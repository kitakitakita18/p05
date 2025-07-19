// 🚀 回答速度退行テスト - 改善後の性能測定
const axios = require('axios');
const { performance } = require('perf_hooks');

// 📊 測定設定
const CONFIG = {
  baseURL: 'http://localhost:5105',
  testUser: {
    email: 'admin@mansion.com',
    password: 'password'
  },
  // より多様な質問でテスト
  testQuestions: [
    // 短い質問
    '管理費とは',
    '理事会について',
    '修繕積立金の用途',
    
    // 中程度の質問
    '管理組合の役割について教えて',
    '総会の決議とは何ですか',
    '専有部分の使用制限について',
    
    // 長い質問
    '管理費と修繕積立金の違いや使用目的について詳しく説明してください',
    'マンション管理組合の理事会の権限と責任について教えてください',
    '大規模修繕工事の実施手順と住民合意の取り方について'
  ],
  iterations: 2,
  ragModes: [true, false]
};

// 📈 性能結果格納
const speedTestResults = {
  timestamp: new Date().toISOString(),
  systemInfo: {
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage()
  },
  authentication: {
    loginTime: 0,
    success: false
  },
  performanceTests: [],
  summary: {
    totalTests: 0,
    avgResponseTime: 0,
    ragEnabledAvg: 0,
    ragDisabledAvg: 0,
    ragOverhead: 0,
    successRate: 0,
    regression: {
      detected: false,
      severity: 'none',
      details: []
    }
  }
};

// 🔐 認証（高速測定）
async function quickAuth() {
  console.log('🔐 高速認証テスト...');
  const startTime = performance.now();
  
  try {
    const response = await axios.post(`${CONFIG.baseURL}/api/auth/login`, CONFIG.testUser, {
      timeout: 5000
    });
    const endTime = performance.now();
    
    speedTestResults.authentication.loginTime = endTime - startTime;
    speedTestResults.authentication.success = response.status === 200;
    
    console.log(`✅ 認証完了: ${speedTestResults.authentication.loginTime.toFixed(2)}ms`);
    return response.data.token;
    
  } catch (error) {
    console.error('❌ 認証失敗:', error.message);
    return null;
  }
}

// ⚡ 高速性能テスト
async function speedTest(token, question, ragEnabled, iteration) {
  const testId = `${question.substring(0, 15)}_${ragEnabled ? 'RAG' : 'STD'}_${iteration}`;
  console.log(`⚡ ${testId}...`);
  
  const result = {
    id: testId,
    question: question,
    ragEnabled: ragEnabled,
    iteration: iteration + 1,
    
    // タイミング測定
    timing: {
      networkStart: 0,
      networkEnd: 0,
      totalTime: 0,
      serverProcessingTime: 0
    },
    
    // 応答データ
    response: {
      success: false,
      cached: false,
      contentLength: 0,
      httpStatus: 0
    },
    
    // パフォーマンス詳細
    performance: {
      aiTime: 0,
      searchTime: 0,
      embeddingTime: 0,
      vectorSearchTime: 0,
      postProcessTime: 0
    },
    
    error: null
  };
  
  try {
    // ネットワーク測定開始
    result.timing.networkStart = performance.now();
    
    const response = await axios.post(
      `${CONFIG.baseURL}/api/openai/chat`,
      {
        messages: [{ role: 'user', content: question }],
        ragEnabled: ragEnabled
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        // 詳細タイミング測定のため
        validateStatus: () => true
      }
    );
    
    result.timing.networkEnd = performance.now();
    result.timing.totalTime = result.timing.networkEnd - result.timing.networkStart;
    
    // レスポンス分析
    result.response.success = response.status === 200;
    result.response.httpStatus = response.status;
    result.response.cached = response.data?.cached || false;
    result.response.contentLength = JSON.stringify(response.data || {}).length;
    
    // サーバーサイドパフォーマンス抽出
    if (response.data?.performanceProfile) {
      const profile = response.data.performanceProfile;
      result.timing.serverProcessingTime = profile.totalTime || 0;
      result.performance.aiTime = profile.aiTime || 0;
      result.performance.searchTime = profile.searchTime || 0;
    }
    
    // 最適化統計の抽出
    if (response.data?.optimizationStats) {
      const stats = response.data.optimizationStats;
      if (stats.searchMetrics) {
        result.performance.embeddingTime = stats.searchMetrics.embeddingTime || 0;
        result.performance.vectorSearchTime = stats.searchMetrics.vectorSearchTime || 0;
        result.performance.postProcessTime = stats.searchMetrics.postProcessTime || 0;
      }
    }
    
    // 結果表示
    const statusIcon = result.response.success ? '✅' : '❌';
    const cacheIcon = result.response.cached ? '💾' : '🆕';
    
    console.log(`${statusIcon} ${testId}: ${result.timing.totalTime.toFixed(0)}ms ${cacheIcon}`);
    
    // パフォーマンス詳細ログ
    if (result.performance.aiTime > 0) {
      console.log(`   └─ AI:${result.performance.aiTime.toFixed(0)}ms, 検索:${result.performance.vectorSearchTime.toFixed(0)}ms`);
    }
    
  } catch (error) {
    result.timing.networkEnd = performance.now();
    result.timing.totalTime = result.timing.networkEnd - result.timing.networkStart;
    result.error = error.message;
    
    console.error(`❌ ${testId}: ${error.message} (${result.timing.totalTime.toFixed(0)}ms)`);
  }
  
  return result;
}

// 📊 詳細統計計算
function calculateDetailedStats() {
  const tests = speedTestResults.performanceTests;
  const successfulTests = tests.filter(t => t.response.success);
  
  if (successfulTests.length === 0) {
    console.warn('⚠️ 成功したテストがありません');
    return;
  }
  
  const summary = speedTestResults.summary;
  summary.totalTests = tests.length;
  summary.successRate = (successfulTests.length / tests.length) * 100;
  
  // 基本統計
  const responseTimes = successfulTests.map(t => t.timing.totalTime);
  summary.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  
  // RAG有効/無効別統計
  const ragEnabledTests = successfulTests.filter(t => t.ragEnabled);
  const ragDisabledTests = successfulTests.filter(t => !t.ragEnabled);
  
  summary.ragEnabledAvg = ragEnabledTests.length > 0 ? 
    ragEnabledTests.reduce((sum, t) => sum + t.timing.totalTime, 0) / ragEnabledTests.length : 0;
  summary.ragDisabledAvg = ragDisabledTests.length > 0 ? 
    ragDisabledTests.reduce((sum, t) => sum + t.timing.totalTime, 0) / ragDisabledTests.length : 0;
  
  summary.ragOverhead = summary.ragEnabledAvg - summary.ragDisabledAvg;
  
  // 退行検出
  detectPerformanceRegression(summary, successfulTests);
}

// 🚨 性能退行検出
function detectPerformanceRegression(summary, tests) {
  const regression = summary.regression;
  const issues = [];
  
  // 基準値（以前の測定から）
  const BASELINE = {
    avgResponseTime: 5500, // 前回測定の平均
    ragOverhead: 2300,     // 前回のRAGオーバーヘッド
    successRate: 100       // 期待成功率
  };
  
  // 平均応答時間の退行チェック
  if (summary.avgResponseTime > BASELINE.avgResponseTime * 1.2) {
    regression.detected = true;
    regression.severity = 'high';
    issues.push(`平均応答時間が20%以上悪化: ${summary.avgResponseTime.toFixed(0)}ms (基準: ${BASELINE.avgResponseTime}ms)`);
  } else if (summary.avgResponseTime > BASELINE.avgResponseTime * 1.1) {
    regression.detected = true;
    regression.severity = regression.severity === 'high' ? 'high' : 'medium';
    issues.push(`平均応答時間が10%以上悪化: ${summary.avgResponseTime.toFixed(0)}ms (基準: ${BASELINE.avgResponseTime}ms)`);
  }
  
  // RAGオーバーヘッドの退行チェック
  if (summary.ragOverhead > BASELINE.ragOverhead * 1.3) {
    regression.detected = true;
    regression.severity = 'high';
    issues.push(`RAGオーバーヘッドが30%以上増加: ${summary.ragOverhead.toFixed(0)}ms (基準: ${BASELINE.ragOverhead}ms)`);
  }
  
  // 成功率の退行チェック
  if (summary.successRate < BASELINE.successRate * 0.9) {
    regression.detected = true;
    regression.severity = 'high';
    issues.push(`成功率が10%以上低下: ${summary.successRate.toFixed(1)}% (基準: ${BASELINE.successRate}%)`);
  }
  
  // 異常に遅いテストの検出
  const slowTests = tests.filter(t => t.timing.totalTime > 10000);
  if (slowTests.length > 0) {
    regression.detected = true;
    issues.push(`10秒以上の異常に遅いテスト: ${slowTests.length}件`);
  }
  
  regression.details = issues;
  
  if (!regression.detected) {
    regression.severity = 'none';
    regression.details = ['性能退行は検出されませんでした'];
  }
}

// 📈 詳細レポート生成
function generateSpeedReport() {
  const summary = speedTestResults.summary;
  const auth = speedTestResults.authentication;
  const regression = summary.regression;
  
  const regressionIcon = regression.detected ? 
    (regression.severity === 'high' ? '🚨' : '⚠️') : '✅';
  
  console.log(`
🚀 回答速度退行テスト結果
=====================================
📅 実行日時: ${speedTestResults.timestamp}
🖥️ 環境: ${speedTestResults.systemInfo.platform} ${speedTestResults.systemInfo.nodeVersion}

🔐 認証性能:
- ログイン時間: ${auth.loginTime.toFixed(2)}ms ${auth.loginTime < 200 ? '✅' : '⚠️'}

💬 回答速度統計:
- 総テスト数: ${summary.totalTests}回
- 成功率: ${summary.successRate.toFixed(1)}% ${summary.successRate >= 95 ? '✅' : '🚨'}
- 平均応答時間: ${summary.avgResponseTime.toFixed(0)}ms
- RAG有効: ${summary.ragEnabledAvg.toFixed(0)}ms
- RAG無効: ${summary.ragDisabledAvg.toFixed(0)}ms
- RAGオーバーヘッド: ${summary.ragOverhead.toFixed(0)}ms

${regressionIcon} 性能退行分析 (${regression.severity}):
${regression.details.map(detail => `- ${detail}`).join('\n')}

📊 詳細テスト結果:
${speedTestResults.performanceTests.slice(0, 10).map(test => {
  const icon = test.response.success ? '✅' : '❌';
  const cache = test.response.cached ? '[キャッシュ]' : '[新規]';
  return `${icon} ${test.id}: ${test.timing.totalTime.toFixed(0)}ms ${cache}`;
}).join('\n')}
${speedTestResults.performanceTests.length > 10 ? `... 他${speedTestResults.performanceTests.length - 10}件` : ''}

💡 推奨対応:
${generateActionItems(regression)}
`);
}

// 💡 対応アクション生成
function generateActionItems(regression) {
  if (!regression.detected) {
    return '- 現在の性能は良好です。継続的な監視を推奨します。';
  }
  
  const actions = [];
  
  if (regression.severity === 'high') {
    actions.push('🚨 緊急対応が必要です');
    actions.push('- 最新の変更を確認し、性能に影響する修正を特定');
    actions.push('- プロファイリングツールで詳細分析を実行');
    actions.push('- 必要に応じて変更をロールバック');
  }
  
  actions.push('- OpenAI API設定の最適化確認');
  actions.push('- データベースクエリの実行計画分析');
  actions.push('- キャッシュ効率の確認');
  actions.push('- 並列処理の実装確認');
  
  return actions.join('\n');
}

// 🚀 メイン実行関数
async function runSpeedRegressionTest() {
  console.log('🚀 回答速度退行テスト開始...');
  console.log(`📊 テスト対象: ${CONFIG.testQuestions.length}種類の質問 × ${CONFIG.iterations}回 × RAG有無 = ${CONFIG.testQuestions.length * CONFIG.iterations * 2}回`);
  
  // 1. 高速認証
  const token = await quickAuth();
  if (!token) {
    console.error('❌ 認証失敗により測定を中止します');
    return;
  }
  
  // 2. 速度テスト実行
  console.log('\n⚡ 速度測定実行中...');
  
  for (const ragEnabled of CONFIG.ragModes) {
    const modeLabel = ragEnabled ? 'RAG有効' : 'RAG無効';
    console.log(`\n🔄 ${modeLabel}モード測定中...`);
    
    for (let iteration = 0; iteration < CONFIG.iterations; iteration++) {
      for (const question of CONFIG.testQuestions) {
        const result = await speedTest(token, question, ragEnabled, iteration);
        speedTestResults.performanceTests.push(result);
        
        // 負荷軽減のための短い待機
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // 3. 統計計算と分析
  calculateDetailedStats();
  generateSpeedReport();
  
  // 4. 結果保存
  const fs = require('fs');
  fs.writeFileSync(
    'speed-regression-results.json', 
    JSON.stringify(speedTestResults, null, 2)
  );
  
  console.log('\n✅ 速度退行テスト完了! 結果をspeed-regression-results.jsonに保存しました。');
  
  return speedTestResults;
}

// 実行
if (require.main === module) {
  runSpeedRegressionTest().catch(console.error);
}

module.exports = { runSpeedRegressionTest, speedTestResults };