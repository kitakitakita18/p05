const express = require('express');
const axios = require('axios');

const router = express.Router();

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

// チャット完了エンドポイント
router.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'メッセージが必要です' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // より利用可能なモデルに変更
        messages: messages,
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