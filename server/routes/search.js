const express = require('express');
const { OpenAI } = require('openai');

const router = express.Router();

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supabaseクライアントの初期化（環境変数が設定されている場合のみ）
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log('🔗 Search: Supabase クライアント初期化完了');
  } catch (error) {
    console.warn('⚠️  Search: Supabase クライアント初期化失敗:', error.message);
  }
}

// ベクトル検索エンドポイント
router.post('/', async (req, res) => {
  try {
    const { question, matchThreshold = 0.7, matchCount = 3 } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: '質問が必要です' });
    }

    // Supabaseが設定されていない場合は空の結果を返す
    if (!supabase) {
      console.log('⚠️  Supabase未設定のため、検索結果なしを返します');
      return res.json({ 
        question, 
        results: [],
        message: 'ベクトル検索機能は設定されていません'
      });
    }

    console.log('🔍 ベクトル検索実行中:', question);

    // 質問のembeddingを生成
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: question,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Supabaseでベクトル検索を実行
    const { data, error } = await supabase.rpc('match_regulation_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Supabase RPC error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('🔍 検索結果:', data ? data.length : 0, '件');

    res.json({ 
      question, 
      results: data || [],
      searchParams: {
        matchThreshold,
        matchCount
      }
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;