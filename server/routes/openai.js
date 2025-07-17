const express = require('express');
const axios = require('axios');
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
    console.log('🔗 Supabase クライアント初期化完了');
  } catch (error) {
    console.warn('⚠️  Supabase クライアント初期化失敗:', error.message);
  }
}

// デバッグエンドポイント（開発時のみ使用）
router.get('/debug', (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const jwtSecret = process.env.JWT_SECRET;
  res.json({
    hasApiKey: !!apiKey,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 20) + '...' : 'undefined',
    hasJwtSecret: !!jwtSecret,
    jwtSecretPrefix: jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'undefined',
    nodeEnv: process.env.NODE_ENV
  });
});

// チャット完了エンドポイント（RAG検索統合）
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'メッセージが必要です' });
  }

  try {
    // 最新のユーザーメッセージを取得
    const latestUserMessage = messages[messages.length - 1];
    const userQuestion = latestUserMessage.content;

    // RAG検索を実行（Supabaseが設定されている場合のみ）
    let ragContext = '';
    if (supabase && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        console.log('🔍 RAG検索を実行中:', userQuestion);
        
        // 質問のembeddingを生成
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: userQuestion,
        });
        
        const queryEmbedding = embeddingResponse.data[0].embedding;
        
        // Supabaseでベクトル検索を実行
        const { data, error } = await supabase.rpc('match_regulation_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7,
          match_count: 3,
        });
        
        if (error) {
          console.error('Supabase RPC error:', error);
        } else if (data && data.length > 0) {
          ragContext = data.map(chunk => chunk.chunk).join('\n\n');
          console.log('🔍 RAG検索結果:', data.length, '件のコンテキストを取得');
        }
      } catch (ragError) {
        console.warn('⚠️  RAG検索エラー（スキップして通常処理を継続）:', ragError.message);
      }
    }

    // コンテキストを含むメッセージを作成
    const enhancedMessages = [...messages];
    if (ragContext) {
      // システムメッセージを追加してコンテキストを提供
      enhancedMessages.unshift({
        role: 'system',
        content: `以下は関連する規約や文書の内容です。この情報を参考にして質問に答えてください：\n\n${ragContext}`
      });
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: enhancedMessages,
        max_tokens: 1000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    res.json(response.data.choices[0].message);
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'AI応答エラー',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 議事録要約エンドポイント
router.post('/summarize-minutes', async (req, res) => {
  try {
    const { content, meetingTitle, meetingDate } = req.body;

    if (!content || !meetingTitle) {
      return res.status(400).json({ error: '議事録内容と会議タイトルは必須です' });
    }

    const prompt = `
理事会議事録の要約を作成してください。

会議情報:
- タイトル: ${meetingTitle}
- 日付: ${meetingDate || '未指定'}

議事録内容:
${content}

以下の形式で要約してください:
1. 重要な決定事項
2. 検討中の課題  
3. 次回までの宿題・アクションアイテム
4. その他の重要な議論

簡潔で分かりやすい日本語でまとめてください。`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは理事会議事録を専門とする要約アシスタントです。重要なポイントを見逃さず、簡潔で分かりやすい要約を作成してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const summary = response.data.choices[0].message.content;

    res.json({
      summary: summary,
      original_length: content.length,
      summary_length: summary.length
    });

  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'AI要約の生成に失敗しました',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 議題提案エンドポイント
router.post('/suggest-agendas', async (req, res) => {
  try {
    const { meetingType, previousMinutes, currentIssues } = req.body;

    const prompt = `
理事会の議題を提案してください。

会議タイプ: ${meetingType || '定期理事会'}
前回議事録: ${previousMinutes || '情報なし'}
現在の課題: ${currentIssues || '特になし'}

以下の観点から適切な議題を5-7個提案してください:
1. 管理費・修繕積立金関連
2. 建物・設備の維持管理
3. 住民サービス・ルール
4. 前回からの継続事項
5. 新規検討事項

各議題には、重要度（高・中・低）と想定討議時間も含めてください。`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはマンション理事会の議題作成を専門とするアシスタントです。実務的で具体的な議題を提案してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const suggestions = response.data.choices[0].message.content;

    res.json({
      suggestions: suggestions,
      meeting_type: meetingType,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'AI議題提案の生成に失敗しました',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;