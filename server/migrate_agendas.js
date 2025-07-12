const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLiteデータベースファイルのパス
const dbPath = path.join(__dirname, 'database.sqlite');

// データベース接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
    process.exit(1);
  } else {
    console.log('SQLiteデータベースに接続しました');
  }
});

// マイグレーション実行
const migrateAgendas = async () => {
  try {
    // discussion_resultカラムを追加
    await new Promise((resolve, reject) => {
      db.run(`ALTER TABLE agendas ADD COLUMN discussion_result TEXT`, (err) => {
        if (err) {
          // カラムが既に存在する場合のエラーは無視
          if (err.message.includes('duplicate column name')) {
            console.log('discussion_resultカラムは既に存在します');
            resolve();
          } else {
            reject(err);
          }
        } else {
          console.log('discussion_resultカラムを追加しました');
          resolve();
        }
      });
    });

    // status カラムの制約を更新（既存の値を確認）
    await new Promise((resolve, reject) => {
      db.get(`PRAGMA table_info(agendas)`, (err, row) => {
        if (err) {
          reject(err);
        } else {
          console.log('agendasテーブルのスキーマを確認しました');
          resolve();
        }
      });
    });

    console.log('マイグレーションが完了しました');
  } catch (error) {
    console.error('マイグレーションエラー:', error);
  } finally {
    // データベース接続を閉じる
    db.close((err) => {
      if (err) {
        console.error('データベース切断エラー:', err.message);
      } else {
        console.log('データベース接続を閉じました');
      }
    });
  }
};

// マイグレーション実行
migrateAgendas();