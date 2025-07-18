import React, { useState } from "react";
import { sendChatMessage, searchDocuments } from "../utils/api";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const userInput = input;
    
    // 状態更新の改善: 関数型更新を使用
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSearchLoading(true);

    // 🔍 ①検索結果を取得して先に表示
    try {
      console.log('🔍 検索を実行中...', { userInput, timestamp: new Date().toISOString() });
      const searchResponse = await searchDocuments(userInput);
      console.log('🔍 検索API完全レスポンス:', JSON.stringify(searchResponse, null, 2));
      console.log('🔍 検索結果配列:', searchResponse?.results);
      console.log('🔍 検索結果数:', searchResponse?.results?.length || 0);
      
      if (searchResponse && searchResponse.results && searchResponse.results.length > 0) {
        console.log('🔍 各検索結果の詳細:');
        searchResponse.results.forEach((result: any, index: number) => {
          console.log(`  結果${index + 1}:`, {
            hasChunk: !!result.chunk,
            hasContent: !!result.content,
            similarity: result.similarity,
            allKeys: Object.keys(result),
            rawResult: result
          });
        });
        
        // 検索結果をシステムメッセージとして一番上に追加
        const searchResultsMessage = {
          role: "system",
          content: `🔍 **検索結果（関連文書）** - ${searchResponse.results.length}件\n\n${searchResponse.results.map((result: any, index: number) => {
            // より多くのプロパティ名に対応
            const text = result.chunk || result.content || result.text || result.document || result.passage || 
                        (typeof result === 'string' ? result : JSON.stringify(result));
            const similarity = result.similarity || result.score || result.match_score || result.relevance || 0;
            
            // テキストの長さ制限（500文字まで）
            const displayText = typeof text === 'string' && text.length > 500 
              ? text.substring(0, 500) + '...' 
              : text;
            
            return `**${index + 1}.** ${displayText}\n   📊 類似度: ${(similarity * 100).toFixed(1)}%`;
          }).join('\n\n---\n\n')}`
        };
        setMessages((prev) => [...prev, searchResultsMessage]);
        console.log('✅ 検索結果メッセージを追加しました');
      } else {
        console.log('⚠️ 検索結果が空またはnull:', { 
          searchResponse, 
          hasResults: !!searchResponse?.results,
          resultsLength: searchResponse?.results?.length 
        });
        // 検索結果なしの場合
        const noResultsMessage = {
          role: "system",
          content: `🔍 検索結果（関連文書）は見つかりませんでした。\n\nデバッグ情報: 質問「${userInput}」に対する検索を実行しましたが、関連する文書が見つかりませんでした。`
        };
        setMessages((prev) => [...prev, noResultsMessage]);
      }
    } catch (searchError: any) {
      console.error('検索エラー:', searchError);
      const searchErrorMessage = {
        role: "system",
        content: "❌ 検索中にエラーが発生しました。"
      };
      setMessages((prev) => [...prev, searchErrorMessage]);
    } finally {
      setSearchLoading(false);
    }

    // 🤖 ②AI応答を取得
    try {
      setLoading(true);
      console.log('🤖 AI応答を取得中...');
      
      // 現在のメッセージ履歴にユーザーメッセージを追加してAIに送信
      setMessages(currentMessages => {
        const messagesWithUser = [...currentMessages, userMessage];
        // AI応答を非同期で取得
        sendChatMessage(messagesWithUser).then(response => {
          const aiContent = typeof response === 'string' ? response : response.content;
          setMessages(prev => [...prev, { role: "assistant", content: aiContent }]);
          console.log('✅ AI応答メッセージを追加しました');
        }).catch(error => {
          console.error('AI応答エラー:', error);
          const errorMessage = error.response?.data?.error || error.message || "AI応答エラー";
          const aiErrorMessage = {
            role: "assistant",
            content: `❌ AI応答の取得中にエラーが発生しました: ${errorMessage}`
          };
          setMessages(prev => [...prev, aiErrorMessage]);
        }).finally(() => {
          setLoading(false);
        });
        
        return messagesWithUser;
      });
      
    } catch (error: any) {
      console.error('🤖 AI応答取得でキャッチされたエラー:', error);
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
                ...(msg.role === 'user' ? styles.userMessage : 
                    msg.role === 'system' ? styles.systemMessage : styles.assistantMessage)
              }}>
                <div style={styles.messageRole}>
                  <strong>
                    {msg.role === 'user' ? 'あなた' : 
                     msg.role === 'system' ? '検索結果' : 'AI アシスタント'}
                  </strong>
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
  systemMessage: {
    backgroundColor: '#f0f8ff',
    color: '#1e40af',
    border: '2px solid #3b82f6',
    marginRight: 'auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
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