import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import apiClient from '../api/client';

const SessionContext = createContext(null);

const STORAGE_KEYS = {
  WORKFLOW: 'assentiq_workflow_state',
};

const initialState = {
  session: null,
  procedure: null,
  screen: -1,           // -1=Landing, 0=Welcome, 1=Explanation, 2=Questions, 3=Signature, 4=Done
  isLoading: false,
  isInitializing: true, // While restoring from localStorage
  error: null,
  ttsData: null,
  audioPlaying: false,
  currentSlide: 0,
  audioPlayedOnce: false,
  messages: [],
  declarationChecked: false,
  signatureData: null,
  isSubmitting: false,
  pdfUrl: null,
  // Clinic/practice info for PDF generation
  clinicInfo: {
    clinic_name: '',
    doctor_name: '',
    clinic_address: '',
    clinic_phone: '',
    clinic_email: '',
    clinic_website: '',
  },
};

function sessionReducer(state, action) {
  switch (action.type) {
    case 'CREATE_SESSION':
      return { ...state, session: action.payload, screen: 0 };

    case 'SET_PROCEDURE':
      return { ...state, procedure: action.payload };

    case 'SET_SCREEN':
      return { ...state, screen: action.payload };

    case 'SET_TTS_DATA':
      return { ...state, ttsData: action.payload };

    case 'SET_AUDIO_PLAYING':
      return { ...state, audioPlaying: action.payload };

    case 'SET_CURRENT_SLIDE':
      return { ...state, currentSlide: action.payload };

    case 'AUDIO_PLAYED_ONCE':
      return { ...state, audioPlayedOnce: true };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };

    case 'SET_DECLARATION':
      return { ...state, declarationChecked: action.payload };

    case 'SET_SIGNATURE':
      return { ...state, signatureData: action.payload };

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };

    case 'SET_PDF_URL':
      return { ...state, pdfUrl: action.payload, screen: 4 };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_CLINIC_INFO':
      return { ...state, clinicInfo: { ...state.clinicInfo, ...action.info } };

    case 'RESET':
      return { ...initialState };

    case 'RESTORE_WORKFLOW':
      // Restore full workflow state from localStorage
      return { ...state, ...action.payload };

    case 'INIT_COMPLETE':
      return { ...state, isInitializing: false };

    default:
      return state;
  }
}

export function SessionProvider({ children }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  // Restore workflow state from localStorage on mount - SYNCHRONOUS
  useEffect(() => {
    try {
      const savedWorkflow = localStorage.getItem(STORAGE_KEYS.WORKFLOW);

      if (savedWorkflow) {
        const workflow = JSON.parse(savedWorkflow);
        dispatch({
          type: 'RESTORE_WORKFLOW',
          session: workflow.session,
          procedure: workflow.procedure,
          screen: workflow.screen,
          ttsData: workflow.ttsData,
          currentSlide: workflow.currentSlide,
          audioPlayedOnce: workflow.audioPlayedOnce,
          messages: workflow.messages,
          declarationChecked: workflow.declarationChecked,
          signatureData: workflow.signatureData,
          pdfUrl: workflow.pdfUrl,
          clinicInfo: workflow.clinicInfo,
        });
      }
    } catch (e) {
      console.warn('Failed to restore state from localStorage:', e);
      localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
    } finally {
      // Mark initialization as complete - this is synchronous
      dispatch({ type: 'INIT_COMPLETE' });
    }
  }, []);

  // Persist workflow state to localStorage whenever it changes
  useEffect(() => {
    const workflowState = {
      session: state.session,
      procedure: state.procedure,
      screen: state.screen,
      ttsData: state.ttsData,
      currentSlide: state.currentSlide,
      audioPlayedOnce: state.audioPlayedOnce,
      messages: state.messages,
      declarationChecked: state.declarationChecked,
      signatureData: state.signatureData,
      pdfUrl: state.pdfUrl,
      clinicInfo: state.clinicInfo,
    };
    localStorage.setItem(STORAGE_KEYS.WORKFLOW, JSON.stringify(workflowState));
  }, [
    state.session,
    state.procedure,
    state.screen,
    state.ttsData,
    state.currentSlide,
    state.audioPlayedOnce,
    state.messages,
    state.declarationChecked,
    state.signatureData,
    state.pdfUrl,
    state.clinicInfo,
  ]);

  const createSession = useCallback(async (data) => {
    try {
      const result = await apiClient.createSession(data);
      dispatch({ type: 'CREATE_SESSION', payload: { ...data, id: result.session_id } });
      // Store clinic info for PDF generation
      if (result.clinic_name || data.clinic_name) {
        dispatch({
          type: 'SET_CLINIC_INFO',
          info: {
            clinic_name: result.clinic_name || data.clinic_name || '',
            doctor_name: result.doctor_name || data.doctor_name || '',
            clinic_address: result.clinic_address || data.clinic_address || '',
            clinic_phone: result.clinic_phone || data.clinic_phone || '',
            clinic_email: result.clinic_email || data.clinic_email || '',
            clinic_website: result.clinic_website || data.clinic_website || '',
          },
        });
      }
      return result;
    } catch {
      const session = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        status: 'in_progress',
      };
      dispatch({ type: 'CREATE_SESSION', payload: session });
      return { session_id: session.id };
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW);
  }, []);

  return (
    <SessionContext.Provider value={{
      state,
      dispatch,
      createSession,
      reset,
      clinicInfo: state.clinicInfo,
      isInitializing: state.isInitializing,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export default SessionContext;