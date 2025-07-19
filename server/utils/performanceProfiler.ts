// 🚀 サーバーサイド高性能プロファイラー
import { performance } from 'perf_hooks';
import os from 'os';
import { dbPool } from './databasePool';

export interface DetailedMetrics {
  timestamp: number;
  requestId: string;
  route: string;
  method: string;
  
  // 📊 リクエスト全体の性能
  request: {
    totalTime: number;
    startTime: number;
    endTime: number;
    contentLength: number;
    userAgent?: string;
  };
  
  // 🧠 AI処理性能
  ai: {
    embeddingTime: number;
    chatCompletionTime: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
  
  // 🔍 検索処理性能
  search: {
    vectorSearchTime: number;
    postProcessingTime: number;
    resultCount: number;
    cacheHit: boolean;
    similarity: number[];
  };
  
  // 🗄️ データベース性能
  database: {
    queries: {
      type: string;
      duration: number;
      cached: boolean;
    }[];
    totalTime: number;
    connectionTime: number;
  };
  
  // 💾 キャッシュ性能
  cache: {
    hits: number;
    misses: number;
    operations: {
      type: 'hit' | 'miss' | 'set';
      key: string;
      duration: number;
    }[];
  };
  
  // 🖥️ システムリソース
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    loadAverage: number[];
    uptime: number;
  };
  
  // ⚠️ エラー情報
  errors: {
    type: string;
    message: string;
    stack?: string;
    timestamp: number;
  }[];
}

class PerformanceProfiler {
  private activeProfiles: Map<string, Partial<DetailedMetrics>> = new Map();
  private completedProfiles: DetailedMetrics[] = [];
  private readonly MAX_PROFILES = 1000; // メモリ制限

  // 🚀 プロファイリング開始
  startProfiling(requestId: string, route: string, method: string): void {
    const startTime = performance.now();
    
    const profile: Partial<DetailedMetrics> = {
      timestamp: Date.now(),
      requestId,
      route,
      method,
      request: {
        totalTime: 0,
        startTime,
        endTime: 0,
        contentLength: 0
      },
      ai: {
        embeddingTime: 0,
        chatCompletionTime: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0
      },
      search: {
        vectorSearchTime: 0,
        postProcessingTime: 0,
        resultCount: 0,
        cacheHit: false,
        similarity: []
      },
      database: {
        queries: [],
        totalTime: 0,
        connectionTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        operations: []
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        loadAverage: os.loadavg(),
        uptime: process.uptime()
      },
      errors: []
    };
    
    this.activeProfiles.set(requestId, profile);
    console.log(`🚀 プロファイリング開始: ${requestId} [${route}]`);
  }

  // ⏱️ AI処理時間記録
  recordAIProcessing(
    requestId: string, 
    type: 'embedding' | 'chat_completion',
    duration: number,
    tokenUsage?: { prompt: number; completion: number; total: number }
  ): void {
    const profile = this.activeProfiles.get(requestId);
    if (!profile?.ai) return;

    if (type === 'embedding') {
      profile.ai.embeddingTime += duration;
    } else {
      profile.ai.chatCompletionTime += duration;
    }

    if (tokenUsage) {
      profile.ai.promptTokens += tokenUsage.prompt;
      profile.ai.completionTokens += tokenUsage.completion;
      profile.ai.totalTokens += tokenUsage.total;
    }

    console.log(`🧠 AI処理記録: ${type} = ${duration.toFixed(2)}ms [${requestId}]`);
  }

  // 🔍 検索処理時間記録
  recordSearchProcessing(
    requestId: string,
    vectorSearchTime: number,
    postProcessingTime: number,
    resultCount: number,
    cacheHit: boolean,
    similarities: number[]
  ): void {
    const profile = this.activeProfiles.get(requestId);
    if (!profile?.search) return;

    profile.search.vectorSearchTime = vectorSearchTime;
    profile.search.postProcessingTime = postProcessingTime;
    profile.search.resultCount = resultCount;
    profile.search.cacheHit = cacheHit;
    profile.search.similarity = similarities;

    console.log(`🔍 検索処理記録: vector=${vectorSearchTime.toFixed(2)}ms, post=${postProcessingTime.toFixed(2)}ms [${requestId}]`);
  }

  // 🗄️ データベースクエリ記録
  recordDatabaseQuery(
    requestId: string,
    queryType: string,
    duration: number,
    cached: boolean
  ): void {
    const profile = this.activeProfiles.get(requestId);
    if (!profile?.database) return;

    profile.database.queries.push({
      type: queryType,
      duration,
      cached
    });
    profile.database.totalTime += duration;

    console.log(`🗄️ DB処理記録: ${queryType} = ${duration.toFixed(2)}ms [${requestId}]`);
  }

  // 💾 キャッシュ操作記録
  recordCacheOperation(
    requestId: string,
    type: 'hit' | 'miss' | 'set',
    key: string,
    duration: number
  ): void {
    const profile = this.activeProfiles.get(requestId);
    if (!profile?.cache) return;

    profile.cache.operations.push({ type, key, duration });
    
    if (type === 'hit') {
      profile.cache.hits++;
    } else if (type === 'miss') {
      profile.cache.misses++;
    }

    console.log(`💾 キャッシュ記録: ${type} = ${duration.toFixed(2)}ms [${requestId}]`);
  }

  // ⚠️ エラー記録
  recordError(requestId: string, error: Error, type: string): void {
    const profile = this.activeProfiles.get(requestId);
    if (!profile?.errors) return;

    profile.errors.push({
      type,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });

    console.error(`⚠️ エラー記録: ${type} - ${error.message} [${requestId}]`);
  }

  // 🏁 プロファイリング完了
  endProfiling(requestId: string, contentLength: number = 0): DetailedMetrics | null {
    const profile = this.activeProfiles.get(requestId);
    if (!profile) {
      console.warn(`⚠️ プロファイルが見つかりません: ${requestId}`);
      return null;
    }

    const endTime = performance.now();
    const totalTime = endTime - (profile.request?.startTime || 0);

    // 最終データ更新
    if (profile.request) {
      profile.request.endTime = endTime;
      profile.request.totalTime = totalTime;
      profile.request.contentLength = contentLength;
    }

    // システムリソース更新
    if (profile.system) {
      profile.system.memoryUsage = process.memoryUsage();
      profile.system.cpuUsage = process.cpuUsage(profile.system.cpuUsage);
      profile.system.loadAverage = os.loadavg();
      profile.system.uptime = process.uptime();
    }

    const completedProfile = profile as DetailedMetrics;
    
    // 完了プロファイルに追加
    this.completedProfiles.push(completedProfile);
    this.activeProfiles.delete(requestId);

    // メモリ制限チェック
    if (this.completedProfiles.length > this.MAX_PROFILES) {
      this.completedProfiles = this.completedProfiles.slice(-this.MAX_PROFILES);
    }

    console.log(`🏁 プロファイリング完了: ${totalTime.toFixed(2)}ms [${requestId}]`);
    
    return completedProfile;
  }

  // 📊 性能サマリー取得
  getPerformanceSummary(timeWindow: number = 24 * 60 * 60 * 1000): any {
    const cutoff = Date.now() - timeWindow;
    const recentProfiles = this.completedProfiles.filter(p => p.timestamp > cutoff);

    if (recentProfiles.length === 0) {
      return { message: '期間内のデータがありません', timeWindow: timeWindow / 1000 / 60 / 60 + '時間' };
    }

    const summary = {
      timeWindow: timeWindow / 1000 / 60 / 60 + '時間',
      totalRequests: recentProfiles.length,
      
      // 応答時間統計
      responseTime: {
        avg: recentProfiles.reduce((sum, p) => sum + p.request.totalTime, 0) / recentProfiles.length,
        min: Math.min(...recentProfiles.map(p => p.request.totalTime)),
        max: Math.max(...recentProfiles.map(p => p.request.totalTime)),
        p95: this.calculatePercentile(recentProfiles.map(p => p.request.totalTime), 95),
        p99: this.calculatePercentile(recentProfiles.map(p => p.request.totalTime), 99)
      },

      // AI処理統計
      ai: {
        avgEmbeddingTime: recentProfiles.reduce((sum, p) => sum + p.ai.embeddingTime, 0) / recentProfiles.length,
        avgChatTime: recentProfiles.reduce((sum, p) => sum + p.ai.chatCompletionTime, 0) / recentProfiles.length,
        totalTokens: recentProfiles.reduce((sum, p) => sum + p.ai.totalTokens, 0),
        avgTokensPerRequest: recentProfiles.reduce((sum, p) => sum + p.ai.totalTokens, 0) / recentProfiles.length
      },

      // 検索処理統計
      search: {
        avgVectorSearchTime: recentProfiles.reduce((sum, p) => sum + p.search.vectorSearchTime, 0) / recentProfiles.length,
        avgPostProcessingTime: recentProfiles.reduce((sum, p) => sum + p.search.postProcessingTime, 0) / recentProfiles.length,
        cacheHitRate: recentProfiles.filter(p => p.search.cacheHit).length / recentProfiles.length * 100,
        avgResultCount: recentProfiles.reduce((sum, p) => sum + p.search.resultCount, 0) / recentProfiles.length
      },

      // データベース統計
      database: {
        avgTotalTime: recentProfiles.reduce((sum, p) => sum + p.database.totalTime, 0) / recentProfiles.length,
        avgQueriesPerRequest: recentProfiles.reduce((sum, p) => sum + p.database.queries.length, 0) / recentProfiles.length,
        cacheHitRate: this.calculateDbCacheHitRate(recentProfiles)
      },

      // キャッシュ統計
      cache: {
        totalHits: recentProfiles.reduce((sum, p) => sum + p.cache.hits, 0),
        totalMisses: recentProfiles.reduce((sum, p) => sum + p.cache.misses, 0),
        hitRate: this.calculateCacheHitRate(recentProfiles)
      },

      // エラー統計
      errors: {
        totalErrors: recentProfiles.reduce((sum, p) => sum + p.errors.length, 0),
        errorRate: recentProfiles.filter(p => p.errors.length > 0).length / recentProfiles.length * 100,
        errorTypes: this.analyzeErrorTypes(recentProfiles)
      },

      // システムリソース
      system: this.analyzeSystemResources(recentProfiles)
    };

    return summary;
  }

  // 📈 パーセンタイル計算
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // 🗄️ データベースキャッシュヒット率計算
  private calculateDbCacheHitRate(profiles: DetailedMetrics[]): number {
    let totalQueries = 0;
    let cachedQueries = 0;

    profiles.forEach(p => {
      p.database.queries.forEach(q => {
        totalQueries++;
        if (q.cached) cachedQueries++;
      });
    });

    return totalQueries > 0 ? (cachedQueries / totalQueries * 100) : 0;
  }

  // 💾 キャッシュヒット率計算
  private calculateCacheHitRate(profiles: DetailedMetrics[]): number {
    const totalHits = profiles.reduce((sum, p) => sum + p.cache.hits, 0);
    const totalMisses = profiles.reduce((sum, p) => sum + p.cache.misses, 0);
    const total = totalHits + totalMisses;
    
    return total > 0 ? (totalHits / total * 100) : 0;
  }

  // ⚠️ エラータイプ分析
  private analyzeErrorTypes(profiles: DetailedMetrics[]): Record<string, number> {
    const errorTypes: Record<string, number> = {};
    
    profiles.forEach(p => {
      p.errors.forEach(e => {
        errorTypes[e.type] = (errorTypes[e.type] || 0) + 1;
      });
    });

    return errorTypes;
  }

  // 🖥️ システムリソース分析
  private analyzeSystemResources(profiles: DetailedMetrics[]): any {
    if (profiles.length === 0) return {};

    const latestProfile = profiles[profiles.length - 1];
    const memUsage = latestProfile.system.memoryUsage;

    return {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      },
      loadAverage: latestProfile.system.loadAverage,
      uptime: Math.round(latestProfile.system.uptime / 60) + '分'
    };
  }

  // 🔍 詳細プロファイル検索
  getProfilesBy(filter: {
    route?: string;
    method?: string;
    minDuration?: number;
    maxDuration?: number;
    hasErrors?: boolean;
    timeFrom?: number;
    timeTo?: number;
  }): DetailedMetrics[] {
    return this.completedProfiles.filter(profile => {
      if (filter.route && profile.route !== filter.route) return false;
      if (filter.method && profile.method !== filter.method) return false;
      if (filter.minDuration && profile.request.totalTime < filter.minDuration) return false;
      if (filter.maxDuration && profile.request.totalTime > filter.maxDuration) return false;
      if (filter.hasErrors !== undefined && (profile.errors.length > 0) !== filter.hasErrors) return false;
      if (filter.timeFrom && profile.timestamp < filter.timeFrom) return false;
      if (filter.timeTo && profile.timestamp > filter.timeTo) return false;
      
      return true;
    });
  }

  // 🧹 古いプロファイルクリーンアップ
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    const beforeCount = this.completedProfiles.length;
    
    this.completedProfiles = this.completedProfiles.filter(p => p.timestamp > cutoff);
    
    const deletedCount = beforeCount - this.completedProfiles.length;
    if (deletedCount > 0) {
      console.log(`🧹 古いプロファイル ${deletedCount}件を削除しました`);
    }
    
    return deletedCount;
  }
}

// シングルトンインスタンス
export const performanceProfiler = new PerformanceProfiler();

// 定期クリーンアップ（1時間間隔）
setInterval(() => {
  performanceProfiler.cleanup();
}, 60 * 60 * 1000);