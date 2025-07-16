#!/bin/bash
# マンション理事会管理システム 自動起動スクリプト

cd /home/kita/p05

# プロセスクリーンアップ
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# 依存関係確認
echo "依存関係を確認中..."
npm install --silent
cd client && npm install --silent
cd ..

# サーバー起動
echo "サーバーを起動中..."
nohup npm run dev > server.log 2>&1 &

# 起動完了待機
echo "起動完了を待機中..."
sleep 10

# 起動確認
if curl -s http://127.0.0.1:3105 > /dev/null; then
    echo "✅ フロントエンドサーバー起動成功: http://127.0.0.1:3105"
else
    echo "❌ フロントエンドサーバー起動失敗"
fi

if curl -s http://127.0.0.1:5105 > /dev/null; then
    echo "✅ バックエンドサーバー起動成功: http://127.0.0.1:5105"
else
    echo "❌ バックエンドサーバー起動失敗"
fi

echo "ログを確認するには: tail -f /home/kita/p05/server.log"