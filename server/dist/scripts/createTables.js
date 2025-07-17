"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
(async () => {
    const db = await (0, sqlite_1.open)({
        filename: "./database.sqlite",
        driver: sqlite3_1.default.Database
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
//# sourceMappingURL=createTables.js.map