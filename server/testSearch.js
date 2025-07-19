const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
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
    
    // 第7条を含む項目を検索
    const article7Items = allData.filter(item => 
      item.content.includes('第7条') || 
      item.content.includes('第７条') ||
      item.content.includes('専有部分の範囲')
    );
    
    console.log(`\n🎯 第7条または専有部分の範囲を含む項目: ${article7Items.length}件`);
    
    article7Items.forEach((item, index) => {
      console.log(`\n--- 項目 ${index + 1} ---`);
      console.log(`ID: ${item.id}`);
      console.log(`内容: ${item.content}`);
    });
    
    if (article7Items.length === 0) {
      console.log('\n❌ 第7条の内容が見つかりませんでした。');
      console.log('データベースの最初の数件を確認します:');
      
      allData.slice(0, 5).forEach((item, index) => {
        console.log(`\n--- データ ${index + 1} ---`);
        console.log(`内容: ${item.content.substring(0, 200)}...`);
      });
    }
    
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

testSearch();