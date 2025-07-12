# マンション理事会管理システム 仕様書

## 1. プロジェクト概要

### 1.1 目的
マンション理事会と組合員向け情報公開の効率化を目的としたWebアプリケーション。
初期バージョンでは「理事会予定管理」「議題・議事録管理」「ゴミ収集日カレンダー表示」に絞り、機能をシンプルに提供する。

### 1.2 対象ユーザー
- 管理者（管理会社担当者）
- 理事長（マンション理事会代表者）
- 理事（理事会メンバー）
- 組合員（マンション組合の一般居住者）

## 2. システム構成

### 2.1 技術スタック
- **フロントエンド**: React 18.2.0 + TypeScript 4.9.5
- **バックエンド**: Node.js + Express 4.18.2
- **データベース**: PostgreSQL
- **認証**: JWT (JSON Web Token)
- **ファイルアップロード**: Multer
- **日付ライブラリ**: date-fns
- **スタイリング**: CSS-in-JS (inline styles)

### 2.2 ポート構成
- **フロントエンド**: http://localhost:3105
- **バックエンド**: http://localhost:5105
- **API エンドポイント**: http://localhost:5105/api

### 2.3 プロジェクト構造
```
/
├── package.json                 # ルートpackage.json
├── .env                        # 環境変数
├── CLAUDE.md                   # Claude Code用ガイド
├── README.md                   # プロジェクト概要
├── SPECIFICATIONS.md           # 本仕様書
├── server/                     # バックエンド
│   ├── index.js               # メインサーバーファイル
│   ├── database.sql           # データベーススキーマ
│   └── uploads/               # ファイルアップロード先
└── client/                     # フロントエンド
    ├── package.json           # クライアント依存関係
    ├── public/
    │   └── index.html
    └── src/
        ├── index.tsx          # エントリーポイント
        ├── App.tsx            # ルートコンポーネント
        ├── App.css            # グローバルスタイル
        ├── types/
        │   └── index.ts       # TypeScript型定義
        ├── utils/
        │   ├── auth.ts        # 認証ユーティリティ
        │   ├── api.ts         # API呼び出し
        │   └── dateUtils.ts   # 日付ユーティリティ
        ├── contexts/
        │   └── AuthContext.tsx # 認証コンテキスト
        └── components/
            ├── Login.tsx       # ログイン画面
            ├── Dashboard.tsx   # ダッシュボード
            ├── Navigation.tsx  # ナビゲーション
            ├── Layout.tsx      # レイアウト
            └── ProtectedRoute.tsx # 認証ガード
```

## 3. ユーザー権限とアクセス制御

### 3.1 ユーザー種別と権限

| ユーザー種別 | 概要 | 権限内容 |
|-------------|------|----------|
| admin | 管理会社の担当者 | 全データの閲覧・編集・削除、ユーザー管理 |
| chairperson | マンション理事会の代表者 | 理事会予定作成・議題登録・資料アップロード・承認権限 |
| board_member | 理事会メンバー | 理事会予定確認・議題コメント・資料閲覧 |
| resident | マンション組合の一般居住者 | お知らせ・議事録閲覧、ゴミ収集日カレンダーの閲覧 |

### 3.2 機能別アクセス権限

| 機能 | admin | chairperson | board_member | resident |
|------|-------|-------------|--------------|----------|
| ダッシュボード表示 | ✅ | ✅ | ✅ | ✅ |
| ユーザー管理 | ✅ | ❌ | ❌ | ❌ |
| 理事会予定作成・編集 | ✅ | ✅ | ❌ | ❌ |
| 理事会予定閲覧 | ✅ | ✅ | ✅ | ❌ |
| 議題作成・編集 | ✅ | ✅ | ✅ | ❌ |
| 議題閲覧・コメント | ✅ | ✅ | ✅ | ❌ |
| 議事録承認 | ✅ | ✅ | ❌ | ❌ |
| 議事録閲覧 | ✅ | ✅ | ✅ | ✅ |
| お知らせ作成・編集 | ✅ | ✅ | ❌ | ❌ |
| お知らせ閲覧 | ✅ | ✅ | ✅ | ✅ |
| ゴミ収集日管理 | ✅ | ❌ | ❌ | ❌ |
| ゴミ収集日閲覧 | ✅ | ✅ | ✅ | ✅ |

## 4. データベース設計

### 4.1 テーブル構成

#### 4.1.1 users（ユーザー）
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'chairperson', 'board_member', 'resident')),
    room_number VARCHAR(20),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.2 meetings（理事会）
```sql
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    date TIMESTAMP NOT NULL,
    location VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.3 meeting_attendance（出欠管理）
```sql
CREATE TABLE meeting_attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'attending', 'absent', 'maybe')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meeting_id, user_id)
);
```

#### 4.1.4 agendas（議題）
```sql
CREATE TABLE agendas (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'discussed', 'approved', 'rejected')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.5 meeting_minutes（議事録）
```sql
CREATE TABLE meeting_minutes (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.6 documents（文書）
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    agenda_id INTEGER REFERENCES agendas(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.7 garbage_schedule（ゴミ収集予定）
```sql
CREATE TABLE garbage_schedule (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.8 announcements（お知らせ）
```sql
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4.1.9 agenda_comments（議題コメント）
```sql
CREATE TABLE agenda_comments (
    id SERIAL PRIMARY KEY,
    agenda_id INTEGER REFERENCES agendas(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 サンプルデータ
```sql
-- ユーザーサンプル（パスワード: password）
INSERT INTO users (name, email, password, role, room_number) VALUES
('管理者', 'admin@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '管理室'),
('理事長', 'chairperson@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'chairperson', '101'),
('理事', 'board@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'board_member', '201'),
('住民', 'resident@mansion.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'resident', '301');
```

## 5. API仕様

### 5.1 認証API

#### POST /api/auth/login
ユーザーログイン
```json
Request:
{
  "email": "admin@mansion.com",
  "password": "password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@mansion.com",
    "role": "admin",
    "name": "管理者"
  }
}
```

### 5.2 ユーザー管理API

#### GET /api/users
ユーザー一覧取得（管理者のみ）
- **認証**: 必要
- **権限**: admin

#### POST /api/users
ユーザー作成（管理者のみ）
- **認証**: 必要
- **権限**: admin

### 5.3 理事会API

#### GET /api/meetings
理事会一覧取得
- **認証**: 必要

#### POST /api/meetings
理事会作成
- **認証**: 必要
- **権限**: admin, chairperson

### 5.4 議題API

#### GET /api/agendas/:meetingId
指定理事会の議題一覧取得
- **認証**: 必要

#### POST /api/agendas
議題作成
- **認証**: 必要
- **権限**: admin, chairperson, board_member

### 5.5 ゴミ収集API

#### GET /api/garbage-schedule
ゴミ収集予定一覧取得
- **認証**: 必要

#### POST /api/garbage-schedule
ゴミ収集予定作成
- **認証**: 必要
- **権限**: admin

### 5.6 お知らせAPI

#### GET /api/announcements
お知らせ一覧取得
- **認証**: 必要

#### POST /api/announcements
お知らせ作成
- **認証**: 必要
- **権限**: admin, chairperson

### 5.7 ファイルアップロードAPI

#### POST /api/upload
ファイルアップロード
- **認証**: 必要
- **Content-Type**: multipart/form-data

## 6. 画面仕様

### 6.1 ログイン画面 (/login)
- メールアドレス・パスワード入力フォーム
- ログインボタン
- デモアカウント情報表示
- エラーメッセージ表示

### 6.2 ダッシュボード (/dashboard)
- **ヘッダー**: ユーザー名・権限・部屋番号表示
- **次回理事会**: 最新の予定されている理事会情報
- **重要なお知らせ**: 最新5件のお知らせ（重要マーク付き）
- **ゴミ収集カレンダー**: 今後7日間の収集予定
- **最近の理事会**: 過去3件の理事会記録

### 6.3 ナビゲーション
権限に応じて表示される項目：
- ダッシュボード（全ユーザー）
- 理事会管理（admin, chairperson）
- 議題・議事録（admin, chairperson, board_member）
- ゴミカレンダー（全ユーザー）
- ユーザー管理（admin）

### 6.4 レスポンシブ対応
- モバイルファーストデザイン
- タブレット・スマートフォン表示最適化
- ブレークポイント: 768px

## 7. セキュリティ仕様

### 7.1 認証・認可
- JWT トークンベース認証
- ロールベースアクセス制御（RBAC）
- トークン有効期限: 24時間

### 7.2 パスワード
- bcryptjs によるハッシュ化
- ソルトラウンド: 10

### 7.3 CORS設定
- クロスオリジンリクエスト許可設定

### 7.4 ファイルアップロード
- Multer による安全なファイル処理
- アップロード先: `server/uploads/`
- ファイル名: タイムスタンプ + 元ファイル名

## 8. 環境設定

### 8.1 環境変数 (.env)
```
NODE_ENV=development
PORT=5105
JWT_SECRET=your-secret-key-change-this-in-production
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mansion_db
DB_USER=postgres
DB_PASSWORD=password
```

### 8.2 開発コマンド
```bash
# 依存関係インストール
npm install
cd client && npm install

# 開発サーバー起動（両方同時）
npm run dev

# 個別起動
npm run server  # バックエンド（ポート5105）
npm run client  # フロントエンド（ポート3105）

# ビルド・検証
npm run build      # 本番ビルド
npm run lint       # ESLint実行
npm run typecheck  # TypeScript型チェック
```

## 9. 今後の実装予定

### 9.1 優先度: 中
- 理事会予定管理機能
- 議題・議事録管理機能
- ゴミ収集日カレンダー機能

### 9.2 優先度: 低
- レスポンシブ対応とスタイリング改善
- メール通知機能
- ファイルダウンロード機能
- 検索機能

## 10. テスト仕様

### 10.1 デモアカウント
| 権限 | メールアドレス | パスワード |
|------|---------------|-----------|
| 管理者 | admin@mansion.com | password |
| 理事長 | chairperson@mansion.com | password |
| 理事 | board@mansion.com | password |
| 住民 | resident@mansion.com | password |

### 10.2 動作確認項目
1. ログイン・ログアウト機能
2. 権限別画面表示制御
3. ダッシュボード情報表示
4. API通信エラーハンドリング
5. レスポンシブ表示

## 11. デプロイメント

### 11.1 本番環境要件
- **サーバー**: AWS EC2 または類似のクラウドサーバー
- **データベース**: AWS RDS (PostgreSQL) または自前サーバー
- **ファイルストレージ**: AWS S3 または類似のオブジェクトストレージ
- **SSL証明書**: HTTPS対応必須

### 11.2 環境構築手順
1. PostgreSQLデータベース作成
2. `server/database.sql` 実行
3. 環境変数設定
4. `npm install` 実行
5. `npm run build` 実行
6. プロセス管理ツール（PM2等）でサーバー起動

---

**作成日**: 2025年7月5日  
**バージョン**: 1.0.0  
**最終更新**: 2025年7月5日