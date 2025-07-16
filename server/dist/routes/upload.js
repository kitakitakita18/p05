"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const pdfEmbedding_1 = require("../utils/pdfEmbedding");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
router.post('/pdf', upload.single('pdf'), async (req, res) => {
    try {
        const { unionId, regulationName } = req.body;
        const pdfPath = req.file?.path;
        if (!pdfPath || !unionId || !regulationName) {
            return res.status(400).json({ error: 'Missing parameters' });
        }
        await (0, pdfEmbedding_1.processPdfAndStoreEmbeddings)(pdfPath, unionId, regulationName);
        res.json({ success: true, message: 'PDF processed and embeddings stored in Supabase' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: String(err) });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map