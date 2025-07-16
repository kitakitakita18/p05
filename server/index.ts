import dotenv from 'dotenv';
import path from 'path';

// 環境変数を最初に読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express from 'express';
import uploadRoute from './routes/upload';
import searchRoute from './routes/search';

const app = express();
const port = process.env.PORT || 5105;

app.use(express.json());
app.use('/api/upload', uploadRoute);
app.use('/api/search', searchRoute);

app.listen(port, () => {
  console.log(`🚀 Supabase統合サーバー起動: http://localhost:${port}`);
});