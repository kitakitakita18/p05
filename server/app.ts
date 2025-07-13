const express = require("express");
const openaiRouter = require("./routes/openai");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5105;

// Middleware
app.use(express.json());

// Routes
app.use("/api/openai", openaiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TypeScript OpenAI Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`OpenAI TypeScript Server running on port ${PORT}`);
  });
}

module.exports = app;