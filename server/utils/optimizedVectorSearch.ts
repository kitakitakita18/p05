// 🚀 最適化されたベクトル検索システム
import { supabase } from './supabaseClient';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OptimizedSearchResult {
  id: string;
  chunk: string;
  similarity: number;
  metadata: {
    unionId: string;
    regulationName: string;
    chunkIndex: number;
    wordCount: number;
    hasArticle: boolean;
    isDefinition: boolean;
    importance: number;
  };
}

export interface SearchMetrics {
  totalTime: number;
  embeddingTime: number;
  vectorSearchTime: number;
  postProcessTime: number;
  cacheHit: boolean;
  resultsCount: number;
  filteredCount: number;
}

class OptimizedVectorSearchService {
  private embeddingCache: Map<string, { embedding: number[], timestamp: number }> = new Map();
  private searchCache: Map<string, { results: OptimizedSearchResult[], timestamp: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24時間
  private readonly SEARCH_CACHE_TTL = 30 * 60 * 1000; // 30分
  private stats = {
    totalSearches: 0,
    cacheHits: 0,
    averageSearchTime: 0,
    totalSearchTime: 0
  };

  // 🧠 最適化されたEmbedding生成（キャッシュ付き）
  private async getOptimizedEmbedding(text: string): Promise<number[]> {
    const normalizedText = this.normalizeText(text);
    const cached = this.embeddingCache.get(normalizedText);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('⚡ Embeddingキャッシュヒット');
      return cached.embedding;
    }

    const startTime = performance.now();
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: normalizedText,
      });
      
      const embedding = response.data[0].embedding;
      const embeddingTime = performance.now() - startTime;
      
      // キャッシュに保存
      this.embeddingCache.set(normalizedText, {
        embedding,
        timestamp: Date.now()
      });
      
      console.log(`🧠 Embedding生成完了: ${embeddingTime.toFixed(2)}ms`);
      return embedding;
      
    } catch (error) {
      console.error('❌ Embedding生成エラー:', error);
      throw new Error('Embedding生成に失敗しました');
    }
  }

  // 🔍 最適化されたベクトル検索
  async optimizedSearch(
    query: string,
    options: {
      threshold?: number;
      maxResults?: number;
      unionId?: string;
      prioritizeDefinitions?: boolean;
      enableCache?: boolean;
    } = {}
  ): Promise<{ results: OptimizedSearchResult[], metrics: SearchMetrics }> {
    const {
      threshold = 0.3,
      maxResults = 5,
      unionId,
      prioritizeDefinitions = true,
      enableCache = true
    } = options;

    const overallStartTime = performance.now();
    let embeddingTime = 0;
    let vectorSearchTime = 0;
    let postProcessTime = 0;
    let cacheHit = false;

    this.stats.totalSearches++;

    // 🗃️ 検索結果キャッシュチェック
    const cacheKey = this.generateCacheKey(query, options);
    if (enableCache) {
      const cached = this.searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_TTL) {
        console.log('⚡ 検索結果キャッシュヒット');
        this.stats.cacheHits++;
        cacheHit = true;
        
        return {
          results: cached.results,
          metrics: {
            totalTime: performance.now() - overallStartTime,
            embeddingTime: 0,
            vectorSearchTime: 0,
            postProcessTime: 0,
            cacheHit: true,
            resultsCount: cached.results.length,
            filteredCount: cached.results.length
          }
        };
      }
    }

    try {
      // 🧠 Phase 1: 最適化されたEmbedding生成
      const embeddingStartTime = performance.now();
      const queryEmbedding = await this.getOptimizedEmbedding(query);
      embeddingTime = performance.now() - embeddingStartTime;

      // 🔍 Phase 2: ベクトル検索実行
      const vectorSearchStartTime = performance.now();
      
      // 動的閾値調整（クエリの長さに基づく）
      const adjustedThreshold = this.calculateDynamicThreshold(query, threshold);
      
      // 多段階検索（まず緩い条件で検索、後で厳密にフィルタリング）
      const { data: rawResults, error } = await supabase.rpc('match_regulation_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: Math.max(adjustedThreshold - 0.1, 0.1), // より多くの候補を取得
        match_count: maxResults * 3, // 後でフィルタリングするため多めに取得
      });

      if (error) {
        throw new Error(`ベクトル検索エラー: ${error.message}`);
      }

      vectorSearchTime = performance.now() - vectorSearchStartTime;

      // 🎯 Phase 3: 高度な後処理とランキング
      const postProcessStartTime = performance.now();
      
      const optimizedResults = this.advancedPostProcessing(
        rawResults || [],
        query,
        {
          threshold: adjustedThreshold,
          maxResults,
          unionId,
          prioritizeDefinitions
        }
      );

      postProcessTime = performance.now() - postProcessStartTime;

      // 📊 統計更新
      const totalTime = performance.now() - overallStartTime;
      this.updateStats(totalTime);

      // 🗃️ 結果をキャッシュに保存
      if (enableCache && optimizedResults.length > 0) {
        this.searchCache.set(cacheKey, {
          results: optimizedResults,
          timestamp: Date.now()
        });
      }

      const metrics: SearchMetrics = {
        totalTime,
        embeddingTime,
        vectorSearchTime,
        postProcessTime,
        cacheHit,
        resultsCount: rawResults?.length || 0,
        filteredCount: optimizedResults.length
      };

      console.log(`🚀 最適化検索完了:`, {
        query: query.substring(0, 50) + '...',
        totalTime: `${totalTime.toFixed(2)}ms`,
        breakdown: {
          embedding: `${embeddingTime.toFixed(2)}ms`,
          vectorSearch: `${vectorSearchTime.toFixed(2)}ms`,
          postProcess: `${postProcessTime.toFixed(2)}ms`
        },
        results: optimizedResults.length
      });

      return { results: optimizedResults, metrics };

    } catch (error) {
      console.error('❌ 最適化検索エラー:', error);
      throw error;
    }
  }

  // 🎯 高度な後処理とランキング
  private advancedPostProcessing(
    rawResults: any[],
    query: string,
    options: {
      threshold: number;
      maxResults: number;
      unionId?: string;
      prioritizeDefinitions: boolean;
    }
  ): OptimizedSearchResult[] {
    const keywords = this.extractKeywords(query);
    
    return rawResults
      .map(result => {
        const chunk = result.chunk || '';
        const metadata = this.analyzeChunk(chunk, result);
        const enhancedScore = this.calculateEnhancedScore(
          result.similarity,
          chunk,
          keywords,
          options.prioritizeDefinitions
        );

        return {
          id: result.id,
          chunk,
          similarity: enhancedScore,
          metadata
        };
      })
      .filter(result => {
        // 多層フィルタリング
        if (result.similarity < options.threshold) return false;
        if (options.unionId && result.metadata.unionId !== options.unionId) return false;
        if (result.metadata.wordCount < 10) return false; // 極端に短い結果を除外
        return true;
      })
      .sort((a, b) => {
        // 複合ソート: 類似度 > 重要度 > 語数
        if (Math.abs(a.similarity - b.similarity) > 0.05) {
          return b.similarity - a.similarity;
        }
        if (a.metadata.importance !== b.metadata.importance) {
          return b.metadata.importance - a.metadata.importance;
        }
        return b.metadata.wordCount - a.metadata.wordCount;
      })
      .slice(0, options.maxResults);
  }

  // 📊 チャンク分析
  private analyzeChunk(chunk: string, rawResult: any) {
    const wordCount = chunk.length;
    const hasArticle = /第\d+条/.test(chunk);
    const isDefinition = /[一二三四五六七八九十]\s+[^。]+\s+[^。]*をいう/.test(chunk) ||
                        /^[一二三四五六七八九十]\s+/.test(chunk);
    
    // 重要度スコア計算
    let importance = 1;
    if (isDefinition) importance += 3;
    if (hasArticle) importance += 2;
    if (wordCount > 500) importance += 1;

    return {
      unionId: rawResult.unionid || '',
      regulationName: rawResult.regulationname || '',
      chunkIndex: 0, // TODO: 実装時に追加
      wordCount,
      hasArticle,
      isDefinition,
      importance
    };
  }

  // 🔢 強化スコア計算
  private calculateEnhancedScore(
    originalSimilarity: number,
    chunk: string,
    keywords: string[],
    prioritizeDefinitions: boolean
  ): number {
    let score = originalSimilarity;
    const chunkLower = chunk.toLowerCase();

    // キーワードマッチボーナス
    const matchedKeywords = keywords.filter(keyword => 
      chunkLower.includes(keyword.toLowerCase())
    );
    const keywordBonus = (matchedKeywords.length / Math.max(keywords.length, 1)) * 0.2;
    score += keywordBonus;

    // コンテンツタイプボーナス
    const isDefinition = /[一二三四五六七八九十]\s+[^。]+\s+[^。]*をいう/.test(chunk);
    const hasArticle = /第\d+条/.test(chunk);
    
    if (prioritizeDefinitions && isDefinition) {
      score += 0.3;
    }
    if (hasArticle) {
      score += 0.2;
    }

    // 完全性ボーナス（文章の完全性）
    if (chunk.includes('。') && chunk.length > 100) {
      score += 0.1;
    }

    return Math.min(score, 1.0); // 最大値1.0に制限
  }

  // 🎚️ 動的閾値計算
  private calculateDynamicThreshold(query: string, baseThreshold: number): number {
    const queryLength = query.length;
    
    // 短いクエリは厳しく、長いクエリは緩く
    if (queryLength < 10) {
      return Math.min(baseThreshold + 0.1, 0.8);
    } else if (queryLength > 50) {
      return Math.max(baseThreshold - 0.1, 0.2);
    }
    
    return baseThreshold;
  }

  // 🔤 テキスト正規化
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[？?。、]/g, '')
      .trim();
  }

  // 🗝️ キーワード抽出
  private extractKeywords(query: string): string[] {
    return query
      .replace(/[とは？について教えてください何ですか]/g, '')
      .trim()
      .split(/\s+/)
      .filter(k => k.length > 1)
      .slice(0, 10); // 最大10キーワード
  }

  // 🗃️ キャッシュキー生成
  private generateCacheKey(query: string, options: any): string {
    const normalized = this.normalizeText(query);
    const optionsStr = JSON.stringify(options);
    return `${normalized}_${optionsStr}`;
  }

  // 📊 統計更新
  private updateStats(searchTime: number): void {
    this.stats.totalSearchTime += searchTime;
    this.stats.averageSearchTime = this.stats.totalSearchTime / this.stats.totalSearches;
  }

  // 📈 統計取得
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalSearches > 0 ? 
        (this.stats.cacheHits / this.stats.totalSearches * 100) : 0,
      embeddingCacheSize: this.embeddingCache.size,
      searchCacheSize: this.searchCache.size
    };
  }

  // 🧹 キャッシュクリア
  clearCache(): void {
    this.embeddingCache.clear();
    this.searchCache.clear();
    console.log('🧹 ベクトル検索キャッシュをクリアしました');
  }

  // 🧹 期限切れキャッシュクリーンアップ
  cleanupExpiredCache(): void {
    const now = Date.now();
    
    // Embeddingキャッシュクリーンアップ
    for (const [key, value] of this.embeddingCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.embeddingCache.delete(key);
      }
    }
    
    // 検索結果キャッシュクリーンアップ
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.SEARCH_CACHE_TTL) {
        this.searchCache.delete(key);
      }
    }
    
    console.log('🧹 期限切れキャッシュクリーンアップ完了');
  }
}

// シングルトンインスタンス
export const optimizedVectorSearch = new OptimizedVectorSearchService();

// 定期クリーンアップ（30分間隔）
setInterval(() => {
  optimizedVectorSearch.cleanupExpiredCache();
}, 30 * 60 * 1000);