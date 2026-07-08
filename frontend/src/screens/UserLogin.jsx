import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';

export default function UserLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.login(form.email, form.password);
      if (data.session_token) {
        localStorage.setItem('assentiq_session_token', data.session_token);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0C1B4D 0%, #1a2f7a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0C1B4D', marginBottom: 8 }}>
            <span style={{ color: '#0C1B4D' }}>Assent</span>
            <span style={{ color: '#22C7B0' }}>IQ</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#5C6B85', marginTop: 4 }}>Patient Login</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.85rem', marginBottom: 20, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#16255E' }}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#16255E' }}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="Your password"
              style={{ width: '100%', padding: '12px 14px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 0',
              background: loading ? '#9CA3AF' : '#0C1B4D',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#5C6B85', marginTop: 24 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#2E6BE6', textDecoration: 'none', fontWeight: 600 }}>
            Sign Up
          </Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#5C6B85', marginTop: 12 }}>
          <Link to="/" style={{ color: '#2E6BE6', textDecoration: 'none' }}>← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}