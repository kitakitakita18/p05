# マンション理事会管理システム - システム仕様書

## 1. プロジェクト概要

### 1.1 システム名
マンション理事会管理システム

### 1.2 目的
マンション管理組合の理事会運営を効率化し、会議の開催・議題管理・出席管理・議事録管理などを統合的に支援するWebアプリケーション

### 1.3 対象ユーザー
- 管理者（管理会社）
- 理事長
- 理事
- 住民

---

## 2. 技術アーキテクチャ

### 2.1 システム構成
```
Client (React/TypeScript) ← HTTP API → Server (Node.js/Express) ← SQLite Database
```

### 2.2 バックエンド技術スタック
- **実行環境**: Node.js
- **フレームワーク**: Express.js
- **データベース**: SQLite（開発用）/PostgreSQL（本番用）
- **認証**: JWT（JSON Web Token）
- **ファイル操作**: Multer
- **パスワード暗号化**: bcrypt.js

### 2.3 フロントエンド技術スタック
- **フレームワーク**: React 18.2.0
- **言語**: TypeScript
- **ルーティング**: React Router v6
- **状態管理**: React Context API
- **HTTP通信**: Axios
- **UI**: カスタムCSS、Lucide React（アイコン）
- **日付処理**: date-fns
- **フォーム**: React Hook Form
- **カレンダー**: React Calendar

---

## 3. データベース設計

### 3.1 テーブル構成

#### 3.1.1 users - ユーザー情報
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

#### 3.1.2 meetings - 理事会情報
```sql
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    date TIMESTAMP,
    time_start TIME,
    time_end TIME,
    location VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'tentative' CHECK (status IN ('confirmed', 'tentative', 'completed', 'cancelled')),
    meeting_type VARCHAR(20) DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'emergency')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.3 meeting_attendance - 出席情報
```sql
CREATE TABLE meeting_attendance (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    member_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'attending', 'absent', 'maybe')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meeting_id, user_id)
);
```

#### 3.1.4 agendas - 議題情報
```sql
CREATE TABLE agendas (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_no INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'discussed', 'approved', 'rejected')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.5 documents - 文書管理
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

#### 3.1.6 garbage_schedule - ゴミ収集予定
```sql
CREATE TABLE garbage_schedule (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.1.7 announcements - お知らせ
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

#### 3.1.8 association_master - 組合基本情報
```sql
CREATE TABLE association_master (
    id SERIAL PRIMARY KEY,
    association_code VARCHAR(20) UNIQUE NOT NULL,
    association_name VARCHAR(200) NOT NULL,
    chairperson_name VARCHAR(100) NOT NULL,
    meeting_frequency INTEGER NOT NULL CHECK (meeting_frequency IN (1, 2, 3, 4)),
    meeting_week INTEGER CHECK (meeting_week IN (1, 2, 3, 4)),
    meeting_day_of_week INTEGER CHECK (meeting_day_of_week IN (0, 1, 2, 3, 4, 5, 6)),
    meeting_start_time TIME,
    meeting_end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. 認証・認可設計

### 4.1 認証方式
- JWT（JSON Web Token）を使用
- トークン有効期限：24時間
- トークンはローカルストレージに保存

### 4.2 ユーザー役割
| 役割 | 英語名 | 権限 |
|------|--------|------|
| 管理者 | admin | 全機能へのアクセス |
| 理事長 | chairperson | 理事会・議題の管理、お知らせ作成 |
| 理事 | board_member | 理事会参加、議題閲覧・コメント |
| 住民 | resident | お知らせ・ゴミカレンダー閲覧のみ |

### 4.3 権限マトリックス
| 機能 | 管理者 | 理事長 | 理事 | 住民 |
|------|--------|--------|------|------|
| ダッシュボード | ✓ | ✓ | ✓ | ✓ |
| 理事会管理 | ✓ | ✓ | 閲覧のみ | × |
| 議題管理 | ✓ | ✓ | 閲覧のみ | × |
| ユーザー管理 | ✓ | × | × | × |
| 組合基本情報 | ✓ | × | × | × |
| お知らせ | ✓ | ✓ | 閲覧のみ | 閲覧のみ |
| ゴミカレンダー | ✓ | ✓ | ✓ | ✓ |

---

## 5. API設計

### 5.1 認証API
- `POST /api/auth/login` - ログイン

### 5.2 ユーザー管理API
- `GET /api/users` - ユーザー一覧取得
- `POST /api/users` - ユーザー作成
- `PUT /api/users/:id` - ユーザー更新
- `DELETE /api/users/:id` - ユーザー削除
- `PUT /api/users/:id/reset-password` - パスワードリセット

### 5.3 理事会管理API
- `GET /api/meetings` - 理事会一覧取得
- `GET /api/meetings/recent` - 最近の理事会
- `GET /api/meetings/next` - 次回理事会
- `GET /api/meetings/by-year/:year` - 年別理事会
- `GET /api/meetings/years` - 開催年一覧
- `POST /api/meetings` - 理事会作成
- `PUT /api/meetings/:id` - 理事会更新
- `DELETE /api/meetings/:id` - 理事会削除
- `POST /api/meetings/generate-schedule` - 定期理事会スケジュール生成

### 5.4 出席管理API
- `GET /api/meetings/:meetingId/attendance` - 出席状況取得
- `POST /api/meetings/:meetingId/attendance` - 出席状況更新
- `POST /api/meetings/:meetingId/attendance/bulk` - 一括出席更新

### 5.5 議題管理API
- `GET /api/agendas/:meetingId` - 議題一覧取得
- `POST /api/agendas` - 議題作成
- `PUT /api/agendas/:id` - 議題更新
- `DELETE /api/agendas/:id` - 議題削除
- `PUT /api/agendas/:meetingId/reorder` - 議題順序変更

### 5.6 文書管理API
- `GET /api/agendas/:agendaId/documents` - 議題文書一覧
- `POST /api/agendas/:agendaId/documents/upload` - 文書アップロード
- `DELETE /api/agendas/documents/:documentId` - 文書削除

### 5.7 お知らせAPI
- `GET /api/announcements` - お知らせ一覧
- `POST /api/announcements` - お知らせ作成

### 5.8 ゴミ収集API
- `GET /api/garbage-schedule` - ゴミ収集予定一覧
- `POST /api/garbage-schedule` - ゴミ収集予定作成

### 5.9 組合情報API
- `GET /api/association` - 組合情報取得
- `PUT /api/association` - 組合情報更新

---

## 6. フロントエンド設計

### 6.1 ページ構成
```
/login - ログイン画面
/dashboard - ダッシュボード
/meetings - 理事会管理
/agendas - 議題管理
/board-meetings - 理事会スケジュール
/users - ユーザー管理
/association - 組合基本情報
/garbage-calendar - ゴミカレンダー
```

### 6.2 コンポーネント設計
- **Layout**: 全体のレイアウト
- **ProtectedRoute**: 認証・認可ルートガード
- **Dashboard**: ダッシュボード
- **Login**: ログイン機能
- **MeetingManagement**: 理事会管理
- **AgendaManagement**: 議題管理
- **UserManagement**: ユーザー管理
- **AssociationMaster**: 組合基本情報管理

### 6.3 状態管理
- **AuthContext**: 認証状態の管理
- **各コンポーネント**: ローカル状態（useState）
- **API通信**: Axiosによる非同期通信

---

## 7. 主要機能仕様

### 7.1 ダッシュボード
- **表示項目**:
  - 次回理事会情報と出席状況
  - 重要なお知らせ
  - 今週のゴミ収集予定
  - 最近の理事会履歴
- **機能**:
  - 出席状況の変更
  - 理事会詳細へのナビゲーション

### 7.2 理事会管理
- **基本機能**:
  - 理事会の作成・編集・削除
  - 開催状況の管理（仮・確定・完了・中止）
  - 定期理事会スケジュールの自動生成
- **出席管理**:
  - 出席者の個別・一括管理
  - 出席状況の可視化
- **通知機能**:
  - 出席確認メール送信
  - リマインダー送信

### 7.3 議題管理
- **基本機能**:
  - 議題の作成・編集・削除
  - 議題順序の変更
  - 議題状況の管理
- **文書管理**:
  - 議題への文書添付
  - 文書のダウンロード・削除
- **通知機能**:
  - 議題一覧メール送信

### 7.4 ユーザー管理
- **基本機能**:
  - ユーザーの作成・編集・削除
  - 役割の管理
  - パスワードリセット
- **権限制御**:
  - 管理者専用機能

### 7.5 組合基本情報管理
- **設定項目**:
  - 組合名・理事長名
  - 定期理事会の開催設定
  - 開催頻度・曜日・時間

---

## 8. セキュリティ設計

### 8.1 認証セキュリティ
- JWT署名による改ざん防止
- トークン有効期限による自動ログアウト
- パスワード暗号化（bcrypt）

### 8.2 認可セキュリティ
- 役割ベースアクセス制御
- API レベルでの権限チェック
- フロントエンドでの UI 制御

### 8.3 データセキュリティ
- SQL インジェクション対策
- ファイルアップロード制限
- CORS設定

---

## 9. 開発・運用

### 9.1 開発環境
- **サーバー**: `npm run dev` - 同時起動（port 5105）
- **クライアント**: `npm run client` - 開発サーバー（port 3105）
- **データベース**: SQLite（開発用）

### 9.2 本番環境
- **サーバー**: `npm start`
- **クライアント**: `npm run build`
- **データベース**: PostgreSQL

### 9.3 コマンド
```bash
# 開発サーバー起動
npm run dev

# 個別起動
npm run server
npm run client

# ビルド
npm run build

# 型チェック
npm run typecheck

# Lint
npm run lint
```

---

## 10. 制約事項・今後の拡張

### 10.1 現在の制約
- 議事録機能は基本的なファイル管理のみ
- メール送信機能はモック実装
- ゴミカレンダー機能は表示のみ

### 10.2 今後の拡張可能性
- 実際のメール送信機能
- モバイルアプリ対応
- プッシュ通知機能
- レポート・分析機能
- 複数組合対応

---

## 11. サンプルデータ

### 11.1 デフォルトユーザー
```
管理者: admin@mansion.com / password
理事長: chairperson@mansion.com / password
理事: board@mansion.com / password
住民: resident@mansion.com / password
```

### 11.2 サンプル組合
```
組合名: サンプルマンション管理組合
理事長: 田中理事長
開催頻度: 毎月第2土曜日 14:00-16:00
```

---

*このシステム仕様書は、現在の実装状況に基づいて作成されています。*