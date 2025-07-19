const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testData() {
  try {
    // データベースの件数を確認
    const { data, error, count } = await supabase
      .from('regulation_chunks')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) {
      console.error('エラー:', error);
      return;
    }
    
    console.log(`データ件数: ${count}件`);
    
    if (data && data.length > 0) {
      console.log('最初のデータ例:');
      console.log(data[0].chunk ? data[0].chunk.substring(0, 100) : 'chunk なし');
    }
    
    // 第7条を含むデータを検索
    const { data: article7Data, error: article7Error } = await supabase
      .from('regulation_chunks')
      .select('*')
      .textSearch('chunk', '第7条', { type: 'plain' });
    
    if (article7Error) {
      console.log('第7条検索エラー:', article7Error);
    } else {
      console.log(`第7条を含むデータ: ${article7Data.length}件`);
      if (article7Data.length > 0) {
        console.log('第7条の内容:');
        console.log(article7Data[0].chunk);
      }
    }
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

testData();