const fs = require('fs');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

// 環境変数の読み込み
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// PDFファイルを読み取りチャンク分割
async function processPdfAndStoreEmbeddings(pdfPath, unionId, regulationName) {
  try {
    console.log(`📄 PDF読み取り開始: ${pdfPath}`);
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log(`📝 テキスト抽出完了: ${pdfData.text.length}文字`);
    
    // より適切なチャンク分割（条文単位で分割、トークン制限対応版）
    const text = pdfData.text;
    const chunks = [];
    
    // トークン制限を考慮した分割関数
    function splitByTokenLimit(text, maxChars = 6000) {
      const result = [];
      if (text.length <= maxChars) {
        result.push(text);
      } else {
        // 1500文字ずつに分割
        const parts = text.match(/[\s\S]{1,1500}/g) || [];
        result.push(...parts);
      }
      return result;
    }
    
    // 第X条で分割
    const articles = text.split(/(?=第\d+条)/);
    
    for (const article of articles) {
      if (article.trim().length > 0) {
        // トークン制限を考慮して分割
        const articleChunks = splitByTokenLimit(article.trim());
        chunks.push(...articleChunks);
      }
    }
    
    console.log(`🔄 チャンク分割完了: ${chunks.length}チャンク`);
    
    // 既存のデータを削除
    console.log('🗑️ 既存データを削除中...');
    const { error: deleteError } = await supabase
      .from('regulation_chunks')
      .delete()
      .eq('unionid', unionId);
    
    if (deleteError) {
      console.error('削除エラー:', deleteError);
    } else {
      console.log('✅ 既存データを削除完了');
    }

    // 新しいデータを挿入
    console.log('💾 新しいデータを保存中...');
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔄 処理中: ${i + 1}/${chunks.length} - ${chunk.substring(0, 50)}...`);
      
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk,
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { error } = await supabase.from('regulation_chunks').insert({
        unionid: unionId,
        regulationname: regulationName,
        chunk,
        embedding,
      });

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
    }

    console.log(`✅ Supabaseに ${chunks.length} チャンクを保存完了`);
  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

// メイン処理
async function main() {
  try {
    console.log('🚀 管理規約の更新を開始します...');
    
    const pdfPath = '/home/kita/p05/server/kiyaku.pdf';
    const unionId = 'mansion-001';
    const regulationName = '正しいマンション管理規約';
    
    await processPdfAndStoreEmbeddings(pdfPath, unionId, regulationName);
    
    console.log('🎉 管理規約の更新が完了しました！');
  } catch (error) {
    console.error('❌ メイン処理エラー:', error);
    process.exit(1);
  }
}

main();