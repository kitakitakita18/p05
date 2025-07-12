import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Agenda } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

interface ExtendedAgenda extends Agenda {
  meeting_title: string;
  meeting_date: string;
  created_by_name: string;
}

type SortField = 'title' | 'status' | 'created_by_name' | 'priority' | 'start_date' | 'due_date';
type SortDirection = 'asc' | 'desc';

const AgendaManagement: React.FC = () => {
  const { user } = useAuth();
  const [agendas, setAgendas] = useState<ExtendedAgenda[]>([]);
  const [filteredAgendas, setFilteredAgendas] = useState<ExtendedAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [meetingSortOrder, setMeetingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<ExtendedAgenda | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // ソート機能
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // 編集フォーム状態
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

  // 全議題を取得
  const fetchAllAgendas = async () => {
    try {
      setLoading(true);
      const agendasData = await api.getAllAgendas();
      setAgendas(agendasData);
      setFilteredAgendas(agendasData);
    } catch (error) {
      console.error('Failed to fetch agendas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAgendas();
  }, []);

  // フィルタリング・ソート処理
  useEffect(() => {
    let filtered = [...agendas];

    // テキスト検索
    if (searchTerm) {
      filtered = filtered.filter(agenda => 
        agenda.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agenda.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agenda.meeting_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agenda => agenda.status === statusFilter);
    }

    // 採否区分フィルタ
    if (approvalFilter !== 'all') {
      filtered = filtered.filter(agenda => {
        if (approvalFilter === 'none') {
          return !agenda.approval_status;
        }
        return agenda.approval_status === approvalFilter;
      });
    }

    // 優先順位フィルタ
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(agenda => agenda.priority === priorityFilter);
    }

    // 開始日範囲フィルタ
    if (startDateFrom || startDateTo) {
      filtered = filtered.filter(agenda => {
        if (!agenda.start_date) return false;
        const startDate = new Date(agenda.start_date);
        const fromDate = startDateFrom ? new Date(startDateFrom) : new Date(0);
        const toDate = startDateTo ? new Date(startDateTo) : new Date('9999-12-31');
        return startDate >= fromDate && startDate <= toDate;
      });
    }

    // 期限日範囲フィルタ
    if (dueDateFrom || dueDateTo) {
      filtered = filtered.filter(agenda => {
        if (!agenda.due_date) return false;
        const dueDate = new Date(agenda.due_date);
        const fromDate = dueDateFrom ? new Date(dueDateFrom) : new Date(0);
        const toDate = dueDateTo ? new Date(dueDateTo) : new Date('9999-12-31');
        return dueDate >= fromDate && dueDate <= toDate;
      });
    }

    // ソート: 理事会、作成日の順
    filtered.sort((a, b) => {
      // 1. 理事会名でソート
      const meetingCompare = a.meeting_title.localeCompare(b.meeting_title);
      if (meetingCompare !== 0) {
        return meetingSortOrder === 'asc' ? meetingCompare : -meetingCompare;
      }
      
      // 2. 作成日でソート
      const aCreatedAt = new Date(a.created_at);
      const bCreatedAt = new Date(b.created_at);
      return aCreatedAt > bCreatedAt ? -1 : 1; // 新しい順
    });

    setFilteredAgendas(filtered);
    setCurrentPage(1); // フィルタ変更時はページを1に戻す
  }, [agendas, searchTerm, statusFilter, approvalFilter, priorityFilter, startDateFrom, startDateTo, dueDateFrom, dueDateTo, meetingSortOrder]);

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ソートアイコン
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // ページネーション
  const totalPages = Math.ceil(filteredAgendas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAgendas = filteredAgendas.slice(startIndex, endIndex);

  // 編集モーダルを開く
  const openEditModal = (agenda: ExtendedAgenda) => {
    setEditingAgenda(agenda);
    setFormData({
      title: agenda.title,
      description: agenda.description || '',
      discussion_result: agenda.discussion_result || '',
      status: agenda.status,
      category: agenda.category || '',
      approval_status: agenda.approval_status || '',
      priority: agenda.priority,
      start_date: agenda.start_date || '',
      due_date: agenda.due_date || ''
    });
    setShowEditModal(true);
  };

  // 編集保存
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgenda) return;

    setSubmitting(true);
    try {
      const updateData = {
        ...formData,
        approval_status: formData.approval_status || undefined
      };
      await api.updateAgenda(editingAgenda.id, updateData);
      await fetchAllAgendas();
      setShowEditModal(false);
      setEditingAgenda(null);
      alert('議題が更新されました。');
    } catch (error) {
      console.error('Failed to update agenda:', error);
      alert('議題の更新に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  // 議題削除
  const handleDeleteAgenda = async (agendaId: number) => {
    if (window.confirm('この議題を削除しますか？')) {
      try {
        await api.deleteAgenda(agendaId);
        await fetchAllAgendas();
        alert('議題が削除されました。');
      } catch (error) {
        console.error('Failed to delete agenda:', error);
        alert('議題の削除に失敗しました。');
      }
    }
  };

  // ステータス別の統計
  const getStatusCounts = () => {
    return {
      total: agendas.length,
      not_started: agendas.filter(a => a.status === 'not_started').length,
      in_progress: agendas.filter(a => a.status === 'in_progress').length,
      completed: agendas.filter(a => a.status === 'completed').length,
      on_hold: agendas.filter(a => a.status === 'on_hold').length,
      finished: agendas.filter(a => a.status === 'finished').length
    };
  };

  // ステータス表示
  const getStatusDisplay = (status: string) => {
    const statusMap = {
      'not_started': { text: '未対応', color: '#6c757d' },
      'in_progress': { text: '処理中', color: '#007bff' },
      'completed': { text: '処理済み', color: '#28a745' },
      'on_hold': { text: '保留', color: '#ffc107' },
      'finished': { text: '完了', color: '#17a2b8' }
    };
    return statusMap[status as keyof typeof statusMap] || { text: status, color: '#333' };
  };

  // 採否区分表示
  const getApprovalDisplay = (approval_status: string | undefined) => {
    if (!approval_status) return null;
    const approvalMap = {
      'approved': { text: '可決', color: '#28a745' },
      'rejected': { text: '否決', color: '#dc3545' }
    };
    return approvalMap[approval_status as keyof typeof approvalMap] || null;
  };

  // 優先順位表示
  const getPriorityDisplay = (priority: string) => {
    const priorityMap = {
      'S': { text: 'S', color: '#dc3545' },
      'A': { text: 'A', color: '#fd7e14' },
      'B': { text: 'B', color: '#ffc107' },
      'C': { text: 'C', color: '#6c757d' }
    };
    return priorityMap[priority as keyof typeof priorityMap] || { text: priority, color: '#333' };
  };

  const canManageAgendas = user?.role === 'admin' || user?.role === 'chairperson';
  const statusCounts = getStatusCounts();

  if (loading) {
    return <div style={styles.loading}>読み込み中...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>議題管理</h1>
        <div style={styles.statsContainer}>
          <div style={styles.statItem}>
            <span style={styles.statNumber}>{statusCounts.total}</span>
            <span style={styles.statLabel}>総議題数</span>
          </div>
          <div style={styles.statItem}>
            <span style={{...styles.statNumber, color: '#6c757d'}}>{statusCounts.not_started}</span>
            <span style={styles.statLabel}>未対応</span>
          </div>
          <div style={styles.statItem}>
            <span style={{...styles.statNumber, color: '#007bff'}}>{statusCounts.in_progress}</span>
            <span style={styles.statLabel}>処理中</span>
          </div>
          <div style={styles.statItem}>
            <span style={{...styles.statNumber, color: '#28a745'}}>{statusCounts.completed}</span>
            <span style={styles.statLabel}>処理済み</span>
          </div>
          <div style={styles.statItem}>
            <span style={{...styles.statNumber, color: '#ffc107'}}>{statusCounts.on_hold}</span>
            <span style={styles.statLabel}>保留</span>
          </div>
          <div style={styles.statItem}>
            <span style={{...styles.statNumber, color: '#17a2b8'}}>{statusCounts.finished}</span>
            <span style={styles.statLabel}>完了</span>
          </div>
        </div>
      </header>

      <div style={styles.filterSection}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="議題タイトル、説明、理事会名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.filtersRow}>
          <div style={styles.filterContainer}>
            <label style={styles.filterLabel}>ステータス:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">すべて</option>
              <option value="not_started">未対応</option>
              <option value="in_progress">処理中</option>
              <option value="completed">処理済み</option>
              <option value="on_hold">保留</option>
              <option value="finished">完了</option>
            </select>
          </div>

          <div style={styles.filterContainer}>
            <label style={styles.filterLabel}>採否区分:</label>
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">すべて</option>
              <option value="none">未設定</option>
              <option value="approved">可決</option>
              <option value="rejected">否決</option>
            </select>
          </div>

          <div style={styles.filterContainer}>
            <label style={styles.filterLabel}>優先順位:</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">すべて</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
        </div>

        <div style={styles.filtersRow}>
          <div style={styles.dateRangeContainer}>
            <label style={styles.filterLabel}>開始日:</label>
            <input
              type="date"
              value={startDateFrom}
              onChange={(e) => setStartDateFrom(e.target.value)}
              style={styles.dateInput}
            />
            <span style={styles.dateRangeSeparator}>〜</span>
            <input
              type="date"
              value={startDateTo}
              onChange={(e) => setStartDateTo(e.target.value)}
              style={styles.dateInput}
            />
          </div>

          <div style={styles.dateRangeContainer}>
            <label style={styles.filterLabel}>期限日:</label>
            <input
              type="date"
              value={dueDateFrom}
              onChange={(e) => setDueDateFrom(e.target.value)}
              style={styles.dateInput}
            />
            <span style={styles.dateRangeSeparator}>〜</span>
            <input
              type="date"
              value={dueDateTo}
              onChange={(e) => setDueDateTo(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>
                <div style={styles.headerWithSort}>
                  <span>理事会</span>
                  <div style={styles.sortButtons}>
                    <button
                      onClick={() => setMeetingSortOrder('asc')}
                      style={{
                        ...styles.sortButton,
                        ...(meetingSortOrder === 'asc' ? styles.activeSortButton : {})
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => setMeetingSortOrder('desc')}
                      style={{
                        ...styles.sortButton,
                        ...(meetingSortOrder === 'desc' ? styles.activeSortButton : {})
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={() => handleSort('title')}
              >
                議題タイトル {getSortIcon('title')}
              </th>
              <th style={styles.th}>議題説明</th>
              <th style={styles.th}>議論結果</th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={() => handleSort('status')}
              >
                ステータス {getSortIcon('status')}
              </th>
              <th style={styles.th}>採否区分</th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={() => handleSort('priority')}
              >
                優先順位 {getSortIcon('priority')}
              </th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={() => handleSort('start_date')}
              >
                開始日 {getSortIcon('start_date')}
              </th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={() => handleSort('due_date')}
              >
                期限日 {getSortIcon('due_date')}
              </th>
              <th 
                style={{...styles.th, ...styles.sortableHeader}} 
                onClick={() => handleSort('created_by_name')}
              >
                作成者 {getSortIcon('created_by_name')}
              </th>
              {canManageAgendas && <th style={styles.th}>操作</th>}
            </tr>
          </thead>
          <tbody>
            {currentAgendas.length > 0 ? (
              currentAgendas.map((agenda, index) => (
                <tr key={agenda.id} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                  <td style={styles.td}>
                    <div style={styles.meetingTitle}>{agenda.meeting_title}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.agendaTitle}>{agenda.title}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.description}>
                      {agenda.description ? (
                        agenda.description.length > 100 
                          ? `${agenda.description.substring(0, 100)}...` 
                          : agenda.description
                      ) : '-'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.description}>
                      {agenda.discussion_result ? (
                        agenda.discussion_result.length > 100 
                          ? `${agenda.discussion_result.substring(0, 100)}...` 
                          : agenda.discussion_result
                      ) : '-'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusDisplay(agenda.status).color
                    }}>
                      {getStatusDisplay(agenda.status).text}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {agenda.approval_status && (
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getApprovalDisplay(agenda.approval_status)?.color
                      }}>
                        {getApprovalDisplay(agenda.approval_status)?.text}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.priorityBadge,
                      backgroundColor: getPriorityDisplay(agenda.priority).color
                    }}>
                      {getPriorityDisplay(agenda.priority).text}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {agenda.start_date ? format(new Date(agenda.start_date), 'yyyy/MM/dd', { locale: ja }) : '-'}
                  </td>
                  <td style={styles.td}>
                    {agenda.due_date ? format(new Date(agenda.due_date), 'yyyy/MM/dd', { locale: ja }) : '-'}
                  </td>
                  <td style={styles.td}>{agenda.created_by_name}</td>
                  {canManageAgendas && (
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => openEditModal(agenda)}
                          style={styles.editButton}
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteAgenda(agenda.id)}
                          style={styles.deleteButton}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={canManageAgendas ? 11 : 10} 
                  style={{...styles.td, textAlign: 'center', padding: '40px'}}
                >
                  {searchTerm || statusFilter !== 'all' ? 
                    '検索条件に一致する議題がありません。' : 
                    '議題が登録されていません。'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            {filteredAgendas.length}件中 {startIndex + 1}-{Math.min(endIndex, filteredAgendas.length)}件を表示
          </div>
          <div style={styles.paginationButtons}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={styles.paginationButton}
            >
              前へ
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === pageNum ? styles.activePaginationButton : {})
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={styles.paginationButton}
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && editingAgenda && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>議題編集</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} style={styles.form}>
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
                <label style={styles.label}>ステータス</label>
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
                  {submitting ? '保存中...' : '保存'}
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
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1600px',
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
  statsContainer: {
    display: 'flex',
    gap: '20px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    minWidth: '80px',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textAlign: 'center' as const,
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  searchContainer: {
    width: '100%',
  },
  filtersRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  searchInput: {
    width: '100%',
    padding: '10px 15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '120px',
  },
  dateRangeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '150px',
  },
  dateRangeSeparator: {
    color: '#666',
    fontSize: '14px',
  },
  headerWithSort: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sortButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  sortButton: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: '2px',
    padding: '2px 6px',
    cursor: 'pointer',
    fontSize: '10px',
    color: '#666',
    lineHeight: '1',
  },
  activeSortButton: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'auto',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    minWidth: '1000px',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #dee2e6',
    fontSize: '14px',
    whiteSpace: 'nowrap' as const,
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none' as const,
    '&:hover': {
      backgroundColor: '#e9ecef',
    },
  },
  evenRow: {
    backgroundColor: '#ffffff',
  },
  oddRow: {
    backgroundColor: '#f8f9fa',
  },
  td: {
    padding: '12px 8px',
    borderBottom: '1px solid #dee2e6',
    fontSize: '13px',
    verticalAlign: 'top' as const,
    maxWidth: '200px',
  },
  meetingTitle: {
    fontWeight: '500',
    color: '#333',
  },
  agendaOrder: {
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center' as const,
  },
  agendaTitle: {
    fontWeight: '500',
    color: '#333',
    lineHeight: '1.4',
  },
  description: {
    color: '#666',
    lineHeight: '1.4',
    wordBreak: 'break-word' as const,
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    display: 'inline-block',
  },
  priorityBadge: {
    padding: '4px 8px',
    borderRadius: '50%',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'white',
    display: 'inline-block',
    minWidth: '24px',
    textAlign: 'center' as const,
  },
  categoryText: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
    minWidth: '80px',
  },
  editButton: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '4px 8px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    whiteSpace: 'nowrap' as const,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '4px 8px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    whiteSpace: 'nowrap' as const,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  paginationInfo: {
    fontSize: '14px',
    color: '#666',
  },
  paginationButtons: {
    display: 'flex',
    gap: '8px',
  },
  paginationButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    color: '#333',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '14px',
  },
  activePaginationButton: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
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
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical' as const,
  },
  select: {
    padding: '8px 12px',
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
};

export default AgendaManagement;