import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

interface MinutesFile {
  id: number;
  name: string;
  uploadDate: string;
  size: string;
  type: string;
  content: string;
  originalFile?: File;
}

interface MinutesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: number;
  meetingTitle?: string;
}

const MinutesPopup: React.FC<MinutesPopupProps> = ({ 
  isOpen, 
  onClose, 
  meetingId, 
  meetingTitle 
}) => {
  const [minutesFiles, setMinutesFiles] = useState<MinutesFile[]>([]);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<MinutesFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && meetingId) {
      fetchMinutesFiles();
    }
  }, [isOpen, meetingId]);

  const fetchMinutesFiles = async () => {
    setIsLoading(true);
    try {
      // 仮の議事録ファイルデータ（実際の実装では API から取得）
      const mockFiles: MinutesFile[] = [
        { 
          id: 1, 
          name: '第1回理事会議事録.pdf', 
          uploadDate: '2025-07-10', 
          size: '245KB',
          type: 'application/pdf',
          content: `第1回理事会議事録

日時: 2025年7月10日 14:00-16:00
場所: マンション集会室
出席者: 理事長、副理事長、監事、理事A、理事B

議題:
1. 管理費について
   - 現在の管理費収支状況の報告
   - 来年度の管理費見直し案の検討
   
2. 大規模修繕計画
   - 外壁塗装工事の見積もり検討
   - 修繕積立金の使用計画
   
3. その他
   - 住民からの要望事項について
   - 次回理事会の日程調整

決議事項:
- 管理費の値上げは見送り
- 大規模修繕は来年度実施予定
- 次回理事会は8月15日に決定`
        },
        { 
          id: 2, 
          name: '理事会資料.docx', 
          uploadDate: '2025-07-08', 
          size: '128KB',
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          content: `理事会資料

【予算案について】
- 今年度の収支状況
  収入: 1,200万円
  支出: 1,150万円
  差額: 50万円

- 来年度の予算計画
  管理費: 据え置き
  修繕積立金: 月額500円増額検討

- 修繕積立金の状況
  現在残高: 3,500万円
  大規模修繕予定額: 2,800万円`
        },
        { 
          id: 3, 
          name: 'メモ.txt', 
          uploadDate: '2025-07-05', 
          size: '2KB',
          type: 'text/plain',
          content: `理事会メモ

要検討事項:
- ペット飼育規約の見直し
  現在のルールが不明確
  住民からの要望が多数

- 駐車場の利用ルール
  空き区画の有効活用
  月極駐車場の料金見直し

- 防災対策の強化
  防災用品の点検・補充
  避難訓練の実施計画`
        }
      ];

      setMinutesFiles(mockFiles);
    } catch (error) {
      console.error('議事録ファイルの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newFile: MinutesFile = {
          id: Date.now(),
          name: file.name,
          uploadDate: new Date().toISOString().split('T')[0],
          size: `${Math.round(file.size / 1024)}KB`,
          type: file.type,
          content: e.target?.result as string,
          originalFile: file
        };

        if (file.type.startsWith('text/')) {
          setMinutesFiles(prev => [...prev, newFile]);
        } else {
          // バイナリファイルの場合
          const binaryFile: MinutesFile = {
            ...newFile,
            content: `${file.name}

ファイルタイプ: ${file.type}
サイズ: ${Math.round(file.size / 1024)}KB

※ このファイルはバイナリ形式です。閲覧には専用のアプリケーションが必要です。`
          };
          setMinutesFiles(prev => [...prev, binaryFile]);
        }
        
        alert(`ファイル「${file.name}」を追加しました`);
      };
      
      if (file.type.startsWith('text/')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleViewFile = (file: MinutesFile) => {
    setViewingFile(file);
    setShowFileViewer(true);
  };

  const handleDownloadFile = (file: MinutesFile) => {
    let blob: Blob;
    
    if (file.originalFile) {
      blob = file.originalFile;
    } else {
      blob = new Blob([file.content], { type: file.type });
    }
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    alert(`「${file.name}」をダウンロードしました`);
  };

  const handleDeleteFile = (fileId: number) => {
    const file = minutesFiles.find(f => f.id === fileId);
    if (file && window.confirm(`「${file.name}」を削除しますか？`)) {
      setMinutesFiles(prev => prev.filter(f => f.id !== fileId));
      alert('ファイルを削除しました');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* メイン議事録ポップアップ */}
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
          {/* ヘッダー */}
          <div style={styles.header}>
            <h2 style={styles.title}>
              議事録管理 {meetingTitle && `- ${meetingTitle}`}
            </h2>
            <button onClick={onClose} style={styles.closeButton}>
              ×
            </button>
          </div>

          {/* ファイルアップロードセクション */}
          <div style={styles.uploadSection}>
            <label style={styles.uploadButton}>
              <span>📁 ファイルを追加</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                style={styles.hiddenInput}
              />
            </label>
          </div>

          {/* ファイル一覧 */}
          <div style={styles.fileListContainer}>
            {isLoading ? (
              <div style={styles.loading}>議事録を読み込み中...</div>
            ) : minutesFiles.length > 0 ? (
              <>
                <div style={styles.fileListHeader}>
                  <span>📄 ファイル名</span>
                  <span>📅 アップロード日</span>
                  <span>📊 サイズ</span>
                  <span>⚙️ 操作</span>
                </div>
                {minutesFiles.map((file) => (
                  <div key={file.id} style={styles.fileItem}>
                    <span style={styles.fileName}>{file.name}</span>
                    <span style={styles.fileDate}>
                      {format(new Date(file.uploadDate), 'yyyy/MM/dd', { locale: ja })}
                    </span>
                    <span style={styles.fileSize}>{file.size}</span>
                    <div style={styles.fileActions}>
                      <button
                        onClick={() => handleViewFile(file)}
                        style={{...styles.actionButton, ...styles.viewButton}}
                        title="ファイル内容を表示"
                      >
                        👀 閲覧
                      </button>
                      <button
                        onClick={() => handleDownloadFile(file)}
                        style={{...styles.actionButton, ...styles.downloadButton}}
                        title="ファイルをダウンロード"
                      >
                        💾 DL
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        style={{...styles.actionButton, ...styles.deleteButton}}
                        title="ファイルを削除"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={styles.noFiles}>
                📝 議事録ファイルがありません
                <p style={styles.noFilesSubtext}>
                  上のボタンからファイルを追加してください
                </p>
              </div>
            )}
          </div>

          {/* フッター */}
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.footerButton}>
              閉じる
            </button>
          </div>
        </div>
      </div>

      {/* ファイルビューアポップアップ */}
      {showFileViewer && viewingFile && (
        <div style={styles.viewerOverlay} onClick={() => setShowFileViewer(false)}>
          <div style={styles.viewerPopup} onClick={(e) => e.stopPropagation()}>
            <div style={styles.viewerHeader}>
              <h3 style={styles.viewerTitle}>
                📄 {viewingFile.name}
              </h3>
              <div style={styles.viewerActions}>
                <button
                  onClick={() => handleDownloadFile(viewingFile)}
                  style={styles.downloadButtonLarge}
                >
                  💾 ダウンロード
                </button>
                <button 
                  onClick={() => setShowFileViewer(false)}
                  style={styles.closeButton}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div style={styles.viewerContent}>
              {viewingFile.type === 'text/plain' && (
                <div style={styles.textViewer}>
                  <pre style={styles.textContent}>{viewingFile.content}</pre>
                </div>
              )}
              
              {viewingFile.type === 'application/pdf' && (
                <div style={styles.documentViewer}>
                  <div style={styles.documentHeader}>
                    <h4>📄 PDF文書</h4>
                  </div>
                  <div style={styles.documentContent}>
                    <pre style={styles.documentText}>{viewingFile.content}</pre>
                  </div>
                  <div style={styles.documentNote}>
                    ※ 実際のPDF表示には専用のビューワーが必要です。
                    <br />ダウンロードしてPDFリーダーで開いてください。
                  </div>
                </div>
              )}
              
              {viewingFile.type.includes('word') && (
                <div style={styles.documentViewer}>
                  <div style={styles.documentHeader}>
                    <h4>📝 Word文書</h4>
                  </div>
                  <div style={styles.documentContent}>
                    <pre style={styles.documentText}>{viewingFile.content}</pre>
                  </div>
                  <div style={styles.documentNote}>
                    ※ 実際のWord文書表示には専用のビューワーが必要です。
                    <br />ダウンロードしてWord等で開いてください。
                  </div>
                </div>
              )}
            </div>
            
            <div style={styles.viewerFooter}>
              <button
                onClick={() => setShowFileViewer(false)}
                style={styles.footerButton}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out',
  },
  popup: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    maxWidth: '900px',
    width: '90%',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    animation: 'slideUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '2px solid #e9ecef',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#666',
    padding: '5px',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  uploadSection: {
    padding: '20px 25px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#ffffff',
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.3)',
  },
  hiddenInput: {
    display: 'none',
  },
  fileListContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px 25px',
  },
  fileListHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
    gap: '15px',
    padding: '15px 20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: '15px',
    border: '1px solid #e9ecef',
  },
  fileItem: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
    gap: '15px',
    padding: '15px 20px',
    backgroundColor: 'white',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    marginBottom: '8px',
    alignItems: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  fileName: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
  },
  fileDate: {
    fontSize: '13px',
    color: '#666',
  },
  fileSize: {
    fontSize: '13px',
    color: '#666',
  },
  fileActions: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'flex-start',
  },
  actionButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  viewButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  downloadButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  noFiles: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#6c757d',
    fontSize: '16px',
    textAlign: 'center' as const,
  },
  noFilesSubtext: {
    fontSize: '14px',
    color: '#868e96',
    margin: '10px 0 0 0',
  },
  footer: {
    padding: '20px 25px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  footerButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '150px',
    fontSize: '16px',
    color: '#6c757d',
  },
  
  // ファイルビューア用スタイル
  viewerOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  viewerPopup: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '95%',
    width: '1000px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 15px 40px rgba(0, 0, 0, 0.4)',
  },
  viewerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '2px solid #e9ecef',
    backgroundColor: '#f8f9fa',
  },
  viewerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  viewerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  downloadButtonLarge: {
    padding: '10px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  viewerContent: {
    flex: 1,
    overflow: 'auto',
    padding: '25px',
    backgroundColor: '#f8f9fa',
  },
  textViewer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e9ecef',
  },
  textContent: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
    whiteSpace: 'pre-wrap',
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    margin: 0,
  },
  documentViewer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e9ecef',
  },
  documentHeader: {
    textAlign: 'center' as const,
    marginBottom: '20px',
    color: '#495057',
  },
  documentContent: {
    backgroundColor: '#fff',
    padding: '20px',
    margin: '20px 0',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
    minHeight: '200px',
  },
  documentText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
    whiteSpace: 'pre-wrap',
    fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    margin: 0,
  },
  documentNote: {
    fontSize: '12px',
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
  },
  viewerFooter: {
    padding: '20px 25px',
    borderTop: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa',
    display: 'flex',
    justifyContent: 'center',
  },
};

export default MinutesPopup;