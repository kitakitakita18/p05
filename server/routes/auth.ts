import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // ★ 本番ではDBでユーザー認証
  if (email === "admin@example.com" && password === "password123") {
    const user = { id: 1, email, role: "admin" };

    // JWT生成
    const token = jwt.sign(
      user,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1h" }
    );

    return res.json({ token });
  }

  res.status(401).json({ message: "認証失敗: メールアドレスまたはパスワードが違います" });
});

export default router;