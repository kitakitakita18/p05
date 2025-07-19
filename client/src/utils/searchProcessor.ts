// 🔍 最適化された検索結果プロセッサー
export interface SearchResult {
  chunk?: string;
  content?: string;
  similarity: number;
  keywordScore?: number;
  combinedScore?: number;
  hasArticle?: boolean;
  isDefinition?: boolean;
  isHousingList?: boolean;
  processingTime?: number;
}

export interface ProcessedSearchResult extends SearchResult {
  relevantParts: string[];
  preview: string;
  scoreInfo: string;
  definitionInfo: string;
  articleInfo: string;
  housingInfo: string;
}

export interface SearchProcessorStats {
  totalProcessed: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  optimizationSavings: number;
}

class SearchResultProcessor {
  private cache: Map<string, ProcessedSearchResult[]> = new Map();
  private stats = {
    totalProcessed: 0,
    totalProcessingTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  // 🚀 高速化されたメイン処理関数
  async processResults(
    results: SearchResult[], 
    userInput: string,
    maxResults: number = 3
  ): Promise<ProcessedSearchResult[]> {
    const startTime = performance.now();
    
    // キャッシュキーを生成
    const cacheKey = this.generateCacheKey(results, userInput, maxResults);
    
    // キャッシュチェック
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      console.log('⚡ 検索結果処理キャッシュヒット');
      return cached;
    }
    
    this.stats.cacheMisses++;
    
    // 最適化されたフィルタリングとランキング
    const processedResults = await this.optimizedProcessing(results, userInput, maxResults);
    
    // キャッシュに保存（5分間）
    this.cache.set(cacheKey, processedResults);
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
    
    const processingTime = performance.now() - startTime;
    this.stats.totalProcessed++;
    this.stats.totalProcessingTime += processingTime;
    
    console.log(`🔍 検索結果処理完了: ${processingTime.toFixed(2)}ms`);
    return processedResults;
  }

  // 🎯 最適化された処理アルゴリズム
  private async optimizedProcessing(
    results: SearchResult[], 
    userInput: string, 
    maxResults: number
  ): Promise<ProcessedSearchResult[]> {
    
    // Phase 1: 高速な事前フィルタリング
    const preFiltered = this.fastPreFilter(results, userInput);
    
    // Phase 2: 並列スコア計算
    const scoredResults = await this.parallelScoring(preFiltered, userInput);
    
    // Phase 3: トップK選択とプレビュー生成
    const topResults = this.selectTopK(scoredResults, maxResults);
    
    // Phase 4: 詳細プレビュー生成（並列実行）
    const detailedResults = await this.generateDetailedPreviews(topResults, userInput);
    
    return detailedResults;
  }

  // 🚀 高速事前フィルタリング
  private fastPreFilter(results: SearchResult[], userInput: string): SearchResult[] {
    const keywords = this.extractKeywords(userInput);
    
    return results
      .filter(result => {
        const content = result.chunk || result.content || '';
        
        // 基本品質チェック
        if (content.length < 10) return false;
        if (result.similarity < 0.1) return false;
        
        // 高速キーワード存在チェック
        const contentLower = content.toLowerCase();
        const hasKeyword = keywords.some(keyword => contentLower.includes(keyword));
        
        return hasKeyword || result.similarity > 0.5;
      })
      .slice(0, 10); // 最大10件で処理負荷を制限
  }

  // ⚡ 並列スコア計算
  private async parallelScoring(
    results: SearchResult[], 
    userInput: string
  ): Promise<SearchResult[]> {
    const keywords = this.extractKeywords(userInput);
    
    // バッチ処理で並列実行
    const batchSize = 3;
    const batches: SearchResult[][] = [];
    
    for (let i = 0; i < results.length; i += batchSize) {
      batches.push(results.slice(i, i + batchSize));
    }
    
    const processedBatches = await Promise.all(
      batches.map(batch => this.processBatch(batch, keywords, userInput))
    );
    
    return processedBatches.flat();
  }

  // 📊 バッチ処理（非同期）
  private async processBatch(
    batch: SearchResult[], 
    keywords: string[], 
    userInput: string
  ): Promise<SearchResult[]> {
    return new Promise(resolve => {
      // マイクロタスクで実行してUIブロックを防ぐ
      setTimeout(() => {
        const processed = batch.map(result => this.calculateOptimizedScore(result, keywords, userInput));
        resolve(processed);
      }, 0);
    });
  }

  // 🎯 最適化されたスコア計算
  private calculateOptimizedScore(
    result: SearchResult, 
    keywords: string[], 
    userInput: string
  ): SearchResult {
    const chunk = result.chunk || result.content || '';
    const chunkLower = chunk.toLowerCase();
    
    // 高速パターン検出
    const patterns = this.detectPatternsOptimized(chunk);
    
    // 効率的なキーワードマッチング
    let keywordScore = 0;
    let matchedKeywords = 0;
    
    for (const keyword of keywords) {
      if (chunkLower.includes(keyword)) {
        matchedKeywords++;
        keywordScore += this.getKeywordWeight(keyword);
      }
    }
    
    // 複合キーワードボーナス
    if (matchedKeywords > 1) {
      keywordScore += matchedKeywords * 0.5;
    }
    
    // パターンベースボーナス
    if (patterns.isDefinition) keywordScore += 8.0;
    if (patterns.hasArticle && !patterns.isDefinition) keywordScore += 4.0;
    if (patterns.isHousingList && !patterns.hasArticle) keywordScore -= 2.0;
    
    // 質問タイプ別調整
    if (userInput.includes('とは') && !patterns.isDefinition) {
      keywordScore *= 0.7;
    }
    
    // 最終スコア計算
    const combinedScore = result.similarity * 0.3 + Math.max(0, keywordScore) * 0.7;
    
    return {
      ...result,
      keywordScore,
      combinedScore,
      hasArticle: patterns.hasArticle,
      isDefinition: patterns.isDefinition,
      isHousingList: patterns.isHousingList
    };
  }

  // 🚀 高速パターン検出
  private detectPatternsOptimized(text: string): {
    hasArticle: boolean;
    isDefinition: boolean;
    isHousingList: boolean;
  } {
    // 正規表現を事前コンパイル（クラス変数として保持すべきだが、ここでは簡略化）
    const articlePattern = /第\d+条/;
    const definitionPattern = /[一二三四五六七八九十]\s+[^。]+\s+[^。]*をいう|^\s*[一二三四五六七八九十]\s+/;
    const housingPattern = /別表第[3-4]|\d{3}号室|住戸番号/;
    
    return {
      hasArticle: articlePattern.test(text),
      isDefinition: definitionPattern.test(text),
      isHousingList: housingPattern.test(text)
    };
  }

  // 🎯 トップK選択（効率的な部分ソート）
  private selectTopK(results: SearchResult[], k: number): SearchResult[] {
    // クイックセレクトアルゴリズムの簡略版
    return results
      .filter(r => r.combinedScore! > 0)
      .sort((a, b) => b.combinedScore! - a.combinedScore!)
      .slice(0, k);
  }

  // 📝 詳細プレビュー生成（並列実行）
  private async generateDetailedPreviews(
    results: SearchResult[], 
    userInput: string
  ): Promise<ProcessedSearchResult[]> {
    const keywords = this.extractKeywords(userInput);
    
    const previews = await Promise.all(
      results.map(result => this.generatePreview(result, keywords))
    );
    
    return previews;
  }

  // 📝 単一プレビュー生成
  private async generatePreview(
    result: SearchResult, 
    keywords: string[]
  ): Promise<ProcessedSearchResult> {
    return new Promise(resolve => {
      setTimeout(() => {
        const chunk = result.chunk || result.content || 'コンテンツなし';
        const relevantParts = this.extractRelevantParts(chunk, keywords);
        
        let preview = '';
        if (relevantParts.length > 0) {
          preview = `🎯 ${relevantParts.slice(0, 2).join('\n')}`;
        } else {
          preview = chunk.length > 350 ? chunk.substring(0, 350) + '...' : chunk;
        }
        
        const scoreInfo = result.keywordScore! > 0 ? 
          ` [キーワード適合度: ${result.keywordScore!.toFixed(1)}]` : '';
        const definitionInfo = result.isDefinition ? ' [定義文]' : '';
        const articleInfo = result.hasArticle ? ' [条文]' : '';
        const housingInfo = result.isHousingList ? ' [住戸リスト]' : '';
        
        resolve({
          ...result,
          relevantParts,
          preview,
          scoreInfo,
          definitionInfo,
          articleInfo,
          housingInfo
        });
      }, 0);
    });
  }

  // 🔍 効率的なキーワード抽出
  private extractKeywords(userInput: string): string[] {
    return userInput
      .toLowerCase()
      .replace(/[とは？について教えてください何ですか]/g, '')
      .trim()
      .split(/\s+/)
      .filter(k => k.length > 1)
      .slice(0, 5); // 最大5キーワードで処理負荷を制限
  }

  // 📊 キーワード重み計算
  private getKeywordWeight(keyword: string): number {
    // 長いキーワードほど重要
    if (keyword.length >= 4) return 1.5;
    if (keyword.length >= 3) return 1.2;
    return 1.0;
  }

  // 🎯 関連部分抽出（最適化版）
  private extractRelevantParts(text: string, keywords: string[]): string[] {
    const parts: string[] = [];
    const textLower = text.toLowerCase();
    
    // 効率的な文分割
    const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
    
    for (const keyword of keywords) {
      if (!textLower.includes(keyword)) continue;
      
      // 番号付きリスト検索
      const numberedPattern = new RegExp(`[一二三四五六七八九十]{1,2}\\s+[^。]*${keyword}[^。]*`, 'gi');
      const numberedMatches = text.match(numberedPattern);
      if (numberedMatches) {
        parts.push(...numberedMatches.slice(0, 2)); // 最大2件
      }
      
      // 条文検索
      const articlePattern = new RegExp(`第\\d+条[^。]*${keyword}[^。]*`, 'gi');
      const articleMatches = text.match(articlePattern);
      if (articleMatches) {
        parts.push(...articleMatches.slice(0, 1)); // 最大1件
      }
      
      // 関連文章検索
      const relevantSentences = sentences
        .filter(s => s.toLowerCase().includes(keyword))
        .slice(0, 2); // 最大2件
      
      parts.push(...relevantSentences.map(s => s.trim() + '。'));
      
      // 過度な処理を防ぐため、キーワードあたりの検索を制限
      if (parts.length >= 6) break;
    }
    
    // 重複削除と制限
    return Array.from(new Set(parts)).slice(0, 4);
  }

  // キャッシュキー生成
  private generateCacheKey(results: SearchResult[], userInput: string, maxResults: number): string {
    const resultSignature = results.length > 0 ? 
      `${results.length}_${results[0].similarity?.toFixed(2)}` : 'empty';
    return `${userInput.toLowerCase().trim()}_${resultSignature}_${maxResults}`;
  }

  // 統計取得
  getStats(): SearchProcessorStats {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return {
      totalProcessed: this.stats.totalProcessed,
      averageProcessingTime: this.stats.totalProcessed > 0 ? 
        this.stats.totalProcessingTime / this.stats.totalProcessed : 0,
      cacheHitRate: total > 0 ? (this.stats.cacheHits / total * 100) : 0,
      optimizationSavings: this.stats.cacheHits * 50 // 1ヒットあたり50ms節約と仮定
    };
  }

  // キャッシュクリア
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 検索結果処理キャッシュをクリアしました');
  }
}

// シングルトンインスタンス
export const searchProcessor = new SearchResultProcessor();