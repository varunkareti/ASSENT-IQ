import { useState, useEffect, useRef } from 'react';

/**
 * SlideDeck — Auto-advancing presentation slides synced with narration.
 *
 * @param {Object[]} slides - Array of { text: string, duration_sec: number }
 * @param {number} currentSlide - Current slide index (controlled by parent)
 * @param {function} onSlideChange - Called when slide changes
 * @param {boolean} autoPlay - If true, auto-advances slides on mount/first play
 * @param {function} onAllSlidesSeen - Called when all slides have been viewed
 */
export default function SlideDeck({ slides, currentSlide, onSlideChange, autoPlay = false, onAllSlidesSeen }) {
  const intervalRef = useRef(null);
  const slideStartRef = useRef(null);

  // Auto-advance slides based on duration when autoPlay is true
  useEffect(() => {
    if (!autoPlay || !slides || currentSlide >= slides.length) {
      clearInterval(intervalRef.current);
      return;
    }

    slideStartRef.current = Date.now();
    const duration = (slides[currentSlide]?.duration_sec || 3) * 1000;

    intervalRef.current = setInterval(() => {
      if (currentSlide < slides.length - 1) {
        onSlideChange(currentSlide + 1);
      } else {
        clearInterval(intervalRef.current);
        // All slides have been shown - notify parent
        if (onAllSlidesSeen) {
          onAllSlidesSeen();
        }
      }
    }, duration);

    return () => clearInterval(intervalRef.current);
  }, [autoPlay, currentSlide, slides, onSlideChange, onAllSlidesSeen]);

  if (!slides || slides.length === 0) return null;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: 280,
      borderRadius: 16,
      overflow: 'hidden',
      background: 'var(--navy-900)',
      boxShadow: '0 4px 24px rgba(12, 27, 77, 0.2)',
    }}>
      {/* Slide */}
      <div style={{
        width: '100%',
        height: 280,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        transition: 'opacity 0.3s ease',
      }}>
        {/* Slide number */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 20,
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem',
          fontFamily: 'monospace',
        }}>
          {currentSlide + 1} / {slides.length}
        </div>

        {/* Slide text */}
        <h2 style={{
          color: '#FFFFFF',
          fontSize: '1.6rem',
          fontWeight: 700,
          textAlign: 'center',
          maxWidth: 600,
          lineHeight: 1.4,
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {slides[currentSlide]?.text || ''}
        </h2>

        {/* Subtitle for step slides */}
        {slides[currentSlide]?.text?.startsWith('Step') && (
          <div style={{
            color: 'var(--teal-400)',
            fontSize: '0.9rem',
            marginTop: 8,
          }}>
            Treatment Step
          </div>
        )}
      </div>

      {/* Slide progress dots */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 6,
        padding: '12px 0',
        background: 'rgba(0,0,0,0.3)',
      }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: i === currentSlide ? 24 : 8,
            height: 6,
            borderRadius: 3,
            background: i === currentSlide
              ? 'var(--teal-400)'
              : i < currentSlide
                ? 'rgba(34, 199, 176, 0.4)'
                : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Replay button */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '12px 0',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={() => {
            clearInterval(intervalRef.current);
            onSlideChange(0);
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            color: '#FFFFFF',
            padding: '8px 20px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
          }}
        >
          <span>↻</span> Replay
        </button>
      </div>
    </div>
  );
}