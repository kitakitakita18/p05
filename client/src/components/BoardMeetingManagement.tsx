import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Meeting, AttendanceSummary } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

const BoardMeetingManagement: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [attendanceSummaries, setAttendanceSummaries] = useState<{[key: number]: AttendanceSummary}>({});

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time_start: '14:00',
    time_end: '16:00',
    location: 'マンション集会室',
    description: '',
    status: 'tentative' as 'confirmed' | 'tentative' | 'completed' | 'cancelled',
    meeting_type: 'regular' as 'regular' | 'emergency'
  });

  const fetchMeetings = async () => {
    try {
      const meetingsData = await api.getMeetings();
      setMeetings(meetingsData);
      
      // 出欠状況サマリーを取得
      const summaries: {[key: number]: AttendanceSummary} = {};
      for (const meeting of meetingsData) {
        try {
          const summary = await api.getAttendanceSummary(meeting.id);
          summaries[meeting.id] = summary;
        } catch (error) {
          console.error(`Failed to fetch attendance summary for meeting ${meeting.id}:`, error);
        }
      }
      setAttendanceSummaries(summaries);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      date: meeting.date ? format(new Date(meeting.date), 'yyyy-MM-dd') : '',
      time_start: meeting.time_start || '14:00',
      time_end: meeting.time_end || '16:00',
      location: meeting.location || 'マンション集会室',
      description: meeting.description || '',
      status: meeting.status,
      meeting_type: meeting.meeting_type
    });
    setShowEditForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const updatedData = {
        ...formData,
        date: formData.date ? new Date(`${formData.date}T${formData.time_start}`).toISOString() : editingMeeting.date
      };

      await api.updateMeeting(editingMeeting.id, updatedData);
      await fetchMeetings();
      setShowEditForm(false);
      setEditingMeeting(null);
      alert('理事会情報が更新されました');
    } catch (error) {
      console.error('Failed to update meeting:', error);
      alert('更新に失敗しました');
    }
  };

  const handleSendAttendanceEmail = async (meetingId: number) => {
    try {
      await api.sendAttendanceEmail(meetingId);
      alert('出欠確認メールを送信しました');
    } catch (error) {
      console.error('Failed to send attendance email:', error);
      alert('メール送信に失敗しました');
    }
  };

  const handleSendReminderEmail = async (meetingId: number) => {
    try {
      await api.sendReminderEmail(meetingId);
      alert('リマインドメールを送信しました');
    } catch (error) {
      console.error('Failed to send reminder email:', error);
      alert('メール送信に失敗しました');
    }
  };

  const getMeetingsByType = (type: string) => {
    return meetings.filter(meeting => meeting.meeting_type === type);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return '確定';
      case 'tentative': return '仮確定';
      case 'completed': return '完了';
      case 'cancelled': return '中止';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#28a745';
      case 'tentative': return '#ffc107';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const canManageMeetings = user?.role === 'admin' || user?.role === 'chairperson';

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  const nextMeeting = getMeetingsByType('next')[0];
  const nextNextMeeting = getMeetingsByType('next_next')[0];
  const thirdMeeting = getMeetingsByType('third')[0];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>理事会管理</h1>
      </header>

      <div style={styles.dashboard}>
        {/* 次回理事会 */}
        <div style={styles.meetingCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>次回理事会</h2>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: nextMeeting ? getStatusColor(nextMeeting.status) : '#6c757d'
            }}>
              {nextMeeting ? getStatusLabel(nextMeeting.status) : '未設定'}
            </span>
          </div>
          
          {nextMeeting ? (
            <div style={styles.meetingInfo}>
              <div style={styles.meetingDate}>
                {format(new Date(nextMeeting.date), 'yyyy年MM月dd日 (E)', { locale: ja })}
              </div>
              <div style={styles.meetingTime}>
                {nextMeeting.time_start} - {nextMeeting.time_end}
              </div>
              <div style={styles.meetingLocation}>
                場所: {nextMeeting.location}
              </div>
              
              {attendanceSummaries[nextMeeting.id] && (
                <div style={styles.attendanceSummary}>
                  <div style={styles.summaryTitle}>出欠状況</div>
                  <div style={styles.summaryStats}>
                    <span style={styles.attending}>出席: {attendanceSummaries[nextMeeting.id].attending}</span>
                    <span style={styles.absent}>欠席: {attendanceSummaries[nextMeeting.id].absent}</span>
                    <span style={styles.pending}>未回答: {attendanceSummaries[nextMeeting.id].pending}</span>
                  </div>
                </div>
              )}

              {canManageMeetings && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => handleEditMeeting(nextMeeting)}
                    style={styles.editButton}
                  >
                    編集
                  </button>
                  {nextMeeting.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleSendAttendanceEmail(nextMeeting.id)}
                        style={styles.emailButton}
                      >
                        出欠確認メール送信
                      </button>
                      <button
                        onClick={() => handleSendReminderEmail(nextMeeting.id)}
                        style={styles.reminderButton}
                      >
                        リマインド送信
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.noMeeting}>次回理事会が設定されていません</div>
          )}
        </div>

        {/* 次々回理事会 */}
        <div style={styles.meetingCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>次々回理事会</h2>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: nextNextMeeting ? getStatusColor(nextNextMeeting.status) : '#6c757d'
            }}>
              {nextNextMeeting ? getStatusLabel(nextNextMeeting.status) : '未設定'}
            </span>
          </div>
          
          {nextNextMeeting ? (
            <div style={styles.meetingInfo}>
              <div style={styles.meetingDate}>
                {format(new Date(nextNextMeeting.date), 'yyyy年MM月dd日 (E)', { locale: ja })}
              </div>
              <div style={styles.meetingTime}>
                {nextNextMeeting.time_start} - {nextNextMeeting.time_end}
              </div>
              <div style={styles.meetingLocation}>
                場所: {nextNextMeeting.location}
              </div>
              
              {nextNextMeeting.status === 'tentative' && (
                <div style={styles.tentativeLabel}>次回理事会で確定予定</div>
              )}

              {canManageMeetings && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => handleEditMeeting(nextNextMeeting)}
                    style={styles.editButton}
                  >
                    仮日程編集
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.noMeeting}>次々回理事会が設定されていません</div>
          )}
        </div>

        {/* 第3回理事会 */}
        <div style={styles.meetingCard}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>第3回理事会</h2>
            <span style={{
              ...styles.statusBadge,
              backgroundColor: thirdMeeting ? getStatusColor(thirdMeeting.status) : '#6c757d'
            }}>
              {thirdMeeting ? getStatusLabel(thirdMeeting.status) : '未設定'}
            </span>
          </div>
          
          {thirdMeeting ? (
            <div style={styles.meetingInfo}>
              <div style={styles.meetingDate}>
                {format(new Date(thirdMeeting.date), 'yyyy年MM月dd日 (E)', { locale: ja })}
              </div>
              <div style={styles.meetingTime}>
                {thirdMeeting.time_start} - {thirdMeeting.time_end}
              </div>
              <div style={styles.meetingLocation}>
                場所: {thirdMeeting.location}
              </div>
              
              {thirdMeeting.status === 'tentative' && (
                <div style={styles.tentativeLabel}>次回理事会で確定予定</div>
              )}

              {canManageMeetings && (
                <div style={styles.actionButtons}>
                  <button
                    onClick={() => handleEditMeeting(thirdMeeting)}
                    style={styles.editButton}
                  >
                    仮日程編集
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.noMeeting}>第3回理事会が設定されていません</div>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {showEditForm && editingMeeting && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{editingMeeting.title} - 編集</h3>
              <button 
                onClick={() => setShowEditForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>日程</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>開始時間</label>
                  <input
                    type="time"
                    value={formData.time_start}
                    onChange={(e) => setFormData({...formData, time_start: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>終了時間</label>
                  <input
                    type="time"
                    value={formData.time_end}
                    onChange={(e) => setFormData({...formData, time_end: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>場所</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ステータス</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  style={styles.select}
                >
                  <option value="tentative">仮確定</option>
                  <option value="confirmed">確定</option>
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.saveButton}>
                  保存
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditForm(false)}
                  style={styles.cancelButton}
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
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #eee',
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
  },
  dashboard: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
  },
  meetingCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '20px',
    border: '1px solid #eee',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid #eee',
  },
  cardTitle: {
    fontSize: '20px',
    color: '#333',
    margin: 0,
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  meetingInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  meetingDate: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  meetingTime: {
    fontSize: '16px',
    color: '#666',
  },
  meetingLocation: {
    fontSize: '14px',
    color: '#666',
  },
  tentativeLabel: {
    fontSize: '12px',
    color: '#ff8c00',
    fontStyle: 'italic',
    marginTop: '5px',
  },
  attendanceSummary: {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  },
  summaryStats: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
  },
  attending: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  absent: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  pending: {
    color: '#ffc107',
    fontWeight: 'bold',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    marginTop: '15px',
    flexWrap: 'wrap' as const,
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  emailButton: {
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  reminderButton: {
    padding: '6px 12px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noMeeting: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '20px',
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
    maxWidth: '500px',
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default BoardMeetingManagement;