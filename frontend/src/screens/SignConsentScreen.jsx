import { useState, useEffect } from 'react';
import { useSession } from '../state/sessionContext';
import apiClient from '../api/client';
import SignaturePad from '../components/SignaturePad';

export default function SignConsentScreen() {
  const { state, dispatch } = useSession();
  const { session, signatureData, declarationChecked, isSubmitting } = state;
  const [error, setError] = useState('');
  const [sigBase64, setSigBase64] = useState(signatureData);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitStep, setSubmitStep] = useState('');

  useEffect(() => {
    if (signatureData) setSigBase64(signatureData);
  }, [signatureData]);

  const canSubmit = declarationChecked && sigBase64 && !isSubmitting;

  const handleDeclarationChange = (e) => {
    dispatch({ type: 'SET_DECLARATION', payload: e.target.checked });
  };

  const handleSignatureChange = (data) => {
    setSigBase64(data);
    dispatch({ type: 'SET_SIGNATURE', payload: data });
  };

  const handleClearSignature = () => {
    setSigBase64(null);
    dispatch({ type: 'SET_SIGNATURE', payload: null });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    setSubmitProgress(10);
    setSubmitStep('Uploading your signature...');

    try {
      const base64Data = sigBase64;
      const byteString = atob(base64Data.split(',')[1]);
      const mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      setSubmitProgress(40);
      setSubmitStep('Uploading signature...');
      await apiClient.uploadSignature(session.id, blob);

      setSubmitProgress(50);
      setSubmitStep('Generating consent PDF...');
      const result = await apiClient.submitConsent(session.id, true, true);

      setSubmitProgress(90);
      setSubmitStep('Finalizing...');
      
      // Store PDF URL without changing screen immediately
      // Let the loading animation complete first
      dispatch({ type: 'SET_PDF_URL', payload: result.pdf_url });
      
      // Small delay to show completion state
      setTimeout(() => {
        setSubmitProgress(100);
        setSubmitStep('Consent submitted successfully!');
      }, 500);
    } catch (e) {
      setError(e.message || 'Failed to submit consent. Please try again.');
      dispatch({ type: 'SET_SUBMITTING', payload: false });
      setSubmitProgress(0);
      setSubmitStep('');
    }
  };

  const handleBack = () => {
    dispatch({ type: 'SET_SCREEN', payload: 2 });
  };

  return (
    <div className="page">
      <h2 style={{ marginBottom: 4 }}>Sign Your Consent Form</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Review the declaration below, then sign and submit your consent.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Submission Progress Overlay */}
      {isSubmitting && (
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
            marginBottom: 8,
          }}>
            {submitStep || 'Processing...'}
          </div>
          <div style={{
            width: 300,
            height: 6,
            background: '#E3E8F0',
            borderRadius: 3,
            overflow: 'hidden',
            marginTop: 12,
          }}>
            <div style={{
              width: `${submitProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #2E6BE6, #22C7B0)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{
            fontSize: '0.82rem',
            color: '#5C6B85',
            marginTop: 12,
          }}>
            {submitProgress}% complete
          </div>
        </div>
      )}

      {/* Declaration Checkbox */}
      <div className="card" style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', lineHeight: 1.6 }}>
          <input
            type="checkbox"
            checked={declarationChecked}
            onChange={handleDeclarationChange}
            style={{ width: 20, height: 20, minWidth: 20, marginTop: 3, accentColor: 'var(--blue-500)' }}
          />
          <span style={{ fontSize: '0.9rem' }}>
            I confirm that I have watched the explanation of my procedure{' '}
            <strong>{state.procedure?.display_name || 'selected procedure'}</strong>. I understand my diagnosis,
            the proposed treatment, its risks, benefits, and alternatives. I had the opportunity to ask questions
            and received answers. I understand that this form supplements — but does not replace — the in-person
            discussion with my treating doctor. I voluntarily consent to the procedure described above.
          </span>
        </label>
      </div>

      {/* Signature Area */}
      <h3 style={{ fontSize: '1rem', marginBottom: 12, fontWeight: 600 }}>Patient Signature</h3>
      <SignaturePad
        onSignatureChange={handleSignatureChange}
        cleared={false}
      />

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {sigBase64 ? 'Signature captured' : 'Use your finger or stylus to sign above'}
        </span>
        <button className="btn btn-link btn-sm" onClick={handleClearSignature} disabled={!sigBase64 || isSubmitting}>
          Clear
        </button>
      </div>

      {/* Navigation */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
        <button
          className="btn btn-secondary"
          onClick={handleBack}
          disabled={isSubmitting}
        >
          Back to Questions
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Consent'}
        </button>
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