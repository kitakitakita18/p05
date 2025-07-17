import React, { useState } from "react";
import { sendChatMessage, searchDocuments } from "../utils/api";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const userInput = input;
    setMessages([...messages, userMessage]);
    setInput("");
    setSearchLoading(true);

    try {
      // 🥇 ステップ1: ベクトル検索を実行
      console.log('🔍 ベクトル検索を実行中...');
      const searchResponse = await searchDocuments(userInput);
      console.log('🔍 検索結果:', searchResponse);
      
      const searchMatches = searchResponse.results || [];
      setSearchResults(searchMatches);
      setSearchLoading(false);
      
      // 検索結果があれば表示
      if (searchMatches.length > 0) {
        setShowSearchResults(true);
      }

      // 🥈 ステップ2: 検索結果を含めてチャットAPIに送信
      setLoading(true);
      
      // 検索結果を整形してコンテキストとして追加
      const context = searchMatches.length > 0 
        ? searchMatches.map((match: any) => `- ${match.chunk}`).join('\n')
        : '';

      const enhancedMessages = [...messages, userMessage];
      if (context) {
        // システムメッセージとして検索結果を追加
        enhancedMessages.unshift({
          role: "system",
          content: `以下の規約・文書情報を参考に回答してください：\n\n${context}`
        });
      }

      const reply = await sendChatMessage(enhancedMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error.response?.data?.error || error.message || "AI応答エラー";
      alert(`AI応答エラー: ${errorMessage}`);
    } finally {
      setLoading(false);
      setSearchLoading(false);
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
        
        {/* 検索中の表示 */}
        {searchLoading && (
          <div style={styles.searchLoadingContainer}>
            <div style={styles.searchLoadingMessage}>
              🔍 関連する規約・文書を検索中...
            </div>
          </div>
        )}
        
        {/* 検索結果の表示 */}
        {showSearchResults && searchResults.length > 0 && (
          <div style={styles.searchResultsContainer}>
            <div style={styles.searchResultsHeader}>
              <strong>🔍 関連する規約・文書 ({searchResults.length}件)</strong>
              <button 
                onClick={() => setShowSearchResults(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.searchResultsList}>
              {searchResults.map((result: any, idx: number) => (
                <div key={idx} style={styles.searchResult}>
                  <div style={styles.searchResultSimilarity}>
                    類似度: {(result.similarity * 100).toFixed(1)}%
                  </div>
                  <div style={styles.searchResultContent}>
                    {result.chunk}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
  searchResultsContainer: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    margin: '10px 0',
    padding: '15px',
  },
  searchResultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    fontSize: '14px',
    color: '#495057',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#6c757d',
    padding: '0 4px',
  },
  searchResultsList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
  },
  searchResult: {
    backgroundColor: 'white',
    border: '1px solid #e9ecef',
    borderRadius: '4px',
    padding: '10px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  searchResultSimilarity: {
    color: '#6c757d',
    fontSize: '11px',
    marginBottom: '5px',
    fontWeight: 'bold',
  },
  searchResultContent: {
    lineHeight: '1.4',
    color: '#333',
  },
  searchLoadingContainer: {
    backgroundColor: '#e3f2fd',
    border: '1px solid #90caf9',
    borderRadius: '8px',
    margin: '10px 0',
    padding: '15px',
  },
  searchLoadingMessage: {
    textAlign: 'center' as const,
    color: '#1976d2',
    fontStyle: 'italic',
    fontSize: '14px',
  },
};

export default Chat;