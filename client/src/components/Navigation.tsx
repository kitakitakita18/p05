import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMainCategory, setActiveMainCategory] = useState<string>('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const canManageUsers = user?.role === 'admin';
  // const canManageMeetings = user?.role === 'admin' || user?.role === 'chairperson' || user?.role === 'board_member';
  const canManageAgendas = user?.role === 'admin' || user?.role === 'chairperson';

  // ナビゲーション構造の定義
  const getMainCategories = () => [
    { id: 'dashboard', label: 'ダッシュボード', path: '/dashboard' },
    { id: 'meetings', label: '理事会運営', path: '/meetings' },
    ...(canManageAgendas ? [{ id: 'agendas', label: '議題管理', hasSubNav: true }] : []),
    ...(canManageUsers ? [{ id: 'admin', label: '管理機能', hasSubNav: true }] : [])
  ];

  const getSubCategories = (mainId: string) => {
    switch (mainId) {
      case 'agendas':
        return canManageAgendas ? [
          { id: 'agenda-registration', label: '議題登録', path: '/agenda-registration' },
          { id: 'agenda-management', label: '議題管理', path: '/agendas' }
        ] : [];
      case 'admin':
        return canManageUsers ? [
          { id: 'users', label: 'ユーザー管理', path: '/users' },
          { id: 'association', label: '組合基本情報', path: '/association' },
          { id: 'roles', label: '役職管理', path: '/roles' }
        ] : [];
      default:
        return [];
    }
  };

  // 現在のパスに基づいてアクティブなカテゴリを決定
  const getCurrentMainCategory = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/meetings') return 'meetings';
    if (['/agendas', '/agenda-registration'].includes(path)) return 'agendas';
    if (['/users', '/association', '/roles'].includes(path)) return 'admin';
    return 'dashboard';
  };

  React.useEffect(() => {
    const currentCategory = getCurrentMainCategory();
    setActiveMainCategory(currentCategory);
  }, [location.pathname]);

  const handleMainCategoryClick = (category: any) => {
    if (category.path) {
      navigate(category.path);
    } else {
      setActiveMainCategory(category.id);
    }
  };

  return (
    <>
      {/* メインナビゲーション */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logo}>
            <span onClick={() => navigate('/dashboard')} style={styles.logoText}>
              理事会運営システム
            </span>
          </div>

          <div style={styles.mainNavLinks}>
            {getMainCategories().map((category) => (
              <button
                key={category.id}
                onClick={() => handleMainCategoryClick(category)}
                style={{
                  ...styles.mainNavButton,
                  ...(activeMainCategory === category.id ? styles.activeMainButton : {}),
                }}
                onMouseEnter={(e) => {
                  if (activeMainCategory !== category.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeMainCategory !== category.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }
                }}
              >
                {category.label}
                {category.hasSubNav && (
                  <span style={styles.dropdownIcon}>▼</span>
                )}
              </button>
            ))}
          </div>

          <div style={styles.userSection}>
            <span style={styles.userName}>{user?.name}</span>
            <button 
              onClick={handleLogout} 
              style={styles.logoutButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(220,53,69,1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(220,53,69,0.8)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      {/* サブナビゲーション */}
      {activeMainCategory && activeMainCategory !== 'dashboard' && getSubCategories(activeMainCategory).length > 0 && (
        <div style={styles.subNav}>
          <div style={styles.subNavContent}>
            {getSubCategories(activeMainCategory).map((subCategory) => (
              <button
                key={subCategory.id}
                onClick={() => navigate(subCategory.path)}
                style={{
                  ...styles.subNavButton,
                  ...(isActive(subCategory.path) ? styles.activeSubButton : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isActive(subCategory.path)) {
                    e.currentTarget.style.backgroundColor = 'rgba(0,123,255,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(subCategory.path)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {subCategory.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  nav: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '0 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  navContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
    height: '60px',
  },
  logo: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  logoText: {
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'white',
  },
  mainNavLinks: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  mainNavButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  activeMainButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    color: '#ffffff',
    borderColor: 'rgba(255,255,255,0.6)',
    fontWeight: 'bold',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  dropdownIcon: {
    fontSize: '10px',
    opacity: 0.7,
  },
  subNav: {
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    padding: '0 20px',
  },
  subNavContent: {
    display: 'flex',
    maxWidth: '1200px',
    margin: '0 auto',
    gap: '4px',
  },
  subNavButton: {
    background: 'transparent',
    border: 'none',
    color: '#495057',
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '400',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
    borderBottom: '3px solid transparent',
  },
  activeSubButton: {
    color: '#007bff',
    fontWeight: '600',
    borderBottomColor: '#007bff',
    backgroundColor: 'rgba(0,123,255,0.05)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userName: {
    fontSize: '14px',
  },
  logoutButton: {
    background: 'rgba(220,53,69,0.8)',
    border: '1px solid rgba(220,53,69,0.9)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
};

export default Navigation;