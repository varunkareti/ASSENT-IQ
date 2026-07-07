import { useState, useEffect, useRef } from 'react';
import { useSession } from '../state/sessionContext';
import apiClient from '../api/client';
import SlideDeck from '../components/SlideDeck';
import ProcedureCards from '../components/ProcedureCards';

export default function ExplanationScreen() {
  const { state, dispatch } = useSession();
  const { procedure, ttsData, currentSlide, audioPlayedOnce, session } = state;
  const [error, setError] = useState('');
  const [narrating, setNarrating] = useState(false);
  const [script, setScript] = useState('');
  const speechRef = useRef(null);
  const loadedRef = useRef(false);

  // Initialize loading state based on whether data exists in restored state
  const [loading, setLoading] = useState(() => {
    // If data is missing or session has no procedure, we need to load
    if (!procedure || !ttsData || !session?.procedure_id) {
      return true;
    }
    return false;
  });

  // If data is already restored from localStorage, skip fetching
  useEffect(() => {
    if (procedure && ttsData && session?.procedure_id) {
      setScript(ttsData.narration_script);
      setLoading(false);
      loadedRef.current = true;
    }
  }, [procedure, ttsData, session?.procedure_id]);

  // Load procedure content + narration script on mount (only once)
  useEffect(() => {
    if (loadedRef.current) return;
    if (!session?.procedure_id) return;
    
    let cancelled = false;
    
    async function load() {
      setLoading(true);
      setError('');

      try {
        const procData = await apiClient.getProcedure(session.procedure_id);
        if (cancelled) return;
        dispatch({ type: 'SET_PROCEDURE', payload: procData });

        const tts = await apiClient.generateTTS(session.procedure_id);
        if (cancelled) return;
        dispatch({ type: 'SET_TTS_DATA', payload: tts });
        setScript(tts.narration_script);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load explanation content.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadedRef.current = true;
        }
      }
    }
    load();
    
    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount

  // Auto-play narration when script loads
  useEffect(() => {
    if (script && !narrating) {
      startNarration(script);
    }
    return () => {
      cancelNarration();
    };
  }, [script]);

  const startNarration = (text) => {
    if (!('speechSynthesis' in window)) {
      setError('Web Speech API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    cancelNarration();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.localService) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setNarrating(true);
      dispatch({ type: 'SET_AUDIO_PLAYING', payload: true });
    };

    utterance.onend = () => {
      setNarrating(false);
      dispatch({ type: 'SET_AUDIO_PLAYING', payload: false });
      dispatch({ type: 'AUDIO_PLAYED_ONCE' });
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setNarrating(false);
      dispatch({ type: 'SET_AUDIO_PLAYING', payload: false });
    };

    speechRef.current = { utterance, cancelled: false };
    window.speechSynthesis.speak(utterance);
  };

  const cancelNarration = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speechRef.current = null;
    setNarrating(false);
  };

  const handleReplay = () => {
    if (script) {
      startNarration(script);
    }
  };

  const handleContinue = () => {
    cancelNarration();
    dispatch({ type: 'SET_SCREEN', payload: 2 });
  };

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center' }}>
        <p>Loading your explanation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-danger">{error}</div>
        <p style={{ color: 'var(--text-muted)' }}>Please check that the backend is running and try again.</p>
      </div>
    );
  }

  if (!ttsData || !procedure) {
    return (
      <div className="page" style={{ textAlign: 'center' }}>
        <p>No explanation content available.</p>
      </div>
    );
  }

  const canContinue = audioPlayedOnce || (ttsData?.slides && currentSlide >= ttsData.slides.length - 1);

  return (
    <div className="page">
      <h2 style={{ marginBottom: 4 }}>Understanding Your {procedure.display_name}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Watch the slides and listen to the explanation below.
      </p>

      {/* Narration controls */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <button className="btn btn-secondary" onClick={handleReplay} disabled={narrating}>
          {narrating ? 'Narrating...' : 'Replay Narration'}
        </button>
      </div>

      {/* Slide Deck */}
      <SlideDeck
        slides={ttsData.slides}
        currentSlide={currentSlide}
        onSlideChange={(i) => dispatch({ type: 'SET_CURRENT_SLIDE', payload: i })}
        autoPlay={!audioPlayedOnce}
        onAllSlidesSeen={() => dispatch({ type: 'AUDIO_PLAYED_ONCE' })}
      />

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 12, textAlign: 'center' }}>
        This information supplements — but does not replace — your doctor's discussion with you.
      </p>

      <div style={{ borderTop: '1px solid var(--border)', margin: '24px 0' }} />

      {/* Procedure Cards */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Key Information</h3>
      <ProcedureCards procedure={procedure} />

      {/* Continue Button */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!canContinue}
          style={{ minWidth: 280 }}
        >
          {canContinue ? (
            'I Have Watched and Understood'
          ) : (
            'Listen to the Full Explanation First'
          )}
        </button>
        {!canContinue && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
            This button will be enabled after you've listened to the complete explanation.
          </p>
        )}
      </div>
    </div>
  );
}