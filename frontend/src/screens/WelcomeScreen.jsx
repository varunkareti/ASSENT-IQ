import { useState, useEffect } from 'react';
import { useSession } from '../state/sessionContext';

const PROCEDURES = [
  { id: 'extraction', name: 'Tooth Extraction', desc: 'Removal of a damaged or diseased tooth' },
  { id: 'root_canal', name: 'Root Canal', desc: 'Treatment of infected tooth pulp' },
  { id: 'dental_implant', name: 'Dental Implant', desc: 'Surgical replacement for missing teeth' },
];

export default function WelcomeScreen() {
  const { createSession, dispatch } = useSession();
  const [form, setForm] = useState({
    patient_name: '',
    procedure_id: 'root_canal',
    tooth: '',
    clinic_name: '',
    doctor_name: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    clinic_website: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // No auto-fill - user must enter all details manually
  // This ensures fresh data for each consent session

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error && e.target.value.trim()) setError('');
  };

  const handleStart = async (e) => {
    // Prevent default form submission behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple submissions
    if (loading || submitAttempted) {
      console.log('Submission already in progress, ignoring...');
      return;
    }
    
    setSubmitAttempted(true);
    
    if (!form.patient_name.trim()) {
      setError('Please enter the patient name to continue.');
      setSubmitAttempted(false);
      return;
    }
    if (!form.procedure_id) {
      setError('Please select a procedure to continue.');
      setSubmitAttempted(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await createSession(form);
      // Small delay to prevent racing with state persistence
      await new Promise(resolve => setTimeout(resolve, 100));
      // Navigate to ExplanationScreen (screen 1) after session is created
      dispatch({ type: 'SET_SCREEN', payload: 1 });
    } catch (e) {
      setError(e.message || 'Failed to create session. Check backend connection.');
    } finally {
      setLoading(false);
      // Reset submit attempted after a short delay
      setTimeout(() => setSubmitAttempted(false), 1000);
    }
  };

  return (
    <div className="page">
      <h2 style={{ marginBottom: 4 }}>Patient Consent</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
        Enter patient and procedure details to begin the informed consent process.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          flexDirection: 'column',
        }}>
          <div style={{
            width: 60,
            height: 60,
            border: '4px solid #E3E8F0',
            borderTop: '4px solid #2E6BE6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 20,
          }} />
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#0C1B4D',
          }}>
            Creating consent session...
          </div>
        </div>
      )}

      <div className="card" onClick={(e) => e.preventDefault()}>
        <form onSubmit={(e) => { e.preventDefault(); handleStart(e); }} noValidate>
          {/* Patient Name - REQUIRED */}
          <div className="form-group">
            <label>Patient Name <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="text"
              name="patient_name"
              value={form.patient_name}
              onChange={handleChange}
              placeholder="Full name of the patient"
              required
              disabled={loading}
            />
          </div>

          {/* Procedure - REQUIRED */}
          <div className="form-group">
            <label>Procedure <span style={{ color: '#DC2626' }}>*</span></label>
            <select
              name="procedure_id"
              value={form.procedure_id}
              onChange={handleChange}
              required
              disabled={loading}
            >
              {PROCEDURES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Tooth - REQUIRED */}
          <div className="form-group">
            <label>Tooth / Region <span style={{ color: '#DC2626' }}>*</span></label>
            <input
              type="text"
              name="tooth"
              value={form.tooth}
              onChange={handleChange}
              placeholder="e.g., Upper left molar #14"
              required
              disabled={loading}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <h3 style={{ fontSize: '1rem', marginBottom: 16, fontWeight: 600 }}>Clinic / Practice Information</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Enter clinic and doctor details for the consent form. All fields can be modified for each session.
          </p>

          {/* Clinic Name - auto-filled, optional to edit */}
          <div className="form-group">
            <label>Clinic Name</label>
            <input
              type="text"
              name="clinic_name"
              value={form.clinic_name}
              onChange={handleChange}
              placeholder="Smile Dental Clinic"
              disabled={loading}
            />
          </div>

          {/* Doctor Name */}
          <div className="form-group">
            <label>Attending Doctor</label>
            <input
              type="text"
              name="doctor_name"
              value={form.doctor_name}
              onChange={handleChange}
              placeholder="Dr. Jane Smith"
              disabled={loading}
            />
          </div>

          <div className="grid-2">
            {/* Clinic Address */}
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                name="clinic_address"
                value={form.clinic_address}
                onChange={handleChange}
                placeholder="123 Main St, Suite 200"
                disabled={loading}
              />
            </div>
            {/* Clinic Phone */}
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                name="clinic_phone"
                value={form.clinic_phone}
                onChange={handleChange}
                placeholder="(303) 555-0147"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid-2">
            {/* Clinic Email - auto-filled */}
            <div className="form-group">
              <label>Email</label>
              <input
                type="text"
                name="clinic_email"
                value={form.clinic_email}
                onChange={handleChange}
                placeholder="info@clinic.com"
                disabled={loading}
              />
            </div>
            {/* Clinic Website */}
            <div className="form-group">
              <label>Website</label>
              <input
                type="text"
                name="clinic_website"
                value={form.clinic_website}
                onChange={handleChange}
                placeholder="www.clinic.com"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={loading}
            onClick={handleStart}
          >
            {loading ? 'Processing...' : 'Begin Consent Process'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
            AssentIQ is a documentation aid. It does not replace the doctor's in-person discussion.
          </p>
        </form>
      </div>

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}