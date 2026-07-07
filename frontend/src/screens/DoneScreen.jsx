import { useEffect, useRef } from 'react';
import { useSession } from '../state/sessionContext';

export default function DoneScreen() {
  const { state, reset } = useSession();
  const { pdfUrl, session, procedure } = state;
  const pdfRef = useRef(null);

  // Auto-open PDF in new tab on mount
  useEffect(() => {
    if (pdfUrl && pdfRef.current) {
      pdfRef.current.focus();
      const timer = setTimeout(() => {
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [pdfUrl]);

  const handleNewSession = () => {
    reset();
  };

  return (
    <div className="page" style={{ textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8 }}>Consent Submitted</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        {session?.patient_name}'s consent for <strong>{procedure?.display_name || 'the procedure'}</strong> has been recorded.
      </p>

      {/* Session Info */}
      <div className="card" style={{ marginBottom: 24, textAlign: 'left', maxWidth: 500, margin: '0 auto 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Patient:</span>
          <strong>{session?.patient_name}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Procedure:</span>
          <strong>{procedure?.display_name || 'N/A'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: 'var(--text-muted)' }}>Tooth:</span>
          <strong>{session?.tooth || 'N/A'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Status:</span>
          <span style={{ color: '#059669', fontWeight: 600 }}>Completed</span>
        </div>
      </div>

      {/* Diagnosis & Prognosis */}
      {procedure?.diagnosis && (
        <div className="card" style={{ marginBottom: 24, textAlign: 'left', maxWidth: 500, margin: '0 auto 24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: '#0C1B4D', borderBottom: '1px solid #E3E8F0', paddingBottom: 8 }}>
            Diagnosis & Prognosis
          </h3>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16255E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Diagnosis
            </div>
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#1a1a2e', 
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {procedure.diagnosis}
            </div>
          </div>
          {procedure.prognosis && (
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16255E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Prognosis
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#1a1a2e', 
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {procedure.prognosis}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Download PDF */}
      {pdfUrl && (
        <div style={{ marginBottom: 24 }}>
          <a
            ref={pdfRef}
            href={pdfUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ marginBottom: 12, display: 'inline-block' }}
          >
            Open PDF
          </a>
          <br />
        </div>
      )}

      {/* Action button */}
      <button className="btn btn-secondary" onClick={handleNewSession} style={{ width: '100%', maxWidth: 300 }}>
        Start New Session
      </button>
    </div>
  );
}