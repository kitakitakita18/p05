// 🚀 包括的性能ベンチマークツール
// ブラウザのコンソールで実行してください

console.log('🚀 包括的性能ベンチマーク開始');

// 📊 ベンチマーク設定
const BENCHMARK_CONFIG = {
  testQuestions: [
    // 短い質問（定義系）
    '管理費とは',
    '理事会について',
    '修繕積立金とは',
    
    // 中程度の質問（説明系）
    '管理費の支払い方法について教えて',
    '理事会の開催頻度は',
    '修繕積立金の使用目的は',
    
    // 長い質問（複合系）
    '理事会の役割と権限、開催頻度や議題の決め方について詳しく教えてください',
    '管理費と修繕積立金の違いや、それぞれの用途と支払い義務について説明してください',
    'マンション管理組合の運営方法や理事の選出方法について教えてください'
  ],
  iterations: 3,  // 各質問を3回実行
  cooldownTime: 2000,  // 質問間の間隔（ms）
  ragModes: [true, false]  // RAG有効/無効の両方をテスト
};

// 📈 性能測定結果格納
const benchmarkResults = {
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  results: [],
  summary: {
    totalTests: 0,
    avgResponseTime: 0,
    avgEmbeddingTime: 0,
    avgSearchTime: 0,
    cacheHitRate: 0,
    ragEnabled: 0,
    ragDisabled: 0
  }
};

// 🎯 個別性能測定関数
async function measureSingleQuery(question, ragEnabled, iteration) {
  console.log(`📝 テスト実行: "${question}" (RAG: ${ragEnabled ? '有効' : '無効'}, 回数: ${iteration + 1})`);
  
  const metrics = {
    question: question.substring(0, 50) + (question.length > 50 ? '...' : ''),
    ragEnabled,
    iteration: iteration + 1,
    
    // フロントエンド測定
    frontend: {
      startTime: 0,
      endTime: 0,
      totalTime: 0,
      uiUpdateTime: 0,
      renderTime: 0
    },
    
    // バックエンド測定 (APIレスポンスから取得)
    backend: {
      totalTime: 0,
      embeddingTime: 0,
      vectorSearchTime: 0,
      aiResponseTime: 0,
      cacheHit: false
    },
    
    // ネットワーク測定
    network: {
      requestTime: 0,
      responseTime: 0,
      transferSize: 0
    },
    
    // エラー情報
    errors: []
  };
  
  try {
    // フロントエンド測定開始
    metrics.frontend.startTime = performance.now();
    
    // RAG設定を切り替え
    const ragToggle = document.querySelector('input[type="checkbox"]');
    if (ragToggle) {
      ragToggle.checked = ragEnabled;
      ragToggle.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // UI更新時間測定
    const uiUpdateStart = performance.now();
    
    // 入力フィールドに質問を設定
    const inputField = document.querySelector('input[placeholder*="理事会"]');
    if (!inputField) {
      throw new Error('入力フィールドが見つかりません');
    }
    
    inputField.value = question;
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    
    metrics.frontend.uiUpdateTime = performance.now() - uiUpdateStart;
    
    // ネットワーク監視開始
    const networkStart = performance.now();
    
    // 送信ボタンをクリック
    const sendButton = document.querySelector('button[style*="007bff"]');
    if (!sendButton || sendButton.disabled) {
      throw new Error('送信ボタンが見つからないか無効です');
    }
    
    sendButton.click();
    
    // レスポンス完了まで待機
    const responseData = await waitForResponse();
    
    metrics.network.requestTime = performance.now() - networkStart;
    metrics.frontend.endTime = performance.now();
    metrics.frontend.totalTime = metrics.frontend.endTime - metrics.frontend.startTime;
    
    // バックエンド統計を抽出
    if (responseData && responseData.optimizationStats) {
      const stats = responseData.optimizationStats;
      
      if (stats.searchMetrics) {
        metrics.backend.totalTime = stats.searchMetrics.totalTime || 0;
        metrics.backend.embeddingTime = stats.searchMetrics.embeddingTime || 0;
        metrics.backend.vectorSearchTime = stats.searchMetrics.vectorSearchTime || 0;
        metrics.backend.cacheHit = stats.searchMetrics.cacheHit || false;
      }
      
      // キャッシュ統計
      if (responseData.cached) {
        metrics.backend.cacheHit = true;
        metrics.backend.totalTime = metrics.frontend.totalTime - metrics.network.requestTime;
      }
    }
    
    // 転送サイズ推定
    metrics.network.transferSize = JSON.stringify(responseData || {}).length;
    
    console.log(`✅ 測定完了: ${metrics.frontend.totalTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error(`❌ 測定エラー:`, error);
    metrics.errors.push(error.message);
  }
  
  return metrics;
}

// ⏳ レスポンス完了待機関数
function waitForResponse() {
  return new Promise((resolve, reject) => {
    let responseData = null;
    let checkCount = 0;
    const maxChecks = 100; // 最大50秒待機
    
    const checkCompletion = () => {
      checkCount++;
      
      // ローディング要素をチェック
      const loadingElements = document.querySelectorAll('[style*="考え中"]');
      const searchLoading = document.querySelectorAll('[style*="検索中"]');
      
      if (loadingElements.length === 0 && searchLoading.length === 0) {
        // 最新のメッセージからレスポンスデータを取得
        const performanceData = JSON.parse(localStorage.getItem('performanceData') || '[]');
        responseData = performanceData[performanceData.length - 1] || {};
        
        resolve(responseData);
      } else if (checkCount > maxChecks) {
        reject(new Error('レスポンス待機タイムアウト'));
      } else {
        setTimeout(checkCompletion, 500);
      }
    };
    
    setTimeout(checkCompletion, 1000); // 1秒後に開始
  });
}

// 🧮 統計計算関数
function calculateStatistics(results) {
  const validResults = results.filter(r => r.errors.length === 0);
  
  if (validResults.length === 0) {
    console.warn('⚠️ 有効な測定結果がありません');
    return;
  }
  
  const summary = benchmarkResults.summary;
  summary.totalTests = validResults.length;
  
  // 平均値計算
  summary.avgResponseTime = validResults.reduce((sum, r) => sum + r.frontend.totalTime, 0) / validResults.length;
  summary.avgEmbeddingTime = validResults.reduce((sum, r) => sum + (r.backend.embeddingTime || 0), 0) / validResults.length;
  summary.avgSearchTime = validResults.reduce((sum, r) => sum + (r.backend.vectorSearchTime || 0), 0) / validResults.length;
  
  // キャッシュヒット率
  const cacheHits = validResults.filter(r => r.backend.cacheHit).length;
  summary.cacheHitRate = (cacheHits / validResults.length * 100);
  
  // RAG有効/無効別統計
  const ragEnabledResults = validResults.filter(r => r.ragEnabled);
  const ragDisabledResults = validResults.filter(r => !r.ragEnabled);
  
  summary.ragEnabled = ragEnabledResults.length > 0 ? 
    ragEnabledResults.reduce((sum, r) => sum + r.frontend.totalTime, 0) / ragEnabledResults.length : 0;
  summary.ragDisabled = ragDisabledResults.length > 0 ? 
    ragDisabledResults.reduce((sum, r) => sum + r.frontend.totalTime, 0) / ragDisabledResults.length : 0;
}

// 📊 詳細分析レポート生成
function generateDetailedReport() {
  const results = benchmarkResults.results;
  const summary = benchmarkResults.summary;
  
  // パフォーマンス分布分析
  const responseTimes = results.map(r => r.frontend.totalTime).sort((a, b) => a - b);
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
  const p90 = responseTimes[Math.floor(responseTimes.length * 0.9)];
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
  
  // クエリタイプ別分析
  const shortQueries = results.filter(r => r.question.length <= 20);
  const mediumQueries = results.filter(r => r.question.length > 20 && r.question.length <= 40);
  const longQueries = results.filter(r => r.question.length > 40);
  
  const report = `
🚀 包括的性能ベンチマーク結果
=====================================
📅 実行日時: ${benchmarkResults.timestamp}
🌐 環境: ${navigator.userAgent.split(' ')[0]}
📊 総テスト数: ${summary.totalTests}回

⚡ 応答時間統計:
- 平均応答時間: ${summary.avgResponseTime.toFixed(2)}ms
- 中央値 (P50): ${p50?.toFixed(2) || 'N/A'}ms  
- 90パーセンタイル (P90): ${p90?.toFixed(2) || 'N/A'}ms
- 95パーセンタイル (P95): ${p95?.toFixed(2) || 'N/A'}ms

🔍 RAG機能別性能:
- RAG有効: ${summary.ragEnabled.toFixed(2)}ms
- RAG無効: ${summary.ragDisabled.toFixed(2)}ms
- RAGオーバーヘッド: ${(summary.ragEnabled - summary.ragDisabled).toFixed(2)}ms
- 性能差: ${((summary.ragEnabled - summary.ragDisabled) / summary.ragDisabled * 100).toFixed(1)}%

🧠 バックエンド処理:
- 平均Embedding時間: ${summary.avgEmbeddingTime.toFixed(2)}ms
- 平均検索時間: ${summary.avgSearchTime.toFixed(2)}ms
- キャッシュヒット率: ${summary.cacheHitRate.toFixed(1)}%

📏 クエリ長別性能:
- 短い質問 (≤20文字): ${shortQueries.length > 0 ? 
  (shortQueries.reduce((sum, r) => sum + r.frontend.totalTime, 0) / shortQueries.length).toFixed(2) : 'N/A'}ms
- 中程度の質問 (21-40文字): ${mediumQueries.length > 0 ? 
  (mediumQueries.reduce((sum, r) => sum + r.frontend.totalTime, 0) / mediumQueries.length).toFixed(2) : 'N/A'}ms
- 長い質問 (>40文字): ${longQueries.length > 0 ? 
  (longQueries.reduce((sum, r) => sum + r.frontend.totalTime, 0) / longQueries.length).toFixed(2) : 'N/A'}ms

🎯 ボトルネック分析:
${generateBottleneckAnalysis(results)}

💡 最適化推奨事項:
${generateOptimizationRecommendations(summary, results)}
`;

  return report;
}

// 🔍 ボトルネック分析
function generateBottleneckAnalysis(results) {
  const validResults = results.filter(r => r.errors.length === 0);
  if (validResults.length === 0) return '- データ不足により分析不可';
  
  const avgFrontend = validResults.reduce((sum, r) => sum + r.frontend.totalTime, 0) / validResults.length;
  const avgNetwork = validResults.reduce((sum, r) => sum + r.network.requestTime, 0) / validResults.length;
  const avgBackend = validResults.reduce((sum, r) => sum + (r.backend.totalTime || 0), 0) / validResults.length;
  const avgUI = validResults.reduce((sum, r) => sum + r.frontend.uiUpdateTime, 0) / validResults.length;
  
  const bottlenecks = [];
  
  if (avgNetwork / avgFrontend > 0.6) {
    bottlenecks.push(`- 🌐 ネットワーク遅延が主要ボトルネック (${(avgNetwork/avgFrontend*100).toFixed(1)}%)`);
  }
  
  if (avgBackend / avgFrontend > 0.4) {
    bottlenecks.push(`- 🖥️ バックエンド処理時間が長い (${(avgBackend/avgFrontend*100).toFixed(1)}%)`);
  }
  
  if (avgUI > 50) {
    bottlenecks.push(`- 🎨 UI更新処理が重い (${avgUI.toFixed(2)}ms)`);
  }
  
  return bottlenecks.length > 0 ? bottlenecks.join('\n') : '- 特に大きなボトルネックは検出されませんでした';
}

// 💡 最適化推奨事項生成
function generateOptimizationRecommendations(summary, results) {
  const recommendations = [];
  
  // 応答時間ベースの推奨
  if (summary.avgResponseTime > 2000) {
    recommendations.push('🚨 【高優先度】平均応答時間が2秒を超えています - 包括的な最適化が必要');
  } else if (summary.avgResponseTime > 1000) {
    recommendations.push('⚠️ 【中優先度】応答時間が1秒を超えています - 部分的最適化を推奨');
  }
  
  // キャッシュ効率ベースの推奨
  if (summary.cacheHitRate < 30) {
    recommendations.push('💾 キャッシュヒット率が低いです - キャッシュ戦略の見直しを推奨');
  }
  
  // RAGオーバーヘッドベースの推奨
  const ragOverhead = summary.ragEnabled - summary.ragDisabled;
  if (ragOverhead > 1500) {
    recommendations.push('🔍 RAG処理のオーバーヘッドが大きいです - ベクトル検索の更なる最適化を推奨');
  }
  
  // バックエンド処理ベースの推奨
  if (summary.avgEmbeddingTime > 500) {
    recommendations.push('🧠 Embedding生成時間が長いです - キャッシュ率向上やAPIレスポンス最適化を推奨');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 現在の性能は良好です - 継続的な監視を推奨');
  }
  
  return recommendations.join('\n');
}

// 🚀 メインベンチマーク実行関数
async function runComprehensiveBenchmark() {
  console.log('🚀 包括的ベンチマーク開始...');
  
  // 事前準備: キャッシュクリア
  if (typeof cacheService !== 'undefined') {
    cacheService.clear();
  }
  localStorage.removeItem('performanceData');
  
  const totalTests = BENCHMARK_CONFIG.testQuestions.length * 
                    BENCHMARK_CONFIG.iterations * 
                    BENCHMARK_CONFIG.ragModes.length;
  
  let completedTests = 0;
  
  for (const ragEnabled of BENCHMARK_CONFIG.ragModes) {
    console.log(`\n🔄 RAG${ragEnabled ? '有効' : '無効'}モードでテスト開始`);
    
    for (let iteration = 0; iteration < BENCHMARK_CONFIG.iterations; iteration++) {
      console.log(`\n📊 反復 ${iteration + 1}/${BENCHMARK_CONFIG.iterations}`);
      
      for (const question of BENCHMARK_CONFIG.testQuestions) {
        const result = await measureSingleQuery(question, ragEnabled, iteration);
        benchmarkResults.results.push(result);
        
        completedTests++;
        const progress = (completedTests / totalTests * 100).toFixed(1);
        console.log(`📈 進捗: ${progress}% (${completedTests}/${totalTests})`);
        
        // クールダウン時間
        if (completedTests < totalTests) {
          await new Promise(resolve => setTimeout(resolve, BENCHMARK_CONFIG.cooldownTime));
        }
      }
    }
  }
  
  // 統計計算
  calculateStatistics(benchmarkResults.results);
  
  // 結果表示
  const report = generateDetailedReport();
  console.log(report);
  
  // 結果をローカルストレージに保存
  localStorage.setItem('benchmarkResults', JSON.stringify(benchmarkResults));
  
  console.log('\n✅ ベンチマーク完了! 詳細結果はローカルストレージに保存されました。');
  console.log('📊 結果の確認: localStorage.getItem("benchmarkResults")');
  
  return benchmarkResults;
}

// 💎 詳細なパフォーマンスプロファイリング
async function runDetailedProfiling() {
  console.log('🔬 詳細パフォーマンスプロファイリング開始...');
  
  const profiling = {
    memoryUsage: {
      before: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      after: null
    },
    resourceTiming: [],
    userTiming: [],
    navigationTiming: performance.getEntriesByType('navigation')[0] || null
  };
  
  // Performance APIを使用した詳細測定
  performance.mark('profiling-start');
  
  // 1つの代表的な質問でプロファイリング
  const testQuestion = '管理費と修繕積立金の違いについて教えてください';
  console.log(`🧪 プロファイリング対象: "${testQuestion}"`);
  
  try {
    const result = await measureSingleQuery(testQuestion, true, 0);
    
    performance.mark('profiling-end');
    performance.measure('total-profiling', 'profiling-start', 'profiling-end');
    
    // メモリ使用量（後）
    profiling.memoryUsage.after = performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null;
    
    // リソースタイミング
    profiling.resourceTiming = performance.getEntriesByType('resource').slice(-10);
    
    // ユーザータイミング
    profiling.userTiming = performance.getEntriesByType('measure');
    
    console.log('🔬 詳細プロファイリング結果:', profiling);
    
  } catch (error) {
    console.error('❌ プロファイリングエラー:', error);
  }
  
  return profiling;
}

// 🎯 使用方法の表示
console.log(`
🚀 包括的性能ベンチマークツール使用方法:
=====================================

1. 基本ベンチマーク実行:
   runComprehensiveBenchmark()

2. 詳細プロファイリング:
   runDetailedProfiling()

3. 結果の確認:
   JSON.parse(localStorage.getItem('benchmarkResults'))

4. 簡易実行（テスト用）:
   BENCHMARK_CONFIG.iterations = 1;
   runComprehensiveBenchmark()

📊 ベンチマーク設定:
- テスト質問数: ${BENCHMARK_CONFIG.testQuestions.length}個
- 反復回数: ${BENCHMARK_CONFIG.iterations}回
- RAGモード: ${BENCHMARK_CONFIG.ragModes.length}種類
- 総テスト数: ${BENCHMARK_CONFIG.testQuestions.length * BENCHMARK_CONFIG.iterations * BENCHMARK_CONFIG.ragModes.length}回
- 推定実行時間: ${Math.ceil((BENCHMARK_CONFIG.testQuestions.length * BENCHMARK_CONFIG.iterations * BENCHMARK_CONFIG.ragModes.length * BENCHMARK_CONFIG.cooldownTime) / 1000 / 60)}分

⚠️ 注意: ベンチマーク実行中は他の操作を行わないでください。
`);