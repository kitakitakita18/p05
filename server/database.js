const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// SQLiteデータベースファイルのパス
const dbPath = path.join(__dirname, 'database.sqlite');

// データベース接続のプール的な仕組み
class DatabaseManager {
  constructor() {
    this.db = null;
  }

  // データベースに接続
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('データベース接続エラー:', err.message);
          reject(err);
        } else {
          console.log('SQLiteデータベースに接続しました');
          resolve();
        }
      });
    });
  }

  // データベースを閉じる
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('データベース切断エラー:', err.message);
            reject(err);
          } else {
            console.log('データベース接続を閉じました');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // SELECT文を実行（複数行）
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('SQL実行エラー:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // SELECT文を実行（単一行）
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('SQL実行エラー:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // INSERT/UPDATE/DELETE文を実行
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('SQL実行エラー:', err.message);
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // トランザクション開始
  beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  }

  // コミット
  commit() {
    return this.run('COMMIT');
  }

  // ロールバック
  rollback() {
    return this.run('ROLLBACK');
  }
}

// シングルトンインスタンス
const dbManager = new DatabaseManager();

// アプリケーション起動時にデータベースに接続
const initializeDatabase = async () => {
  try {
    await dbManager.connect();
    console.log('データベースの初期化が完了しました');
  } catch (error) {
    console.error('データベースの初期化に失敗しました:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('アプリケーションを終了しています...');
  await dbManager.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('アプリケーションを終了しています...');
  await dbManager.close();
  process.exit(0);
});

module.exports = {
  dbManager,
  initializeDatabase
};