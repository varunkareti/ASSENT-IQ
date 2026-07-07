import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ADMIN_API = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      navigate('/admin/dashboard');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${ADMIN_API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(err.detail || 'Invalid credentials');
      }
      const data = await res.json();
      // Store admin token
      localStorage.setItem('admin_token', data.access_token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong');
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
          <p style={{ fontSize: '0.9rem', color: '#5C6B85', marginTop: 4 }}>Admin Dashboard</p>
          <div style={{ marginTop: 12, padding: '8px 16px', background: '#F0F7FF', borderRadius: 8, display: 'inline-block' }}>
            <span style={{ fontSize: '0.8rem', color: '#2E6BE6', fontWeight: 600 }}>🔒 Restricted Access</span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.85rem', marginBottom: 20, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#16255E' }}>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              placeholder="Admin username"
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
              placeholder="Admin password"
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
            {loading ? 'Signing in...' : 'Sign In to Admin'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#5C6B85', marginTop: 24 }}>
          <Link to="/" style={{ color: '#2E6BE6', textDecoration: 'none' }}>← Back to AssentIQ</Link>
        </p>
      </div>
    </div>
  );
}