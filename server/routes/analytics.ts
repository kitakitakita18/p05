// 📊 最適化分析エンドポイント
import express from 'express';
import { dbPool } from '../utils/databasePool';
import { optimizedVectorSearch } from '../utils/optimizedVectorSearch';
import { performanceProfiler } from '../utils/performanceProfiler';

const router = express.Router();

// 🚀 データベース最適化統計エンドポイント
router.get('/db-stats', async (req, res) => {
  try {
    console.log('📊 データベース統計情報を取得中...');
    
    // 接続プール統計
    const poolStats = dbPool.getPoolStats();
    
    // 詳細メトリクス
    const detailedMetrics = dbPool.getDetailedMetrics();
    
    // ベクトル検索統計
    const vectorSearchStats = optimizedVectorSearch.getStats();
    
    // 最近の遅いクエリ（データベース最適化スクリプトで作成したビューを使用）
    const slowQueriesResult = await dbPool.getStats(
      `SELECT 
        query_type,
        avg_duration,
        max_duration,
        execution_count,
        cached_executions,
        avg_cache_hit_rate
      FROM v_slow_queries 
      ORDER BY avg_duration DESC 
      LIMIT 10`,
      []
    );
    
    // テーブルサイズ統計
    const tableSizesResult = await dbPool.getStats(
      `SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC`,
      []
    );

    // インデックス使用統計
    const indexUsageResult = await dbPool.getStats(
      `SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 20`,
      []
    );

    // プロファイラーからの包括的統計
    const profilerSummary = performanceProfiler.getPerformanceSummary(24 * 60 * 60 * 1000); // 24時間

    const response = {
      timestamp: new Date().toISOString(),
      databasePool: {
        connectionStats: poolStats,
        queryMetrics: detailedMetrics
      },
      vectorSearch: vectorSearchStats,
      performanceAnalysis: {
        slowQueries: slowQueriesResult.rows,
        tableSizes: tableSizesResult.rows,
        indexUsage: indexUsageResult.rows
      },
      comprehensiveProfiler: profilerSummary,
      recommendations: generateOptimizationRecommendations(poolStats, detailedMetrics, vectorSearchStats, profilerSummary)
    };

    console.log('✅ データベース統計情報取得完了');
    res.json(response);

  } catch (error) {
    console.error('❌ データベース統計取得エラー:', error);
    res.status(500).json({
      error: 'データベース統計の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🎯 リアルタイムパフォーマンス監視エンドポイント
router.get('/performance-monitor', async (req, res) => {
  try {
    console.log('📈 リアルタイムパフォーマンス監視データを取得中...');
    
    // アクティブな接続数
    const activeConnectionsResult = await dbPool.getStats(
      `SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity 
      WHERE datname = current_database()`,
      []
    );

    // 現在実行中のクエリ
    const runningQueriesResult = await dbPool.getStats(
      `SELECT 
        pid,
        state,
        query_start,
        EXTRACT(EPOCH FROM (now() - query_start)) as duration_seconds,
        left(query, 100) as query_preview
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND state = 'active' 
        AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY query_start ASC`,
      []
    );

    // 最近のパフォーマンス統計（過去1時間）
    const recentPerformanceResult = await dbPool.getStats(
      `SELECT 
        query_type,
        COUNT(*) as execution_count,
        AVG(query_duration_ms) as avg_duration,
        MAX(query_duration_ms) as max_duration,
        MIN(query_duration_ms) as min_duration,
        COUNT(*) FILTER (WHERE is_cached = true) as cached_executions
      FROM query_performance_stats 
      WHERE executed_at >= NOW() - INTERVAL '1 hour'
      GROUP BY query_type
      ORDER BY avg_duration DESC`,
      []
    );

    const response = {
      timestamp: new Date().toISOString(),
      connectionStatus: activeConnectionsResult.rows[0],
      runningQueries: runningQueriesResult.rows,
      recentPerformance: recentPerformanceResult.rows,
      databasePool: dbPool.getPoolStats(),
      vectorSearch: optimizedVectorSearch.getStats()
    };

    console.log('✅ リアルタイムパフォーマンス監視データ取得完了');
    res.json(response);

  } catch (error) {
    console.error('❌ パフォーマンス監視データ取得エラー:', error);
    res.status(500).json({
      error: 'パフォーマンス監視データの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🧹 最適化メンテナンス実行エンドポイント
router.post('/optimize', async (req, res) => {
  try {
    console.log('🔧 データベース最適化メンテナンス開始...');
    
    const maintenanceResults = [];
    
    // 1. 統計情報更新
    await dbPool.query('SELECT update_table_statistics()', [], {
      queryType: 'maintenance'
    });
    maintenanceResults.push('✅ テーブル統計情報を更新しました');

    // 2. 古いパフォーマンス統計クリーンアップ
    const cleanupResult = await dbPool.query('SELECT cleanup_old_performance_stats() as deleted_count', [], {
      queryType: 'maintenance'
    });
    const deletedCount = cleanupResult.rows[0]?.deleted_count || 0;
    maintenanceResults.push(`🧹 古いパフォーマンス統計 ${deletedCount}件を削除しました`);

    // 3. キャッシュクリア（オプション）
    if (req.body.clearCache) {
      dbPool.clearCache();
      optimizedVectorSearch.clearCache();
      maintenanceResults.push('🗑️ 全キャッシュをクリアしました');
    }

    // 4. インデックス使用状況チェック
    const unusedIndexesResult = await dbPool.getStats(
      `SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public' AND idx_scan = 0
      ORDER BY tablename, indexname`,
      []
    );

    if (unusedIndexesResult.rows.length > 0) {
      maintenanceResults.push(`⚠️ 使用されていないインデックス ${unusedIndexesResult.rows.length}個を発見しました`);
    }

    console.log('✅ データベース最適化メンテナンス完了');
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: maintenanceResults,
      unusedIndexes: unusedIndexesResult.rows,
      stats: {
        databasePool: dbPool.getPoolStats(),
        vectorSearch: optimizedVectorSearch.getStats()
      }
    });

  } catch (error) {
    console.error('❌ 最適化メンテナンスエラー:', error);
    res.status(500).json({
      error: '最適化メンテナンスに失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 💡 最適化推奨事項生成関数
function generateOptimizationRecommendations(
  poolStats: any, 
  detailedMetrics: any, 
  vectorStats: any,
  profilerSummary?: any
): string[] {
  const recommendations: string[] = [];

  // 接続プール分析
  if (poolStats.totalConnections > 15) {
    recommendations.push('🔧 接続プールサイズが大きいです。max設定を見直してください');
  }

  if (poolStats.waitingConnections > 5) {
    recommendations.push('⚠️ 待機中の接続が多いです。接続プールサイズを増やすことを検討してください');
  }

  // クエリパフォーマンス分析
  if (poolStats.averageQueryTime > 200) {
    recommendations.push('🐌 平均クエリ時間が遅いです。インデックスの追加を検討してください');
  }

  if (poolStats.slowQueries > poolStats.totalQueries * 0.1) {
    recommendations.push('📊 遅いクエリの割合が高いです。クエリの最適化が必要です');
  }

  // キャッシュ効率分析
  if (poolStats.cacheHitRate < 30) {
    recommendations.push('💾 データベースキャッシュヒット率が低いです。キャッシュTTLの調整を検討してください');
  }

  if (vectorStats.cacheHitRate < 50) {
    recommendations.push('🧠 ベクトル検索キャッシュ効率が低いです。類似クエリの検出精度を向上させてください');
  }

  // プロファイラー分析（利用可能な場合）
  if (profilerSummary && profilerSummary.totalRequests > 0) {
    if (profilerSummary.responseTime.avg > 2000) {
      recommendations.push('🚨 【緊急】平均応答時間が2秒を超えています - 即座に最適化が必要');
    }
    
    if (profilerSummary.ai.avgEmbeddingTime > 800) {
      recommendations.push('🧠 Embedding処理時間が長いです - キャッシュ効率の改善を推奨');
    }
    
    if (profilerSummary.search.cacheHitRate < 40) {
      recommendations.push('🔍 ベクトル検索キャッシュ効率が低いです - キャッシュ戦略の見直しを推奨');
    }
    
    if (profilerSummary.errors.errorRate > 5) {
      recommendations.push('⚠️ エラー率が高いです - エラーハンドリングの改善が必要');
    }
  }

  // 一般的な推奨事項
  if (recommendations.length === 0) {
    recommendations.push('✅ 現在のパフォーマンスは良好です。定期的な監視を継続してください');
  }

  return recommendations;
}

export default router;