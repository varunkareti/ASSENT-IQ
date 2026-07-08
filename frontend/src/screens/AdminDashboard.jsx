import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProcedureDisplayName } from '../utils/procedures';

const ADMIN_API = import.meta.env.VITE_API_BASE || '';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const downloadRef = useRef(null);

  const getAuthToken = () => {
    return localStorage.getItem('admin_token');
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchStats();
    fetchSessions();
  }, []);

  const fetchStats = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${ADMIN_API}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchSessions = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${ADMIN_API}/api/admin/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);
    } catch (e) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (sessionId) => {
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
      return;
    }
    setDetailLoading(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${ADMIN_API}/api/admin/session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch session detail');
      const data = await res.json();
      setSelectedSession(data);
    } catch (e) {
      setError('Failed to load session details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Check if a PDF file exists for this session on the server
  const hasPdfForSession = async (sessionId) => {
    const token = getAuthToken();
    if (!token) return false;
    try {
      // Try the admin download endpoint
      const res = await fetch(`${ADMIN_API}/api/admin/download/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleDownload = async (sessionId) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${ADMIN_API}/api/admin/download/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
        return;
      }
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      if (downloadRef.current) {
        downloadRef.current.href = url;
        downloadRef.current.download = `consent_${sessionId}.pdf`;
        downloadRef.current.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError('Failed to download: ' + e.message);
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm(`Are you sure you want to delete this session and all associated consent data? This action cannot be undone.\n\nSession: ${sessionId}\nPatient: ${sessions.find(s => s.id === sessionId)?.patient_name || 'Unknown'}`)) {
      return;
    }
    const token = getAuthToken();
    try {
      const res = await fetch(`${ADMIN_API}/api/admin/session/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/admin');
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Delete failed' }));
        throw new Error(err.detail || 'Failed to delete session');
      }
      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      // If detail modal is open for this session, close it
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (e) {
      setError('Delete error: ' + e.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = !searchTerm || 
      s.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.procedure_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tooth?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (!getAuthToken()) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0C1B4D 0%, #1a2f7a 100%)',
        color: '#fff',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            <span style={{ color: '#fff' }}>Assent</span>
            <span style={{ color: '#22C7B0' }}>IQ</span>
          </span>
          <span style={{ fontSize: '0.85rem', opacity: 0.8, padding: '4px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 20 }}>Admin Dashboard</span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>
        {/* KPI Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}>
            <CompactStat label="Total Sessions" value={stats.total_sessions} color="#2E6BE6" />
            <CompactStat label="Root Canal" value={stats.root_canal} color="#22C7B0" />
            <CompactStat label="Extraction" value={stats.extraction} color="#F59E0B" />
            <CompactStat label="Dental Implant" value={stats.dental_implant} color="#8B5CF6" />
          </div>
        )}

        {/* Search & Filter */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <input
            type="text"
            placeholder="Search by patient, procedure, tooth, clinic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '10px 14px',
              border: '1px solid #D1D5DB',
              borderRadius: 8,
              fontSize: '0.9rem',
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #D1D5DB',
              borderRadius: 8,
              fontSize: '0.9rem',
              minWidth: 150,
            }}
          >
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Sessions Table */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0C1B4D' }}>
              All Sessions ({filteredSessions.length})
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#5C6B85' }}>Loading sessions...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <Th>Patient</Th>
                    <Th>Procedure</Th>
                    <Th>Tooth</Th>
                    <Th>Clinic</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <Td><strong>{s.patient_name}</strong></Td>
                      <Td>{getProcedureDisplayName(s.procedure_id)}</Td>
                      <Td>{s.tooth || '-'}</Td>
                      <Td>{s.clinic_name || '-'}</Td>
                      <Td>
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
                      </Td>
                      <Td style={{ fontSize: '0.82rem', color: '#5C6B85' }}>{new Date(s.created_at).toLocaleDateString()}</Td>
                      <Td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleViewDetail(s.id)}
                            style={{
                              padding: '6px 12px',
                              background: selectedSession?.id === s.id ? '#0C1B4D' : '#F0F7FF',
                              color: selectedSession?.id === s.id ? '#fff' : '#2E6BE6',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 500,
                            }}
                          >
                            {selectedSession?.id === s.id ? 'Hide' : 'View'}
                          </button>
                          {s.status === 'completed' && (
                            <button
                              onClick={() => handleDownload(s.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#F0F7FF',
                                color: '#10B981',
                                border: '1px solid #10B981',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontWeight: 500,
                              }}
                            >
                              Download PDF
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(s.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#FFF5F5',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 500,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && (
                    <tr>
                      <Td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#5C6B85' }}>
                        No sessions found
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Session Detail Modal */}
        {selectedSession && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24,
          }} onClick={() => setSelectedSession(null)}>
            <div
              style={{
                background: '#fff',
                borderRadius: 16,
                maxWidth: 800,
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
                padding: 32,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0C1B4D' }}>
                  Session Details
                </h2>
                <button
                  onClick={() => setSelectedSession(null)}
                  style={{
                    background: '#F3F4F6',
                    border: 'none',
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {detailLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#5C6B85' }}>Loading...</div>
              ) : (
                <>
                  {/* Session Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <DetailItem label="Patient Name" value={selectedSession.patient_name} />
                    <DetailItem label="Procedure" value={getProcedureDisplayName(selectedSession.procedure_id)} />
                    <DetailItem label="Tooth" value={selectedSession.tooth || '-'} />
                    <DetailItem label="Status" value={selectedSession.status} />
                    <DetailItem label="Clinic Name" value={selectedSession.clinic_name || '-'} />
                    <DetailItem label="Doctor" value={selectedSession.doctor_name || '-'} />
                    <DetailItem label="Clinic Phone" value={selectedSession.clinic_phone || '-'} />
                    <DetailItem label="Clinic Email" value={selectedSession.clinic_email || '-'} />
                    <DetailItem label="Clinic Address" value={selectedSession.clinic_address || '-'} labelFull />
                    <DetailItem label="Created" value={new Date(selectedSession.created_at).toLocaleString()} labelFull />
                  </div>

                  {/* Q&A Log */}
                  {selectedSession.qa_log && selectedSession.qa_log.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontSize: '1rem', color: '#0C1B4D', marginBottom: 12 }}>Q&A Log ({selectedSession.qa_log.length})</h3>
                      <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                        {selectedSession.qa_log.map((qa, i) => (
                          <div key={i} style={{ padding: '12px 16px', borderBottom: i < selectedSession.qa_log.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                            <div style={{ fontSize: '0.8rem', color: '#2E6BE6', fontWeight: 600, marginBottom: 4 }}>Q: {qa.question}</div>
                            <div style={{ fontSize: '0.85rem', color: '#16255E' }}>A: {qa.answer}</div>
                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>{new Date(qa.timestamp).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                    {(selectedSession.consent?.pdf_path || selectedSession.status === 'completed') && (
                      <button
                        onClick={() => handleDownload(selectedSession.id)}
                        style={{
                          padding: '12px 32px',
                          background: '#22C7B0',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                        }}
                      >
                        📄 Download Consent PDF
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selectedSession.id)}
                      style={{
                        padding: '12px 32px',
                        background: '#DC2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                      }}
                    >
                      🗑 Delete This Session
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hidden download link */}
        <a ref={downloadRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}

function Th({ children, colSpan }) {
  return (
    <th colSpan={colSpan} style={{
      padding: '12px 16px',
      textAlign: 'left',
      fontSize: '0.78rem',
      fontWeight: 600,
      color: '#5C6B85',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: '1px solid #E5E7EB',
    }}>
      {children}
    </th>
  );
}

function Td({ children, colSpan }) {
  return (
    <td colSpan={colSpan} style={{
      padding: '12px 16px',
      fontSize: '0.85rem',
      color: '#16255E',
    }}>
      {children}
    </td>
  );
}

function CompactStat({ label, value, color }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      padding: '12px 16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: '#5C6B85', marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function DetailItem({ label, value, labelFull }) {
  return (
    <div style={{
      padding: 12,
      background: '#F9FAFB',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#5C6B85', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#16255E', fontWeight: labelFull ? 500 : 400 }}>
        {value}
      </div>
    </div>
  );
}