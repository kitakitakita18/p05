import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Meeting } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

const BoardMeetingSchedule: React.FC = () => {
  const { user } = useAuth();
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [selectedMeetingAgendas, setSelectedMeetingAgendas] = useState<any[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'recent'>('recent');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [selectedMeetingForMinutes, setSelectedMeetingForMinutes] = useState<Meeting | null>(null);
  const [minutesFiles, setMinutesFiles] = useState<any[]>([]);
  const [minutesLoading, setMinutesLoading] = useState(false);

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

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const meetingsData = await api.getMeetings();
        // 日付順にソート（古い順）
        const sortedMeetings = meetingsData.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setAllMeetings(sortedMeetings);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const newMeeting = await api.createMeeting({
          ...formData,
          date: new Date(formData.date).toISOString()
        });
        
        setAllMeetings([...allMeetings, newMeeting]);
        resetForm();
        setShowAddForm(false);
        alert('理事会スケジュールが作成されました');
      }
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('理事会スケジュールの作成に失敗しました');
    }
  };

  const handleEditMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const updatedMeeting = await api.updateMeeting(editingMeeting.id, {
          ...formData,
          date: new Date(formData.date).toISOString()
        });

        setAllMeetings(allMeetings.map(m => m.id === editingMeeting.id ? { ...m, ...updatedMeeting } : m));
        resetForm();
        setShowEditForm(false);
        setEditingMeeting(null);
        alert('理事会スケジュールが更新されました');
      }
    } catch (error) {
      console.error('Failed to update meeting:', error);
      alert('理事会スケジュールの更新に失敗しました');
    }
  };

  const handleSendAttendanceEmail = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceLoading(true);
    setShowAttendanceModal(true);
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const attendance = await api.getMeetingAttendance(meeting.id);
        setAttendanceData(attendance);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setAttendanceData([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleSendReminderEmail = async (meetingId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.sendReminderEmail(meetingId);
        alert('リマインダーメールを送信しました');
      }
    } catch (error) {
      console.error('Failed to send reminder email:', error);
      alert('リマインダーメールの送信に失敗しました');
    }
  };

  const handleGenerateSchedule = async () => {
    if (!window.confirm('組合基本情報の設定に基づいて半年先までの理事会スケジュールを自動作成します。よろしいですか？')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const result = await api.generateMeetingSchedule();
        await fetchMeetings(); // 一覧を再読み込み
        alert(`${result.message}\n作成された理事会: ${result.count}件`);
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      alert('スケジュールの自動作成に失敗しました');
    }
  };

  const handleDeleteMeeting = async (meetingId: number, meetingTitle: string) => {
    if (!window.confirm(`「${meetingTitle}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const result = await api.deleteMeeting(meetingId);
        setAllMeetings(allMeetings.filter(m => m.id !== meetingId));
        alert(result.message);
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      alert('理事会スケジュールの削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time_start: '14:00',
      time_end: '16:00',
      location: 'マンション集会室',
      description: '',
      status: 'tentative',
      meeting_type: 'regular'
    });
  };

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

  const showDetail = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
  };

  const showAgendas = async (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setAgendaLoading(true);
    setShowAgendaModal(true);
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const agendas = await api.getAgendas(meeting.id);
        setSelectedMeetingAgendas(agendas);
      }
    } catch (error) {
      console.error('Failed to fetch agendas:', error);
      setSelectedMeetingAgendas([]);
    } finally {
      setAgendaLoading(false);
    }
  };

  const updateAttendanceStatus = async (userId: number, status: string) => {
    if (!selectedMeeting) return;
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.updateAttendanceStatus(selectedMeeting.id, status, userId);
        // 出席状況を再読み込み
        const attendance = await api.getMeetingAttendance(selectedMeeting.id);
        setAttendanceData(attendance);
        alert('出席状況を更新しました');
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
      alert('出席状況の更新に失敗しました');
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    
    try {
      setAttendanceLoading(true);
      
      // 現在の出席状況データを一括保存用の形式に変換
      const attendances = attendanceData.map(attendance => ({
        user_id: attendance.user_id,
        status: attendance.status
      }));
      
      const result = await api.saveBulkAttendance(selectedMeeting.id, attendances);
      
      alert(result.message || '出席状況を保存しました');
      
      // 出席状況を再読み込み
      const updatedAttendance = await api.getMeetingAttendance(selectedMeeting.id);
      setAttendanceData(updatedAttendance);
      
    } catch (error) {
      console.error('Failed to save attendance:', error);
      alert('出席状況の保存に失敗しました');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleShowMinutesModal = async (meeting: Meeting) => {
    setSelectedMeetingForMinutes(meeting);
    setShowMinutesModal(true);
    setMinutesLoading(true);
    
    try {
      // 議事録ファイル一覧を取得
      const files = await api.getMeetingMinutes(meeting.id);
      setMinutesFiles(files);
    } catch (error) {
      console.error('Failed to load meeting minutes:', error);
      setMinutesFiles([]);
    } finally {
      setMinutesLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedMeetingForMinutes) return;

    // ファイルタイプをチェック
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('PDF、Word、またはテキストファイルのみアップロード可能です');
      return;
    }

    try {
      setMinutesLoading(true);
      await api.uploadMeetingMinutes(selectedMeetingForMinutes.id, file);
      
      // ファイル一覧を再取得
      const files = await api.getMeetingMinutes(selectedMeetingForMinutes.id);
      setMinutesFiles(files);
      
      alert('議事録をアップロードしました');
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('ファイルのアップロードに失敗しました');
    } finally {
      setMinutesLoading(false);
    }
  };

  const handleDeleteMinutes = async (fileId: number) => {
    if (!selectedMeetingForMinutes || !window.confirm('このファイルを削除しますか？')) return;

    try {
      setMinutesLoading(true);
      await api.deleteMeetingMinutes(fileId);
      
      // ファイル一覧を再取得
      const files = await api.getMeetingMinutes(selectedMeetingForMinutes.id);
      setMinutesFiles(files);
      
      alert('議事録を削除しました');
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('ファイルの削除に失敗しました');
    } finally {
      setMinutesLoading(false);
    }
  };

  // 出席状況のカウントを計算する関数
  const getAttendanceCount = () => {
    if (!attendanceData.length) return { attending: 0, maybe: 0, absent: 0, total: 0 };
    
    const attending = attendanceData.filter(a => a.status === 'attending').length;
    const maybe = attendanceData.filter(a => a.status === 'maybe').length;
    const absent = attendanceData.filter(a => a.status === 'absent').length;
    const total = attendanceData.length;
    
    return { attending, maybe, absent, total };
  };

  // 表示用のミーティングデータを取得
  const getDisplayMeetings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'all') {
      // すべてのミーティングを表示
      return allMeetings;
    } else {
      // 直近タブ: 過去1回分 + 未来分すべて
      const pastMeetings = allMeetings.filter(meeting => {
        const meetingDate = new Date(meeting.date);
        meetingDate.setHours(0, 0, 0, 0);
        return meetingDate < today;
      });

      const futureMeetings = allMeetings.filter(meeting => {
        const meetingDate = new Date(meeting.date);
        meetingDate.setHours(0, 0, 0, 0);
        return meetingDate >= today;
      });

      // 過去のミーティングから最新の1件のみ取得
      const recentPastMeeting = pastMeetings.length > 0 ? [pastMeetings[pastMeetings.length - 1]] : [];

      return [...recentPastMeeting, ...futureMeetings];
    }
  };

  const displayMeetings = getDisplayMeetings();

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'confirmed': return '確定';
      case 'tentative': return '仮確定';
      case 'completed': return '完了';
      case 'cancelled': return 'キャンセル';
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

  const getMeetingTypeDisplayName = (type: string) => {
    switch (type) {
      case 'regular': return '定例理事会';
      case 'emergency': return '臨時理事会';
      default: return type;
    }
  };

  const canManageMeetings = user?.role === 'admin' || user?.role === 'chairperson';

  if (!canManageMeetings) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>アクセス権限がありません</h2>
          <p>この機能は管理者または理事長のみが利用できます。</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>理事会スケジュール管理</h1>
        <div style={styles.headerButtons}>
          <button
            onClick={handleGenerateSchedule}
            style={styles.generateButton}
          >
            半年先まで作成
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            style={styles.primaryButton}
          >
            新しい理事会を追加
          </button>
        </div>
      </header>

      {/* タブメニュー */}
      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'all' ? styles.activeTab : styles.inactiveTab)
          }}
        >
          すべて
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          style={{
            ...styles.tabButton,
            ...(activeTab === 'recent' ? styles.activeTab : styles.inactiveTab)
          }}
        >
          直近
        </button>
      </div>

      <div style={styles.meetingList}>
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>種別</div>
          <div style={styles.headerCell}>タイトル</div>
          <div style={styles.headerCell}>開催日時</div>
          <div style={styles.headerCell}>場所</div>
          <div style={styles.headerCell}>ステータス</div>
          <div style={styles.headerCell}>操作</div>
        </div>

        {displayMeetings.map((meeting) => (
          <div key={meeting.id} style={styles.meetingRow}>
            <div style={styles.meetingCell}>
              <span style={styles.meetingType}>
                {getMeetingTypeDisplayName(meeting.meeting_type)}
              </span>
            </div>
            <div style={styles.meetingCell}>
              <div style={styles.meetingTitle}>{meeting.title}</div>
            </div>
            <div style={styles.meetingCell}>
              <div style={styles.meetingDate}>
                {meeting.date ? format(new Date(meeting.date), 'yyyy年MM月dd日(E)', { locale: ja }) : '未設定'}
              </div>
              <div style={styles.meetingTime}>
                {meeting.time_start} - {meeting.time_end}
              </div>
            </div>
            <div style={styles.meetingCell}>
              <div style={styles.meetingLocation}>{meeting.location}</div>
            </div>
            <div style={styles.meetingCell}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(meeting.status)
              }}>
                {getStatusDisplayName(meeting.status)}
              </span>
            </div>
            <div style={styles.meetingCell}>
              <div style={styles.actionButtons}>
                <button
                  onClick={() => showAgendas(meeting)}
                  style={styles.agendaButton}
                >
                  議題
                </button>
                <button
                  onClick={() => startEdit(meeting)}
                  style={styles.editButton}
                >
                  編集
                </button>
                <button
                  onClick={() => handleSendAttendanceEmail(meeting)}
                  style={styles.emailButton}
                >
                  出席確認
                </button>
                <button
                  onClick={() => handleSendReminderEmail(meeting.id)}
                  style={styles.reminderButton}
                >
                  リマインダー
                </button>
                <button
                  onClick={() => handleShowMinutesModal(meeting)}
                  style={styles.minutesButton}
                >
                  議事録
                </button>
                {meeting.status === 'tentative' && (
                  <button
                    onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                    style={styles.deleteButton}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 追加フォーム */}
      {showAddForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>新しい理事会を追加</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddMeeting} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>種別 *</label>
                <select
                  value={formData.meeting_type}
                  onChange={(e) => setFormData({...formData, meeting_type: e.target.value as any})}
                  style={styles.select}
                  required
                >
                  <option value="regular">定例理事会</option>
                  <option value="emergency">臨時理事会</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>タイトル *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>開催日 *</label>
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
                  <label style={styles.label}>開始時間 *</label>
                  <input
                    type="time"
                    value={formData.time_start}
                    onChange={(e) => setFormData({...formData, time_start: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>終了時間 *</label>
                  <input
                    type="time"
                    value={formData.time_end}
                    onChange={(e) => setFormData({...formData, time_end: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>場所 *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ステータス *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  style={styles.select}
                  required
                >
                  <option value="tentative">仮確定</option>
                  <option value="confirmed">確定</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
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
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.saveButton}>
                  作成
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  style={styles.cancelButton}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編集フォーム */}
      {showEditForm && editingMeeting && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>理事会情報を編集</h3>
              <button 
                onClick={() => setShowEditForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditMeeting} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>種別 *</label>
                <select
                  value={formData.meeting_type}
                  onChange={(e) => setFormData({...formData, meeting_type: e.target.value as any})}
                  style={styles.select}
                  required
                >
                  <option value="regular">定例理事会</option>
                  <option value="emergency">臨時理事会</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>タイトル *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>開催日 *</label>
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
                  <label style={styles.label}>開始時間 *</label>
                  <input
                    type="time"
                    value={formData.time_start}
                    onChange={(e) => setFormData({...formData, time_start: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>終了時間 *</label>
                  <input
                    type="time"
                    value={formData.time_end}
                    onChange={(e) => setFormData({...formData, time_end: e.target.value})}
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>場所 *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ステータス *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  style={styles.select}
                  required
                >
                  <option value="tentative">仮確定</option>
                  <option value="confirmed">確定</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
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
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.saveButton}>
                  更新
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

      {/* 詳細モーダル */}
      {showDetailModal && selectedMeeting && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>理事会詳細</h3>
              <button 
                onClick={() => setShowDetailModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.detailContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>種別:</span>
                <span style={styles.detailValue}>{getMeetingTypeDisplayName(selectedMeeting.meeting_type)}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>タイトル:</span>
                <span style={styles.detailValue}>{selectedMeeting.title}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>開催日:</span>
                <span style={styles.detailValue}>
                  {selectedMeeting.date ? format(new Date(selectedMeeting.date), 'yyyy年MM月dd日(E)', { locale: ja }) : '未設定'}
                </span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>時間:</span>
                <span style={styles.detailValue}>{selectedMeeting.time_start} - {selectedMeeting.time_end}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>場所:</span>
                <span style={styles.detailValue}>{selectedMeeting.location}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>ステータス:</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(selectedMeeting.status)
                }}>
                  {getStatusDisplayName(selectedMeeting.status)}
                </span>
              </div>
              {selectedMeeting.description && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>説明:</span>
                  <span style={styles.detailValue}>{selectedMeeting.description}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 議題モーダル */}
      {showAgendaModal && selectedMeeting && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{selectedMeeting.title} - 議題一覧</h3>
              <button 
                onClick={() => setShowAgendaModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.agendaContent}>
              {agendaLoading ? (
                <div style={styles.loading}>議題を読み込み中...</div>
              ) : selectedMeetingAgendas.length > 0 ? (
                <div>
                  {selectedMeetingAgendas.map((agenda, index) => (
                    <div key={agenda.id} style={styles.agendaItem}>
                      <div style={styles.agendaHeader}>
                        <span style={styles.agendaNumber}>{agenda.order_no}.</span>
                        <span style={styles.agendaTitle}>{agenda.title}</span>
                        <span style={styles.agendaStatus}>
                          {agenda.status === 'pending' ? '未検討' : 
                           agenda.status === 'discussed' ? '検討済' :
                           agenda.status === 'approved' ? '承認' : 
                           agenda.status === 'rejected' ? '否決' : agenda.status}
                        </span>
                      </div>
                      {agenda.description && (
                        <div style={styles.agendaDescription}>
                          {agenda.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noAgendas}>
                  この理事会にはまだ議題が登録されていません。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 出席確認モーダル */}
      {showAttendanceModal && selectedMeeting && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{selectedMeeting.title} - 出席確認</h3>
              <button 
                onClick={() => setShowAttendanceModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.attendanceContent}>
              {attendanceLoading ? (
                <div style={styles.loading}>出席状況を読み込み中...</div>
              ) : (
                <div>
                  <div style={styles.meetingInfo}>
                    <div style={styles.infoRow}>
                      <span>開催日時: {selectedMeeting.date ? format(new Date(selectedMeeting.date), 'yyyy年MM月dd日(E) HH:mm', { locale: ja }) : '未設定'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span>場所: {selectedMeeting.location}</span>
                    </div>
                  </div>
                  
                  <div style={styles.attendanceList}>
                    <h4>役員出席状況</h4>
                    {attendanceData.length > 0 ? (
                      attendanceData.map((attendance) => (
                        <div key={attendance.id} style={styles.attendanceRow}>
                          <div style={styles.memberInfo}>
                            <span style={styles.memberRole}>
                              {attendance.role_name || (attendance.role === 'admin' ? '管理者' :
                               attendance.role === 'chairperson' ? '理事長' :
                               attendance.role === 'board_member' ? '理事' : '住民')}
                            </span>
                            <span style={styles.memberName}>{attendance.member_name}</span>
                          </div>
                          <div style={styles.statusButtons}>
                            <button
                              onClick={() => updateAttendanceStatus(attendance.user_id, 'attending')}
                              style={{
                                ...styles.statusButton,
                                ...(attendance.status === 'attending' ? styles.activeStatusButton : {}),
                                backgroundColor: attendance.status === 'attending' ? '#28a745' : '#f8f9fa'
                              }}
                            >
                              参加可能
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(attendance.user_id, 'maybe')}
                              style={{
                                ...styles.statusButton,
                                ...(attendance.status === 'maybe' ? styles.activeStatusButton : {}),
                                backgroundColor: attendance.status === 'maybe' ? '#ffc107' : '#f8f9fa'
                              }}
                            >
                              要検討
                            </button>
                            <button
                              onClick={() => updateAttendanceStatus(attendance.user_id, 'absent')}
                              style={{
                                ...styles.statusButton,
                                ...(attendance.status === 'absent' ? styles.activeStatusButton : {}),
                                backgroundColor: attendance.status === 'absent' ? '#dc3545' : '#f8f9fa'
                              }}
                            >
                              参加不可
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={styles.noAttendance}>
                        出席者情報がありません。
                      </div>
                    )}
                    
                    {/* 出席状況カウント */}
                    {attendanceData.length > 0 && (
                      <div style={styles.attendanceCount}>
                        <h4>出席状況集計</h4>
                        <div style={styles.countGrid}>
                          <div style={styles.countItem}>
                            <div style={{...styles.countBadge, backgroundColor: '#28a745'}}>
                              参加可能
                            </div>
                            <div style={styles.countNumber}>
                              {getAttendanceCount().attending}名
                            </div>
                          </div>
                          <div style={styles.countItem}>
                            <div style={{...styles.countBadge, backgroundColor: '#ffc107'}}>
                              要検討
                            </div>
                            <div style={styles.countNumber}>
                              {getAttendanceCount().maybe}名
                            </div>
                          </div>
                          <div style={styles.countItem}>
                            <div style={{...styles.countBadge, backgroundColor: '#dc3545'}}>
                              参加不可
                            </div>
                            <div style={styles.countNumber}>
                              {getAttendanceCount().absent}名
                            </div>
                          </div>
                          <div style={styles.countItem}>
                            <div style={{...styles.countBadge, backgroundColor: '#6c757d'}}>
                              合計
                            </div>
                            <div style={styles.countNumber}>
                              {getAttendanceCount().total}名
                            </div>
                          </div>
                        </div>
                        <div style={styles.attendanceRate}>
                          出席率: {getAttendanceCount().total > 0 ? 
                            Math.round((getAttendanceCount().attending / getAttendanceCount().total) * 100) : 0}%
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 保存ボタン */}
                  <div style={styles.saveButtonContainer}>
                    <button
                      onClick={handleSaveAttendance}
                      style={styles.saveButton}
                      disabled={attendanceLoading}
                    >
                      {attendanceLoading ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 議事録モーダル */}
      {showMinutesModal && selectedMeetingForMinutes && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{selectedMeetingForMinutes.title} - 議事録</h3>
              <button 
                onClick={() => setShowMinutesModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <div style={styles.minutesContent}>
              {minutesLoading ? (
                <div style={styles.loading}>議事録を読み込み中...</div>
              ) : (
                <div>
                  <div style={styles.meetingInfo}>
                    <div style={styles.infoRow}>
                      <span>開催日時: {selectedMeetingForMinutes.date ? format(new Date(selectedMeetingForMinutes.date), 'yyyy年MM月dd日(E) HH:mm', { locale: ja }) : '未設定'}</span>
                    </div>
                    <div style={styles.infoRow}>
                      <span>場所: {selectedMeetingForMinutes.location}</span>
                    </div>
                  </div>
                  
                  <div style={styles.fileUploadSection}>
                    <h4>議事録ファイルをアップロード</h4>
                    <div style={styles.uploadArea}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        style={styles.fileInput}
                        id="minutes-file-input"
                      />
                      <label htmlFor="minutes-file-input" style={styles.fileInputLabel}>
                        ファイルを選択 (PDF, Word, テキスト)
                      </label>
                    </div>
                  </div>
                  
                  <div style={styles.filesSection}>
                    <h4>アップロード済みファイル</h4>
                    {minutesFiles.length > 0 ? (
                      <div style={styles.filesList}>
                        {minutesFiles.map((file) => (
                          <div key={file.id} style={styles.fileItem}>
                            <div style={styles.fileInfo}>
                              <span style={styles.fileName}>{file.original_name}</span>
                              <span style={styles.fileSize}>
                                {file.file_size ? `${Math.round(file.file_size / 1024)}KB` : ''}
                              </span>
                              <span style={styles.fileDate}>
                                {file.upload_date ? format(new Date(file.upload_date), 'yyyy/MM/dd HH:mm') : ''}
                              </span>
                            </div>
                            <div style={styles.fileActions}>
                              <button
                                onClick={() => window.open(`/api/files/${file.id}/download`, '_blank')}
                                style={styles.downloadButton}
                              >
                                ダウンロード
                              </button>
                              {(user?.role === 'admin' || user?.role === 'chairperson') && (
                                <button
                                  onClick={() => handleDeleteMinutes(file.id)}
                                  style={styles.deleteFileButton}
                                >
                                  削除
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.noFiles}>
                        アップロードされた議事録がありません。
                      </div>
                    )}
                  </div>
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
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  tabContainer: {
    display: 'flex',
    marginBottom: '20px',
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tabButton: {
    flex: 1,
    padding: '12px 24px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  activeTab: {
    backgroundColor: '#007bff',
    color: 'white',
    borderBottom: '3px solid #0056b3',
  },
  inactiveTab: {
    backgroundColor: '#f8f9fa',
    color: '#495057',
    borderBottom: '3px solid transparent',
  },
  meetingList: {
    backgroundColor: 'white',
    borderRadius: '0 0 8px 8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1.5fr 1fr 1fr 2.5fr',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },
  headerCell: {
    padding: '15px 10px',
    fontWeight: 'bold',
    color: '#495057',
    fontSize: '14px',
    borderRight: '1px solid #dee2e6',
  },
  meetingRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1.5fr 1fr 1fr 2.5fr',
    borderBottom: '1px solid #eee',
    transition: 'background-color 0.2s',
  },
  meetingCell: {
    padding: '15px 10px',
    borderRight: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
  },
  meetingType: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#007bff',
  },
  meetingTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  meetingDate: {
    fontSize: '14px',
    color: '#333',
  },
  meetingTime: {
    fontSize: '12px',
    color: '#666',
  },
  meetingLocation: {
    fontSize: '13px',
    color: '#333',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap' as const,
  },
  detailButton: {
    padding: '4px 8px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  editButton: {
    padding: '4px 8px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  emailButton: {
    padding: '4px 8px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  reminderButton: {
    padding: '4px 8px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: '4px 8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '16px',
    color: '#666',
  },
  accessDenied: {
    textAlign: 'center' as const,
    padding: '60px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
  formRow: {
    display: 'flex',
    gap: '10px',
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
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
    minWidth: '80px',
  },
  detailValue: {
    fontSize: '14px',
    color: '#666',
  },
  agendaButton: {
    padding: '4px 8px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  agendaContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
  },
  agendaItem: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
  },
  agendaHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  agendaNumber: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#007bff',
    minWidth: '20px',
  },
  agendaTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  agendaStatus: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: '#e9ecef',
    color: '#495057',
    fontWeight: 'bold',
  },
  agendaDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
    paddingLeft: '30px',
  },
  noAgendas: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  },
  // 出席確認モーダル用スタイル
  attendanceContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  meetingInfo: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  infoRow: {
    marginBottom: '8px',
    fontSize: '14px',
    color: '#495057',
  },
  attendanceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  attendanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  memberInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  memberRole: {
    fontSize: '12px',
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    padding: '4px 10px',
    borderRadius: '12px',
    fontWeight: 'bold',
    minWidth: '60px',
    textAlign: 'center' as const,
  },
  memberName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  statusButtons: {
    display: 'flex',
    gap: '8px',
  },
  statusButton: {
    padding: '8px 12px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#495057',
    transition: 'all 0.2s',
  },
  activeStatusButton: {
    color: 'white',
    borderColor: 'transparent',
  },
  noAttendance: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  },
  // 出席状況カウント用スタイル
  attendanceCount: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  countGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    marginBottom: '15px',
  },
  countItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  countBadge: {
    padding: '6px 12px',
    borderRadius: '16px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    minWidth: '80px',
  },
  countNumber: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  attendanceRate: {
    textAlign: 'center' as const,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#495057',
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  saveButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
    padding: '20px 0',
    borderTop: '1px solid #e9ecef',
  },
  saveButton: {
    padding: '12px 30px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  minutesButton: {
    padding: '6px 12px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    margin: '0 2px',
    transition: 'all 0.2s',
  },
  minutesContent: {
    padding: '20px',
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  fileUploadSection: {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  uploadArea: {
    marginTop: '15px',
  },
  fileInput: {
    display: 'none',
  },
  fileInputLabel: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  filesSection: {
    marginTop: '20px',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '15px',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #dee2e6',
  },
  fileInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  fileName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  fileSize: {
    fontSize: '12px',
    color: '#6c757d',
  },
  fileDate: {
    fontSize: '12px',
    color: '#6c757d',
  },
  fileActions: {
    display: 'flex',
    gap: '8px',
  },
  downloadButton: {
    padding: '6px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  deleteFileButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  noFiles: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#999',
    fontSize: '16px',
  },
};

export default BoardMeetingSchedule;