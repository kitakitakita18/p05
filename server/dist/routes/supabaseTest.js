"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabaseClient_1 = require("../utils/supabaseClient");
const openai_1 = require("openai");
const router = express_1.default.Router();
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// テスト用の固定embeddingベクトル（1536次元）
const createMockEmbedding = () => {
    return Array.from({ length: 1536 }, () => Math.random() * 0.01);
};
// SupabaseにPDFチャンクを登録
router.post('/upload', async (req, res) => {
    const { unionId, regulationName, chunks } = req.body;
    try {
        for (const chunk of chunks) {
            let embedding;
            // OpenAI APIキーが有効な場合は実際のembeddingを生成、無効な場合はモックを使用
            try {
                const embeddingRes = await openai.embeddings.create({
                    model: 'text-embedding-ada-002',
                    input: chunk,
                });
                embedding = embeddingRes.data[0].embedding;
                console.log('OpenAI embedding生成成功');
            }
            catch (openaiError) {
                console.log('OpenAI APIキーが無効のため、モックembeddingを使用');
                embedding = createMockEmbedding();
            }
            // 必須フィールドを追加
            const { error } = await supabaseClient_1.supabase
                .from('regulation_chunks')
                .insert({
                unionid: unionId,
                regulationname: regulationName,
                chunk,
                embedding: embedding,
            });
            if (error)
                throw error;
        }
        res.json({ success: true, message: 'Supabaseに保存完了' });
    }
    catch (err) {
        console.error('Supabase保存エラー:', err);
        res.status(500).json({ error: 'Supabase保存エラー', details: err });
    }
});
// Supabaseテーブル確認エンドポイント
router.get('/tables', async (req, res) => {
    try {
        // PostgreSQLのシステムテーブルから情報を取得
        const { data, error } = await supabaseClient_1.supabase.rpc('get_table_list');
        if (error) {
            // 関数が存在しない場合は、直接regulation_chunksテーブルの確認を試行
            const { data: testData, error: testError } = await supabaseClient_1.supabase
                .from('regulation_chunks')
                .select('*')
                .limit(1);
            if (testError) {
                res.json({
                    message: 'regulation_chunksテーブルが存在しません',
                    error: testError,
                    suggestion: 'Supabaseでregulation_chunksテーブルを作成してください'
                });
            }
            else {
                res.json({
                    message: 'regulation_chunksテーブルは存在します',
                    sample_data: testData
                });
            }
        }
        else {
            res.json({ tables: data });
        }
    }
    catch (err) {
        console.error('テーブル確認エラー:', err);
        res.status(500).json({ error: 'テーブル確認エラー', details: err });
    }
});
// Supabaseからベクトル検索
router.post('/search', async (req, res) => {
    const { question } = req.body;
    try {
        let queryEmbedding;
        try {
            const embeddingRes = await openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: question,
            });
            queryEmbedding = embeddingRes.data[0].embedding;
        }
        catch (openaiError) {
            console.log('OpenAI APIキーが無効のため、モックembeddingを使用');
            queryEmbedding = createMockEmbedding();
        }
        const { data, error } = await supabaseClient_1.supabase.rpc('match_regulation_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 3
        });
        if (error)
            throw error;
        res.json({ results: data });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Supabase検索エラー' });
    }
});
exports.default = router;
//# sourceMappingURL=supabaseTest.js.map