import { useNavigate } from 'react-router-dom';

export default function AuthHeader({ showLogo = true }) {
  const navigate = useNavigate();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderBottom: '1px solid #E3E8F0',
      background: '#fff',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
      >
        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0C1B4D' }}>
          <span style={{ color: '#0C1B4D' }}>Assent</span>
          <span style={{ color: '#22C7B0' }}>IQ</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          onClick={() => navigate('/')}
          style={{ 
            background: 'none', 
            border: '1px solid #D1D5DB', 
            borderRadius: 4, 
            padding: '6px 14px', 
            fontSize: '0.82rem', 
            color: '#16255E', 
            cursor: 'pointer',
          }}
        >
          Home
        </button>
      </div>
    </header>
  );
}