const express = require("express");
const path = require("path");
const openaiRouter = require("./routes/openai");
require("dotenv").config();

import { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 5105;

// Middleware
app.use(express.json());

// API Routes
app.use("/api/openai", openaiRouter);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        message: 'TypeScript OpenAI Server is running',
        timestamp: new Date().toISOString()
    });
});

// ===== ✅ React のビルド済みファイルをサーブ =====
const clientBuildPath = path.join(__dirname, "../client/build");
app.use(express.static(clientBuildPath));

app.get("*", (req: Request, res: Response) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
});
// ===============================================

// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`OpenAI TypeScript Server running on port ${PORT}`);
    });
}

module.exports = app;