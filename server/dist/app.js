"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const openaiRouter = require("./routes/openai");
require("dotenv").config();
const auth_1 = __importDefault(require("./routes/auth"));
const upload_1 = __importDefault(require("./routes/upload"));
const ask_1 = __importDefault(require("./routes/ask"));
const app = express();
const PORT = process.env.PORT || 5105;
// Middleware
app.use(express.json());
// API Routes
app.use("/api/auth", auth_1.default);
app.use("/api/upload", upload_1.default);
app.use("/api/openai", openaiRouter);
app.use("/api", ask_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'TypeScript OpenAI Server is running',
        timestamp: new Date().toISOString()
    });
});
// ===== ✅ React のビルド済みファイルをサーブ =====
const clientBuildPath = path.join(__dirname, "../client/build");
app.use(express.static(clientBuildPath));
app.get("*", (req, res) => {
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
//# sourceMappingURL=app.js.map