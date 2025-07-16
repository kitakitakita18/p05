import OpenAI from "openai";
import { encoding_for_model } from "tiktoken";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// トークンエンコーダー
const enc = encoding_for_model("text-embedding-3-small");

// チャンク化設定
const CHUNK_CONFIG = {
  maxTokens: 3000,        // 1チャンクあたりの最大トークン数
  overlap: 200,           // チャンク間のオーバーラップトークン数
  minChunkTokens: 100,    // 最小チャンクサイズ
  model: "text-embedding-3-small" as const
};

// トークン数カウント
function countTokens(text: string): number {
  return enc.encode(text).length;
}

// テキストをトークン数でチャンク化
function chunkTextByTokens(
  text: string, 
  maxTokens: number = CHUNK_CONFIG.maxTokens,
  overlap: number = CHUNK_CONFIG.overlap
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[。！？\n])/);
  
  let currentChunk = "";
  let currentTokens = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = countTokens(sentence);
    
    // 単一文章が制限を超える場合は分割
    if (sentenceTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentTokens = 0;
      }
      
      // 長い文章を文字数で分割
      const words = sentence.split(/\s+/);
      let wordChunk = "";
      let wordTokens = 0;
      
      for (const word of words) {
        const wordTokenCount = countTokens(word);
        if (wordTokens + wordTokenCount > maxTokens) {
          if (wordChunk) {
            chunks.push(wordChunk.trim());
            wordChunk = word;
            wordTokens = wordTokenCount;
          }
        } else {
          wordChunk += " " + word;
          wordTokens += wordTokenCount;
        }
      }
      
      if (wordChunk) {
        chunks.push(wordChunk.trim());
      }
      
      continue;
    }
    
    // 通常の処理
    if (currentTokens + sentenceTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        
        // オーバーラップ処理
        const overlapText = getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence;
        currentTokens = countTokens(currentChunk);
      } else {
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      }
    } else {
      currentChunk += sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// オーバーラップテキストの取得
function getOverlapText(text: string, overlapTokens: number): string {
  const sentences = text.split(/(?<=[。！？\n])/);
  let overlapText = "";
  let tokens = 0;
  
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];
    const sentenceTokens = countTokens(sentence);
    
    if (tokens + sentenceTokens <= overlapTokens) {
      overlapText = sentence + overlapText;
      tokens += sentenceTokens;
    } else {
      break;
    }
  }
  
  return overlapText;
}

// 単一埋め込み生成
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const cleanText = text.replace(/\s+/g, " ").trim();
    const tokenCount = countTokens(cleanText);
    
    console.log(`テキスト長: ${cleanText.length}文字, トークン数: ${tokenCount}`);
    
    // トークン制限チェック
    if (tokenCount > 8000) {
      throw new Error(`テキストが長すぎます。${tokenCount}トークン > 8000トークン制限`);
    }
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding生成エラー:", error);
    throw error;
  }
}

// チャンク化された埋め込み生成
export async function createEmbeddingsWithChunks(
  text: string,
  maxTokens: number = CHUNK_CONFIG.maxTokens
): Promise<Array<{ chunk: string; embedding: number[]; tokens: number }>> {
  const chunks = chunkTextByTokens(text, maxTokens);
  const results = [];
  
  console.log(`テキストを${chunks.length}個のチャンクに分割しました`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const tokens = countTokens(chunk);
    
    console.log(`チャンク ${i + 1}/${chunks.length}: ${tokens}トークン`);
    
    try {
      const embedding = await createEmbedding(chunk);
      results.push({
        chunk,
        embedding,
        tokens
      });
      
      // API制限回避のための待機
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`チャンク ${i + 1} の処理でエラー:`, error);
      throw error;
    }
  }
  
  return results;
}

// 単一ドキュメント保存（下位互換性）
export async function storeDocument(document: {
  fileName: string;
  filePath: string;
  content: string;
  embedding: number[];
  uploadedBy?: number;
  uploadedAt: Date;
}): Promise<string> {
  console.log("Document stored:", {
    fileName: document.fileName,
    contentLength: document.content.length,
    embeddingLength: document.embedding.length
  });
  
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// チャンク化されたドキュメント保存
export async function storeDocumentWithChunks(document: {
  fileName: string;
  filePath: string;
  content: string;
  chunks: Array<{ chunk: string; embedding: number[]; tokens: number }>;
  uploadedBy?: number;
  uploadedAt: Date;
}): Promise<string[]> {
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
  
  const documentIds = [];
  
  for (let i = 0; i < document.chunks.length; i++) {
    const chunk = document.chunks[i];
    const chunkId = `doc_${Date.now()}_${i + 1}_${Math.random().toString(36).substr(2, 9)}`;
    
    // データベースに保存
    await db.run(`
      INSERT INTO regulation_chunks (union_id, regulation_name, content, embedding)
      VALUES (?, ?, ?, ?)
    `, [
      'ASC001', // 固定値
      document.fileName,
      chunk.chunk,
      JSON.stringify(chunk.embedding)
    ]);
    
    console.log(`チャンク ${i + 1}/${document.chunks.length} を保存:`, {
      id: chunkId,
      fileName: `${document.fileName} (${i + 1}/${document.chunks.length})`,
      tokens: chunk.tokens,
      chunkLength: chunk.chunk.length
    });
    
    documentIds.push(chunkId);
  }
  
  await db.close();
  return documentIds;
}