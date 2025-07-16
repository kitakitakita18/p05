import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createEmbedding, storeDocument, createEmbeddingsWithChunks, storeDocumentWithChunks } from '../utils/embedding';
import { authenticateToken } from '../middlewares/auth';
import { supabase } from '../utils/supabaseClient';

// Request型の拡張
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

const router = express.Router();

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${timestamp}-${name}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDFファイルのみアップロード可能です'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB制限
  }
});

// PDFアップロードエンドポイント
router.post('/pdf', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDFファイルが必要です' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // PDFテキスト抽出
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const extractedText = pdfData.text;

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'PDFからテキストを抽出できませんでした' });
    }

    // チャンク化された埋め込み生成
    const chunks = await createEmbeddingsWithChunks(extractedText);

    // Supabaseに保存
    const unionId = 'default'; // TODO: 実際の組合IDを設定
    const regulationName = fileName;
    
    for (let i = 0; i < chunks.length; i++) {
      const { error } = await supabase.from('regulation_chunks').insert({
        unionId,
        regulationName,
        chunk: chunks[i].text,
        embedding: chunks[i].embedding, // OpenAI生成のembeddingベクトル
      });
      if (error) throw error;
    }

    res.json({
      success: true,
      message: 'Supabaseに保存しました',
      fileName,
      chunksCount: chunks.length,
      totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokens, 0),
      extractedText: extractedText.substring(0, 500) + '...', // プレビュー用
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    
    // アップロードファイルを削除（エラー時）
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('ファイル削除エラー:', unlinkErr);
      });
    }

    res.status(500).json({ 
      error: 'PDFアップロード処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// アップロード済みファイル一覧
router.get('/files', authenticateToken, async (req, res) => {
  try {
    // TODO: データベースからファイル一覧を取得
    res.json({
      success: true,
      files: []
    });
  } catch (error) {
    console.error('Files list error:', error);
    res.status(500).json({ error: 'ファイル一覧の取得に失敗しました' });
  }
});

// ファイル削除
router.delete('/files/:id', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // TODO: データベースからファイル情報を取得して削除
    
    res.json({
      success: true,
      message: 'ファイルが削除されました'
    });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: 'ファイル削除に失敗しました' });
  }
});

export default router;