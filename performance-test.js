// 🚀 性能測定スクリプト - サーバーサイド性能テスト
const axios = require('axios');
const { performance } = require('perf_hooks');

// 📊 測定設定
const CONFIG = {
  baseURL: 'http://localhost:5105',
  testUser: {
    email: 'admin@mansion.com',
    password: 'password'
  },
  testQuestions: [
    '管理費とは',
    '理事会について教えて',
    '修繕積立金の用途は',
    '管理組合の役割について詳しく教えてください',
    'マンション管理の基本的なルールを説明してください'
  ],
  iterations: 2,
  ragModes: [true, false]
};

// 📈 性能結果格納
const performanceResults = {
  timestamp: new Date().toISOString(),
  authentication: {
    loginTime: 0,
    success: false
  },
  chatAPI: {
    tests: [],
    summary: {
      totalTests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      ragEnabledAvg: 0,
      ragDisabledAvg: 0,
      successRate: 0
    }
  },
  systemMetrics: {
    startTime: Date.now(),
    endTime: 0,
    totalDuration: 0
  }
};

// 🔐 認証テスト
async function testAuthentication() {
  console.log('🔐 認証性能テスト開始...');
  const startTime = performance.now();
  
  try {
    const response = await axios.post(`${CONFIG.baseURL}/api/auth/login`, CONFIG.testUser);
    const endTime = performance.now();
    
    performanceResults.authentication.loginTime = endTime - startTime;
    performanceResults.authentication.success = response.status === 200;
    
    console.log(`✅ 認証成功: ${performanceResults.authentication.loginTime.toFixed(2)}ms`);
    return response.data.token;
    
  } catch (error) {
    console.error('❌ 認証失敗:', error.message);
    return null;
  }
}

// 💬 チャットAPI性能テスト
async function testChatAPI(token, question, ragEnabled, iteration) {
  const testId = `${question.substring(0, 10)}_rag${ragEnabled ? 'ON' : 'OFF'}_${iteration + 1}`;
  console.log(`📝 テスト実行: ${testId}`);
  
  const testResult = {
    id: testId,
    question: question,
    ragEnabled: ragEnabled,
    iteration: iteration + 1,
    startTime: 0,
    endTime: 0,
    responseTime: 0,
    success: false,
    responseSize: 0,
    cached: false,
    backendMetrics: {
      aiTime: 0,
      searchTime: 0,
      totalTime: 0
    },
    error: null
  };
  
  try {
    const startTime = performance.now();
    testResult.startTime = startTime;
    
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
        timeout: 30000 // 30秒タイムアウト
      }
    );
    
    const endTime = performance.now();
    testResult.endTime = endTime;
    testResult.responseTime = endTime - startTime;
    testResult.success = response.status === 200;
    testResult.responseSize = JSON.stringify(response.data).length;
    testResult.cached = response.data.cached || false;
    
    // バックエンドメトリクス抽出
    if (response.data.performanceProfile) {
      const profile = response.data.performanceProfile;
      testResult.backendMetrics.aiTime = profile.aiTime || 0;
      testResult.backendMetrics.searchTime = profile.searchTime || 0;
      testResult.backendMetrics.totalTime = profile.totalTime || 0;
    }
    
    console.log(`✅ ${testId}: ${testResult.responseTime.toFixed(2)}ms (${testResult.cached ? 'キャッシュ' : '新規'})`);
    
  } catch (error) {
    const endTime = performance.now();
    testResult.endTime = endTime;
    testResult.responseTime = endTime - testResult.startTime;
    testResult.error = error.message;
    
    console.error(`❌ ${testId}: ${error.message}`);
  }
  
  return testResult;
}

// 📊 統計計算
function calculateStatistics() {
  const tests = performanceResults.chatAPI.tests;
  const successfulTests = tests.filter(t => t.success);
  
  if (successfulTests.length === 0) {
    console.warn('⚠️ 成功したテストがありません');
    return;
  }
  
  const summary = performanceResults.chatAPI.summary;
  summary.totalTests = tests.length;
  summary.successRate = (successfulTests.length / tests.length) * 100;
  
  // 応答時間統計
  const responseTimes = successfulTests.map(t => t.responseTime);
  summary.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  summary.minResponseTime = Math.min(...responseTimes);
  summary.maxResponseTime = Math.max(...responseTimes);
  
  // RAG有効/無効別統計
  const ragEnabledTests = successfulTests.filter(t => t.ragEnabled);
  const ragDisabledTests = successfulTests.filter(t => !t.ragEnabled);
  
  summary.ragEnabledAvg = ragEnabledTests.length > 0 ? 
    ragEnabledTests.reduce((sum, t) => sum + t.responseTime, 0) / ragEnabledTests.length : 0;
  summary.ragDisabledAvg = ragDisabledTests.length > 0 ? 
    ragDisabledTests.reduce((sum, t) => sum + t.responseTime, 0) / ragDisabledTests.length : 0;
}

// 📈 詳細レポート生成
function generateDetailedReport() {
  const summary = performanceResults.chatAPI.summary;
  const auth = performanceResults.authentication;
  
  console.log(`
🚀 性能測定結果レポート
=====================================
📅 実行日時: ${performanceResults.timestamp}
⏱️ 総実行時間: ${performanceResults.systemMetrics.totalDuration.toFixed(2)}ms

🔐 認証性能:
- ログイン時間: ${auth.loginTime.toFixed(2)}ms
- 認証成功: ${auth.success ? '✅' : '❌'}

💬 チャットAPI性能:
- 総テスト数: ${summary.totalTests}回
- 成功率: ${summary.successRate.toFixed(1)}%
- 平均応答時間: ${summary.averageResponseTime.toFixed(2)}ms
- 最速応答: ${summary.minResponseTime.toFixed(2)}ms
- 最遅応答: ${summary.maxResponseTime.toFixed(2)}ms

🔍 RAG機能比較:
- RAG有効時: ${summary.ragEnabledAvg.toFixed(2)}ms
- RAG無効時: ${summary.ragDisabledAvg.toFixed(2)}ms
- RAGオーバーヘッド: ${(summary.ragEnabledAvg - summary.ragDisabledAvg).toFixed(2)}ms
- 性能差: ${((summary.ragEnabledAvg - summary.ragDisabledAvg) / summary.ragDisabledAvg * 100).toFixed(1)}%

📊 詳細テスト結果:
${performanceResults.chatAPI.tests.map(test => 
  `- ${test.id}: ${test.responseTime.toFixed(2)}ms ${test.success ? '✅' : '❌'} ${test.cached ? '[キャッシュ]' : '[新規]'}`
).join('\n')}

💡 性能評価:
${generatePerformanceEvaluation(summary)}
`);
}

// 💡 性能評価と推奨事項
function generatePerformanceEvaluation(summary) {
  const evaluations = [];
  
  if (summary.averageResponseTime < 1000) {
    evaluations.push('✅ 優秀: 平均応答時間が1秒未満');
  } else if (summary.averageResponseTime < 2000) {
    evaluations.push('⚠️ 普通: 平均応答時間が1-2秒');
  } else {
    evaluations.push('🚨 要改善: 平均応答時間が2秒以上');
  }
  
  if (summary.successRate >= 95) {
    evaluations.push('✅ 高信頼性: 成功率95%以上');
  } else if (summary.successRate >= 90) {
    evaluations.push('⚠️ 中信頼性: 成功率90-95%');
  } else {
    evaluations.push('🚨 低信頼性: 成功率90%未満');
  }
  
  const ragOverhead = summary.ragEnabledAvg - summary.ragDisabledAvg;
  if (ragOverhead < 500) {
    evaluations.push('✅ RAG効率良好: オーバーヘッド0.5秒未満');
  } else if (ragOverhead < 1000) {
    evaluations.push('⚠️ RAG効率普通: オーバーヘッド0.5-1秒');
  } else {
    evaluations.push('🚨 RAG効率要改善: オーバーヘッド1秒以上');
  }
  
  return evaluations.join('\n');
}

// 🚀 メイン実行関数
async function runPerformanceTest() {
  console.log('🚀 包括的性能測定開始...');
  performanceResults.systemMetrics.startTime = performance.now();
  
  // 1. 認証テスト
  const token = await testAuthentication();
  if (!token) {
    console.error('❌ 認証失敗により性能測定を中止します');
    return;
  }
  
  // 2. チャットAPI性能テスト
  console.log('\n💬 チャットAPI性能測定開始...');
  
  for (const ragEnabled of CONFIG.ragModes) {
    console.log(`\n🔄 RAG${ragEnabled ? '有効' : '無効'}モードでテスト開始`);
    
    for (let iteration = 0; iteration < CONFIG.iterations; iteration++) {
      console.log(`\n📊 反復 ${iteration + 1}/${CONFIG.iterations}`);
      
      for (const question of CONFIG.testQuestions) {
        const result = await testChatAPI(token, question, ragEnabled, iteration);
        performanceResults.chatAPI.tests.push(result);
        
        // クールダウン時間（サーバー負荷軽減）
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // 3. 統計計算と結果出力
  performanceResults.systemMetrics.endTime = performance.now();
  performanceResults.systemMetrics.totalDuration = 
    performanceResults.systemMetrics.endTime - performanceResults.systemMetrics.startTime;
  
  calculateStatistics();
  generateDetailedReport();
  
  // 4. 結果をファイルに保存
  const fs = require('fs');
  fs.writeFileSync(
    'performance-results.json', 
    JSON.stringify(performanceResults, null, 2)
  );
  
  console.log('\n✅ 性能測定完了! 結果をperformance-results.jsonに保存しました。');
  
  return performanceResults;
}

// 実行
if (require.main === module) {
  runPerformanceTest().catch(console.error);
}

module.exports = { runPerformanceTest, performanceResults };