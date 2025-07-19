// ⚡ 簡易速度テスト
const axios = require('axios');
const { performance } = require('perf_hooks');

async function quickSpeedTest() {
  console.log('⚡ 緊急修正後の簡易速度テスト');
  
  // 認証
  const authStart = performance.now();
  const authResponse = await axios.post('http://localhost:5105/api/auth/login', {
    email: 'admin@mansion.com',
    password: 'password'
  });
  const authTime = performance.now() - authStart;
  console.log(`🔐 認証時間: ${authTime.toFixed(2)}ms`);
  
  const token = authResponse.data.token;
  
  // 簡単な質問テスト
  const testQuestions = [
    '管理費とは',
    '理事会について',
    '総会の決議とは'
  ];
  
  for (const question of testQuestions) {
    console.log(`\n📝 テスト: "${question}"`);
    
    // RAG有効
    const ragStart = performance.now();
    try {
      const ragResponse = await axios.post('http://localhost:5105/api/openai/chat', {
        messages: [{ role: 'user', content: question }],
        ragEnabled: true
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
      const ragTime = performance.now() - ragStart;
      console.log(`✅ RAG有効: ${ragTime.toFixed(0)}ms (${ragResponse.data.cached ? 'キャッシュ' : '新規'})`);
    } catch (error) {
      console.log(`❌ RAG有効: エラー - ${error.message}`);
    }
    
    // RAG無効
    const stdStart = performance.now();
    try {
      const stdResponse = await axios.post('http://localhost:5105/api/openai/chat', {
        messages: [{ role: 'user', content: question }],
        ragEnabled: false
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
      const stdTime = performance.now() - stdStart;
      console.log(`✅ RAG無効: ${stdTime.toFixed(0)}ms (${stdResponse.data.cached ? 'キャッシュ' : '新規'})`);
    } catch (error) {
      console.log(`❌ RAG無効: エラー - ${error.message}`);
    }
    
    // 1秒休憩
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

quickSpeedTest().catch(console.error);