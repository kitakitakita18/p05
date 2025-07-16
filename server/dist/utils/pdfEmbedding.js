"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPdfAndStoreEmbeddings = processPdfAndStoreEmbeddings;
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const openai_1 = require("openai");
const supabaseClient_1 = require("./supabaseClient");
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// PDFファイルを読み取りチャンク分割
async function processPdfAndStoreEmbeddings(pdfPath, unionId, regulationName) {
    const dataBuffer = fs_1.default.readFileSync(pdfPath);
    const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
    // チャンク分割（ここでは1000文字ごと）
    const chunks = pdfData.text.match(/[\s\S]{1,1000}/g) || [];
    for (const chunk of chunks) {
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: chunk,
        });
        const embedding = embeddingResponse.data[0].embedding;
        const { error } = await supabaseClient_1.supabase.from('regulation_chunks').insert({
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
//# sourceMappingURL=pdfEmbedding.js.map