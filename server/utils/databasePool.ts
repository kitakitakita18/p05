// 🚀 最適化されたデータベース接続プールとクエリ管理
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

interface QueryMetrics {
  queryType: string;
  duration: number;
  timestamp: number;
  isCached: boolean;
  params?: any;
}

interface PoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
}

class OptimizedDatabasePool {
  private pool: Pool;
  private queryCache: Map<string, { result: any, timestamp: number }> = new Map();
  private queryMetrics: QueryMetrics[] = [];
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分
  private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms以上は遅いクエリ
  private stats = {
    totalQueries: 0,
    totalQueryTime: 0,
    cacheHits: 0,
    slowQueries: 0
  };

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'mansion_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      
      // 🚀 接続プール最適化設定
      min: 2,                    // 最小接続数
      max: 20,                   // 最大接続数
      idleTimeoutMillis: 30000,  // アイドル接続タイムアウト (30秒)
      connectionTimeoutMillis: 2000, // 接続タイムアウト (2秒)
      
      // 📊 パフォーマンス最適化
      statement_timeout: 10000,   // クエリタイムアウト (10秒)
      query_timeout: 8000,        // クエリタイムアウト (8秒)
      
      // 🔧 接続設定
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // 📈 接続プールイベント設定
      log: (msg) => console.log('🐘 DB Pool:', msg)
    });

    this.setupPoolEventListeners();
    this.startPeriodicMaintenance();
  }

  // 🎧 プールイベントリスナー設定
  private setupPoolEventListeners(): void {
    this.pool.on('connect', (client) => {
      console.log('🔌 新しいデータベース接続が確立されました');
    });

    this.pool.on('acquire', (client) => {
      console.log('📋 データベース接続を取得しました');
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ データベースプールエラー:', err);
    });

    this.pool.on('remove', (client) => {
      console.log('🗑️ データベース接続が削除されました');
    });
  }

  // 🚀 最適化されたクエリ実行
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    options: {
      enableCache?: boolean;
      cacheKey?: string;
      queryType?: string;
    } = {}
  ): Promise<QueryResult<T>> {
    const {
      enableCache = false,
      cacheKey,
      queryType = 'general'
    } = options;

    const startTime = performance.now();
    const actualCacheKey = cacheKey || this.generateCacheKey(text, params);

    // 💾 キャッシュチェック
    if (enableCache) {
      const cached = this.queryCache.get(actualCacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('⚡ クエリキャッシュヒット:', queryType);
        this.stats.cacheHits++;
        
        this.recordMetrics({
          queryType,
          duration: performance.now() - startTime,
          timestamp: Date.now(),
          isCached: true,
          params
        });

        return cached.result;
      }
    }

    let client: PoolClient | undefined;
    
    try {
      // 📋 接続取得と実行
      client = await this.pool.connect();
      const result = await client.query<T>(text, params);
      
      const duration = performance.now() - startTime;

      // 📊 メトリクス記録
      this.recordMetrics({
        queryType,
        duration,
        timestamp: Date.now(),
        isCached: false,
        params
      });

      // 💾 結果をキャッシュに保存
      if (enableCache && result.rows.length > 0) {
        this.queryCache.set(actualCacheKey, {
          result: result,
          timestamp: Date.now()
        });
      }

      // ⚠️ 遅いクエリの警告
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 遅いクエリ検出: ${duration.toFixed(2)}ms - ${queryType}`);
        console.warn('🔍 クエリ:', text.substring(0, 100) + '...');
        this.stats.slowQueries++;
      }

      console.log(`💨 クエリ実行完了: ${duration.toFixed(2)}ms - ${queryType}`);
      return result;

    } catch (error) {
      console.error('❌ クエリ実行エラー:', {
        error: error instanceof Error ? error.message : error,
        queryType,
        query: text.substring(0, 100) + '...'
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // 🎯 特定用途向けクエリメソッド

  // 📊 統計情報取得用の高速クエリ
  async getStats<T extends QueryResultRow = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    return this.query<T>(query, params, {
      enableCache: true,
      queryType: 'stats',
      cacheKey: `stats_${this.generateCacheKey(query, params)}`
    });
  }

  // 🔍 検索用の最適化クエリ
  async search<T extends QueryResultRow = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    return this.query<T>(query, params, {
      enableCache: true,
      queryType: 'search',
      cacheKey: `search_${this.generateCacheKey(query, params)}`
    });
  }

  // ✏️ 書き込み用クエリ（キャッシュなし）
  async write<T extends QueryResultRow = any>(query: string, params?: any[]): Promise<QueryResult<T>> {
    // 書き込み後は関連キャッシュをクリア
    this.invalidateRelatedCache(query);
    
    return this.query<T>(query, params, {
      enableCache: false,
      queryType: 'write'
    });
  }

  // 🔄 トランザクション実行
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      console.log('✅ トランザクション完了');
      return result;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ トランザクションロールバック:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 📊 メトリクス記録
  private recordMetrics(metrics: QueryMetrics): void {
    this.stats.totalQueries++;
    this.stats.totalQueryTime += metrics.duration;
    
    this.queryMetrics.push(metrics);
    
    // メトリクス履歴を最新1000件に制限
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  // 🗝️ キャッシュキー生成
  private generateCacheKey(query: string, params?: any[]): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${query.replace(/\s+/g, ' ').trim()}_${paramsStr}`;
  }

  // 🗑️ 関連キャッシュ無効化
  private invalidateRelatedCache(query: string): void {
    const writeOps = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
    const isWriteOperation = writeOps.some(op => 
      query.toUpperCase().includes(op)
    );
    
    if (isWriteOperation) {
      const tableName = this.extractTableName(query);
      if (tableName) {
        for (const [key] of this.queryCache) {
          if (key.includes(tableName)) {
            this.queryCache.delete(key);
          }
        }
        console.log(`🧹 ${tableName}関連のキャッシュを無効化しました`);
      }
    }
  }

  // 📋 テーブル名抽出
  private extractTableName(query: string): string | null {
    const match = query.match(/(?:FROM|INTO|UPDATE|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    return match ? match[1].toLowerCase() : null;
  }

  // 📈 統計情報取得
  getPoolStats(): PoolStats {
    const avgQueryTime = this.stats.totalQueries > 0 ? 
      this.stats.totalQueryTime / this.stats.totalQueries : 0;
    
    const cacheHitRate = this.stats.totalQueries > 0 ?
      (this.stats.cacheHits / this.stats.totalQueries * 100) : 0;

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingConnections: this.pool.waitingCount,
      totalQueries: this.stats.totalQueries,
      averageQueryTime: Number(avgQueryTime.toFixed(2)),
      slowQueries: this.stats.slowQueries,
      cacheHitRate: Number(cacheHitRate.toFixed(2))
    };
  }

  // 📊 詳細メトリクス取得
  getDetailedMetrics() {
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    const recentMetrics = this.queryMetrics.filter(m => m.timestamp > last24h);
    
    const byType = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.queryType]) {
        acc[metric.queryType] = {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          cacheHits: 0
        };
      }
      
      acc[metric.queryType].count++;
      acc[metric.queryType].totalTime += metric.duration;
      if (metric.isCached) acc[metric.queryType].cacheHits++;
      
      return acc;
    }, {} as Record<string, any>);

    // 平均時間計算
    Object.keys(byType).forEach(type => {
      byType[type].avgTime = byType[type].totalTime / byType[type].count;
    });

    return {
      summary: this.getPoolStats(),
      byQueryType: byType,
      recentMetricsCount: recentMetrics.length,
      cacheSize: this.queryCache.size
    };
  }

  // 🧹 キャッシュクリア
  clearCache(): void {
    this.queryCache.clear();
    console.log('🧹 データベースクエリキャッシュをクリアしました');
  }

  // 🧹 期限切れキャッシュクリーンアップ
  private cleanupExpiredCache(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, value] of this.queryCache) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 期限切れクエリキャッシュ ${deletedCount}件を削除しました`);
    }
  }

  // 🔧 定期メンテナンス開始
  private startPeriodicMaintenance(): void {
    // 5分間隔でキャッシュクリーンアップ
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 5 * 60 * 1000);

    // 30分間隔で統計リセット（メモリ効率化）
    setInterval(() => {
      if (this.queryMetrics.length > 500) {
        this.queryMetrics = this.queryMetrics.slice(-500);
        console.log('📊 クエリメトリクス履歴を最適化しました');
      }
    }, 30 * 60 * 1000);
  }

  // 🔌 接続プール終了
  async close(): Promise<void> {
    await this.pool.end();
    console.log('🔌 データベース接続プールを終了しました');
  }
}

// シングルトンインスタンス
export const dbPool = new OptimizedDatabasePool();

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  console.log('🛑 プロセス終了中 - データベース接続を閉じています...');
  await dbPool.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 プロセス終了中 - データベース接続を閉じています...');
  await dbPool.close();
  process.exit(0);
});