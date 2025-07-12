import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Role {
  id: number;
  association_code: string;
  role_cd: number;
  role_name: string;
  created_at: string;
  updated_at: string;
}

const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [formData, setFormData] = useState({
    association_code: '',
    role_cd: '',
    role_name: ''
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Mock data for now - replace with actual API call
        const mockRoles: Role[] = [
          {
            id: 1,
            association_code: 'ASC001',
            role_cd: 1,
            role_name: '管理者',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 2,
            association_code: 'ASC001',
            role_cd: 2,
            role_name: '理事長',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 3,
            association_code: 'ASC001',
            role_cd: 3,
            role_name: '理事',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 4,
            association_code: 'ASC001',
            role_cd: 4,
            role_name: '住民',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        setRoles(mockRoles);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Mock role creation - replace with actual API call
        const newRole: Role = {
          id: Date.now(),
          association_code: formData.association_code,
          role_cd: parseInt(formData.role_cd),
          role_name: formData.role_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setRoles([...roles, newRole]);
        resetForm();
        setShowAddForm(false);
        alert('役職が追加されました');
      }
    } catch (error) {
      console.error('Failed to create role:', error);
      alert('役職の追加に失敗しました');
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Mock role update - replace with actual API call
        const updatedRole: Role = {
          ...editingRole,
          association_code: formData.association_code,
          role_cd: parseInt(formData.role_cd),
          role_name: formData.role_name,
          updated_at: new Date().toISOString()
        };

        setRoles(roles.map(role => role.id === editingRole.id ? updatedRole : role));
        resetForm();
        setShowEditForm(false);
        setEditingRole(null);
        alert('役職が更新されました');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('役職の更新に失敗しました');
    }
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (!window.confirm(`「${roleName}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Mock role deletion - replace with actual API call
        setRoles(roles.filter(role => role.id !== roleId));
        alert('役職が削除されました');
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('役職の削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      association_code: '',
      role_cd: '',
      role_name: ''
    });
  };

  const startEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      association_code: role.association_code,
      role_cd: role.role_cd.toString(),
      role_name: role.role_name
    });
    setShowEditForm(true);
  };

  const canManageRoles = user?.role === 'admin';

  if (!canManageRoles) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>アクセス権限がありません</h2>
          <p>この機能は管理者のみ利用できます。</p>
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
        <h1 style={styles.title}>役職管理</h1>
        <button
          onClick={() => setShowAddForm(true)}
          style={styles.primaryButton}
        >
          役職を追加
        </button>
      </header>

      <div style={styles.roleList}>
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>組合CD</div>
          <div style={styles.headerCell}>役職CD</div>
          <div style={styles.headerCell}>役職名</div>
          <div style={styles.headerCell}>作成日</div>
          <div style={styles.headerCell}>操作</div>
        </div>

        {roles.map((role) => (
          <div key={role.id} style={styles.roleRow}>
            <div style={styles.roleCell}>{role.association_code}</div>
            <div style={styles.roleCell}>{role.role_cd}</div>
            <div style={styles.roleCell}>{role.role_name}</div>
            <div style={styles.roleCell}>
              {new Date(role.created_at).toLocaleDateString('ja-JP')}
            </div>
            <div style={styles.roleCell}>
              <div style={styles.actionButtons}>
                <button
                  onClick={() => startEdit(role)}
                  style={styles.editButton}
                >
                  編集
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id, role.role_name)}
                  style={styles.deleteButton}
                >
                  削除
                </button>
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
              <h3>新しい役職を追加</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddRole} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>組合CD *</label>
                <input
                  type="text"
                  value={formData.association_code}
                  onChange={(e) => setFormData({...formData, association_code: e.target.value})}
                  style={styles.input}
                  required
                  placeholder="例：ASC001"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>役職CD *</label>
                <input
                  type="number"
                  value={formData.role_cd}
                  onChange={(e) => setFormData({...formData, role_cd: e.target.value})}
                  style={styles.input}
                  required
                  placeholder="例：1"
                  min="1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>役職名 *</label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                  style={styles.input}
                  required
                  placeholder="例：管理者"
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.saveButton}>
                  追加
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
      {showEditForm && editingRole && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>役職を編集</h3>
              <button 
                onClick={() => setShowEditForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditRole} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>組合CD *</label>
                <input
                  type="text"
                  value={formData.association_code}
                  onChange={(e) => setFormData({...formData, association_code: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>役職CD *</label>
                <input
                  type="number"
                  value={formData.role_cd}
                  onChange={(e) => setFormData({...formData, role_cd: e.target.value})}
                  style={styles.input}
                  required
                  min="1"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>役職名 *</label>
                <input
                  type="text"
                  value={formData.role_name}
                  onChange={(e) => setFormData({...formData, role_name: e.target.value})}
                  style={styles.input}
                  required
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
  roleList: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr 1.5fr 1.5fr',
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
  roleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr 1.5fr 1.5fr',
    borderBottom: '1px solid #eee',
    transition: 'background-color 0.2s',
  },
  roleCell: {
    padding: '15px 10px',
    borderRight: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#333',
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
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

export default RoleManagement;