const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractPdfText() {
  try {
    const dataBuffer = fs.readFileSync('./kiyaku.pdf');
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('PDF全体の文字数:', pdfData.text.length);
    
    // 第14条を検索
    const text = pdfData.text;
    const chapter14Index = text.indexOf('第１４条');
    const chapter14Index2 = text.indexOf('第14条');
    
    console.log('第１４条の位置:', chapter14Index);
    console.log('第14条の位置:', chapter14Index2);
    
    if (chapter14Index !== -1) {
      console.log('\n=== 第14条付近のテキスト ===');
      const start = Math.max(0, chapter14Index - 200);
      const end = Math.min(text.length, chapter14Index + 800);
      console.log(text.substring(start, end));
    } else if (chapter14Index2 !== -1) {
      console.log('\n=== 第14条付近のテキスト ===');
      const start = Math.max(0, chapter14Index2 - 200);
      const end = Math.min(text.length, chapter14Index2 + 800);
      console.log(text.substring(start, end));
    }
    
    // 「区分所有者は、別表第４に掲げる」を検索
    const specificIndex = text.indexOf('区分所有者は、別表第４に掲げる');
    console.log('\n「区分所有者は、別表第４に掲げる」の位置:', specificIndex);
    
    if (specificIndex !== -1) {
      console.log('\n=== 特定文言付近のテキスト ===');
      const start = Math.max(0, specificIndex - 200);
      const end = Math.min(text.length, specificIndex + 800);
      console.log(text.substring(start, end));
    }
    
    // PDFテキストの先頭1000文字を表示
    console.log('\n=== PDFテキストの先頭1000文字 ===');
    console.log(text.substring(0, 1000));
    
    // チャンク分割のテスト（pdfEmbedding.tsと同じ方法）
    const chunks = text.match(/[\s\S]{1,1000}/g) || [];
    console.log('\nチャンク数:', chunks.length);
    
    // 第14条を含むチャンクを検索
    const chapter14Chunks = chunks.filter(chunk => 
      chunk.includes('第１４条') || chunk.includes('第14条')
    );
    
    console.log('\n第14条を含むチャンク数:', chapter14Chunks.length);
    
    if (chapter14Chunks.length > 0) {
      chapter14Chunks.forEach((chunk, index) => {
        console.log(`\n=== 第14条チャンク ${index + 1} ===`);
        console.log(chunk);
      });
    }
    
    // 「区分所有者は、別表第４に掲げる」を含むチャンクを検索
    const specificChunks = chunks.filter(chunk => 
      chunk.includes('区分所有者は、別表第４に掲げる')
    );
    
    console.log('\n特定文言を含むチャンク数:', specificChunks.length);
    
    if (specificChunks.length > 0) {
      specificChunks.forEach((chunk, index) => {
        console.log(`\n=== 特定文言チャンク ${index + 1} ===`);
        console.log(chunk);
      });
    }
    
  } catch (error) {
    console.error('PDFテキスト抽出エラー:', error);
  }
}

extractPdfText();