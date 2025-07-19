import express from "express";
import axios from "axios";
import { OpenAI } from 'openai';
import { supabase } from '../utils/supabaseClient';
import { optimizedVectorSearch } from '../utils/optimizedVectorSearch';
import { dbPool } from '../utils/databasePool';
import { performanceProfiler } from '../utils/performanceProfiler';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🗄️ サーバーサイドキャッシュシステム
interface ServerCacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
  hitCount: number;
}

class ServerCacheService {
  private cache: Map<string, ServerCacheEntry> = new Map();
  private maxSize: number = 500; // サーバーは大容量キャッシュ
  private defaultTTL: number = 60 * 60 * 1000; // 1時間のデフォルトTTL
  private stats = { hits: 0, misses: 0 };

  // キー正規化
  private normalizeKey(input: string): string {
    return input
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[？?。、]/g, '')
      .trim();
  }

  // キャッシュ保存
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    const entry: ServerCacheEntry = {
      key,
      data,
      timestamp: now,
      expiry: now + ttl,
      hitCount: 0
    };

    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    console.log(`💾 サーバーキャッシュ保存: "${key}" (TTL: ${ttl}ms)`);
  }

  // キャッシュ取得
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ サーバーキャッシュ期限切れ: "${key}"`);
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    console.log(`✅ サーバーキャッシュヒット: "${key}" (ヒット回数: ${entry.hitCount})`);
    return entry.data;
  }

  // LRU退避
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ サーバーキャッシュLRU退避: "${oldestKey}"`);
    }
  }

  // 統計取得
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(1) : '0.0',
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      cacheSize: this.cache.size
    };
  }

  // 期限切れクリーンアップ
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 サーバーキャッシュクリーンアップ: ${deletedCount}件削除`);
    }
    
    return deletedCount;
  }
}

// シングルトンインスタンス
const serverCache = new ServerCacheService();

// 5分間隔でクリーンアップ
setInterval(() => {
  serverCache.cleanup();
}, 5 * 60 * 1000);

// 🧠 OpenAI Embeddingキャッシュサービス
class EmbeddingCacheService {
  private cache: Map<string, { embedding: number[], timestamp: number, expiry: number }> = new Map();
  private maxSize: number = 1000; // Embeddingは大量キャッシュ可能
  private defaultTTL: number = 24 * 60 * 60 * 1000; // 24時間のデフォルトTTL（Embeddingは長期利用可能）
  private stats = { hits: 0, misses: 0 };

  // テキストを正規化してキャッシュキーを生成
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[？?。、]/g, '')
      .trim();
  }

  // Embeddingをキャッシュに保存
  set(text: string, embedding: number[], ttl: number = this.defaultTTL): void {
    const normalizedText = this.normalizeText(text);
    const now = Date.now();
    
    const entry = {
      embedding,
      timestamp: now,
      expiry: now + ttl
    };

    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(normalizedText, entry);
    console.log(`🧠 Embeddingキャッシュ保存: "${text.substring(0, 50)}..." (TTL: ${ttl}ms)`);
  }

  // キャッシュからEmbeddingを取得
  get(text: string): number[] | null {
    const normalizedText = this.normalizeText(text);
    const entry = this.cache.get(normalizedText);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(normalizedText);
      this.stats.misses++;
      console.log(`⏰ Embeddingキャッシュ期限切れ: "${text.substring(0, 50)}..."`);
      return null;
    }

    this.stats.hits++;
    console.log(`✅ Embeddingキャッシュヒット: "${text.substring(0, 50)}..."`);
    return entry.embedding;
  }

  // LRU退避
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ EmbeddingキャッシュLRU退避: "${oldestKey.substring(0, 30)}..."`);
    }
  }

  // 統計取得
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(1) : '0.0',
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      cacheSize: this.cache.size,
      estimatedSavings: this.stats.hits * 0.0001 // 1ヒットあたり約$0.0001の節約
    };
  }

  // 期限切れクリーンアップ
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Embeddingキャッシュクリーンアップ: ${deletedCount}件削除`);
    }
    
    return deletedCount;
  }
}

// シングルトンインスタンス
const embeddingCache = new EmbeddingCacheService();

// 1時間間隔でクリーンアップ
setInterval(() => {
  embeddingCache.cleanup();
}, 60 * 60 * 1000);

// 🧠 即座のAI応答生成（並列処理用）
const generateImmediateAIResponse = async (messages: any[], ragEnabled: boolean = true) => {
  console.log('🧠 即座のAI応答生成開始');
  
  // 基本システムメッセージ
  const systemMessage = {
    role: 'system',
    content: ragEnabled ? 
      'あなたはマンション理事会の専門アシスタントです。質問に対して分かりやすく丁寧に回答してください。' :
      'あなたは親しみやすく丁寧なAIアシスタントです。マンション理事会に関する質問に対して、一般的な知識に基づいて分かりやすく回答してください。'
  };
  
  const enhancedMessages = [systemMessage, ...messages];
  
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: ragEnabled ? "gpt-4o-mini" : "gpt-3.5-turbo",
      messages: enhancedMessages,
      max_tokens: ragEnabled ? 800 : 600, // 初回応答は控えめに
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 12000, // 12秒タイムアウト（並列実行のため短縮）
    }
  );
  
  console.log('🧠 即座のAI応答生成完了');
  return (response.data as any).choices[0].message;
};

// 🔍 RAG検索実行（並列処理用）
const performRAGSearch = async (searchQuery: string, userQuestion: string, requestId: string) => {
  console.log('🔍 RAG検索実行開始');
  
  try {
    const searchResult = await optimizedVectorSearch.optimizedSearch(searchQuery, {
      threshold: 0.3,
      maxResults: 3,
      prioritizeDefinitions: userQuestion.includes('とは') || userQuestion.includes('について'),
      enableCache: true
    });
    
    // 軽量プロファイリング
    if (process.env.ENABLE_DETAILED_PROFILING === 'true') {
      performanceProfiler.recordSearchProcessing(
        requestId,
        searchResult.metrics.vectorSearchTime,
        searchResult.metrics.postProcessTime,
        searchResult.results.length,
        searchResult.metrics.cacheHit,
        searchResult.results.slice(0, 3).map(r => r.similarity)
      );
    }
    
    console.log('🔍 RAG検索実行完了:', searchResult.results.length, '件');
    return searchResult;
  } catch (error) {
    console.warn('🔍 RAG検索エラー:', error);
    throw error;
  }
};

// 📈 RAG情報でAI応答を強化
const enhanceAIResponseWithRAG = async (baseResponse: string, ragContext: string) => {
  console.log('📈 AI応答をRAG情報で強化開始');
  
  const enhancePrompt = `
以下の基本回答をRAG検索で得られた関連情報を使って、より詳しく正確に強化してください。

基本回答:
${baseResponse}

関連文書情報:
${ragContext}

強化時の注意点:
- 基本回答の内容は維持しつつ、関連文書の情報で補強する
- 条文番号や具体的な根拠があれば明示する
- 自然で読みやすい文章にまとめる
- 専門用語は分かりやすく説明する`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは文書情報を使ってAI応答を強化する専門アシスタントです。"
          },
          {
            role: "user",
            content: enhancePrompt
          }
        ],
        max_tokens: 1200,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );
    
    console.log('📈 AI応答強化完了');
    return (response.data as any).choices[0].message.content;
  } catch (error) {
    console.warn('📈 AI応答強化エラー、基本応答を返却:', error);
    return baseResponse;
  }
};

// 最適化された検索クエリ生成関数
const generateOptimalSearchQuery = (messages: any[], latestQuestion: string): string => {
  console.log('🔄 最適化検索クエリ生成開始 - 質問:', latestQuestion);
  console.log('🔄 メッセージ履歴数:', messages.length);
  
  // 「まとめ」系の質問を検出
  const isSummaryQuestion = latestQuestion.includes('まとめ') || 
                           latestQuestion.includes('総括') ||
                           latestQuestion.includes('要約');
  console.log('🔄 まとめ系質問:', isSummaryQuestion);
  
  // ユーザーメッセージのみ抽出
  const userMessages = messages
    .filter((msg: any) => msg.role === 'user')
    .map((msg: any) => msg.content);
  
  if (userMessages.length === 0) {
    console.log('🔄 ユーザーメッセージなし');
    return latestQuestion;
  }
  
  let searchQuery: string;
  
  if (isSummaryQuestion) {
    // まとめ系質問：最新5件で包括的に検索
    const contextMessages = userMessages.slice(-5);
    searchQuery = contextMessages.join(' ');
    console.log('🔍 まとめ系 - 参照件数:', contextMessages.length);
    console.log('🔍 まとめ系 - 検索クエリ:', searchQuery.substring(0, 100) + '...');
  } else {
    // 通常質問：代名詞チェックして文脈確保
    const pronouns = ['それ', 'これ', 'あれ', 'そこ', 'ここ', 'あそこ', 'その', 'この', 'あの'];
    const hasPronoun = pronouns.some(pronoun => latestQuestion.includes(pronoun));
    
    if (hasPronoun && userMessages.length > 1) {
      // 代名詞あり：最新2件で文脈確保
      const contextMessages = userMessages.slice(-2);
      searchQuery = contextMessages.join(' ');
      console.log('🔍 通常（代名詞あり） - 参照件数:', contextMessages.length);
    } else {
      // 代名詞なし：最新質問のみ
      searchQuery = latestQuestion;
      console.log('🔍 通常（代名詞なし） - 質問のみ使用');
    }
  }
  
  console.log('🔍 最終検索クエリ:', searchQuery.substring(0, 150) + (searchQuery.length > 150 ? '...' : ''));
  return searchQuery;
};

// チャット完了エンドポイント（RAG検索統合 + キャッシュ機能）
router.post("/chat", async (req, res) => {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 🚀 プロファイリング開始（開発環境のみ）
  if (process.env.ENABLE_DETAILED_PROFILING === 'true') {
    performanceProfiler.startProfiling(requestId, '/openai/chat', 'POST');
  }
  
  console.log('🚀 /openai/chat エンドポイントにリクエスト受信 [' + requestId + ']');
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
    
    // 💾 サーバーキャッシュチェック
    const cacheKey = `chat_${userQuestion}_${ragEnabled}`;
    const cachedResult = serverCache.get(cacheKey);
    
    if (cachedResult) {
      console.log('⚡ サーバーキャッシュから高速応答');
      return res.json({ 
        content: cachedResult.content,
        cached: true,
        optimizationStats: process.env.ENABLE_DETAILED_STATS === 'true' ? {
          server: serverCache.getStats(),
          embedding: embeddingCache.getStats(),
          vectorSearch: optimizedVectorSearch.getStats(),
          searchMetrics: null,
          dbPool: dbPool.getPoolStats()
        } : {
          simplified: true,
          cacheHit: true
        }
      });
    }
    
    // 最適化された検索クエリを生成
    const searchQuery = generateOptimalSearchQuery(messages, userQuestion);
    console.log('🚀 ユーザー質問:', userQuestion);
    console.log('🚀 検索クエリ（文脈結合後）:', searchQuery);
    console.log('🚀 RAG有効:', ragEnabled);

    // ⚡ 真の並列処理: AI応答とRAG検索を完全分離
    console.log('⚡ 並列処理開始: AI応答とRAG検索を同時実行');
    let ragContext = '';
    let searchMetrics = null;
    let aiResponse = null;
    
    // 🚀 Promise.allSettledで完全並列実行
    const parallelStart = performance.now();
    const [aiResult, ragResult] = await Promise.allSettled([
      // 🧠 AI応答を即座に開始（RAGコンテキストなし）
      generateImmediateAIResponse(messages, ragEnabled),
      
      // 🔍 並行してRAG検索実行
      ragEnabled && process.env.SUPABASE_URL && process.env.SUPABASE_KEY ? 
        performRAGSearch(searchQuery, userQuestion, requestId) : 
        Promise.resolve(null)
    ]);
    
    const parallelEnd = performance.now();
    console.log(`⚡ 並列処理完了: ${(parallelEnd - parallelStart).toFixed(2)}ms`);
    
    // 🧠 AI応答結果処理
    if (aiResult.status === 'fulfilled') {
      aiResponse = aiResult.value;
      console.log('✅ AI応答成功');
    } else {
      console.error('❌ AI応答失敗:', aiResult.reason);
      throw new Error('AI応答生成に失敗しました');
    }
    
    // 🔍 RAG検索結果処理
    if (ragResult.status === 'fulfilled' && ragResult.value) {
      const searchResult = ragResult.value;
      searchMetrics = searchResult.metrics;
      const results = searchResult.results;
      
      if (results && results.length > 0) {
        console.log('✅ RAG検索成功:', results.length, '件取得');
        ragContext = results.map((result, index) => {
          const metadata = result.metadata;
          const tags = [];
          if (metadata.isDefinition) tags.push('定義文');
          if (metadata.hasArticle) tags.push('条文');
          if (metadata.importance > 3) tags.push('重要');
          
          return `【文書${index + 1}】（類似度: ${(result.similarity * 100).toFixed(1)}%${tags.length > 0 ? '・' + tags.join('・') : ''}）\n${result.chunk}`;
        }).join('\n\n---\n\n');
      }
    } else if (ragResult.status === 'rejected') {
      console.warn('⚠️ RAG検索失敗（AI応答は利用可能）:', ragResult.reason);
    } else if (!ragEnabled) {
      console.log('🤖 RAG無効 - AI応答のみ使用');
    }
    
    // 📈 RAG情報があれば応答を強化
    if (ragEnabled && ragContext && aiResponse) {
      console.log('🔄 RAG情報でAI応答を強化中...');
      const enhancedResponse = await enhanceAIResponseWithRAG(aiResponse.content, ragContext);
      aiResponse.content = enhancedResponse;
      console.log('✅ RAG強化完了');
    }

    // 🧠 AI処理プロファイリング記録（開発環境のみ）
    if (process.env.ENABLE_DETAILED_PROFILING === 'true') {
      performanceProfiler.recordAIProcessing(
        requestId,
        'parallel_chat_completion',
        parallelEnd - parallelStart,
        undefined // 並列処理なので個別のトークン使用量は記録しない
      );
    }
    
    // 💾 成功した応答をサーバーキャッシュに保存
    const cacheData = {
      content: aiResponse.content,
      timestamp: Date.now(),
      ragContext: ragContext ? ragContext.substring(0, 200) + '...' : null
    };
    
    // RAG有効時は長めのキャッシュ、無効時は短めに設定
    const cacheTTL = ragEnabled ? 60 * 60 * 1000 : 30 * 60 * 1000; // 1時間 or 30分
    serverCache.set(cacheKey, cacheData, cacheTTL);
    console.log('💾 AI応答をサーバーキャッシュに保存しました');
    
    // 🏁 プロファイリング完了（開発環境のみ）
    const profileResult = process.env.ENABLE_DETAILED_PROFILING === 'true' ? 
      performanceProfiler.endProfiling(requestId, JSON.stringify(aiResponse).length) : null;
    
    // 応答に最適化統計を含める（軽量化）
    const responseData = {
      ...aiResponse,
      cached: false,
      optimizationStats: process.env.ENABLE_DETAILED_STATS === 'true' ? {
        server: serverCache.getStats(),
        embedding: embeddingCache.getStats(),
        vectorSearch: optimizedVectorSearch.getStats(),
        searchMetrics: searchMetrics,
        dbPool: dbPool.getPoolStats()
      } : {
        simplified: true,
        totalTime: profileResult?.request.totalTime || 0
      },
      performanceProfile: process.env.ENABLE_DETAILED_PROFILING === 'true' && profileResult ? {
        requestId: profileResult.requestId,
        totalTime: profileResult.request.totalTime,
        aiTime: profileResult.ai.chatCompletionTime,
        searchTime: profileResult.search.vectorSearchTime
      } : null
    };
    
    res.json(responseData);
  } catch (error: any) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    
    // ⚠️ エラープロファイリング記録（開発環境のみ）
    const profileResult = process.env.ENABLE_DETAILED_PROFILING === 'true' ? (() => {
      performanceProfiler.recordError(requestId, error, 'openai_api_error');
      return performanceProfiler.endProfiling(requestId, 0);
    })() : null;
    
    res.status(500).json({ 
      error: "AI応答エラー",
      details: error.response?.data?.error?.message || error.message,
      performanceProfile: profileResult ? {
        requestId: profileResult.requestId,
        totalTime: profileResult.request.totalTime,
        errorCount: profileResult.errors.length
      } : null
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