// 🔍 文書品質チェックスクリプト
const { createClient } = require('@supabase/supabase-js');

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_KEY || 'your-anon-key'
);

async function analyzeDocumentQuality() {
  console.log('📊 文書品質分析開始...');
  
  try {
    // 全チャンクデータを取得
    const { data: chunks, error } = await supabase
      .from('regulation_chunks')
      .select('*')
      .limit(20);
    
    if (error) {
      console.error('❌ データ取得エラー:', error);
      return;
    }
    
    console.log(`📋 総チャンク数: ${chunks.length}`);
    
    // 品質分析
    const analysis = {
      totalChunks: chunks.length,
      emptyChunks: 0,
      shortChunks: 0,
      spaceyChunks: 0,
      duplicatedChunks: 0,
      qualityIssues: [],
      sampleIssues: []
    };
    
    const chunkTexts = new Set();
    
    chunks.forEach((chunk, index) => {
      const text = chunk.chunk || '';
      const cleanText = text.trim();
      
      // 空チャンク
      if (!cleanText) {
        analysis.emptyChunks++;
        analysis.qualityIssues.push(`チャンク${index + 1}: 空のチャンク`);
      }
      
      // 短すぎるチャンク (20文字未満)
      else if (cleanText.length < 20) {
        analysis.shortChunks++;
        analysis.qualityIssues.push(`チャンク${index + 1}: 短すぎる (${cleanText.length}文字)`);
        analysis.sampleIssues.push({
          type: '短すぎる',
          text: cleanText,
          length: cleanText.length
        });
      }
      
      // 空白や改行が多すぎるチャンク
      else if (text.match(/\s{5,}/) || text.match(/\n{3,}/)) {
        analysis.spaceyChunks++;
        analysis.qualityIssues.push(`チャンク${index + 1}: 過度な空白・改行`);
        analysis.sampleIssues.push({
          type: '空白過多',
          text: text.substring(0, 100) + '...',
          original: text
        });
      }
      
      // 重複チャンク
      if (chunkTexts.has(cleanText)) {
        analysis.duplicatedChunks++;
        analysis.qualityIssues.push(`チャンク${index + 1}: 重複チャンク`);
      } else {
        chunkTexts.add(cleanText);
      }
    });
    
    // レポート生成
    console.log(`
🔍 文書品質分析結果
================================
📊 基本統計:
- 総チャンク数: ${analysis.totalChunks}
- 空チャンク: ${analysis.emptyChunks}件
- 短いチャンク: ${analysis.shortChunks}件 
- 空白過多チャンク: ${analysis.spaceyChunks}件
- 重複チャンク: ${analysis.duplicatedChunks}件

⚠️ 品質問題の詳細:
${analysis.qualityIssues.slice(0, 10).join('\n')}
${analysis.qualityIssues.length > 10 ? `\n... 他${analysis.qualityIssues.length - 10}件` : ''}

🔍 問題のあるチャンクサンプル:
${analysis.sampleIssues.slice(0, 5).map((issue, i) => `
${i + 1}. ${issue.type}:
   "${issue.text}"
   ${issue.length ? `(長さ: ${issue.length}文字)` : ''}
`).join('')}

💡 改善提案:
${generateImprovementSuggestions(analysis)}
`);
    
    // 具体的な問題のあるチャンクを詳細表示
    if (analysis.sampleIssues.length > 0) {
      console.log('\n📋 詳細な問題分析:');
      analysis.sampleIssues.slice(0, 3).forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.type}の例:`);
        console.log('━'.repeat(50));
        console.log(`原文: "${issue.original || issue.text}"`);
        console.log('━'.repeat(50));
        console.log('問題: ' + analyzeTextIssues(issue.original || issue.text));
      });
    }
    
  } catch (error) {
    console.error('❌ 分析エラー:', error);
  }
}

function analyzeTextIssues(text) {
  const issues = [];
  
  if (text.match(/\n{3,}/)) {
    issues.push('過度な改行（3回以上連続）');
  }
  
  if (text.match(/\s{5,}/)) {
    issues.push('過度なスペース（5文字以上連続）');
  }
  
  if (text.trim().length < text.length * 0.5) {
    issues.push('空白文字が全体の50%以上');
  }
  
  if (text.match(/^\s*[-−]\s*\d+\s*→/)) {
    issues.push('ページ番号や行番号が含まれている');
  }
  
  if (text.match(/^\s*$/m)) {
    issues.push('空行が含まれている');
  }
  
  return issues.length > 0 ? issues.join(', ') : '特定の問題なし';
}

function generateImprovementSuggestions(analysis) {
  const suggestions = [];
  
  if (analysis.emptyChunks > 0) {
    suggestions.push('- 空チャンクを削除する');
  }
  
  if (analysis.shortChunks > analysis.totalChunks * 0.2) {
    suggestions.push('- チャンク分割アルゴリズムを改善（文脈を保持）');
  }
  
  if (analysis.spaceyChunks > 0) {
    suggestions.push('- PDFパース時の空白・改行処理を改善');
    suggestions.push('- テキスト正規化処理を強化');
  }
  
  if (analysis.duplicatedChunks > 0) {
    suggestions.push('- 重複チャンク検出・除去機能を実装');
  }
  
  suggestions.push('- PDF抽出アルゴリズムの見直し');
  suggestions.push('- チャンク品質スコア算出機能の実装');
  
  return suggestions.join('\n');
}

// スクリプト実行
if (require.main === module) {
  analyzeDocumentQuality().catch(console.error);
}

module.exports = { analyzeDocumentQuality };