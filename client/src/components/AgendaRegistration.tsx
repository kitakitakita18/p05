import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Meeting, Agenda } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

const AgendaRegistration: React.FC = () => {
  const { user } = useAuth();
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // ファイルアップロード用の状態
  const [agendaDocuments, setAgendaDocuments] = useState<{[key: number]: any[]}>({});
  const [uploadingFile, setUploadingFile] = useState(false);

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discussion_result: '',
    status: 'not_started' as 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'finished',
    category: '',
    approval_status: '' as '' | 'approved' | 'rejected',
    priority: 'C' as 'S' | 'A' | 'B' | 'C',
    start_date: '',
    due_date: ''
  });

  const fetchYears = React.useCallback(async () => {
    try {
      const yearsData = await api.getMeetingYears();
      setYears(yearsData);
      if (yearsData.length > 0 && !selectedYear) {
        setSelectedYear(yearsData[0]);
      }
    } catch (error) {
      console.error('Failed to fetch years:', error);
    }
  }, [selectedYear]);

  const fetchMeetings = React.useCallback(async (year: string) => {
    try {
      const meetingsData = await api.getMeetingsByYear(year);
      setMeetings(meetingsData);
      
      if (meetingsData.length > 0 && !selectedMeeting) {
        setSelectedMeeting(meetingsData[0]);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    }
  }, [selectedMeeting]);

  const fetchAgendas = React.useCallback(async (meetingId: number) => {
    try {
      const agendasData = await api.getAgendas(meetingId);
      setAgendas(agendasData);
      
      // 各議題の文書を取得
      const documentsData: {[key: number]: any[]} = {};
      for (const agenda of agendasData) {
        try {
          const docs = await api.getAgendaDocuments(agenda.id);
          documentsData[agenda.id] = docs;
        } catch (error) {
          console.error(`Failed to fetch documents for agenda ${agenda.id}:`, error);
          documentsData[agenda.id] = [];
        }
      }
      setAgendaDocuments(documentsData);
    } catch (error) {
      console.error('Failed to fetch agendas:', error);
    }
  }, []);

  useEffect(() => {
    fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedYear) {
      fetchMeetings(selectedYear);
    }
  }, [selectedYear, fetchMeetings]);

  useEffect(() => {
    if (selectedMeeting) {
      fetchAgendas(selectedMeeting.id);
    }
  }, [selectedMeeting, fetchAgendas]);

  useEffect(() => {
    if (years.length > 0 && meetings.length > 0) {
      setLoading(false);
    }
  }, [years, meetings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    setSubmitting(true);
    try {
      const newAgenda = {
        meeting_id: selectedMeeting.id,
        title: formData.title,
        description: formData.description,
        discussion_result: formData.discussion_result,
        order_no: agendas.length + 1,
        status: formData.status,
        category: formData.category,
        approval_status: formData.approval_status || undefined,
        priority: formData.priority,
        start_date: formData.start_date || undefined,
        due_date: formData.due_date || undefined
      };

      await api.createAgenda(newAgenda);
      
      // フォームをリセット
      setFormData({
        title: '',
        description: '',
        discussion_result: '',
        status: 'not_started',
        category: '',
        approval_status: '',
        priority: 'C',
        start_date: '',
        due_date: ''
      });
      setShowAddForm(false);
      
      // 議題一覧を再取得
      await fetchAgendas(selectedMeeting.id);
      
      alert('議題が正常に追加されました！');
    } catch (error) {
      console.error('Failed to create agenda:', error);
      alert('議題の追加に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (agendaId: number, file: File) => {
    setUploadingFile(true);
    try {
      await api.uploadAgendaDocument(agendaId, file);
      
      // 文書一覧を再取得
      const docs = await api.getAgendaDocuments(agendaId);
      setAgendaDocuments(prev => ({
        ...prev,
        [agendaId]: docs
      }));
      
      alert('ファイルが正常にアップロードされました！');
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('ファイルのアップロードに失敗しました。');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (agendaId: number, documentId: number) => {
    if (window.confirm('この文書を削除しますか？')) {
      try {
        await api.deleteAgendaDocument(documentId);
        
        // 文書一覧を再取得
        const docs = await api.getAgendaDocuments(agendaId);
        setAgendaDocuments(prev => ({
          ...prev,
          [agendaId]: docs
        }));
        
        alert('文書が削除されました。');
      } catch (error) {
        console.error('Failed to delete document:', error);
        alert('文書の削除に失敗しました。');
      }
    }
  };

  const canManageAgendas = user?.role === 'admin' || user?.role === 'chairperson';

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>議題登録</h1>
        {canManageAgendas && (
          <button
            onClick={() => setShowAddForm(true)}
            style={styles.primaryButton}
          >
            新しい議題を登録
          </button>
        )}
      </header>

      <div style={styles.filterSection}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>開催年:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={styles.select}
          >
            <option value="">年を選択</option>
            {years.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>理事会:</label>
          <select
            value={selectedMeeting?.id || ''}
            onChange={(e) => {
              const meetingId = parseInt(e.target.value);
              const meeting = meetings.find(m => m.id === meetingId);
              setSelectedMeeting(meeting || null);
            }}
            style={styles.select}
            disabled={!selectedYear}
          >
            <option value="">理事会を選択</option>
            {meetings.map(meeting => (
              <option key={meeting.id} value={meeting.id}>
                {format(new Date(meeting.date), 'yyyy年MM月dd日', { locale: ja })} {meeting.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedMeeting && (
        <div style={styles.meetingInfo}>
          <h2 style={styles.meetingTitle}>
            {format(new Date(selectedMeeting.date), 'yyyy年MM月dd日', { locale: ja })} {selectedMeeting.title}
          </h2>
          {selectedMeeting.description && (
            <p style={styles.meetingDescription}>{selectedMeeting.description}</p>
          )}
        </div>
      )}

      <div style={styles.agendaList}>
        <h3 style={styles.sectionTitle}>議題一覧</h3>
        
        {agendas.length > 0 ? (
          <div style={styles.agendaItems}>
            {agendas.map((agenda, index) => (
              <div key={agenda.id} style={styles.agendaItem}>
                <div style={styles.agendaHeader}>
                  <div style={styles.agendaNumber}>議題 {index + 1}</div>
                  <div style={styles.agendaStatus}>
                    <span style={{
                      ...styles.statusBadge,
                      ...(agenda.status === 'not_started' ? styles.statusNotStarted :
                          agenda.status === 'in_progress' ? styles.statusInProgress :
                          agenda.status === 'completed' ? styles.statusCompleted :
                          agenda.status === 'on_hold' ? styles.statusOnHold :
                          styles.statusFinished)
                    }}>
                      {agenda.status === 'not_started' ? '未対応' :
                       agenda.status === 'in_progress' ? '処理中' :
                       agenda.status === 'completed' ? '処理済み' :
                       agenda.status === 'on_hold' ? '保留' : '完了'}
                    </span>
                  </div>
                </div>
                
                <h4 style={styles.agendaTitle}>{agenda.title}</h4>
                
                {agenda.description && (
                  <p style={styles.agendaDescription}>{agenda.description}</p>
                )}
                
                {agenda.discussion_result && (
                  <div style={styles.discussionResult}>
                    <strong>議論結果:</strong> {agenda.discussion_result}
                  </div>
                )}

                {/* 文書一覧 */}
                {agendaDocuments[agenda.id] && agendaDocuments[agenda.id].length > 0 && (
                  <div style={styles.documentList}>
                    <h5 style={styles.documentTitle}>添付文書:</h5>
                    {agendaDocuments[agenda.id].map((doc) => (
                      <div key={doc.id} style={styles.documentItem}>
                        <span style={styles.documentName}>{doc.original_name}</span>
                        <div style={styles.documentActions}>
                          <a
                            href={`/api/files/${doc.id}/download`}
                            download
                            style={styles.downloadLink}
                          >
                            ダウンロード
                          </a>
                          {canManageAgendas && (
                            <button
                              onClick={() => handleDeleteDocument(agenda.id, doc.id)}
                              style={styles.deleteButton}
                            >
                              削除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ファイルアップロード */}
                {canManageAgendas && (
                  <div style={styles.fileUpload}>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(agenda.id, file);
                        }
                      }}
                      style={styles.fileInput}
                      disabled={uploadingFile}
                    />
                    {uploadingFile && <span style={styles.uploadStatus}>アップロード中...</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noAgendas}>議題が登録されていません。</p>
        )}
      </div>

      {/* 新規議題登録モーダル */}
      {showAddForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>新しい議題を登録</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>議題タイトル *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>議題説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={styles.textarea}
                  rows={4}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>議論結果</label>
                <textarea
                  value={formData.discussion_result}
                  onChange={(e) => setFormData({...formData, discussion_result: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>種別</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  style={styles.input}
                  placeholder="通常"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>状態</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  style={styles.select}
                >
                  <option value="not_started">未対応</option>
                  <option value="in_progress">処理中</option>
                  <option value="completed">処理済み</option>
                  <option value="on_hold">保留</option>
                  <option value="finished">完了</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>採否区分</label>
                <select
                  value={formData.approval_status}
                  onChange={(e) => setFormData({...formData, approval_status: e.target.value as any})}
                  style={styles.select}
                >
                  <option value="">未設定</option>
                  <option value="approved">可決</option>
                  <option value="rejected">否決</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>優先順位</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                  style={styles.select}
                >
                  <option value="S">S</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>開始日</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>期限日</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.modalFooter}>
                <button 
                  type="submit" 
                  style={styles.primaryButton}
                  disabled={submitting}
                >
                  {submitting ? '登録中...' : '登録'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  style={styles.secondaryButton}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #eee',
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
  },
  filterSection: {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '200px',
  },
  meetingInfo: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  meetingTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '10px',
  },
  meetingDescription: {
    color: '#666',
    lineHeight: '1.5',
  },
  agendaList: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    marginBottom: '20px',
    borderBottom: '2px solid #007bff',
    paddingBottom: '5px',
  },
  agendaItems: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  agendaItem: {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
  },
  agendaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  agendaNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  agendaStatus: {
    display: 'flex',
    gap: '8px',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
  },
  statusNotStarted: {
    backgroundColor: '#6c757d',
  },
  statusInProgress: {
    backgroundColor: '#007bff',
  },
  statusCompleted: {
    backgroundColor: '#28a745',
  },
  statusOnHold: {
    backgroundColor: '#ffc107',
  },
  statusFinished: {
    backgroundColor: '#17a2b8',
  },
  agendaTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '10px',
  },
  agendaDescription: {
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '10px',
  },
  discussionResult: {
    backgroundColor: '#e9ecef',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '10px',
    fontSize: '14px',
  },
  documentList: {
    marginTop: '15px',
  },
  documentTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  documentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  documentName: {
    fontSize: '13px',
    color: '#333',
  },
  documentActions: {
    display: 'flex',
    gap: '8px',
  },
  downloadLink: {
    fontSize: '12px',
    color: '#007bff',
    textDecoration: 'none',
  },
  deleteButton: {
    fontSize: '12px',
    color: '#dc3545',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  fileUpload: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  fileInput: {
    fontSize: '12px',
  },
  uploadStatus: {
    fontSize: '12px',
    color: '#666',
  },
  noAgendas: {
    textAlign: 'center' as const,
    color: '#999',
    fontStyle: 'italic',
    padding: '40px',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '16px',
    color: '#666',
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
};

export default AgendaRegistration;