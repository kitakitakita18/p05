"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const openai_1 = require("openai");
const supabaseClient_1 = require("../utils/supabaseClient");
const router = express_1.default.Router();
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
router.post('/', async (req, res) => {
    try {
        const { question, matchThreshold = 0.5, matchCount = 5 } = req.body;
        console.log('🔍 Search request received:', { question, matchThreshold, matchCount });
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: question,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;
        console.log('✅ OpenAI embedding generated, length:', queryEmbedding.length);
        const { data, error } = await supabaseClient_1.supabase.rpc('match_regulation_chunks', {
            query_embedding: queryEmbedding,
            match_threshold: matchThreshold,
            match_count: matchCount,
        });
        if (error) {
            console.error('❌ Supabase RPC error:', error);
            return res.status(500).json({ error: error.message });
        }
        console.log('🔍 Supabase search results:', {
            resultCount: data?.length || 0,
            results: data
        });
        res.json({ question, results: data || [] });
    }
    catch (err) {
        console.error('❌ Search endpoint error:', err);
        res.status(500).json({ error: String(err) });
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map