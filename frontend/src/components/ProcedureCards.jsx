import { useState } from 'react';

/**
 * ProcedureCards — Three dropdown Benefits / Risks / Alternatives display.
 * Each category is a button that expands to show the content.
 */
export default function ProcedureCards({ procedure }) {
  const [openCard, setOpenCard] = useState(null);

  if (!procedure) return null;

  const cards = [
    {
      title: 'Benefits',
      items: procedure.benefits,
      accentColor: '#22C7B0',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      itemIcon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    {
      title: 'Risks',
      items: procedure.risks,
      accentColor: '#2E6BE6',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      itemIcon: (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" opacity="0.3" />
        </svg>
      ),
    },
    {
      title: 'Alternatives',
      items: procedure.alternatives,
      accentColor: '#6C757D',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      ),
      itemIcon: (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ),
    },
  ];

  const toggleCard = (title) => {
    setOpenCard(openCard === title ? null : title);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {cards.map((card) => {
        const isOpen = openCard === card.title;
        return (
          <div
            key={card.title}
            style={{
              border: '1px solid #E3E8F0',
              borderRadius: 12,
              background: '#fff',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                borderTop: `3px solid ${card.accentColor}`,
              }}
              onClick={() => toggleCard(card.title)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${card.accentColor}15`,
                  color: card.accentColor,
                }}>
                  {card.icon}
                </span>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  margin: 0,
                  color: '#1a1a2e',
                }}>
                  {card.title}
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 24,
                  height: 24,
                  padding: '0 8px',
                  borderRadius: 12,
                  background: '#F0F4F8',
                  color: '#5C6B85',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {card.items?.length || 0}
                </span>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                color: '#5C6B85',
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
            {isOpen && card.items && (
              <div style={{
                padding: '4px 16px 16px 60px',
              }}>
                {card.items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '10px 0',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      color: '#1a1a2e',
                      borderBottom: i < (card.items?.length || 0) - 1 ? '1px solid #F0F4F8' : 'none',
                    }}
                  >
                    <span style={{
                      flexShrink: 0,
                      marginTop: 3,
                      color: card.accentColor,
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      {card.itemIcon}
                    </span>
                    <span style={{ flex: 1 }}>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}