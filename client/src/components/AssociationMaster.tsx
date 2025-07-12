import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Association } from '../types';
import { api } from '../utils/api';

const AssociationMaster: React.FC = () => {
  const { user } = useAuth();
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    association_code: '',
    association_name: '',
    chairperson_name: '',
    meeting_frequency: 1,
    meeting_week: 1,
    meeting_day_of_week: 0,
    meeting_start_time: '14:00',
    meeting_end_time: '16:00'
  });

  useEffect(() => {
    fetchAssociation();
  }, []);

  const fetchAssociation = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token value:', token);
      
      if (token) {
        console.log('Fetching association data...');
        const associationData = await api.getAssociation();
        console.log('Association data received:', associationData);
        
        if (associationData && typeof associationData === 'object') {
          setAssociation(associationData);
          setFormData({
            association_code: associationData.association_code || '',
            association_name: associationData.association_name || '',
            chairperson_name: associationData.chairperson_name || '',
            meeting_frequency: associationData.meeting_frequency || 1,
            meeting_week: associationData.meeting_week || 1,
            meeting_day_of_week: associationData.meeting_day_of_week || 0,
            meeting_start_time: associationData.meeting_start_time || '14:00',
            meeting_end_time: associationData.meeting_end_time || '16:00'
          });
          console.log('Association data set successfully');
        } else {
          console.error('Invalid association data received:', associationData);
        }
      } else {
        console.log('No token found - cannot fetch association data');
      }
    } catch (error) {
      console.error('Failed to fetch association:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      } else {
        console.error('Error details:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    if (association) {
      setFormData({
        association_code: association.association_code,
        association_name: association.association_name,
        chairperson_name: association.chairperson_name,
        meeting_frequency: association.meeting_frequency,
        meeting_week: association.meeting_week || 1,
        meeting_day_of_week: association.meeting_day_of_week || 0,
        meeting_start_time: association.meeting_start_time || '14:00',
        meeting_end_time: association.meeting_end_time || '16:00'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const updatedAssociation = await api.updateAssociation(formData);
        setAssociation(updatedAssociation);
        setEditing(false);
        alert('組合基本情報が更新されました');
      }
    } catch (error) {
      console.error('Failed to update association:', error);
      alert('組合基本情報の更新に失敗しました');
    }
  };

  const getMeetingFrequencyDisplayName = (frequency: number) => {
    switch (frequency) {
      case 1: return '毎月';
      case 2: return '偶数月';
      case 3: return '奇数月';
      case 4: return 'その他';
      default: return '不明';
    }
  };

  const getMeetingWeekDisplayName = (week?: number) => {
    if (week === undefined || week === null) return '-';
    switch (week) {
      case 1: return '第1週';
      case 2: return '第2週';
      case 3: return '第3週';
      case 4: return '第4週';
      default: return '不明';
    }
  };

  const getDayOfWeekDisplayName = (dayOfWeek?: number) => {
    if (dayOfWeek === undefined || dayOfWeek === null) return '-';
    const days = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    return days[dayOfWeek] || '不明';
  };

  const canManageAssociation = user?.role === 'admin';


  if (!canManageAssociation) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>アクセス権限がありません</h2>
          <p>この機能は管理者のみが利用できます。</p>
          <p>現在のユーザー: {user?.name} ({user?.role})</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  if (!association) {
    return <div style={styles.loading}>データが見つかりません</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>組合基本情報管理</h1>
        {!editing && (
          <button
            onClick={handleEdit}
            style={styles.primaryButton}
          >
            編集
          </button>
        )}
      </header>

      <div style={styles.content}>
        {editing ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>組合コード *</label>
                <input
                  type="text"
                  value={formData.association_code}
                  onChange={(e) => setFormData({...formData, association_code: e.target.value})}
                  style={styles.input}
                  required
                  maxLength={20}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>組合名称 *</label>
                <input
                  type="text"
                  value={formData.association_name}
                  onChange={(e) => setFormData({...formData, association_name: e.target.value})}
                  style={styles.input}
                  required
                  maxLength={200}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>理事長名 *</label>
                <input
                  type="text"
                  value={formData.chairperson_name}
                  onChange={(e) => setFormData({...formData, chairperson_name: e.target.value})}
                  style={styles.input}
                  required
                  maxLength={100}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>理事会頻度 *</label>
                <select
                  value={formData.meeting_frequency}
                  onChange={(e) => setFormData({...formData, meeting_frequency: parseInt(e.target.value)})}
                  style={styles.select}
                  required
                >
                  <option value={1}>毎月</option>
                  <option value={2}>偶数月</option>
                  <option value={3}>奇数月</option>
                  <option value={4}>その他</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>理事会開催週</label>
                <select
                  value={formData.meeting_week}
                  onChange={(e) => setFormData({...formData, meeting_week: parseInt(e.target.value)})}
                  style={styles.select}
                >
                  <option value={1}>第1週</option>
                  <option value={2}>第2週</option>
                  <option value={3}>第3週</option>
                  <option value={4}>第4週</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>理事会開催曜日</label>
                <select
                  value={formData.meeting_day_of_week}
                  onChange={(e) => setFormData({...formData, meeting_day_of_week: parseInt(e.target.value)})}
                  style={styles.select}
                >
                  <option value={0}>日曜日</option>
                  <option value={1}>月曜日</option>
                  <option value={2}>火曜日</option>
                  <option value={3}>水曜日</option>
                  <option value={4}>木曜日</option>
                  <option value={5}>金曜日</option>
                  <option value={6}>土曜日</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>理事会開始時刻</label>
                <input
                  type="time"
                  value={formData.meeting_start_time}
                  onChange={(e) => setFormData({...formData, meeting_start_time: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>理事会終了時刻</label>
                <input
                  type="time"
                  value={formData.meeting_end_time}
                  onChange={(e) => setFormData({...formData, meeting_end_time: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton}>
                保存
              </button>
              <button 
                type="button" 
                onClick={handleCancel}
                style={styles.cancelButton}
              >
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.displayGrid}>
            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>組合コード</div>
              <div style={styles.displayValue}>{association.association_code}</div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>組合名称</div>
              <div style={styles.displayValue}>{association.association_name}</div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>理事長名</div>
              <div style={styles.displayValue}>{association.chairperson_name}</div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>理事会頻度</div>
              <div style={styles.displayValue}>
                <span style={styles.frequencyBadge}>
                  {getMeetingFrequencyDisplayName(association.meeting_frequency)}
                </span>
              </div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>理事会開催週</div>
              <div style={styles.displayValue}>
                {getMeetingWeekDisplayName(association.meeting_week)}
              </div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>理事会開催曜日</div>
              <div style={styles.displayValue}>
                {getDayOfWeekDisplayName(association.meeting_day_of_week)}
              </div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>理事会開催時間</div>
              <div style={styles.displayValue}>
                {association.meeting_start_time && association.meeting_end_time 
                  ? `${association.meeting_start_time} - ${association.meeting_end_time}`
                  : '-'
                }
              </div>
            </div>

            <div style={styles.displayGroup}>
              <div style={styles.displayLabel}>最終更新日時</div>
              <div style={styles.displayValue}>
                {new Date(association.updated_at).toLocaleString('ja-JP')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
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
  content: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    padding: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  displayGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  },
  displayGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    paddingBottom: '15px',
    borderBottom: '1px solid #f0f0f0',
  },
  displayLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  displayValue: {
    fontSize: '16px',
    color: '#333',
    lineHeight: '1.5',
  },
  frequencyBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
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
};

export default AssociationMaster;