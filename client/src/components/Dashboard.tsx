import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Meeting, Announcement, Agenda } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [nextMeeting, setNextMeeting] = useState<Meeting | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [nextMeetingAgendas, setNextMeetingAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 編集モーダル用の状態
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
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
  
  // 出席確認モーダル用の状態
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // 次回理事会の出席状況用の状態
  const [nextMeetingAttendance, setNextMeetingAttendance] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [/* meetingsData */, recentMeetingsData, nextMeetingData, announcementsData] = await Promise.all([
          api.getMeetings(),
          api.getRecentMeetings(),
          api.getNextMeeting(),
          api.getAnnouncements(),
        ]);

        // setMeetings(meetingsData.slice(0, 3));
        setRecentMeetings(recentMeetingsData);
        setNextMeeting(nextMeetingData);
        setAnnouncements(announcementsData.slice(0, 5));

        // 次回理事会の議題と出席状況を取得
        if (nextMeetingData) {
          try {
            const [agendasData, attendanceData] = await Promise.all([
              api.getAgendas(nextMeetingData.id),
              api.getMeetingAttendance(nextMeetingData.id)
            ]);
            setNextMeetingAgendas(agendasData.slice(0, 5));
            setNextMeetingAttendance(attendanceData);
          } catch (error) {
            console.error('Failed to fetch agendas or attendance:', error);
          }
        }
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 編集フォームを開始する関数
  const startEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      date: meeting.date ? format(new Date(meeting.date), 'yyyy-MM-dd') : '',
      time_start: meeting.time_start || '14:00',
      time_end: meeting.time_end || '16:00',
      location: meeting.location || 'マンション集会室',
      description: meeting.description || '',
      status: meeting.status || 'tentative',
      meeting_type: meeting.meeting_type || 'regular'
    });
    setShowEditForm(true);
  };

  // 出席確認モーダルを開く関数
  const handleSendAttendanceEmail = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceLoading(true);
    setShowAttendanceModal(true);
    
    try {
      const attendance = await api.getMeetingAttendance(meeting.id);
      setAttendanceData(attendance);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setAttendanceData([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // 編集フォームの更新処理
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      /* const updatedMeeting = */ await api.updateMeeting(editingMeeting.id, formData);
      
      // ダッシュボードデータを再取得
      const nextMeetingData = await api.getNextMeeting();
      setNextMeeting(nextMeetingData);
      
      setShowEditForm(false);
      setEditingMeeting(null);
      alert('理事会スケジュールが更新されました');
    } catch (error) {
      console.error('Failed to update meeting:', error);
      alert('理事会スケジュールの更新に失敗しました');
    }
  };

  // 出席状況更新関数
  const updateAttendanceStatus = async (userId: number, status: string) => {
    if (!selectedMeeting) return;
    
    try {
      await api.updateAttendanceStatus(selectedMeeting.id, status, userId);
      const attendance = await api.getMeetingAttendance(selectedMeeting.id);
      setAttendanceData(attendance);
      
      // 次回理事会の出席状況も更新
      if (nextMeeting && selectedMeeting.id === nextMeeting.id) {
        setNextMeetingAttendance(attendance);
      }
      
      alert('出席状況を更新しました');
    } catch (error) {
      console.error('Failed to update attendance:', error);
      alert('出席状況の更新に失敗しました');
    }
  };

  // 出席状況のカウントを計算する関数
  const getAttendanceCount = (attendanceData: any[]) => {
    if (!attendanceData.length) return { attending: 0, maybe: 0, absent: 0, total: 0 };
    
    const attending = attendanceData.filter(a => a.status === 'attending').length;
    const maybe = attendanceData.filter(a => a.status === 'maybe').length;
    const absent = attendanceData.filter(a => a.status === 'absent').length;
    const total = attendanceData.length;
    
    return { attending, maybe, absent, total };
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return '管理者';
      case 'chairperson': return '理事長';
      case 'board_member': return '理事';
      case 'resident': return '住民';
      default: return role;
    }
  };

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>ダッシュボード</h1>
        <div style={styles.userInfo}>
          <span>{user?.name} ({getRoleDisplayName(user?.role || '')})</span>
          {user?.room_number && <span style={styles.roomNumber}>{user.room_number}号室</span>}
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.row}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>次回理事会</h2>
            {nextMeeting ? (
              <div style={styles.nextMeeting}>
                <div style={styles.nextMeetingHeader}>
                  <div style={styles.nextMeetingInfo}>
                    <h3 style={styles.meetingTitle}>{nextMeeting.title}</h3>
                    <p style={styles.meetingDate}>
                      {format(new Date(nextMeeting.date), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </p>
                    {nextMeeting.location && (
                      <p style={styles.meetingLocation}>場所: {nextMeeting.location}</p>
                    )}
                    {nextMeeting.description && (
                      <p style={styles.meetingDescription}>{nextMeeting.description}</p>
                    )}
                    
                    {/* 出席状況集計表示 */}
                    {nextMeetingAttendance.length > 0 && (
                      <div style={styles.nextMeetingAttendanceCount}>
                        <h5 style={styles.attendanceCountTitle}>出席状況</h5>
                        <div style={styles.attendanceCountGrid}>
                          <div style={styles.attendanceCountItem}>
                            <div style={{...styles.attendanceCountBadge, backgroundColor: '#28a745'}}>
                              出席
                            </div>
                            <div style={styles.attendanceCountNumber}>
                              {getAttendanceCount(nextMeetingAttendance).attending}名
                            </div>
                          </div>
                          <div style={styles.attendanceCountItem}>
                            <div style={{...styles.attendanceCountBadge, backgroundColor: '#ffc107'}}>
                              未定
                            </div>
                            <div style={styles.attendanceCountNumber}>
                              {getAttendanceCount(nextMeetingAttendance).maybe}名
                            </div>
                          </div>
                          <div style={styles.attendanceCountItem}>
                            <div style={{...styles.attendanceCountBadge, backgroundColor: '#dc3545'}}>
                              欠席
                            </div>
                            <div style={styles.attendanceCountNumber}>
                              {getAttendanceCount(nextMeetingAttendance).absent}名
                            </div>
                          </div>
                          <div style={styles.attendanceCountItem}>
                            <div style={{...styles.attendanceCountBadge, backgroundColor: '#6c757d'}}>
                              合計
                            </div>
                            <div style={styles.attendanceCountNumber}>
                              {getAttendanceCount(nextMeetingAttendance).total}名
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {(user?.role === 'admin' || user?.role === 'chairperson') && (
                    <div style={styles.nextMeetingButtons}>
                      <button
                        onClick={() => startEdit(nextMeeting)}
                        style={styles.editButton}
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleSendAttendanceEmail(nextMeeting)}
                        style={styles.attendanceButton}
                      >
                        出席確認
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p style={styles.noData}>予定されている理事会はありません</p>
            )}
          </div>

          {(user?.role === 'admin' || user?.role === 'chairperson') && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>次回理事会議題</h2>
              {nextMeetingAgendas.length > 0 ? (
                <div style={styles.agendaList}>
                  {nextMeetingAgendas.map((agenda, index) => (
                    <div key={agenda.id} style={styles.agendaItem}>
                      <span style={styles.agendaNumber}>{index + 1}.</span>
                      <span style={styles.agendaTitle}>{agenda.title}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/agendas')}
                    style={styles.manageButton}
                  >
                    議題を管理する
                  </button>
                </div>
              ) : (
                <div style={styles.noAgenda}>
                  <p style={styles.noData}>議題が設定されていません</p>
                  <button
                    onClick={() => navigate('/agendas')}
                    style={styles.manageButton}
                  >
                    議題を追加する
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>重要なお知らせ</h2>
            {announcements.length > 0 ? (
              <div style={styles.announcements}>
                {announcements.map((announcement) => (
                  <div key={announcement.id} style={styles.announcementItem}>
                    <div style={styles.announcementHeader}>
                      <span style={styles.announcementTitle}>{announcement.title}</span>
                      {announcement.is_important && (
                        <span style={styles.importantBadge}>重要</span>
                      )}
                    </div>
                    <p style={styles.announcementContent}>{announcement.content}</p>
                    <p style={styles.announcementDate}>
                      {format(new Date(announcement.created_at), 'yyyy年MM月dd日', { locale: ja })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noData}>お知らせはありません</p>
            )}
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>最近の理事会</h2>
            {recentMeetings.length > 0 ? (
              <div style={styles.recentMeetings}>
                {recentMeetings.map((meeting) => (
                  <div key={meeting.id} style={styles.meetingItem}>
                    <div style={styles.meetingItemHeader}>
                      <div style={styles.meetingItemTitle}>{meeting.title}</div>
                      <button
                        onClick={() => navigate(`/meetings/${meeting.id}/minutes`)}
                        style={styles.minutesButton}
                      >
                        議事録
                      </button>
                    </div>
                    <div style={styles.meetingItemDate}>
                      {format(new Date(meeting.date), 'yyyy年MM月dd日', { locale: ja })}
                    </div>
                    <div style={styles.meetingStatus}>
                      状態: {meeting.status === 'confirmed' ? '確定' : 
                             meeting.status === 'tentative' ? '仮確定' :
                             meeting.status === 'completed' ? '完了' : '中止'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noData}>今月は完了した理事会がありません</p>
            )}
          </div>
        </div>
      </div>

      {/* 編集フォームモーダル */}
      {showEditForm && editingMeeting && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>理事会情報を編集</h3>
              <button
                onClick={() => setShowEditForm(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} style={styles.editForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>理事会タイトル</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>開催日</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  style={styles.input}
                  required
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
                <label style={styles.label}>説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ステータス</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    style={styles.select}
                  >
                    <option value="tentative">仮確定</option>
                    <option value="confirmed">確定</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">中止</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>会議種別</label>
                  <select
                    value={formData.meeting_type}
                    onChange={(e) => setFormData({...formData, meeting_type: e.target.value as any})}
                    style={styles.select}
                  >
                    <option value="regular">定例</option>
                    <option value="emergency">臨時</option>
                  </select>
                </div>
              </div>
              <div style={styles.formButtons}>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  style={styles.cancelButton}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  style={styles.saveButton}
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 出席確認モーダル */}
      {showAttendanceModal && selectedMeeting && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>{selectedMeeting.title} - 出席確認</h3>
              <button
                onClick={() => setShowAttendanceModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.attendanceContent}>
              {attendanceLoading ? (
                <div style={styles.loading}>読み込み中...</div>
              ) : (
                <div style={styles.attendanceList}>
                  {attendanceData.map((attendance) => (
                    <div key={attendance.id} style={styles.attendanceItem}>
                      <div style={styles.attendanceInfo}>
                        <span style={styles.memberName}>{attendance.member_name}</span>
                        <span style={styles.memberRole}>({attendance.role_name})</span>
                      </div>
                      <div style={styles.attendanceButtons}>
                        <button
                          onClick={() => updateAttendanceStatus(attendance.user_id, 'attending')}
                          style={{
                            ...styles.attendanceStatusButton,
                            backgroundColor: attendance.status === 'attending' ? '#28a745' : '#e9ecef'
                          }}
                        >
                          出席
                        </button>
                        <button
                          onClick={() => updateAttendanceStatus(attendance.user_id, 'maybe')}
                          style={{
                            ...styles.attendanceStatusButton,
                            backgroundColor: attendance.status === 'maybe' ? '#ffc107' : '#e9ecef'
                          }}
                        >
                          未定
                        </button>
                        <button
                          onClick={() => updateAttendanceStatus(attendance.user_id, 'absent')}
                          style={{
                            ...styles.attendanceStatusButton,
                            backgroundColor: attendance.status === 'absent' ? '#dc3545' : '#e9ecef'
                          }}
                        >
                          欠席
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#666',
  },
  roomNumber: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  row: {
    display: 'flex',
    gap: '20px',
    '@media (max-width: 768px)': {
      flexDirection: 'column' as const,
    },
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '18px',
    marginBottom: '15px',
    color: '#333',
    borderBottom: '2px solid #007bff',
    paddingBottom: '5px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '16px',
    color: '#666',
  },
  noData: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '20px',
  },
  nextMeeting: {
    padding: '10px 0',
  },
  meetingTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '5px',
  },
  meetingDate: {
    fontSize: '14px',
    color: '#007bff',
    fontWeight: 'bold',
    marginBottom: '5px',
  },
  meetingLocation: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px',
  },
  meetingDescription: {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.4',
  },
  announcements: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  announcementItem: {
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    borderLeft: '4px solid #007bff',
  },
  announcementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  announcementTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  importantBadge: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
  },
  announcementContent: {
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.4',
    marginBottom: '5px',
  },
  announcementDate: {
    fontSize: '10px',
    color: '#999',
  },
  recentMeetings: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  meetingItem: {
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  meetingItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '5px',
  },
  meetingItemTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  meetingItemDate: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px',
  },
  meetingStatus: {
    fontSize: '10px',
    color: '#999',
  },
  minutesButton: {
    padding: '4px 8px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  nextMeetingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
  },
  nextMeetingInfo: {
    flex: 1,
  },
  nextMeetingButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    minWidth: '120px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  attendanceButton: {
    padding: '8px 16px',
    backgroundColor: '#ffc107',
    color: '#212529',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
  },
  agendaList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  agendaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
  },
  agendaNumber: {
    fontSize: '12px',
    color: '#007bff',
    fontWeight: 'bold',
    minWidth: '20px',
  },
  agendaTitle: {
    fontSize: '13px',
    color: '#333',
    flex: 1,
  },
  manageButton: {
    marginTop: '15px',
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  noAgenda: {
    textAlign: 'center' as const,
    padding: '20px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 10px',
    borderBottom: '1px solid #eee',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  editForm: {
    padding: '20px',
  },
  formGroup: {
    marginBottom: '15px',
  },
  formRow: {
    display: 'flex',
    gap: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  formButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  attendanceContent: {
    padding: '20px',
  },
  attendanceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  attendanceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    border: '1px solid #eee',
    borderRadius: '4px',
  },
  attendanceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  memberName: {
    fontWeight: 'bold',
  },
  memberRole: {
    fontSize: '12px',
    color: '#666',
  },
  attendanceButtons: {
    display: 'flex',
    gap: '5px',
  },
  attendanceStatusButton: {
    padding: '5px 10px',
    border: '1px solid #ddd',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#333',
  },
  // 次回理事会の出席状況集計用スタイル
  nextMeetingAttendanceCount: {
    marginTop: '15px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e9ecef',
  },
  attendanceCountTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  attendanceCountGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  attendanceCountItem: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '5px',
  },
  attendanceCountBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    minWidth: '50px',
  },
  attendanceCountNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
};

export default Dashboard;