"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// 環境変数を最初に読み込み
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
const express_1 = __importDefault(require("express"));
const upload_1 = __importDefault(require("./routes/upload"));
const search_1 = __importDefault(require("./routes/search"));
const app = (0, express_1.default)();
const port = process.env.PORT || 5105;
app.use(express_1.default.json());
app.use('/api/upload', upload_1.default);
app.use('/api/search', search_1.default);
app.listen(port, () => {
    console.log(`🚀 Supabase統合サーバー起動: http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map