import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Meeting, MeetingAttendance, DateCandidate } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';
import MinutesPopup from './MinutesPopup';

const MeetingManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [, setAttendance] = useState<MeetingAttendance[]>([]);
  const [dateCandidates, setDateCandidates] = useState<DateCandidate[]>([]);
  const [votes, setVotes] = useState<any>({});
  const [userVotes, setUserVotes] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showNewMeetingForm, setShowNewMeetingForm] = useState(false);
  const [showDateCandidateForm, setShowDateCandidateForm] = useState(false);
  const [newCandidateDate, setNewCandidateDate] = useState('');
  const [newCandidateStartTime, setNewCandidateStartTime] = useState('');
  const [newCandidateEndTime, setNewCandidateEndTime] = useState('');
  const [showAgendasModal, setShowAgendasModal] = useState(false);
  const [selectedMeetingAgendas, setSelectedMeetingAgendas] = useState<any[]>([]);
  const [agendasLoading, setAgendasLoading] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingMeetingId, setSchedulingMeetingId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeetingData, setEditingMeetingData] = useState<Meeting | null>(null);
  const [showMinutesPopup, setShowMinutesPopup] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['tentative', 'confirmed']);
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editableData, setEditableData] = useState({
    title: '',
    date: '',
    time_start: '',
    time_end: '',
    location: '',
    description: '',
    status: 'tentative' as 'confirmed' | 'tentative' | 'completed' | 'cancelled'
  });

  // New meeting form state
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    location: '',
    description: ''
  });

  const fetchMeetings = async () => {
    try {
      const meetingsData = await api.getMeetings();
      setMeetings(meetingsData);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await api.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };


  const fetchMeetingDetails = async (meetingId: number) => {
    try {
      const [attendanceData, candidatesData, votesData] = await Promise.all([
        api.getMeetingAttendance(meetingId),
        api.getDateCandidates(meetingId),
        api.getAllDateVotes(meetingId)
      ]);
      
      setAttendance(attendanceData);
      setDateCandidates(candidatesData);
      setVotes(votesData);
      
      // 各ユーザーの個別投票状況を初期化（実際はAPIから取得すべき）
      const initialUserVotes: any = {};
      // 現在はローカル状態のみで管理
      setUserVotes(initialUserVotes);
    } catch (error) {
      console.error('Failed to fetch meeting details:', error);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Creating meeting with data:', newMeeting);
      
      // システム日付より先の日付を設定
      const today = new Date();
      const futureDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000); // 1週間後
      
      const meeting = await api.createMeeting({
        ...newMeeting,
        date: futureDate.toISOString(),
        status: 'tentative'
      });
      
      console.log('Meeting created successfully:', meeting);
      await fetchMeetings();
      // 理事会作成完了
      setNewMeeting({ title: '', location: '', description: '' });
      setShowNewMeetingForm(false);
      alert('理事会が正常に作成されました！');
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('理事会の作成に失敗しました。もう一度お試しください。');
    }
  };

  const handleCreateDateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateDate || !newCandidateStartTime || !newCandidateEndTime || !schedulingMeetingId) return;
    
    try {
      // 日付と開始時刻を組み合わせてcandidateDataを作成
      const candidateDateTime = `${newCandidateDate}T${newCandidateStartTime}`;
      const candidateData = await api.createDateCandidate(schedulingMeetingId, candidateDateTime);
      
      // candidateDataに終了時刻情報を追加（サーバー側で対応していない場合は一時的にクライアント側で管理）
      const enhancedCandidateData = {
        ...candidateData,
        start_time: newCandidateStartTime,
        end_time: newCandidateEndTime
      };
      
      // 新しい候補日をリストに追加
      setDateCandidates(prev => [...prev, enhancedCandidateData]);
      
      // 次回の候補日のために日付を1日進める（時刻はそのまま）
      const nextDate = new Date(newCandidateDate);
      nextDate.setDate(nextDate.getDate() + 1);
      setNewCandidateDate(nextDate.toISOString().split('T')[0]);
      
      // 時刻はそのまま維持して連続追加しやすくする
      // setNewCandidateStartTime(''); // コメントアウト
      // setNewCandidateEndTime(''); // コメントアウト
      
      // フォームは開いたままにして連続追加可能に
      // setShowDateCandidateForm(false); // コメントアウト
      alert('候補日が追加されました。続けて候補日を追加できます。');
    } catch (error) {
      console.error('Failed to create date candidate:', error);
      alert('候補日の追加に失敗しました');
    }
  };

  const handleDateVote = async (candidateId: number, availability: string) => {
    try {
      await api.submitDateVote(candidateId, availability);
      
      // 投票状況を再取得
      if (schedulingMeetingId) {
        const votesData = await api.getAllDateVotes(schedulingMeetingId);
        setVotes(votesData);
      }
      
      alert('投票を送信しました');
    } catch (error) {
      console.error('Failed to submit vote:', error);
      alert('投票の送信に失敗しました');
    }
  };

  const handleUserDateVote = async (candidateId: number, userId: number, availability: string) => {
    try {
      // 投票権限のチェック：自分の投票のみ変更可能
      if (user && user.id === userId && canVoteOnDates) {
        await api.submitDateVote(candidateId, availability);
        
        // ローカル状態を更新
        const voteKey = `${candidateId}_${userId}`;
        setUserVotes((prev: any) => ({
          ...prev,
          [voteKey]: availability
        }));
        
        // 投票状況を再取得
        if (schedulingMeetingId) {
          const votesData = await api.getAllDateVotes(schedulingMeetingId);
          setVotes(votesData);
        }
        
        alert('投票を送信しました');
      } else {
        if (!canVoteOnDates) {
          alert('投票権限がありません');
        } else {
          alert('自分の投票のみ変更できます');
        }
      }
    } catch (error) {
      console.error('Failed to submit vote:', error);
      alert('投票の送信に失敗しました');
    }
  };



  const handleShowEditModal = (meeting: Meeting) => {
    setEditingMeetingData(meeting);
    setEditableData({
      title: meeting.title,
      date: meeting.date ? format(new Date(meeting.date), 'yyyy-MM-dd') : '',
      time_start: meeting.time_start || '',
      time_end: meeting.time_end || '',
      location: meeting.location || '',
      description: meeting.description || '',
      status: meeting.status
    });
    setShowEditModal(true);
  };

  const handleShowMinutesModal = (meetingId: number, meetingTitle?: string) => {
    setSelectedMeetingId(meetingId);
    setSelectedMeetingTitle(meetingTitle || '');
    setShowMinutesPopup(true);
  };


  const handleShowSchedulingModal = async (meetingId: number) => {
    setSchedulingMeetingId(meetingId);
    setShowSchedulingModal(true);
    
    // 該当理事会の日程候補を取得
    try {
      await fetchMeetingDetails(meetingId);
    } catch (error) {
      console.error('Failed to fetch meeting details for scheduling:', error);
    }
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    // 権限チェック
    if (!canManageMeetings) {
      alert('理事会を削除する権限がありません');
      return;
    }

    if (meeting.status === 'completed') {
      alert('完了した理事会は削除できません');
      return;
    }

    const confirmMessage = `理事会「${meeting.title}」を削除しますか？\n\n※ この操作は取り消せません。関連する議題や議事録も削除されます。`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // API削除機能が存在する場合は使用
        if (api.deleteMeeting) {
          await api.deleteMeeting(meeting.id);
        } else {
          // API削除機能が存在しない場合は仮の削除処理
          console.log('Delete API not available, simulating deletion');
        }
        
        // 理事会一覧を更新
        await fetchMeetings();
        
        // 理事会削除完了
        
        alert(`理事会「${meeting.title}」を削除しました`);
      } catch (error) {
        console.error('Failed to delete meeting:', error);
        alert('理事会の削除に失敗しました。API機能が実装されていない可能性があります。');
      }
    }
  };

  const handleShowAgendasModal = async (meetingId: number) => {
    setAgendasLoading(true);
    setShowAgendasModal(true);
    
    try {
      // 議題を取得（現在は仮データを使用）
      const agendas = [
        {
          id: 1,
          title: '予算について',
          description: '来年度の予算案の検討',
          status: 'pending',
          meeting_id: meetingId
        },
        {
          id: 2,
          title: '管理規約の変更',
          description: 'ペット飼育に関する規約変更の提案',
          status: 'discussed',
          meeting_id: meetingId
        },
        {
          id: 3,
          title: '大規模修繕計画',
          description: '外壁塗装工事の計画について',
          status: 'resolved',
          meeting_id: meetingId
        }
      ];
      
      setSelectedMeetingAgendas(agendas);
    } catch (error) {
      console.error('Failed to fetch agendas:', error);
      setSelectedMeetingAgendas([]);
      alert('議題の取得に失敗しました');
    } finally {
      setAgendasLoading(false);
    }
  };

  const canManageMeetings = user?.role === 'admin' || user?.role === 'chairperson';
  const canVoteOnDates = user?.role === 'admin' || user?.role === 'chairperson' || user?.role === 'board_member';


  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };



  // フィルタとソート機能
  const getFilteredAndSortedMeetings = () => {
    let filteredMeetings = meetings;

    // ステータスフィルタ（複数選択対応）
    if (selectedStatuses.length > 0) {
      filteredMeetings = filteredMeetings.filter(meeting => 
        selectedStatuses.includes(meeting.status)
      );
    }

    // ソート機能
    const sortedMeetings = [...filteredMeetings].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'title') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
      }
      return 0;
    });

    return sortedMeetings;
  };

  const handleSortChange = (newSortBy: 'date' | 'title') => {
    if (sortBy === newSortBy) {
      // 同じ列をクリックした場合はソート順を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 違う列をクリックした場合は昇順でソート
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const displayMeetings = getFilteredAndSortedMeetings();

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>理事会管理</h1>
        <div style={styles.headerButtons}>
          {canManageMeetings && (
            <>
              <button
                onClick={() => setShowNewMeetingForm(true)}
                style={styles.primaryButton}
              >
                新しい理事会を作成
              </button>
              <button
                onClick={() => navigate('/agendas')}
                style={styles.agendaButton}
              >
                議題管理
              </button>
            </>
          )}
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.tableContainer}>
          <h3 style={styles.tableTitle}>理事会一覧</h3>
          
          {/* フィルタとソートのコントロール */}
          <div style={styles.filterSortContainer}>
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>ステータス:</label>
              <div style={styles.statusButtonsContainer}>
                {[
                  { value: 'tentative', label: '仮確定', color: '#ffc107' },
                  { value: 'confirmed', label: '確定', color: '#007bff' },
                  { value: 'completed', label: '完了', color: '#28a745' },
                  { value: 'cancelled', label: '中止', color: '#dc3545' }
                ].map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusToggle(status.value)}
                    style={{
                      ...styles.statusToggleButton,
                      ...(selectedStatuses.includes(status.value) 
                        ? { ...styles.statusToggleButtonActive, backgroundColor: status.color, borderColor: status.color }
                        : { ...styles.statusToggleButtonInactive, borderColor: status.color, color: status.color }
                      )
                    }}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={styles.sortSection}>
              <span style={styles.sortLabel}>並び替え:</span>
              <div style={styles.sortButtons}>
                <button
                  onClick={() => handleSortChange('date')}
                  style={{
                    ...styles.sortButton,
                    ...(sortBy === 'date' ? styles.activeSortButton : {})
                  }}
                >
                  開催日 {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('title')}
                  style={{
                    ...styles.sortButton,
                    ...(sortBy === 'title' ? styles.activeSortButton : {})
                  }}
                >
                  タイトル {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
            
            <div style={styles.resultCount}>
              全{meetings.length}件中{displayMeetings.length}件を表示
            </div>
          </div>
          
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.tableHeaderCell}>タイトル</th>
                <th style={styles.tableHeaderCell}>開催日</th>
                <th style={styles.tableHeaderCell}>時間</th>
                <th style={styles.tableHeaderCell}>場所</th>
                <th style={styles.tableHeaderCell}>ステータス</th>
                <th style={styles.tableHeaderCell}>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayMeetings.map((meeting) => (
                <tr 
                  key={meeting.id} 
                  style={styles.tableRow}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={styles.tableCell}>{meeting.title}</td>
                  <td style={styles.tableCell}>
                    {meeting.date !== '1970-01-01T00:00:00.000Z' 
                      ? format(new Date(meeting.date), 'yyyy年MM月dd日 (E)', { locale: ja })
                      : '日程調整中'
                    }
                  </td>
                  <td style={styles.tableCell}>
                    {meeting.time_start && meeting.time_end 
                      ? `${meeting.time_start} - ${meeting.time_end}`
                      : '-'
                    }
                  </td>
                  <td style={styles.tableCell}>{meeting.location || '-'}</td>
                  <td style={styles.tableCell}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: meeting.status === 'confirmed' ? '#28a745' :
                                     meeting.status === 'tentative' ? '#ffc107' :
                                     meeting.status === 'completed' ? '#6c757d' : '#dc3545'
                    }}>
                      {meeting.status === 'confirmed' ? '確定' : 
                       meeting.status === 'tentative' ? '仮確定' :
                       meeting.status === 'completed' ? '完了' : '中止'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.actionButtonsContainer}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowEditModal(meeting);
                        }}
                        style={styles.detailButton}
                      >
                        詳細
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowSchedulingModal(meeting.id);
                        }}
                        style={styles.schedulingButtonSmall}
                        title="日程調整"
                      >
                        日程
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowMinutesModal(meeting.id, meeting.title);
                        }}
                        style={styles.minutesButtonSmall}
                        title="議事録管理"
                      >
                        議事録
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowAgendasModal(meeting.id);
                        }}
                        style={styles.agendaButtonSmall}
                        title="議題確認"
                      >
                        議題
                      </button>
                      {meeting.status !== 'completed' && canManageMeetings && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMeeting(meeting);
                          }}
                          style={styles.deleteButtonSmall}
                          title="理事会を削除"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.mainContent}>
        </div>
      </div>

      {/* New Meeting Modal */}
      {showNewMeetingForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>新しい理事会を作成</h3>
              <button 
                onClick={() => setShowNewMeetingForm(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateMeeting} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>タイトル</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>場所</label>
                <input
                  type="text"
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting({...newMeeting, location: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>説明</label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.primaryButton}>
                  作成
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowNewMeetingForm(false)}
                  style={styles.secondaryButton}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Candidate Modal */}
      {showDateCandidateForm && (
        <div 
          style={styles.candidateModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDateCandidateForm(false);
            }
          }}
        >
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>候補日を追加</h3>
              <button 
                onClick={() => setShowDateCandidateForm(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateDateCandidate} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>候補日</label>
                <input
                  type="date"
                  value={newCandidateDate}
                  onChange={(e) => setNewCandidateDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>開始時刻</label>
                  <input
                    type="time"
                    value={newCandidateStartTime}
                    onChange={(e) => setNewCandidateStartTime(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>終了時刻</label>
                  <input
                    type="time"
                    value={newCandidateEndTime}
                    onChange={(e) => setNewCandidateEndTime(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.primaryButton}>
                  追加
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setNewCandidateDate('');
                    setNewCandidateStartTime('');
                    setNewCandidateEndTime('');
                    setShowDateCandidateForm(false);
                  }}
                  style={styles.completeCandidateButton}
                >
                  完了
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setNewCandidateDate('');
                    setNewCandidateStartTime('');
                    setNewCandidateEndTime('');
                    setShowDateCandidateForm(false);
                  }}
                  style={styles.secondaryButton}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agendas Modal */}
      {showAgendasModal && (
        <div style={styles.modal}>
          <div style={styles.agendasModalContent}>
            <div style={styles.modalHeader}>
              <h3>議題一覧</h3>
              <button 
                onClick={() => setShowAgendasModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div style={styles.agendasContainer}>
              {agendasLoading ? (
                <div style={styles.agendasLoading}>議題を読み込み中...</div>
              ) : selectedMeetingAgendas.length > 0 ? (
                <div style={styles.agendasList}>
                  {selectedMeetingAgendas.map((agenda, index) => (
                    <div key={agenda.id || index} style={styles.agendaItem}>
                      <div style={styles.agendaTitle}>
                        {agenda.title || `議題 ${index + 1}`}
                      </div>
                      <div style={styles.agendaDescription}>
                        {agenda.description || '詳細なし'}
                      </div>
                      <div style={styles.agendaStatus}>
                        ステータス: {agenda.status === 'pending' ? '保留' : 
                                   agenda.status === 'discussed' ? '討議済み' : 
                                   agenda.status === 'resolved' ? '解決済み' : '未設定'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noAgendas}>
                  この理事会には議題が登録されていません
                </div>
              )}
            </div>
            <div style={styles.agendasModalFooter}>
              <button
                onClick={() => {
                  setShowAgendasModal(false);
                  const meetingId = selectedMeetingAgendas[0]?.meeting_id || meetings[0]?.id;
                  if (meetingId) {
                    navigate(`/agendas?meeting=${meetingId}`);
                  } else {
                    navigate('/agendas');
                  }
                }}
                style={styles.primaryButton}
              >
                議題管理画面へ
              </button>
              <button
                onClick={() => setShowAgendasModal(false)}
                style={styles.secondaryButton}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Modal - ダッシュボードの出席確認UIと同じスタイル */}
      {showSchedulingModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>日程調整</h3>
              <button 
                onClick={() => setShowSchedulingModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div style={styles.schedulingActions}>
              <button
                onClick={() => {
                  // フォームを開く時に初期値を設定
                  const today = new Date();
                  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  setNewCandidateDate(nextWeek.toISOString().split('T')[0]);
                  setNewCandidateStartTime('14:00');
                  setNewCandidateEndTime('16:00');
                  setShowDateCandidateForm(true);
                }}
                style={styles.addCandidateButton}
              >
                候補日を追加
              </button>
            </div>
            
            <div style={styles.attendanceContent}>
              {dateCandidates.length > 0 ? (
                <div style={styles.attendanceList}>
                  {dateCandidates.map((candidate) => (
                    <div key={candidate.id} style={styles.candidateGroup}>
                      <div style={styles.candidateDate}>
                        {candidate.start_time && candidate.end_time 
                          ? `${format(new Date(candidate.candidate_date), 'yyyy年MM月dd日 (E)', { locale: ja })} ${candidate.start_time}～${candidate.end_time}`
                          : format(new Date(candidate.candidate_date), 'yyyy年MM月dd日 (E) HH:mm', { locale: ja })
                        }
                      </div>
                      
                      <div style={styles.candidateVoteSummary}>
                        <span style={styles.voteCount}>
                          ✓ {votes[candidate.id]?.available || 0}名
                        </span>
                        <span style={styles.voteCount}>
                          ？ {votes[candidate.id]?.maybe || 0}名
                        </span>
                        <span style={styles.voteCount}>
                          ✗ {votes[candidate.id]?.unavailable || 0}名
                        </span>
                      </div>

                      <div style={styles.userVotesList}>
                        {users.map((listUser) => {
                          // 各ユーザーの投票状況を取得（キー: candidateId_userId）
                          const voteKey = `${candidate.id}_${listUser.id}`;
                          const userVote = userVotes[voteKey] || null;
                          const isCurrentUser = user && user.id === listUser.id;
                          const canUserVote = isCurrentUser && canVoteOnDates;
                          
                          return (
                            <div key={listUser.id} style={styles.attendanceItem}>
                              <div style={styles.attendanceInfo}>
                                <span style={styles.memberName}>{listUser.name}</span>
                                <span style={styles.memberRole}>({listUser.role === 'admin' ? '管理者' : listUser.role === 'chairperson' ? '理事長' : listUser.role === 'board_member' ? '理事' : '住民'})</span>
                              </div>
                              {/* 投票権限に関係なく、すべてのユーザーの行に投票ボタンを表示 */}
                              <div style={styles.attendanceButtons}>
                                <button
                                  onClick={() => handleUserDateVote(candidate.id, listUser.id, 'available')}
                                  disabled={!canUserVote}
                                  style={{
                                    ...styles.attendanceStatusButton,
                                    backgroundColor: userVote === 'available' ? '#28a745' : '#e9ecef',
                                    color: userVote === 'available' ? 'white' : '#333',
                                    opacity: canUserVote ? 1 : 0.6,
                                    cursor: canUserVote ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  参加可能
                                </button>
                                <button
                                  onClick={() => handleUserDateVote(candidate.id, listUser.id, 'maybe')}
                                  disabled={!canUserVote}
                                  style={{
                                    ...styles.attendanceStatusButton,
                                    backgroundColor: userVote === 'maybe' ? '#ffc107' : '#e9ecef',
                                    color: userVote === 'maybe' ? '#333' : '#333',
                                    opacity: canUserVote ? 1 : 0.6,
                                    cursor: canUserVote ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  要検討
                                </button>
                                <button
                                  onClick={() => handleUserDateVote(candidate.id, listUser.id, 'unavailable')}
                                  disabled={!canUserVote}
                                  style={{
                                    ...styles.attendanceStatusButton,
                                    backgroundColor: userVote === 'unavailable' ? '#dc3545' : '#e9ecef',
                                    color: userVote === 'unavailable' ? 'white' : '#333',
                                    opacity: canUserVote ? 1 : 0.6,
                                    cursor: canUserVote ? 'pointer' : 'not-allowed'
                                  }}
                                >
                                  参加不可
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.loading}>候補日が設定されていません</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {showEditModal && editingMeetingData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3>理事会情報編集</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const updatedData = {
                  ...editableData,
                  date: editableData.date ? new Date(`${editableData.date}T${editableData.time_start || '00:00'}`).toISOString() : editingMeetingData.date
                };
                
                await api.updateMeeting(editingMeetingData.id, updatedData);
                await fetchMeetings();
                setShowEditModal(false);
                alert('理事会情報が更新されました');
              } catch (error) {
                console.error('Failed to update meeting:', error);
                alert('更新に失敗しました');
              }
            }} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>タイトル</label>
                  <input
                    type="text"
                    value={editableData.title}
                    onChange={(e) => setEditableData({...editableData, title: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ステータス</label>
                  <select
                    value={editableData.status}
                    onChange={(e) => setEditableData({...editableData, status: e.target.value as any})}
                    style={styles.select}
                  >
                    <option value="tentative">仮確定</option>
                    <option value="confirmed">確定</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">中止</option>
                  </select>
                </div>
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>開催日</label>
                  <input
                    type="date"
                    value={editableData.date}
                    onChange={(e) => setEditableData({...editableData, date: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>開始時間</label>
                  <input
                    type="time"
                    value={editableData.time_start}
                    onChange={(e) => setEditableData({...editableData, time_start: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>終了時間</label>
                  <input
                    type="time"
                    value={editableData.time_end}
                    onChange={(e) => setEditableData({...editableData, time_end: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>場所</label>
                <input
                  type="text"
                  value={editableData.location}
                  onChange={(e) => setEditableData({...editableData, location: e.target.value})}
                  style={styles.input}
                  placeholder="開催場所を入力してください"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>説明</label>
                <textarea
                  value={editableData.description}
                  onChange={(e) => setEditableData({...editableData, description: e.target.value})}
                  style={styles.textarea}
                  rows={3}
                  placeholder="理事会の説明を入力してください"
                />
              </div>
              
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.primaryButton}>
                  保存
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  style={styles.secondaryButton}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 議事録ポップアップ */}
      <MinutesPopup
        isOpen={showMinutesPopup}
        onClose={() => setShowMinutesPopup(false)}
        meetingId={selectedMeetingId || 0}
        meetingTitle={selectedMeetingTitle}
      />
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
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
  headerButtons: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    color: '#333',
    margin: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableTitle: {
    fontSize: '18px',
    color: '#333',
    margin: 0,
    padding: '20px 20px 0',
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px',
    marginBottom: '15px',
  },
  filterSortContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px 15px',
    borderBottom: '1px solid #eee',
    marginBottom: '15px',
    flexWrap: 'wrap' as const,
    gap: '15px',
  },
  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    color: '#333',
    fontWeight: 'bold',
  },
  filterSelect: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    minWidth: '120px',
  },
  sortSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sortLabel: {
    fontSize: '14px',
    color: '#333',
    fontWeight: 'bold',
  },
  sortButtons: {
    display: 'flex',
    gap: '5px',
  },
  sortButton: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#666',
    transition: 'all 0.3s',
  },
  activeSortButton: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
  },
  resultCount: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },
  statusButtonsContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  statusToggleButton: {
    padding: '8px 16px',
    border: '2px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    backgroundColor: 'white',
    outline: 'none',
  },
  statusToggleButtonActive: {
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transform: 'translateY(-1px)',
  },
  statusToggleButtonInactive: {
    backgroundColor: 'white',
    opacity: 0.7,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    margin: '0 20px 20px',
    maxWidth: 'calc(100% - 40px)',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  tableHeaderCell: {
    padding: '12px 15px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #dee2e6',
    fontSize: '14px',
  },
  tableRow: {
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid #dee2e6',
  },
  tableCell: {
    padding: '12px 15px',
    fontSize: '14px',
    color: '#333',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  detailButton: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.3s',
  },
  actionButtonsContainer: {
    display: 'flex',
    gap: '5px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  schedulingButtonSmall: {
    padding: '4px 8px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    minWidth: '40px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
  },
  minutesButtonSmall: {
    padding: '4px 8px',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    minWidth: '50px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
  },
  agendaButtonSmall: {
    padding: '4px 8px',
    backgroundColor: '#fd7e14',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    minWidth: '40px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
  },
  deleteButtonSmall: {
    padding: '4px 8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    minWidth: '40px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.3s',
  },
  mainContent: {
    width: '100%',
  },
  hiddenInput: {
    display: 'none',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  saveButtonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  saveButton: {
    padding: '10px 30px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  meetingTitle: {
    fontSize: '24px',
    color: '#333',
    marginBottom: '10px',
  },
  meetingDescription: {
    color: '#666',
    lineHeight: '1.5',
    marginBottom: '10px',
  },
  meetingLocation: {
    color: '#666',
    fontSize: '14px',
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#333',
    margin: 0,
  },
  candidatesContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  candidateItem: {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
  },
  voteButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  voteButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
  },
  availableButton: {
    backgroundColor: '#28a745',
  },
  maybeButton: {
    backgroundColor: '#ffc107',
    color: '#333',
  },
  unavailableButton: {
    backgroundColor: '#dc3545',
  },
  voteResults: {
    fontSize: '12px',
    color: '#666',
  },
  voteCount: {
    display: 'flex',
    gap: '10px',
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
  agendaButton: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  completeCandidateButton: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.3s',
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
  noSelection: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '16px',
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
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    padding: '20px',
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
    backgroundColor: 'white',
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
  agendasModalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '70vh',
    overflow: 'auto',
  },
  agendasContainer: {
    minHeight: '200px',
    marginBottom: '20px',
  },
  agendasLoading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100px',
    color: '#666',
    fontSize: '14px',
  },
  agendasList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  agendaItem: {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
  },
  agendaTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  agendaDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
    marginBottom: '8px',
  },
  agendaStatus: {
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic',
  },
  noAgendas: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100px',
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  agendasModalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
  },
  schedulingModalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '700px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  schedulingModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #eee',
  },
  schedulingModalTitle: {
    fontSize: '24px',
    color: '#333',
    margin: 0,
  },
  schedulingModalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  addCandidateButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  schedulingContent: {
    minHeight: '200px',
  },
  schedulingList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  schedulingItem: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
  },
  schedulingDate: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
  },
  schedulingVoteButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  voteAvailableButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  voteMaybeButton: {
    padding: '8px 16px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  voteUnavailableButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  schedulingVoteResults: {
    display: 'flex',
    gap: '15px',
    fontSize: '14px',
    color: '#666',
  },
  voteResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  noSchedulingData: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '150px',
    color: '#999',
    fontSize: '16px',
    fontStyle: 'italic',
  },
  userVoteDetails: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #eee',
  },
  userVoteTitle: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '10px',
    margin: 0,
  },
  userVoteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
  },
  userVoteItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    border: '1px solid #e9ecef',
  },
  userName: {
    fontSize: '14px',
    color: '#333',
    fontWeight: 'bold',
  },
  userVoteStatus: {
    fontSize: '12px',
  },
  userVoteAvailable: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  userVoteMaybe: {
    color: '#ffc107',
    fontWeight: 'bold',
  },
  userVoteUnavailable: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  userVoteNone: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  // 日程調整モーダル用の新しいスタイル（ダッシュボードの出席確認UIと同じ）
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
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
  },
  schedulingActions: {
    padding: '0 20px 15px',
    borderBottom: '1px solid #eee',
    marginBottom: '15px',
  },
  attendanceContent: {
    padding: '20px',
  },
  attendanceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
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
  candidateGroup: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
  },
  candidateDate: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '10px',
    textAlign: 'center' as const,
    padding: '8px',
    backgroundColor: '#007bff',
    borderRadius: '4px',
  },
  candidateVoteSummary: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginBottom: '15px',
    padding: '8px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  userVotesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  attendanceStatus: {
    display: 'flex',
    alignItems: 'center',
    padding: '5px 10px',
  },
  voteStatus: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
  },
  // 候補日追加モーダル用の高いz-index
  candidateModalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100, // 日程調整モーダルより高い値
  },
};

export default MeetingManagement;