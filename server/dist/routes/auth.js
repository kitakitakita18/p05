"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
// POST /api/auth/login
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    // ★ 本番ではDBでユーザー認証
    if (email === "admin@example.com" && password === "password123") {
        const user = { id: 1, email, role: "admin" };
        // JWT生成
        const token = jsonwebtoken_1.default.sign(user, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "1h" });
        return res.json({ token });
    }
    res.status(401).json({ message: "認証失敗: メールアドレスまたはパスワードが違います" });
});
exports.default = router;
//# sourceMappingURL=auth.js.map