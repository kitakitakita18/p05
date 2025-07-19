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
    const prompt = `あなたはマンション管理規約の専門家です。以下の規約データを参考に、質問に正確に回答してください。

規約データ:
${context}

質問: ${question}

回答の際は以下の形式で答えてください：
- 該当する条文がある場合は「第○条」から始めて条文の全文を記載
- 条文が複数ある場合は全て記載
- 条文が見つからない場合は「該当する条文は見つかりません」と回答

質問に最も関連する条文を正確に特定し、条文番号と内容を含めて回答してください。`;
    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
    });
    return completion.choices[0].message?.content;
};
// POST /api/ask
router.post("/", async (req, res) => {
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
            match_threshold: 0.2,
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