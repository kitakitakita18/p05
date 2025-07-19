const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  try {
    // regulation_chunksテーブルの全チャンクを取得
    const { data: chunks, error } = await supabase
      .from('regulation_chunks')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('Error fetching chunks:', error);
      return;
    }
    
    console.log('Total chunks:', chunks?.length || 0);
    
    // 第14条を含むチャンクを検索
    const chapter14Chunks = chunks?.filter(chunk => 
      chunk.chunk.includes('第１４条') || 
      chunk.chunk.includes('第14条') ||
      chunk.chunk.includes('第一四条')
    );
    
    console.log('\nChunks containing 第14条:', chapter14Chunks?.length || 0);
    
    if (chapter14Chunks && chapter14Chunks.length > 0) {
      chapter14Chunks.forEach((chunk, index) => {
        console.log(`\n=== 第14条関連チャンク ${index + 1} ===`);
        console.log('ID:', chunk.id);
        console.log('Content:', chunk.chunk);
        console.log('Length:', chunk.chunk.length);
      });
    }
    
    // 「区分所有者は、別表第４に掲げる」を含むチャンクを検索
    const specificChunks = chunks?.filter(chunk => 
      chunk.chunk.includes('区分所有者は、別表第４に掲げる')
    );
    
    console.log('\nChunks containing 「区分所有者は、別表第４に掲げる」:', specificChunks?.length || 0);
    
    if (specificChunks && specificChunks.length > 0) {
      specificChunks.forEach((chunk, index) => {
        console.log(`\n=== 特定文言チャンク ${index + 1} ===`);
        console.log('ID:', chunk.id);
        console.log('Content:', chunk.chunk);
        console.log('Length:', chunk.chunk.length);
      });
    }
    
    // 全チャンクの内容を確認（デバッグ用）
    console.log('\n=== 全チャンクの概要 ===');
    chunks?.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1} (ID: ${chunk.id}): ${chunk.chunk.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('Database check error:', error);
  }
}

checkDatabase();