import sqlite3 from "sqlite3";
import { open } from "sqlite";

(async () => {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS regulation_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      union_id TEXT NOT NULL,
      regulation_name TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL
    );
  `);

  console.log("✅ regulation_chunks テーブルを作成しました");
  await db.close();
})();