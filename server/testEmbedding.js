const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testEmbedding() {
  try {
    // 第14条に関する質問で埋め込みを作成
    const testQuestions = [
      "バルコニーの専用使用権について教えてください",
      "第14条について",
      "区分所有者は、別表第４に掲げる",
      "専用使用権"
    ];

    for (const question of testQuestions) {
      console.log(`\n=== 質問: ${question} ===`);
      
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: question,
      });

      const embedding = embeddingResponse.data[0].embedding;
      console.log(`埋め込みベクトル長: ${embedding.length}`);
      console.log(`埋め込みベクトル（最初の5要素）: ${embedding.slice(0, 5).join(', ')}`);
      
      // 待機（API制限対策）
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 第14条のテキストでも埋め込みを作成
    const chapter14Text = `第１４条  区分所有者は、別表第４に掲げるバルコニー、玄関扉、窓枠、窓ガラス、一階に面する庭及び屋上テラス（以下この条、第２１条第１項及び別表第４において「バルコニー等」という。）について、同表に掲げるとおり、専用使用権を有することを承認する。`;
    
    console.log(`\n=== 第14条テキストの埋め込み ===`);
    const textEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chapter14Text,
    });

    const textEmbed = textEmbedding.data[0].embedding;
    console.log(`第14条テキストの埋め込みベクトル長: ${textEmbed.length}`);
    console.log(`第14条テキストの埋め込み（最初の5要素）: ${textEmbed.slice(0, 5).join(', ')}`);

  } catch (error) {
    console.error('埋め込みテストエラー:', error);
  }
}

testEmbedding();