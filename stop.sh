#!/bin/bash
# マンション理事会管理システム 停止スクリプト

echo "サーバーを停止中..."

# プロセス停止
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "concurrently" 2>/dev/null || true

sleep 2

echo "✅ サーバーを停止しました"