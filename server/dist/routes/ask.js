"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const openai_1 = __importDefault(require("openai"));
const supabaseClient_1 = require("../utils/supabaseClient");
const router = express_1.default.Router();
// 環境変数のバリデーション
if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
}
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
// Embedding作成ヘルパー関数
const createEmbedding = async (text) => {
    const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text
    });
    return embeddingRes.data[0].embedding;
};
// ChatGPT回答生成ヘルパー関数
const chatCompletion = async (question, context) => {
    const prompt = `次の規約データを参考に質問に回答してください:\n${context}\n質問: ${question}`;
    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0].message?.content;
};
// POST /api/ask
router.post("/ask", async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: "質問文が必要です" });
        }
        // 質問のembeddingを生成
        const questionEmbedding = await createEmbedding(question);
        // Supabaseで類似検索 (pgvectorの<->演算子で距離を計算)
        const { data, error } = await supabaseClient_1.supabase.rpc('match_regulation_chunks', {
            query_embedding: questionEmbedding,
            match_threshold: 0.8,
            match_count: 3,
        });
        if (error)
            throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "関連する規約データが見つかりません" });
        }
        const context = data.map((d) => d.chunk).join('\n');
        const answer = await chatCompletion(question, context);
        res.json({
            question,
            answer,
            references: data,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
exports.default = router;
//# sourceMappingURL=ask.js.map