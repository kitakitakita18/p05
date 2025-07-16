import express from 'express';
import multer from 'multer';
import { processPdfAndStoreEmbeddings } from '../utils/pdfEmbedding';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/pdf', upload.single('pdf'), async (req, res) => {
  try {
    const { unionId, regulationName } = req.body;
    const pdfPath = req.file?.path;

    if (!pdfPath || !unionId || !regulationName) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    await processPdfAndStoreEmbeddings(pdfPath, unionId, regulationName);
    res.json({ success: true, message: 'PDF processed and embeddings stored in Supabase' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;