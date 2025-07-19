const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchTable4() {
  try {
    console.log('🔍 別表第４の詳細検索を実行中...');
    
    // 全データを取得
    const { data: allData, error } = await supabase
      .from('regulation_chunks')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('検索エラー:', error);
      return;
    }
    
    console.log('📊 データベース内の全項目:', allData.length);
    
    // 別表第４を含む項目を検索
    const table4Items = allData.filter(item => 
      item.chunk && (
        item.chunk.includes('別表第４') || 
        item.chunk.includes('別表第4') ||
        item.chunk.includes('別表') ||
        item.chunk.includes('バルコニー等') ||
        item.chunk.includes('専用使用権')
      )
    );
    
    console.log('🎯 別表第４関連の項目:', table4Items.length);
    
    table4Items.forEach((item, index) => {
      console.log(`\n=== 別表第４関連 項目 ${index + 1} ===`);
      console.log(`ID: ${item.id}`);
      console.log(`内容:`);
      console.log(item.chunk);
      console.log('='.repeat(80));
    });
    
    // 「14条」を正確に含む項目を検索
    const article14Items = allData.filter(item => 
      item.chunk && item.chunk.includes('（バルコニー等の専用使用権）')
    );
    
    console.log('\n🔍 第14条（バルコニー等の専用使用権）の項目:', article14Items.length);
    
    article14Items.forEach((item, index) => {
      console.log(`\n=== 第14条関連 項目 ${index + 1} ===`);
      console.log(`ID: ${item.id}`);
      console.log(`内容:`);
      console.log(item.chunk);
      console.log('='.repeat(80));
    });
    
  } catch (error) {
    console.error('処理エラー:', error);
  }
}

searchTable4();