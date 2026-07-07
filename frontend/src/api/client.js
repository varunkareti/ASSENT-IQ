/**
 * API client for AssentIQ — wraps all backend calls and attaches session tokens.
 * Uses relative URLs to work in both dev (via Vite proxy) and production (same origin).
 */

// Use relative URL so it works in dev (proxied) and production (same origin)
const API_BASE = '';

function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('assentiq_session_token');
  const headers = { ...extra };
  if (token) {
    headers['x-session-token'] = token;
  }
  return headers;
}

// Helper to build URL with proper cache-busting for GET requests
function cachedUrl(url) {
  if (!url) return API_BASE;
  // If it's a full URL (shouldn't happen with relative paths), return as-is
  if (url.startsWith('http')) return url;
  // Add cache-busting query param for GET requests
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cache=${Date.now()}`;
}

export default {
  // ─── Procedures ───────────────────────────────────────────────────────
  getProcedure(procedureId) {
    return fetch(cachedUrl(`/api/procedures/${procedureId}`))
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load procedure');
        return r.json();
      });
  },

  // ─── Sessions ─────────────────────────────────────────────────────────
  createSession(data) {
    const token = localStorage.getItem('assentiq_session_token');
    console.log('API createSession called with token:', token ? 'PRESENT' : 'MISSING');
    return fetch(`/api/consent/sessions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      },
      body: JSON.stringify(data),
    })
      .then((r) => {
        console.log('API createSession response:', r.status);
        if (!r.ok) throw new Error('Failed to create session');
        return r.json();
      })
      .catch(e => {
        console.error('API createSession error:', e);
        throw e;
      });
  },

  // ─── TTS ──────────────────────────────────────────────────────────────
  generateTTS(procedureId, sessionId) {
    return fetch(`/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ procedure_id: procedureId, session_id: sessionId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('TTS generation failed');
        return r.json();
      })
      .catch(e => {
        console.error('API generateTTS error:', e);
        throw e;
      });
  },

  // ─── Chat ─────────────────────────────────────────────────────────────
  sendQuestion(sessionId, question) {
    return fetch(`/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ session_id: sessionId, question }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Chat failed');
        return r.json();
      });
  },

  // ─── Signature ────────────────────────────────────────────────────────
  uploadSignature(sessionId, signatureData) {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('signature', signatureData, 'signature.png');

    return fetch(`/api/consent/signature`, {
      method: 'POST',
      headers: getAuthHeaders(), // FormData doesn't need Content-Type header
      body: formData,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Signature upload failed');
        return r.json();
      });
  },

  // ─── Consent Submit ───────────────────────────────────────────────────
  submitConsent(sessionId, declarationChecked, watchedVideo) {
    return fetch(`/api/consent/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        session_id: sessionId,
        declaration_checked: declarationChecked,
        watched_video: watchedVideo,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Consent submission failed');
        return r.json();
      });
  },

  // ─── Consent History ──────────────────────────────────────────────────
  getConsentHistory() {
    return fetch(cachedUrl('/api/consent/history'), {
      headers: getAuthHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load consent history');
        return r.json();
      });
  },

  getConsentDetail(sessionId) {
    return fetch(cachedUrl(`/api/consent/history/${sessionId}`), {
      headers: getAuthHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load consent detail');
        return r.json();
      });
  },

  downloadConsent(sessionId) {
    const token = localStorage.getItem('assentiq_session_token');
    // Use relative URL for download - works in production and dev proxy
    return `/api/consent/download/${sessionId}`;
  },

  // ─── Auth ─────────────────────────────────────────────────────────────
  register(data) {
    return fetch(`/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Registration failed');
        return r.json();
      });
  },

  login(email, password) {
    return fetch(`/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Login failed');
        return r.json();
      });
  },

  logout() {
    return fetch(`/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  },

  getMe() {
    return fetch(cachedUrl('/api/auth/me'), {
      headers: getAuthHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Not authenticated');
        return r.json();
      });
  },
};