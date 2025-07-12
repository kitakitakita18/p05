# マンション理事会管理システム 起動手順

## システム概要
- **フロントエンド**: React/TypeScript（ポート3105）
- **バックエンド**: Node.js/Express（ポート5105）

## 起動手順

### 1. 依存関係のインストール
```bash
# ルートディレクトリで実行
npm install

# クライアントの依存関係
cd client && npm install && cd ..
```

### 2. データベース設定
PostgreSQLサーバーを起動し、以下を実行：
```sql
-- データベース作成
CREATE DATABASE mansion_db;

-- スキーマとサンプルデータ投入
\i server/database.sql
```

### 3. 環境変数の設定
`.env`ファイルが正しく設定されていることを確認：
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

### 4. サーバー起動

#### 両方のサーバーを同時起動
```bash
npm run dev
```

#### 個別起動
```bash
# バックエンドのみ（ポート5105）
npm run server

# フロントエンドのみ（ポート3105）
npm run client
```

## アクセス情報

### フロントエンド
- **URL**: http://localhost:3105
- **ログイン画面**: http://localhost:3105/login

### バックエンド
- **API URL**: http://localhost:5105/api
- **ヘルスチェック**: http://localhost:5105

## デモアカウント

| 権限 | メールアドレス | パスワード |
|------|---------------|-----------|
| 管理者 | admin@mansion.com | password |
| 理事長 | chairperson@mansion.com | password |
| 理事 | board@mansion.com | password |
| 住民 | resident@mansion.com | password |

## トラブルシューティング

### ポートが使用中の場合
```bash
# ポート5105の使用状況確認
lsof -i :5105

# ポート3105の使用状況確認
lsof -i :3105
```

### データベース接続エラーの場合
1. PostgreSQLサーバーが起動していることを確認
2. `.env`ファイルのデータベース設定を確認
3. データベースとユーザーが存在することを確認

### 依存関係エラーの場合
```bash
# node_modulesを削除して再インストール
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

## 開発コマンド

```bash
# リント実行
npm run lint

# TypeScript型チェック
npm run typecheck

# 本番ビルド
npm run build
```