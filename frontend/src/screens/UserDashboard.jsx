import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../state/sessionContext';
import { getProcedureDisplayName } from '../utils/procedures';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export default function UserDashboard() {
  const { state } = useSession();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {});
      if (!res.ok) throw new Error('Failed to load sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      // Load sessions from localStorage as fallback
      try {
        const saved = localStorage.getItem('assentiq_workflow_state');
        if (saved) {
          const workflow = JSON.parse(saved);
          if (workflow.session) {
            setSessions([workflow.session]);
          }
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      if (sessions.length === 0) {
        setError('Failed to load session data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDownload = async (sessionId) => {
    try {
      // First try to get session info from localStorage
      const saved = localStorage.getItem('assentiq_workflow_state');
      if (saved) {
        const workflow = JSON.parse(saved);
        if (workflow.session?.id === sessionId) {
          // This is the current session, try PDF from localStorage
          if (workflow.pdfUrl) {
            window.open(API_BASE + workflow.pdfUrl, '_blank');
            return;
          }
        }
      }

      // Fall back to downloading via backend
      const res = await fetch(`${API_BASE}/storage/pdfs/consent_${sessionId}.pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `consent_${sessionId}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        setError('PDF not found for this session.');
      }
    } catch (err) {
      setError(err.message || 'Failed to download PDF');
    }
  };

  const currentSession = state.session;

  return (
    <div className="page">
      <h2 style={{ marginBottom: 4, fontSize: '1.4rem' }}>My Consent Dashboard</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        View your consent session history and download completed forms.
      </p>

      {/* User info */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #F0F7FF, #E8F4FD)', borderLeft: '4px solid #2E6BE6' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {currentSession && (
            <>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Current Patient</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0C1B4D' }}>{currentSession.patient_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Procedure</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0C1B4D' }}>{getProcedureDisplayName(currentSession.procedure_id)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tooth</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0C1B4D' }}>{currentSession.tooth || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Clinic</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0C1B4D' }}>{currentSession.clinic_name || 'N/A'}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading your records...</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && sessions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, background: '#FAFBFC' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📋</div>
          <p style={{ color: '#5C6B85', marginBottom: 8, fontWeight: 500 }}>No consent records yet</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Complete a consent session to see records here.</p>
        </div>
      )}

      {/* Session cards */}
      {!loading && !error && sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0C1B4D', marginBottom: 4 }}>
            Consent History ({sessions.length})
          </h3>
          {sessions.map((s, idx) => (
            <div
              key={s.id || idx}
              className="card"
              style={{
                borderLeft: s.status === 'completed' ? '4px solid #22C7B0' : '4px solid #F59E0B',
                background: s.status === 'completed' ? '#FFFFFF' : '#FFFBEB',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Patient</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0C1B4D' }}>{s.patient_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Procedure</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0C1B4D' }}>{getProcedureDisplayName(s.procedure_id)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tooth</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0C1B4D' }}>{s.tooth || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Date</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0C1B4D' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: s.status === 'completed' ? '#D1FAE5' : '#FEF3C7',
                    color: s.status === 'completed' ? '#065F46' : '#92400E',
                  }}>
                    {s.status}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {s.status === 'completed' && (
                  <button
                    className="btn btn-sm"
                    style={{ background: '#22C7B0', color: '#fff', border: 'none' }}
                    onClick={() => handleDownload(s.id)}
                  >
                    📄 Download PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin link */}
      <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
        <p style={{ fontSize: '0.82rem', color: '#5C6B85' }}>
          Need admin access?{' '}
          <a href="/admin" style={{ color: '#2E6BE6', textDecoration: 'none', fontWeight: 600 }}>
            Go to Admin Dashboard →
          </a>
        </p>
      </div>
    </div>
  );
}