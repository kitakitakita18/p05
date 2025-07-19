const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSpecificSearch() {
  try {
    console.log('🔍 Supabase接続設定を確認中...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey ? 'あり' : 'なし');
    
    console.log('🔍 データベースの内容を確認中...');
    
    // データベースの全内容を確認
    const { data: allData, error: allError } = await supabase
      .from('regulation_chunks')
      .select('*')
      .order('id', { ascending: true });
    
    if (allError) {
      console.error('データベース確認エラー:', allError);
      return;
    }

    console.log(`\n✅ データベース内容: ${allData.length}件`);
    
    // 指定されたキーワードを含む項目を検索
    const keywords = [
      'バルコニー',
      '専用使用権',
      '第14条',
      '第１４条',
      '別表第4',
      '別表第４',
      '玄関扉',
      '窓枠',
      '窓ガラス',
      '一階に面する庭',
      '屋上テラス'
    ];
    
    console.log('\n🎯 指定されたキーワードでの検索結果:');
    
    keywords.forEach(keyword => {
      const matchingItems = allData.filter(item => 
        item.chunk && item.chunk.includes(keyword)
      );
      
      console.log(`\n--- "${keyword}" の検索結果: ${matchingItems.length}件 ---`);
      
      matchingItems.forEach((item, index) => {
        console.log(`\n  項目 ${index + 1}:`);
        console.log(`  ID: ${item.id}`);
        console.log(`  内容: ${item.chunk.substring(0, 200)}...`);
        console.log(`  類似度: ${item.similarity || 'N/A'}`);
      });
    });
    
    // 全データの最初の5件を確認
    console.log('\n📋 データベースの最初の5件:');
    allData.slice(0, 5).forEach((item, index) => {
      console.log(`\n--- データ ${index + 1} ---`);
      console.log(`ID: ${item.id}`);
      console.log(`内容: ${item.chunk ? item.chunk.substring(0, 300) : 'なし'}...`);
    });
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

async function getEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}

testSpecificSearch();