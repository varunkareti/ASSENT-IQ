import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';

export default function ChatBox({ sessionId, onMessagesChange }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cleanup typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const userMsg = {
      role: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.sendQuestion(sessionId, trimmed);
      const aiMsg = {
        role: 'ai',
        text: response.answer,
        timestamp: new Date().toISOString(),
        id: Date.now() + 1,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errMsg = e.message || 'Failed to get answer. Please try again.';
      setError(errMsg);
      setMessages((prev) => [...prev, {
        role: 'error',
        text: errMsg,
        timestamp: new Date().toISOString(),
        id: Date.now() + 1,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    const parts = name?.split(' ') || [];
    const first = parts[0]?.charAt(0) || '?';
    const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)',
      borderRadius: 16,
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #0C1B4D 0%, #1a2f7a 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
        }}>
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AssentIQ Assistant</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Your dental consent guide</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C7B0', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Online</span>
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
          }
        `}</style>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: 300,
        maxHeight: 450,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
            gap: 12,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
            }}>
              💬
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>How can I help you?</div>
            <div style={{ fontSize: '0.78rem', textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
              Ask questions about your dental procedure, recovery, or risks.
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isError = msg.role === 'error';
          
          return (
            <div
              key={msg.id || i}
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                animation: 'fadeInUp 0.3s ease-out',
                animationDelay: `${i * 0.05}s`,
              }}
            >
              {/* Avatar - AI */}
              {!isUser && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2E6BE6, #4F8FFF)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  flexShrink: 0,
                  color: '#fff',
                  fontWeight: 600,
                }}>
                  {isError ? '⚠' : 'AI'}
                </div>
              )}

              {/* Message Bubble */}
              <div style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
                {!isUser && (
                  <span style={{ fontSize: '0.65rem', color: '#2E6BE6', fontWeight: 600, paddingLeft: 4 }}>
                    AssentIQ
                  </span>
                )}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser
                    ? 'linear-gradient(135deg, #0C1B4D, #1a2f7a)'
                    : isError
                    ? '#FEF2F2'
                    : '#FFFFFF',
                  color: isUser || isError ? '#fff' : '#1F2937',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  border: isError ? '1px solid #FECACA' : isUser ? 'none' : '1px solid #E5E7EB',
                  boxShadow: isError ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  color: '#9CA3AF',
                  textAlign: isUser ? 'right' : 'left',
                  padding: '0 4px',
                }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Avatar - User */}
              {isUser && (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22C7B0, #18a08e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  flexShrink: 0,
                  color: '#fff',
                }}>
                  {getInitials('Patient')}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing Indicator */}
        {loading && (
          <div style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-start',
            animation: 'fadeInUp 0.3s ease-out',
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2E6BE6, #4F8FFF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              flexShrink: 0,
              color: '#fff',
              fontWeight: 600,
            }}>
              AI
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '16px 16px 16px 4px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#2E6BE6',
                    animation: `typingBounce 1.2s infinite ${i * 0.2}s`,
                  }}
                />
              ))}
              <span style={{ fontSize: '0.75rem', color: '#6B7280', marginLeft: 4 }}>
                Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '10px 16px',
          margin: '0 16px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 8,
          color: '#DC2626',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: '1rem' }}>⚠️</span>
          {error}
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: 16,
        borderTop: '1px solid #E5E7EB',
        background: '#FFFFFF',
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 24,
            padding: '4px 4px 4px 16px',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your procedure..."
              disabled={loading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.88rem',
                color: '#1F2937',
                padding: '8px 0',
              }}
            />
            <label style={{ fontSize: '1.2rem', cursor: 'pointer', color: '#9CA3AF', padding: '0 8px', display: 'none' }}>
              📎
            </label>
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !question.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: question.trim()
                ? 'linear-gradient(135deg, #2E6BE6, #4F8FFF)'
                : '#E5E7EB',
              color: question.trim() ? '#fff' : '#9CA3AF',
              border: 'none',
              cursor: question.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              transition: 'all 0.2s ease',
              boxShadow: question.trim() ? '0 4px 12px rgba(46, 107, 230, 0.3)' : 'none',
            }}
            title="Send message"
          >
            ➤
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#9CA3AF', marginTop: 8 }}>
          AssentIQ uses AI. Always verify with your dentist.
        </div>
      </div>
    </div>
  );
}