import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  const handleAdminClick = () => {
    navigate('/admin');
  };

  const handleStart = () => {
    // No auth check needed - users can start directly
    navigate('/welcome');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px', borderBottom: '1px solid #E3E8F0', background: '#fff',
      }}>
        <div
          style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0C1B4D', cursor: 'pointer', letterSpacing: '-0.02em' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span style={{ color: '#0C1B4D' }}>Assent</span>
          <span style={{ color: '#22C7B0' }}>IQ</span>
        </div>
        <button
          onClick={handleAdminClick}
          style={{
            padding: '8px 20px',
            background: '#0C1B4D',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          Admin
        </button>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 16, color: '#0C1B4D' }}>
          Informed Consent Patients Actually Understand
        </h1>
        <p style={{ fontSize: '1rem', color: '#5C6B85', textAlign: 'center', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.6 }}>
          AssentIQ replaces paper handouts and SMS consent links with a tablet-based, AI-guided informed consent workflow.
        </p>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <button
            className="btn btn-primary"
            onClick={handleStart}
            style={{ minWidth: 280, padding: '12px 24px', fontSize: '1rem' }}
          >
            Begin Consent Process
          </button>
          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: 8 }}>
            No sign-in required. Start a new consent session instantly.
          </p>
        </div>

        {/* Key Stats */}
        <div className="card" style={{ padding: '28px 24px', background: '#F7F9FC', borderTop: '3px solid #0C1B4D' }}>
          <p style={{ fontSize: '0.9rem', color: '#16255E', marginBottom: 16, lineHeight: 1.6 }}>
            <strong>20-30%</strong> of dental malpractice claims involve inadequate or missing informed consent.
            AssentIQ creates a timestamped, auditable consent record for every procedure.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, background: '#fff', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#2E6BE6' }}>Documented</div>
              <div style={{ fontSize: '0.82rem', color: '#5C6B85' }}>Every discussion</div>
            </div>
            <div style={{ padding: 12, background: '#fff', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#2E6BE6' }}>Auditable</div>
              <div style={{ fontSize: '0.82rem', color: '#5C6B85' }}>Q&A timestamps</div>
            </div>
            <div style={{ padding: 12, background: '#fff', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#2E6BE6' }}>Professional</div>
              <div style={{ fontSize: '0.82rem', color: '#5C6B85' }}>PDF generation</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, textAlign: 'center', marginBottom: 24, color: '#0C1B4D' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>1</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 6, color: '#0C1B4D' }}>Enter Patient Info</div>
              <div style={{ fontSize: '0.82rem', color: '#5C6B85', lineHeight: 1.5 }}>
                Provide patient name, procedure type, and clinic details.
              </div>
            </div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>2</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 6, color: '#0C1B4D' }}>AI Explains Procedure</div>
              <div style={{ fontSize: '0.82rem', color: '#5C6B85', lineHeight: 1.5 }}>
                The chatbot explains the procedure, risks, and recovery in plain language.
              </div>
            </div>
            <div style={{ padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>3</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 6, color: '#0C1B4D' }}>Sign & Complete</div>
              <div style={{ fontSize: '0.82rem', color: '#5C6B85', lineHeight: 1.5 }}>
                Patient signs digitally and receives a professional PDF consent form.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E3E8F0', padding: '20px 24px', textAlign: 'center', background: '#fff' }}>
        <p style={{ fontSize: '0.8rem', color: '#5C6B85' }}>
          <strong style={{ color: '#16255E' }}>AssentIQ</strong> — Clarity. Consent. Confidence.
         <br />&copy; 2026 AssentIQ. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
