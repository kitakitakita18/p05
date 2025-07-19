import express from "express";
import axios from "axios";
import { OpenAI } from 'openai';
import { supabase } from '../utils/supabaseClient';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 文脈を考慮した検索クエリ生成関数
const generateContextualSearchQuery = async (messages: any[], latestQuestion: string): Promise<string> => {
  console.log('🔄 文脈結合開始 - 質問:', latestQuestion);
  console.log('🔄 メッセージ履歴数:', messages.length);
  
  // 最新質問に代名詞が含まれているかチェック
  const pronouns = ['それ', 'これ', 'あれ', 'そこ', 'ここ', 'あそこ', 'その', 'この', 'あの'];
  const hasPronoun = pronouns.some(pronoun => latestQuestion.includes(pronoun));
  console.log('🔄 代名詞検出:', hasPronoun);
  
  // 代名詞がない、または会話履歴が短い場合はそのまま返す
  if (!hasPronoun || messages.length < 2) {
    console.log('🔄 文脈結合不要:', { hasPronoun, messageLength: messages.length });
    return latestQuestion;
  }
  
  // 直近のユーザーメッセージ（最大3件）を取得して文脈を構築
  const userMessages = messages
    .filter((msg: any) => msg.role === 'user')
    .slice(-3) // 最新3件のユーザーメッセージ
    .map((msg: any) => msg.content);
  
  // 文脈を組み合わせた検索クエリを生成
  if (userMessages.length > 1) {
    const previousContext = userMessages.slice(0, -1).join(' ');
    const contextualQuery = `${previousContext} ${latestQuestion}`;
    console.log('🔍 文脈結合前:', latestQuestion);
    console.log('🔍 文脈結合後:', contextualQuery);
    return contextualQuery;
  }
  
  return latestQuestion;
};

// チャット完了エンドポイント（RAG検索統合）
router.post("/chat", async (req, res) => {
  console.log('🚀 /openai/chat エンドポイントにリクエスト受信');
  console.log('🚀 リクエストボディ:', JSON.stringify(req.body, null, 2));
  
  const { messages, ragEnabled = true } = req.body;

  if (!messages || !Array.isArray(messages)) {
    console.log('❌ メッセージ配列が無効:', messages);
    return res.status(400).json({ error: 'メッセージが必要です' });
  }

  try {
    // 最新のユーザーメッセージを取得
    const latestUserMessage = messages[messages.length - 1];
    const userQuestion = latestUserMessage.content;
    
    // 文脈を考慮した検索クエリを生成
    const searchQuery = await generateContextualSearchQuery(messages, userQuestion);
    console.log('🚀 ユーザー質問:', userQuestion);
    console.log('🚀 検索クエリ（文脈結合後）:', searchQuery);
    console.log('🚀 RAG有効:', ragEnabled);

    // RAG検索を実行（RAG有効かつSupabaseが設定されている場合のみ）
    let ragContext = '';
    if (ragEnabled && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      try {
        console.log('🤖 バックエンドRAG検索を実行中:', userQuestion);
        
        // 文脈を考慮した検索クエリのembeddingを生成
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: searchQuery,
        });
        
        console.log('🤖 バックエンド検索クエリ:', searchQuery);
        
        const queryEmbedding = embeddingResponse.data[0].embedding;
        console.log('🤖 バックエンドembedding生成完了:', queryEmbedding.length, 'dimensions');
        
        // Supabaseでベクトル検索を実行
        const { data, error } = await supabase.rpc('match_regulation_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: 0.3,
          match_count: 5,
        });
        
        if (error) {
          console.error('🤖 バックエンドSupabase RPC error:', error);
        } else if (data && data.length > 0) {
          console.log('🤖 バックエンドRAG検索結果詳細:', data.map((chunk: any) => ({
            similarity: chunk.similarity,
            chunk_preview: chunk.chunk?.substring(0, 100) + '...'
          })));
          
          // 定義文優先フィルタリングを適用
          const filteredData = data
            .slice(0, 5) // 上位5件を取得
            .map((result: any) => {
              const chunk = result.chunk || '';
              const keywords = userQuestion.toLowerCase().replace(/[とは？について教えてください何ですか]/g, '').trim().split(/\s+/).filter((k: string) => k.length > 0);
              
              // 定義文判定
              const isDefinition = /[一二三四五六七八九十]\s+[^。]+\s+[^。]*をいう/.test(chunk) ||
                                   /^\s*[一二三四五六七八九十]\s+/.test(chunk);
              
              // 条文判定
              const hasArticle = /第\d+条/.test(chunk);
              
              // キーワードマッチスコア計算
              let keywordScore = 0;
              const chunkLower = chunk.toLowerCase();
              
              for (const keyword of keywords) {
                if (chunkLower.includes(keyword)) {
                  keywordScore += 1.0;
                }
              }
              
              // 定義文ボーナス
              if (isDefinition) {
                keywordScore += 10.0;
              }
              
              // 条文ボーナス
              if (hasArticle && !isDefinition) {
                keywordScore += 5.0;
              }
              
              // 総合スコア計算
              const combinedScore = result.similarity * 0.3 + keywordScore * 0.7;
              
              return {
                ...result,
                keywordScore,
                combinedScore,
                isDefinition,
                hasArticle
              };
            })
            .filter((result: any) => result.combinedScore > 0)
            .sort((a: any, b: any) => b.combinedScore - a.combinedScore)
            .slice(0, 3);
          
          console.log('🤖 バックエンドフィルタリング後結果:', filteredData.map((item: any) => ({
            similarity: item.similarity,
            keywordScore: item.keywordScore,
            combinedScore: item.combinedScore,
            isDefinition: item.isDefinition,
            hasArticle: item.hasArticle,
            preview: item.chunk.substring(0, 100) + '...'
          })));
          
          ragContext = filteredData.map((chunk: any, index: number) => 
            `【文書${index + 1}】（類似度: ${(chunk.similarity * 100).toFixed(1)}%${chunk.isDefinition ? '・定義文' : ''}${chunk.hasArticle ? '・条文' : ''}）\n${chunk.chunk}`
          ).join('\n\n---\n\n');
          console.log('🤖 バックエンドRAG検索結果:', filteredData.length, '件のコンテキストを取得');
        } else {
          console.log('🤖 バックエンドRAG検索結果が空:', { data, error });
        }
      } catch (ragError) {
        console.warn('🤖 バックエンドRAG検索エラー（スキップして通常処理を継続）:', ragError);
      }
    } else if (!ragEnabled) {
      console.log('🤖 RAG無効 - 通常のAI回答モード');
    } else {
      console.log('🤖 Supabase環境変数が設定されていません - RAG検索をスキップ');
    }

    // コンテキストを含むメッセージを作成
    const enhancedMessages = [...messages];
    if (ragEnabled && ragContext) {
      console.log('🤖 RAGコンテキストを追加中');
      // システムメッセージを追加してコンテキストを提供
      const systemMessage = {
        role: 'system',
        content: `あなたはマンション理事会の専門アシスタントです。以下の関連文書を参考に、自然で分かりやすい日本語で回答してください。

関連文書：
${ragContext}

回答時の注意点：
- 専門用語は分かりやすく説明する
- 具体例を交えて説明する
- 必要に応じて条文番号や根拠を明示する
- 簡潔で親しみやすい口調で回答する`
      };
      enhancedMessages.unshift(systemMessage);
      console.log('🤖 追加されたシステムメッセージプレビュー:', systemMessage.content.substring(0, 200) + '...');
    } else if (!ragEnabled) {
      console.log('🤖 RAG無効 - 一般的なAIアシスタントとして回答');
      // RAG無効時の基本システムメッセージ
      const basicSystemMessage = {
        role: 'system',
        content: 'あなたは親しみやすく丁寧なAIアシスタントです。マンション理事会に関する質問に対して、一般的な知識に基づいて分かりやすく回答してください。'
      };
      enhancedMessages.unshift(basicSystemMessage);
    } else {
      console.log('🤖 RAGコンテキストなし - 一般的な回答を生成');
    }
    
    console.log('🤖 OpenAIに送信するメッセージ数:', enhancedMessages.length);
    console.log('🤖 OpenAIに送信するメッセージ:', enhancedMessages.map(m => ({ 
      role: m.role, 
      contentPreview: m.content?.substring(0, 100) + '...' 
    })));

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: enhancedMessages,
        max_tokens: 1200,
        temperature: 0.8,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    const aiResponse = (response.data as any).choices[0].message;
    console.log('🤖 OpenAI応答:', aiResponse);
    console.log('🤖 応答内容プレビュー:', aiResponse.content?.substring(0, 200) + '...');
    
    res.json(aiResponse);
  } catch (error: any) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "AI応答エラー",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 議事録要約エンドポイント
router.post("/summarize-minutes", async (req, res) => {
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
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは理事会議事録を専門とする要約アシスタントです。重要なポイントを見逃さず、簡潔で分かりやすい要約を作成してください。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const summary = (response.data as any).choices[0].message.content;

    res.json({
      summary: summary,
      original_length: content.length,
      summary_length: summary.length
    });

  } catch (error: any) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "AI要約の生成に失敗しました",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 議題提案エンドポイント
router.post("/suggest-agendas", async (req, res) => {
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
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたはマンション理事会の議題作成を専門とするアシスタントです。実務的で具体的な議題を提案してください。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const suggestions = (response.data as any).choices[0].message.content;

    res.json({
      suggestions: suggestions,
      meeting_type: meetingType,
      generated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "AI議題提案の生成に失敗しました",
      details: error.response?.data?.error?.message || error.message
    });
  }
});

export default router;