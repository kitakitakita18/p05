import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

console.log('Supabase接続設定確認:');
console.log('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
console.log('SUPABASE_KEY:', supabaseKey ? '設定済み' : '未設定');

export const supabase = createClient(supabaseUrl, supabaseKey);

// 接続テスト
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('regulation_chunks').select('count').limit(1);
    if (error) {
      console.error('Supabase接続エラー:', error.message);
    } else {
      console.log('✅ Supabase接続成功');
    }
  } catch (err) {
    console.error('Supabase接続テスト失敗:', err);
  }
};

// 非同期でテストを実行
testSupabaseConnection();