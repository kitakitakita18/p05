import React, { useState } from "react";
import { sendChatMessage, searchDocuments } from "../utils/api";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(true);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const userInput = input;
    let searchResponse: any = null;
    
    // 状態更新の改善: 関数型更新を使用
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    // 🤖 ①AI応答を先に取得して表示
    try {
      setLoading(true);
      console.log('🤖 AI応答を取得中...', { ragEnabled });
      
      // RAG有効/無効の設定をバックエンドに送信
      const response = await sendChatMessage([userMessage], ragEnabled);
      const aiContent = typeof response === 'string' ? response : response.content;
      
      // AI応答をメッセージ履歴に追加
      setMessages(prev => [...prev, { role: "assistant", content: aiContent }]);
      console.log('✅ AI応答メッセージを追加しました');
      
    } catch (error: any) {
      console.error('AI応答エラー:', error);
      const errorMessage = error.response?.data?.error || error.message || "AI応答エラー";
      const aiErrorMessage = {
        role: "assistant",
        content: `❌ AI応答の取得中にエラーが発生しました: ${errorMessage}`
      };
      setMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setLoading(false);
    }

    // 🔍 ②検索結果を後で表示（RAG有効時のみ）
    if (ragEnabled) {
      try {
        setSearchLoading(true);
        console.log('🔍 フロントエンド検索を実行中...', { userInput, timestamp: new Date().toISOString() });
        searchResponse = await searchDocuments(userInput);
        console.log('🔍 フロントエンド検索API完全レスポンス:', JSON.stringify(searchResponse, null, 2));
        console.log('🔍 フロントエンド検索結果配列:', searchResponse?.results);
        console.log('🔍 フロントエンド検索結果数:', searchResponse?.results?.length || 0);
      
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
        
        // 検索結果の詳細を表示（条文を優先する改良版フィルタリング）
        const filteredResults = searchResponse.results
          // 上位5件を取得
          .slice(0, 5)
          // 条文優先の再ランキング
          .map((result: any) => {
            const chunk = result.chunk || result.content || 'コンテンツなし';
            const questionLower = userInput.toLowerCase().replace(/[とは？について教えてください何ですか]/g, '').trim();
            const keywords = questionLower.split(/\s+/).filter(k => k.length > 0);
            
            // 条文判定（第○条が含まれているか）
            const hasArticle = /第\d+条/.test(chunk);
            
            // 定義文判定（「○ キーワード 説明文」の形式）
            const isDefinition = /[一二三四五六七八九十]\s+[^。]+\s+[^。]*をいう/.test(chunk) ||
                                 /^\s*[一二三四五六七八九十]\s+/.test(chunk);
            
            // 住戸番号リストの判定（別表第3、4や連続する住戸番号を含む）
            const isHousingList = /別表第[3-4]/.test(chunk) || 
                                  /\d{3}号室/.test(chunk) || 
                                  /住戸番号/.test(chunk) ||
                                  /(?:\d{3}号室[^\n]*\n){3,}/.test(chunk);
            
            // キーワードマッチスコアを計算
            let keywordScore = 0;
            const chunkLower = chunk.toLowerCase();
            
            for (const keyword of keywords) {
              if (chunkLower.includes(keyword)) {
                keywordScore += 1.0;
                // 複合キーワードの場合はさらに高スコア
                if (keywords.length > 1) {
                  const allKeywordsPresent = keywords.every(k => chunkLower.includes(k));
                  if (allKeywordsPresent) {
                    keywordScore += 2.0;
                  }
                }
              }
            }
            
            // 定義文ボーナス：定義文を含む場合は最高スコア
            if (isDefinition) {
              keywordScore += 10.0;
            }
            
            // 条文ボーナス：条文を含む場合は大幅にスコアを上げる
            if (hasArticle && !isDefinition) {
              keywordScore += 5.0;
            }
            
            // 住戸番号リストペナルティ：住戸番号リストの場合はスコアを大幅に下げる
            if (isHousingList && !hasArticle) {
              keywordScore -= 3.0;
            }
            
            // 関連性の低い結果を除外
            if (keywordScore <= 0 && result.similarity < 0.4) {
              keywordScore = -1.0;
            }
            
            // 類似度とキーワードスコアを組み合わせて総合スコアを算出
            const combinedScore = result.similarity * 0.3 + keywordScore * 0.7;
            
            return {
              ...result,
              keywordScore,
              combinedScore,
              hasArticle,
              isDefinition,
              isHousingList
            };
          })
          // 関連性の低い結果を除外
          .filter((result: any) => result.combinedScore > 0)
          // 総合スコアでソート（条文が優先される）
          .sort((a: any, b: any) => b.combinedScore - a.combinedScore)
          // 上位3件に絞る
          .slice(0, 3);

          const searchResultsMessage = {
            role: "system",
            content: filteredResults.length > 0 ? 
              `🔍 関連文書の検索結果（${searchResponse.results.length}件中、関連性の高い${filteredResults.length}件を表示）\n\n` +
              filteredResults.map((result: any, index: number) => {
                const similarity = (result.similarity * 100).toFixed(1);
                const keywordScore = result.keywordScore || 0;
                const chunk = result.chunk || result.content || 'コンテンツなし';
                
                // 質問のキーワードを抽出（「とは」「について」などを除外）
                const questionLower = userInput.toLowerCase().replace(/[とは？について教えてください何ですか]/g, '').trim();
                const keywords = questionLower.split(/\s+/).filter(k => k.length > 0);
                
                // キーワードにマッチする文や項目を抽出
                const extractRelevantParts = (text: string, keywords: string[]): string[] => {
                  const parts = [];
                  const textLower = text.toLowerCase();
                  
                  // 各キーワードについて関連部分を抽出
                  for (const keyword of keywords) {
                    if (textLower.includes(keyword)) {
                      // 番号付きリスト（一 、二 、三 など）の項目を抽出
                      const numberedItemRegex = new RegExp(`[一二三四五六七八九十]{1,2}\\s+${keyword}[^。]*。?`, 'gi');
                      const numberedMatches = text.match(numberedItemRegex);
                      if (numberedMatches) {
                        parts.push(...numberedMatches);
                      }
                      
                      // 番号付きリスト（1. 2. 3. など）の項目を抽出
                      const numberedItemRegex2 = new RegExp(`\\d+\\.?\\s+[^。]*${keyword}[^。]*。?`, 'gi');
                      const numberedMatches2 = text.match(numberedItemRegex2);
                      if (numberedMatches2) {
                        parts.push(...numberedMatches2);
                      }
                      
                      // 第X条形式の抽出
                      const articleRegex = new RegExp(`第\\d+条[^。]*${keyword}[^。]*。?`, 'gi');
                      const articleMatches = text.match(articleRegex);
                      if (articleMatches) {
                        parts.push(...articleMatches);
                      }
                      
                      // 通常の文章からキーワードを含む文を抽出
                      const sentences = text.split(/[。！？]/).filter(s => s.trim().length > 0);
                      const keywordSentences = sentences.filter(s => 
                        s.toLowerCase().includes(keyword) && s.trim().length > 0
                      );
                      if (keywordSentences.length > 0) {
                        parts.push(...keywordSentences.map(s => s.trim() + (s.endsWith('。') ? '' : '。')));
                      }
                    }
                  }
                  
                  // 重複を除去して返す
                  return Array.from(new Set(parts)).filter(p => p.trim().length > 0);
                };
                
                const relevantParts = extractRelevantParts(chunk, keywords);
                
                let preview = '';
                if (relevantParts.length > 0) {
                  // 最も関連性の高い部分を表示（最初の2つまで）
                  preview = relevantParts.slice(0, 2).join('\n');
                  // 抽出した部分を強調表示
                  preview = `🎯 ${preview}`;
                } else {
                  // キーワードが見つからない場合は従来通り先頭から表示
                  preview = chunk.length > 200 ? chunk.substring(0, 200) + '...' : chunk;
                }
                
                // キーワードスコアの表示
                const scoreInfo = keywordScore > 0 ? ` [キーワード適合度: ${keywordScore.toFixed(1)}]` : '';
                const definitionInfo = result.isDefinition ? ' [定義文]' : '';
                const articleInfo = result.hasArticle ? ' [条文]' : '';
                const housingInfo = result.isHousingList ? ' [住戸リスト]' : '';
                return `📄 結果${index + 1}: (類似度: ${similarity}%${scoreInfo}${definitionInfo}${articleInfo}${housingInfo})\n${preview}`;
              }).join('\n\n')
              : 
              `🔍 関連文書の検索結果（${searchResponse.results.length}件検索しましたが、関連性の高い結果が見つかりませんでした）\n\n` +
              `💡 **データベースに該当する情報が存在しない可能性があります。**\n` +
              `**解決策:** 管理組合の規約原本を確認するか、不足している規約内容をデータベースに追加してください。`
          };
          setMessages((prev) => [...prev, searchResultsMessage]);
          console.log('✅ 検索完了メッセージを追加しました');
        } else {
          console.log('⚠️ 検索結果が空またはnull:', { 
            searchResponse, 
            hasResults: !!searchResponse?.results,
            resultsLength: searchResponse?.results?.length 
          });
          // 検索結果なしの場合
          const noResultsMessage = {
            role: "system",
            content: `🔍 関連する文書が見つかりませんでした。`
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
        <div style={styles.headerControls}>
          <div style={styles.ragToggle}>
            <label style={styles.ragToggleLabel}>
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
                style={styles.ragToggleCheckbox}
              />
              <span style={styles.ragToggleText}>
                {ragEnabled ? '🔍 RAG有効' : '🚫 RAG無効'}
              </span>
            </label>
          </div>
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
        
        {/* 検索中の表示（RAG有効時のみ） */}
        {ragEnabled && searchLoading && (
          <div style={styles.searchLoadingContainer}>
            <div style={styles.searchLoadingMessage}>
              🔍 関連する規約・文書を検索中...
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
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  ragToggle: {
    display: 'flex',
    alignItems: 'center',
  },
  ragToggleLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: '#e9ecef',
    border: '1px solid #ced4da',
    transition: 'all 0.3s ease',
  },
  ragToggleCheckbox: {
    marginRight: '6px',
  },
  ragToggleText: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#495057',
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