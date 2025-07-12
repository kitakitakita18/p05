import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('メールアドレスまたはパスワードが間違っています');
      }
    } catch (error) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setError('');
    setLoading(true);

    try {
      const success = await login(demoEmail, demoPassword);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('デモアカウントでのログインに失敗しました');
      }
    } catch (error) {
      setError('ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>理事会運営システム</h1>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div style={styles.demoCredentials}>
          <h3>デモ用アカウント</h3>
          <div style={styles.accountGroup}>
            <h4>簡単デモアカウント（パスワード: demo）</h4>
            <div style={styles.quickLoginButtons}>
              <button 
                type="button"
                onClick={() => handleQuickLogin('demo@mansion.com', 'demo')}
                disabled={loading}
                style={styles.quickLoginButton}
              >
                管理者でログイン
              </button>
              <button 
                type="button"
                onClick={() => handleQuickLogin('demo-chair@mansion.com', 'demo')}
                disabled={loading}
                style={styles.quickLoginButton}
              >
                理事長でログイン
              </button>
              <button 
                type="button"
                onClick={() => handleQuickLogin('demo-board@mansion.com', 'demo')}
                disabled={loading}
                style={styles.quickLoginButton}
              >
                理事でログイン
              </button>
              <button 
                type="button"
                onClick={() => handleQuickLogin('demo-resident@mansion.com', 'demo')}
                disabled={loading}
                style={styles.quickLoginButton}
              >
                住民でログイン
              </button>
            </div>
          </div>
          <div style={styles.accountGroup}>
            <h4>標準テストアカウント（パスワード: password）</h4>
            <p>• 管理者: admin@mansion.com</p>
            <p>• 理事長: chairperson@mansion.com</p>
            <p>• 理事: board@mansion.com</p>
            <p>• 住民: resident@mansion.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    textAlign: 'center' as const,
    marginBottom: '30px',
    color: '#333',
    fontSize: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#555',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
  },
  button: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  error: {
    color: '#d32f2f',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  demoCredentials: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#666',
  },
  accountGroup: {
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #e9ecef',
  },
  quickLoginButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '10px',
  },
  quickLoginButton: {
    padding: '8px 12px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default Login;