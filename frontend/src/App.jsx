import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useRef } from 'react';
import { useSession } from './state/sessionContext';
import LandingPage from './screens/LandingPage';
import WelcomeScreen from './screens/WelcomeScreen';
import ExplanationScreen from './screens/ExplanationScreen';
import QuestionsScreen from './screens/QuestionsScreen';
import SignConsentScreen from './screens/SignConsentScreen';
import DoneScreen from './screens/DoneScreen';
import AdminLogin from './screens/AdminLogin';
import AdminDashboard from './screens/AdminDashboard';

// Map screen numbers to URL paths
const SCREEN_TO_PATH = {
  '-1': '/',
  '0': '/welcome',
  '1': '/explanation',
  '2': '/questions',
  '3': '/consent',
  '4': '/done',
};

// Map URL paths to screen numbers
const PATH_TO_SCREEN = {
  '/': -1,
  '/welcome': 0,
  '/explanation': 1,
  '/questions': 2,
  '/consent': 3,
  '/done': 4,
  '/admin': -1,
  '/admin/dashboard': -1,
};

function AppHeader() {
  const { state } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, procedure } = state;

  const isAdminPage = location.pathname.startsWith('/admin');
  if (isAdminPage) return null;

  const showHeader = ['/welcome', '/explanation', '/questions', '/consent', '/done'].includes(location.pathname);
  if (!showHeader) return null;

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderBottom: '1px solid #E3E8F0', background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span 
          style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0C1B4D', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <span style={{ color: '#0C1B4D' }}>Assent</span>
          <span style={{ color: '#22C7B0' }}>IQ</span>
        </span>
        {session && session.patient_name && (
          <span style={{ fontSize: '0.85rem', color: '#5C6B85', paddingLeft: 16, borderLeft: '1px solid #E3E8F0' }}>
            {session.patient_name} — {procedure?.display_name || session.procedure_id}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      </div>
    </header>
  );
}

function WorkflowContent() {
  const { state } = useSession();
  const { screen } = state;

  const screens = {
    '-1': <LandingPage />,
    '0': <WelcomeScreen />,
    '1': <ExplanationScreen />,
    '2': <QuestionsScreen />,
    '3': <SignConsentScreen />,
    '4': <DoneScreen />,
  };
  return screens[String(screen)] || <WelcomeScreen />;
}

function PageLayout({ children, showHeader, showFooter }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F7F9FC' }}>
      {showHeader && <AppHeader />}
      <main style={{ flex: 1 }}>{children}</main>

    </div>
  );
}

// Sync: URL -> Screen state
function UrlToScreenSync() {
  const { state, dispatch } = useSession();
  const location = useLocation();
  const pathname = location.pathname;
  const processedPathsRef = useRef(new Set());

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    if (processedPathsRef.current.has(pathname + state.screen)) return;
    processedPathsRef.current.add(pathname + state.screen);

    const expectedScreen = PATH_TO_SCREEN[pathname];
    if (expectedScreen !== undefined && state.screen !== expectedScreen) {
      if (expectedScreen >= -1 && expectedScreen <= 4) {
        const timer = setTimeout(() => {
          dispatch({ type: 'SET_SCREEN', payload: expectedScreen });
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, dispatch, state.screen]);

  return null;
}

// Sync: Screen state -> URL
function ScreenToUrlSync() {
  const { state } = useSession();
  const navigate = useNavigate();
  const { screen } = state;
  const prevScreenRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevScreenRef.current = screen;
      return;
    }

    if (screen === -1) {
      prevScreenRef.current = screen;
      return;
    }
    
    if (prevScreenRef.current === screen) return;
    prevScreenRef.current = screen;

    const path = SCREEN_TO_PATH[String(screen)];
    if (!path) return;
    
    if (path !== window.location.pathname) {
      navigate(path, { replace: true });
    }
  }, [screen, navigate]);

  return null;
}

function AppContent() {
  const { isInitializing } = useSession();

  return (
    <>
      <UrlToScreenSync />
      <ScreenToUrlSync />
      
      <Routes>
        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        
        {/* Landing page */}
        <Route path="/" element={
          <PageLayout showFooter={true}>
            <WorkflowContent />
          </PageLayout>
        } />
        
        {/* Consent workflow routes */}
        <Route path="/welcome" element={
          <PageLayout showHeader={true} showFooter={true}>
            <WorkflowContent />
          </PageLayout>
        } />
        <Route path="/explanation" element={
          <PageLayout showHeader={true} showFooter={true}>
            <WorkflowContent />
          </PageLayout>
        } />
        <Route path="/questions" element={
          <PageLayout showHeader={true} showFooter={true}>
            <WorkflowContent />
          </PageLayout>
        } />
        <Route path="/consent" element={
          <PageLayout showHeader={true} showFooter={true}>
            <WorkflowContent />
          </PageLayout>
        } />
        <Route path="/done" element={
          <PageLayout showHeader={true} showFooter={true}>
            <WorkflowContent />
          </PageLayout>
        } />
        
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function AppWithRouter() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default function App() {
  return <AppWithRouter />;
}