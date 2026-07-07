import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * SignaturePad — Touch + mouse signature capture on HTML5 Canvas.
 * 
 * @param {function} onSignatureChange - Called with base64 data URL when signature changes
 * @param {boolean} cleared - External clear trigger
 */
export default function SignaturePad({ onSignatureChange, cleared }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPointRef = useRef(null);

  // Get contextual canvas + 2d context
  const getCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#0C1B4D';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Clear on external trigger
  useEffect(() => {
    if (cleared) {
      clearSignature();
    }
  }, [cleared]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;
    setIsDrawing(true);
    lastPointRef.current = point;

    // Draw a dot for single taps
    const ctx = getCanvas();
    if (ctx) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0C1B4D';
      ctx.fill();
    }
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !lastPointRef.current) return;
    const point = getPoint(e);
    if (!point) return;

    const ctx = getCanvas();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    setHasSignature(true);
    // Notify parent with current canvas content
    const canvas = canvasRef.current;
    if (canvas && onSignatureChange) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  };

  const stopDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvas();
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    if (onSignatureChange) {
      onSignatureChange(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 180,
        borderRadius: 12,
        border: '2px dashed var(--border-subtle)',
        background: hasSignature ? 'var(--bg-card)' : 'rgba(227, 232, 240, 0.3)',
        cursor: hasSignature ? 'crosshair' : 'default',
        transition: 'border-color 0.2s, background 0.2s',
        touchAction: 'none',
      }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      {!hasSignature && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          fontStyle: 'italic',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          Sign here with your finger or stylus
        </div>
      )}
    </div>
  );
}