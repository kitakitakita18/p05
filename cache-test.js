// 🚀 キャッシュ機能テストスクリプト
// ブラウザのコンソールで実行してください

console.log('💾 キャッシュ機能テスト開始');

// テスト用の質問リスト（類似質問も含む）
const cacheTestQuestions = [
  // グループ1: 管理費関連（類似質問のテスト）
  '管理費について教えて',
  '管理費はいくらですか',
  'マンション管理費について',
  
  // グループ2: 修繕積立金関連
  '修繕積立金とは',
  '修繕積立金について教えて',
  
  // グループ3: 理事会関連
  '理事会の役割について',
  '理事会の開催頻度は',
  
  // グループ4: 完全に同じ質問（キャッシュヒット確認）
  '管理費について教えて', // 重複
  '修繕積立金とは', // 重複
];

// 自動キャッシュテスト実行関数
async function runCacheTest() {
  console.log('💾 キャッシュ機能自動テスト開始');
  
  // RAG有効でテスト
  console.log('🔍 RAG有効でキャッシュテスト実行中...');
  
  for (let i = 0; i < cacheTestQuestions.length; i++) {
    const question = cacheTestQuestions[i];
    console.log(`\n📝 テスト ${i+1}/${cacheTestQuestions.length}: "${question}"`);
    
    // 開始時間を記録
    const startTime = performance.now();
    
    // 入力フィールドに質問を設定
    const inputField = document.querySelector('input[placeholder*="理事会"]');
    if (inputField) {
      inputField.value = question;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      
      // 送信ボタンをクリック
      const sendButton = document.querySelector('button[style*="007bff"]');
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        
        // 処理完了まで待機
        await new Promise(resolve => {
          const checkCompletion = () => {
            const loadingElements = document.querySelectorAll('[style*="考え中"]');
            if (loadingElements.length === 0) {
              const endTime = performance.now();
              const responseTime = endTime - startTime;
              console.log(`⏱️ 応答時間: ${responseTime.toFixed(2)}ms`);
              resolve();
            } else {
              setTimeout(checkCompletion, 100);
            }
          };
          setTimeout(checkCompletion, 500);
        });
        
        // 次のテストまで少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  console.log('\n✅ キャッシュテスト完了！');
  console.log('📊 性能分析ボタンをクリックして結果を確認してください。');
  console.log('💾 キャッシュボタンでキャッシュ状況を確認してください。');
}

// キャッシュ効果分析関数
function analyzeCacheEffectiveness() {
  // パフォーマンスデータを取得
  const performanceData = JSON.parse(localStorage.getItem('performanceData') || '[]');
  
  if (performanceData.length === 0) {
    console.log('⚠️ パフォーマンスデータがありません。テストを実行してください。');
    return;
  }
  
  // キャッシュヒットとミスを分析
  const cacheHits = performanceData.filter(d => d.cacheHit);
  const cacheMisses = performanceData.filter(d => !d.cacheHit);
  
  const avgCacheHitTime = cacheHits.length > 0 ? 
    cacheHits.reduce((sum, d) => sum + parseFloat(d.totalTime), 0) / cacheHits.length : 0;
  
  const avgCacheMissTime = cacheMisses.length > 0 ? 
    cacheMisses.reduce((sum, d) => sum + parseFloat(d.totalTime), 0) / cacheMisses.length : 0;
  
  const speedup = avgCacheMissTime > 0 ? (avgCacheMissTime / avgCacheHitTime).toFixed(1) : 'N/A';
  const timeSaved = avgCacheMissTime - avgCacheHitTime;
  
  const report = `
💾 キャッシュ効果分析レポート
=====================================
📊 基本統計:
- 総クエリ数: ${performanceData.length}回
- キャッシュヒット: ${cacheHits.length}回
- キャッシュミス: ${cacheMisses.length}回
- ヒット率: ${performanceData.length > 0 ? (cacheHits.length / performanceData.length * 100).toFixed(1) : 0}%

⚡ 性能比較:
- キャッシュヒット平均時間: ${avgCacheHitTime.toFixed(2)}ms
- キャッシュミス平均時間: ${avgCacheMissTime.toFixed(2)}ms
- 高速化倍率: ${speedup}x
- 1回あたり時間節約: ${timeSaved.toFixed(2)}ms

💰 コスト効果:
- OpenAI API呼び出し節約: ${cacheHits.length}回
- 推定コスト節約: $${(cacheHits.length * 0.002).toFixed(4)}
`;

  console.log(report);
  alert(report);
}

// 類似質問検出テスト
function testSimilarQuestionDetection() {
  console.log('🎯 類似質問検出テスト開始');
  
  const similarQuestions = [
    ['管理費について教えて', '管理費はいくらですか'],
    ['修繕積立金とは', '修繕積立金について'],
    ['理事会の役割', '理事会について教えて'],
  ];
  
  console.log('以下の質問ペアを順番に実行して、2回目でキャッシュヒットするか確認してください:');
  similarQuestions.forEach((pair, i) => {
    console.log(`${i + 1}. 1回目: "${pair[0]}"`);
    console.log(`   2回目: "${pair[1]}" (類似質問として検出されるかテスト)`);
  });
}

// 実行方法の表示
console.log(`
🚀 キャッシュ機能テスト使用方法:
=====================================
1. 基本テスト: runCacheTest()
2. 効果分析: analyzeCacheEffectiveness()
3. 類似質問テスト: testSimilarQuestionDetection()
4. キャッシュクリア: cacheService.clear()

💡 推奨テスト手順:
1. cacheService.clear() でキャッシュクリア
2. runCacheTest() で自動テスト実行
3. analyzeCacheEffectiveness() で効果分析
4. 手動で類似質問をテスト
`);