import React, { useState } from "react";
import { sendChatMessage } from "../utils/api";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendChatMessage([...messages, userMessage]);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error.response?.data?.error || error.message || "AI応答エラー";
      alert(`AI応答エラー: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('Auth check - Token:', token ? token.substring(0, 20) + '...' : 'none');
    console.log('Auth check - User:', user);
    alert(`Token: ${token ? 'Present' : 'Missing'}\nUser: ${user ? 'Present' : 'Missing'}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>GPT‑4.1 nano チャット</h2>
        <button 
          onClick={clearMessages} 
          style={styles.clearButton}
          disabled={loading}
        >
          チャットクリア
        </button>
        <button 
          onClick={checkAuth} 
          style={{...styles.clearButton, marginLeft: '10px'}}
        >
          認証確認
        </button>
      </div>
      
      <div style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            理事会に関する質問やお手伝いできることがあれば、お気軽にお聞かせください。
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={styles.messageWrapper}>
              <div style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
              }}>
                <div style={styles.messageRole}>
                  <strong>{msg.role === 'user' ? 'あなた' : 'AI アシスタント'}</strong>
                </div>
                <div style={styles.messageContent}>{msg.content}</div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={styles.messageWrapper}>
            <div style={{...styles.message, ...styles.assistantMessage}}>
              <div style={styles.messageRole}><strong>AI アシスタント</strong></div>
              <div style={styles.loadingMessage}>
                <span style={styles.loadingDots}>考え中</span>
                <span style={styles.loadingAnimation}>...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div style={styles.inputContainer}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="理事会に関する質問を入力してください..."
          style={styles.input}
          disabled={loading}
        />
        <button 
          onClick={handleSend} 
          disabled={loading || !input.trim()}
          style={{
            ...styles.sendButton,
            ...(loading || !input.trim() ? styles.sendButtonDisabled : {})
          }}
        >
          {loading ? "送信中..." : "送信"}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '600px',
    maxWidth: '800px',
    margin: '20px auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px 8px 0 0',
  },
  title: {
    margin: 0,
    color: '#333',
    fontSize: '18px',
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.3s',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px',
    backgroundColor: '#fafafa',
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#666',
    fontStyle: 'italic',
    marginTop: '50px',
    fontSize: '14px',
  },
  messageWrapper: {
    marginBottom: '15px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    maxWidth: '80%',
    wordWrap: 'break-word' as const,
  },
  userMessage: {
    backgroundColor: '#007bff',
    color: 'white',
    marginLeft: 'auto',
    textAlign: 'right' as const,
  },
  assistantMessage: {
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #ddd',
    marginRight: 'auto',
  },
  messageRole: {
    fontSize: '12px',
    marginBottom: '4px',
    opacity: 0.8,
  },
  messageContent: {
    fontSize: '14px',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap' as const,
  },
  loadingMessage: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#666',
  },
  loadingDots: {
    marginRight: '4px',
  },
  loadingAnimation: {
    animation: 'blink 1.5s infinite',
  },
  inputContainer: {
    display: 'flex',
    padding: '15px 20px',
    borderTop: '1px solid #eee',
    backgroundColor: '#fff',
    borderRadius: '0 0 8px 8px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px 0 0 4px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s',
  },
  sendButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '0 4px 4px 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
  },
  sendButtonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed',
  },
};

export default Chat;