import fs from 'fs';
import pdfParse from 'pdf-parse';
import { OpenAI } from 'openai';
import { supabase } from './supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// PDFファイルを読み取りチャンク分割
export async function processPdfAndStoreEmbeddings(pdfPath: string, unionId: string, regulationName: string) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdfParse(dataBuffer);

  // チャンク分割（ここでは1000文字ごと）
  const chunks = pdfData.text.match(/[\s\S]{1,1000}/g) || [];

  for (const chunk of chunks) {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { error } = await supabase.from('regulation_chunks').insert({
      unionId,
      regulationName,
      chunk,
      embedding,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }

  console.log(`✅ Supabaseに ${chunks.length} チャンクを保存`);
}