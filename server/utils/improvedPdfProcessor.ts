// 🚀 改善されたPDF処理とチャンク分割
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { OpenAI } from 'openai';
import { supabase } from './supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ImprovedPdfProcessor {
  
  // 📝 テキストクリーニング処理
  private cleanText(text: string): string {
    return text
      // ページ番号除去
      .replace(/^\s*-\s*\d+\s*-?\s*$/gm, '')
      .replace(/^\s*\d+\s*$/gm, '')
      // 連続する空白・改行の正規化
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{5,}/g, '  ')
      // ページヘッダー・フッター除去
      .replace(/^資料\d+\s*$/gm, '')
      .replace(/^\s*マンション標準管理規約.*$/gm, '')
      // 不要な記号除去
      .replace(/→/g, '')
      // 文字化け修正
      .replace(/◯◯/g, 'XX')
      // 行の整理
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  // 🎯 意味のあるチャンク分割
  private smartChunkSplit(text: string): string[] {
    const cleanedText = this.cleanText(text);
    const chunks: string[] = [];
    
    // 条文単位での分割を優先
    const articlePattern = /^（[^）]+）\s*第\d+条/gm;
    const sections = cleanedText.split(articlePattern);
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      
      if (section.length === 0) continue;
      
      // 条文が長すぎる場合は段落で分割
      if (section.length > 2000) {
        const paragraphs = this.splitByParagraphs(section);
        chunks.push(...paragraphs);
      } else if (section.length > 50) { // 短すぎるチャンクを避ける
        chunks.push(section);
      }
    }
    
    // 条文パターンが見つからない場合の段落分割
    if (chunks.length === 0) {
      const paragraphs = this.splitByParagraphs(cleanedText);
      chunks.push(...paragraphs.filter(p => p.length > 50));
    }
    
    return chunks;
  }

  // 📄 段落単位での分割
  private splitByParagraphs(text: string): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed.length === 0) continue;
      
      // チャンクサイズ制限（1500文字）
      if (currentChunk.length + trimmed.length > 1500) {
        if (currentChunk.trim().length > 50) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmed;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      }
    }
    
    if (currentChunk.trim().length > 50) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  // 🎯 チャンク品質スコア算出
  private calculateQualityScore(chunk: string): number {
    let score = 100;
    
    // 長さによる評価
    if (chunk.length < 50) score -= 50;
    else if (chunk.length < 100) score -= 20;
    else if (chunk.length > 2000) score -= 30;
    
    // 意味のあるコンテンツかどうか
    if (/第\d+条/.test(chunk)) score += 20; // 条文
    if (/（[^）]+）/.test(chunk)) score += 10; // 見出し
    if (/[。！？]/.test(chunk)) score += 15; // 完全な文
    
    // 不要な要素による減点
    if (/^\s*[-−]\s*\d+/.test(chunk)) score -= 30; // ページ番号
    if (chunk.split('\n').length > chunk.length / 10) score -= 20; // 過度な改行
    if (/\s{5,}/.test(chunk)) score -= 15; // 過度な空白
    
    return Math.max(0, Math.min(100, score));
  }

  // 🚀 改善されたPDF処理メイン関数
  async processImprovedPdf(pdfPath: string, unionId: string, regulationName: string) {
    console.log('🚀 改善されたPDF処理開始:', pdfPath);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('📄 抽出されたテキスト長:', pdfData.text.length);
    
    // スマートチャンク分割
    const chunks = this.smartChunkSplit(pdfData.text);
    
    console.log('📊 チャンク分割結果:', chunks.length, '個');
    
    // 品質フィルタリング
    const qualityChunks = chunks
      .map(chunk => ({
        text: chunk,
        quality: this.calculateQualityScore(chunk)
      }))
      .filter(item => item.quality >= 50) // 品質スコア50以上のみ
      .sort((a, b) => b.quality - a.quality); // 品質順にソート
    
    console.log('✅ 品質フィルタリング後:', qualityChunks.length, '個');
    
    // Supabaseに保存
    for (const item of qualityChunks) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: item.text,
        });

        const embedding = embeddingResponse.data[0].embedding;

        const { error } = await supabase.from('regulation_chunks').insert({
          unionid: unionId,
          regulationname: regulationName,
          chunk: item.text,
          embedding,
        });

        if (error) {
          console.error('❌ Supabase保存エラー:', error);
          throw error;
        }

        console.log(`✅ 高品質チャンク保存 (品質: ${item.quality}): ${item.text.substring(0, 50)}...`);
        
      } catch (error) {
        console.error('❌ チャンク処理エラー:', error);
      }
    }
    
    // 品質レポート
    const qualityReport = this.generateQualityReport(qualityChunks);
    console.log('\n📊 品質レポート:\n', qualityReport);
    
    return {
      totalChunks: chunks.length,
      qualityChunks: qualityChunks.length,
      averageQuality: qualityChunks.reduce((sum, item) => sum + item.quality, 0) / qualityChunks.length,
      report: qualityReport
    };
  }

  // 📊 品質レポート生成
  private generateQualityReport(qualityChunks: Array<{text: string, quality: number}>): string {
    const highQuality = qualityChunks.filter(item => item.quality >= 80).length;
    const mediumQuality = qualityChunks.filter(item => item.quality >= 60 && item.quality < 80).length;
    const lowQuality = qualityChunks.filter(item => item.quality < 60).length;
    
    return `
📊 チャンク品質分布:
- 高品質 (80点以上): ${highQuality}個
- 中品質 (60-79点): ${mediumQuality}個  
- 低品質 (50-59点): ${lowQuality}個

🎯 品質改善効果:
- 不適切なチャンクを除去
- 条文の完全性を保持
- 検索精度の向上が期待される`;
  }
}

// 使用例
export async function processImprovedPdfDocument(pdfPath: string, unionId: string, regulationName: string) {
  const processor = new ImprovedPdfProcessor();
  return await processor.processImprovedPdf(pdfPath, unionId, regulationName);
}