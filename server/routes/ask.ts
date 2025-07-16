import express from "express";
import OpenAI from "openai";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cosineSimilarity from "../utils/cosineSimilarity";

const router = express.Router();

// 環境変数のバリデーション
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// POST /api/ask
router.post("/ask", async (req, res) => {
  try {
    const question = req.body.question;
    if (!question) {
      return res.status(400).json({ error: "質問文が必要です" });
    }

    // 質問文のベクトル化
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: question
    });
    const questionVector = embeddingRes.data[0].embedding;

    // SQLiteから規約ベクトル全件取得
    let db;
    let chunks;
    try {
      db = await open({
        filename: "./database.sqlite",
        driver: sqlite3.Database
      });
      
      chunks = await db.all("SELECT id, union_id, regulation_name, content, embedding FROM regulation_chunks");
      await db.close();
      
      if (!chunks || chunks.length === 0) {
        return res.status(404).json({ error: "規約データが見つかりません" });
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      if (db) await db.close();
      return res.status(500).json({ error: "データベースへの接続に失敗しました" });
    }

    // コサイン類似度計算
    const scoredChunks = chunks.map((chunk: any) => {
      const chunkEmbedding = JSON.parse(chunk.embedding);
      const score = cosineSimilarity(questionVector, chunkEmbedding);
      return { ...chunk, score };
    });

    // 類似度スコアでソートして上位3件を抽出
    const topChunks = scoredChunks.sort((a: any, b: any) => b.score - a.score).slice(0, 3);

    // ChatGPTに渡すプロンプト生成
    const context = topChunks.map((c: any) => `規約: ${c.content}`).join("\n---\n");
    const prompt = `次の規約データを参考に質問に回答してください:\n${context}\n質問: ${question}`;

    // ChatGPTで回答生成
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const answer = completion.choices[0].message?.content;

    res.json({
      question,
      answer,
      references: topChunks.map((c: any) => ({
        unionId: c.union_id,
        regulationName: c.regulation_name,
        score: c.score
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "質問処理中にエラーが発生しました" });
  }
});

export default router;