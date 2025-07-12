import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { api } from '../utils/api';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

interface Role {
  id: number;
  association_code: string;
  role_cd: number;
  role_name: string;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_cd: 4, // デフォルトは住民
    room_number: '',
    phone: ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const fetchUsers = async () => {
    try {
      const usersData = await api.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      // Mock roles data - replace with actual API call
      const mockRoles: Role[] = [
        { id: 1, association_code: 'ASC001', role_cd: 1, role_name: '管理者' },
        { id: 2, association_code: 'ASC001', role_cd: 2, role_name: '理事長' },
        { id: 3, association_code: 'ASC001', role_cd: 3, role_name: '理事' },
        { id: 4, association_code: 'ASC001', role_cd: 4, role_name: '住民' }
      ];
      setRoles(mockRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Creating user with data:', formData);
      const newUser = await api.createUser(formData);
      console.log('User created successfully:', newUser);
      
      setUsers([...users, newUser]);
      setFormData({
        name: '',
        email: '',
        password: '',
        role_cd: 4,
        room_number: '',
        phone: ''
      });
      setShowAddForm(false);
      alert('ユーザーが作成されました');
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('ユーザーの作成に失敗しました: ' + (error as Error).message);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Basic validation
    if (!formData.name.trim()) {
      alert('名前は必須です');
      return;
    }
    if (!formData.email.trim()) {
      alert('メールアドレスは必須です');
      return;
    }
    if (!formData.role_cd) {
      alert('役職を選択してください');
      return;
    }

    try {
      console.log('Updating user with data:', {
        name: formData.name,
        email: formData.email,
        role_cd: formData.role_cd,
        room_number: formData.room_number,
        phone: formData.phone
      });

      const updatedUser = await api.updateUser(editingUser.id, {
        name: formData.name,
        email: formData.email,
        role_cd: formData.role_cd,
        room_number: formData.room_number,
        phone: formData.phone
      });

      console.log('Server response:', updatedUser);

      // ユーザーリストを更新（元のユーザー情報をベースにしてサーバーからの更新データをマージ）
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...updatedUser, updated_at: new Date().toISOString() } 
          : u
      ));
      setFormData({
        name: '',
        email: '',
        password: '',
        role_cd: 4,
        room_number: '',
        phone: ''
      });
      setShowEditForm(false);
      setEditingUser(null);
      alert('ユーザー情報が更新されました');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('ユーザーの更新に失敗しました: ' + (error as Error).message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('このユーザーを削除しますか？')) return;

    try {
      await api.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      alert('ユーザーが削除されました');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('ユーザーの削除に失敗しました');
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('パスワードが一致しません');
      return;
    }

    try {
      await api.resetUserPassword(selectedUser.id, passwordData.newPassword);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordReset(false);
      setSelectedUser(null);
      alert('パスワードがリセットされました');
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('パスワードのリセットに失敗しました');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    
    // role_cdが存在しない場合、roleから推定
    let roleCd = user.role_cd;
    if (!roleCd && user.role) {
      switch (user.role) {
        case 'admin': roleCd = 1; break;
        case 'chairperson': roleCd = 2; break;
        case 'board_member': roleCd = 3; break;
        case 'resident': roleCd = 4; break;
        default: roleCd = 4;
      }
    }
    
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role_cd: roleCd || 4,
      room_number: user.room_number || '',
      phone: user.phone || ''
    });
    setShowEditForm(true);
  };

  const startPasswordReset = (user: User) => {
    setSelectedUser(user);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setShowPasswordReset(true);
  };

  const getRoleDisplayName = (roleCd: number | undefined) => {
    if (!roleCd) return '不明';
    const role = roles.find(r => r.role_cd === roleCd);
    return role ? role.role_name : '不明';
  };

  const getRoleBadgeColor = (roleCd: number | undefined) => {
    switch (roleCd) {
      case 1: return '#dc3545'; // 管理者
      case 2: return '#007bff'; // 理事長
      case 3: return '#28a745'; // 理事
      case 4: return '#6c757d'; // 住民
      default: return '#6c757d';
    }
  };

  const canManageUsers = user?.role === 'admin';

  if (!canManageUsers) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <h2>アクセス権限がありません</h2>
          <p>この機能は管理者のみが利用できます。</p>
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
        <h1 style={styles.title}>ユーザー管理</h1>
        <button
          onClick={() => setShowAddForm(true)}
          style={styles.primaryButton}
        >
          新しいユーザーを追加
        </button>
      </header>

      {/* ユーザー一覧 */}
      <div style={styles.userList}>
        <div style={styles.tableHeader}>
          <div style={styles.headerCell}>役職</div>
          <div style={styles.headerCell}>名前</div>
          <div style={styles.headerCell}>メールアドレス</div>
          <div style={styles.headerCell}>部屋番号</div>
          <div style={styles.headerCell}>電話番号</div>
          <div style={styles.headerCell}>登録日</div>
          <div style={styles.headerCell}>操作</div>
        </div>

        {users.map((userItem) => (
          <div key={userItem.id} style={styles.userRow}>
            <div style={styles.userCell}>
              <span style={{
                ...styles.roleBadge,
                backgroundColor: getRoleBadgeColor(userItem.role_cd)
              }}>
                {getRoleDisplayName(userItem.role_cd)}
              </span>
            </div>
            <div style={styles.userCell}>
              <div style={styles.userName}>{userItem.name}</div>
            </div>
            <div style={styles.userCell}>
              <div style={styles.userEmail}>{userItem.email}</div>
            </div>
            <div style={styles.userCell}>
              <div style={styles.roomNumber}>{userItem.room_number || '-'}</div>
            </div>
            <div style={styles.userCell}>
              <div style={styles.phoneNumber}>{userItem.phone || '-'}</div>
            </div>
            <div style={styles.userCell}>
              <div style={styles.createdDate}>
                {format(new Date(userItem.created_at), 'yyyy/MM/dd', { locale: ja })}
              </div>
            </div>
            <div style={styles.userCell}>
              <div style={styles.actionButtons}>
                <button
                  onClick={() => startEdit(userItem)}
                  style={styles.editButton}
                >
                  編集
                </button>
                <button
                  onClick={() => startPasswordReset(userItem)}
                  style={styles.passwordButton}
                >
                  パスワード
                </button>
                {userItem.id !== user?.id && (
                  <button
                    onClick={() => handleDeleteUser(userItem.id)}
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

      {/* ユーザー追加モーダル */}
      {showAddForm && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>新しいユーザーを追加</h3>
              <button 
                onClick={() => setShowAddForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>名前 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>メールアドレス *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>初期パスワード *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>役職 *</label>
                <select
                  value={formData.role_cd}
                  onChange={(e) => setFormData({...formData, role_cd: parseInt(e.target.value)})}
                  style={styles.select}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.role_cd} value={role.role_cd}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>部屋番号</label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                  style={styles.input}
                  placeholder="例: 101"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>電話番号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  style={styles.input}
                  placeholder="例: 090-1234-5678"
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

      {/* ユーザー編集モーダル */}
      {showEditForm && editingUser && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>ユーザー情報を編集</h3>
              <button 
                onClick={() => setShowEditForm(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditUser} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>名前 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>メールアドレス *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>役職 *</label>
                <select
                  value={formData.role_cd}
                  onChange={(e) => setFormData({...formData, role_cd: parseInt(e.target.value)})}
                  style={styles.select}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.role_cd} value={role.role_cd}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>部屋番号</label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>電話番号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  style={styles.input}
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

      {/* パスワードリセットモーダル */}
      {showPasswordReset && selectedUser && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>{selectedUser.name} のパスワードリセット</h3>
              <button 
                onClick={() => setShowPasswordReset(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePasswordReset} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>新しいパスワード *</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  style={styles.input}
                  required
                  minLength={6}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>パスワード確認 *</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  style={styles.input}
                  required
                  minLength={6}
                />
              </div>
              <div style={styles.modalFooter}>
                <button type="submit" style={styles.saveButton}>
                  リセット
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordReset(false)}
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
  userList: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr 1fr 1.5fr 1fr 2fr',
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
  userRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 2fr 1fr 1.5fr 1fr 2fr',
    borderBottom: '1px solid #eee',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  userCell: {
    padding: '15px 10px',
    borderRight: '1px solid #eee',
    display: 'flex',
    alignItems: 'center',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: '13px',
    color: '#666',
  },
  roleBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  roomNumber: {
    fontSize: '13px',
    color: '#333',
  },
  phoneNumber: {
    fontSize: '13px',
    color: '#333',
  },
  createdDate: {
    fontSize: '12px',
    color: '#666',
  },
  actionButtons: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap' as const,
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  passwordButton: {
    padding: '6px 12px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
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
    fontWeight: 'bold',
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
};

export default UserManagement;