import sqlite3 from "sqlite3";
import { open } from "sqlite";

(async () => {
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database
  });

  // サンプルデータを投入（embeddingは空の配列として格納）
  const sampleData = [
    {
      union_id: 'ASC001',
      regulation_name: 'サンプルマンション管理規約',
      content: '第1条（目的）この規約は、マンションの管理に関する基本的な事項を定めることを目的とする。',
      embedding: JSON.stringify([])
    },
    {
      union_id: 'ASC001',
      regulation_name: 'サンプルマンション管理規約',
      content: '第2条（理事長の任期）理事長の任期は2年とし、再任を妨げない。',
      embedding: JSON.stringify([])
    },
    {
      union_id: 'ASC001',
      regulation_name: 'サンプルマンション管理規約',
      content: '第3条（理事会の開催）理事会は毎月第2土曜日に開催する。',
      embedding: JSON.stringify([])
    },
    {
      union_id: 'ASC001',
      regulation_name: 'サンプルマンション管理規約',
      content: '第4条（管理費の徴収）管理費は毎月末日までに納付するものとする。',
      embedding: JSON.stringify([])
    }
  ];

  for (const data of sampleData) {
    await db.run(`
      INSERT INTO regulation_chunks (union_id, regulation_name, content, embedding)
      VALUES (?, ?, ?, ?)
    `, [data.union_id, data.regulation_name, data.content, data.embedding]);
  }

  console.log("✅ サンプルデータを投入しました");
  
  // データ確認
  const count = await db.get("SELECT COUNT(*) as count FROM regulation_chunks");
  console.log(`📊 regulation_chunks テーブルに ${count.count} 件のデータが格納されています`);
  
  await db.close();
})();