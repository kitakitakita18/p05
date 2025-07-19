const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function detailedSearch() {
  try {
    console.log('🔍 詳細な検索を実行中...');
    
    // 特定のIDの完全な内容を取得
    const targetId = '029ed029-7e50-4d29-aca9-2fd71f7fcff2';
    
    const { data, error } = await supabase
      .from('regulation_chunks')
      .select('*')
      .eq('id', targetId)
      .single();
    
    if (error) {
      console.error('検索エラー:', error);
      return;
    }

    console.log('✅ 詳細データ取得成功');
    console.log('ID:', data.id);
    console.log('完全な内容:');
    console.log(data.chunk);
    console.log('\n--- 区切り ---\n');
    
    // 第14条を含む可能性のある他の項目も確認
    const { data: allData, error: allError } = await supabase
      .from('regulation_chunks')
      .select('*')
      .order('id', { ascending: true });
    
    if (allError) {
      console.error('全データ取得エラー:', allError);
      return;
    }
    
    console.log('🔍 第14条、第１４条、または専用使用権関連の項目を詳細検索:');
    
    allData.forEach((item, index) => {
      const content = item.chunk || '';
      if (content.includes('第14条') || 
          content.includes('第１４条') || 
          content.includes('専用使用権') ||
          content.includes('バルコニー') ||
          content.includes('別表第４') ||
          content.includes('別表第4')) {
        console.log(`\n=== 項目 ${index + 1} ===`);
        console.log(`ID: ${item.id}`);
        console.log(`内容 (最初の500文字):`);
        console.log(content.substring(0, 500));
        console.log(`... (全体の長さ: ${content.length}文字)`);
        console.log('='.repeat(50));
      }
    });
    
  } catch (error) {
    console.error('処理エラー:', error);
  }
}

detailedSearch();