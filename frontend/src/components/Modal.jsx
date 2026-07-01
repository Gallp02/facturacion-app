import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, onConfirm, confirmText = 'Confirmar', confirmColor = '#e53e3e', loading = false, maxWidth = 420 }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, white)',
          borderRadius: 16,
          padding: 28,
          width: '90%',
          maxWidth: maxWidth,
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        animation: 'scaleIn 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary, #1a202c)' }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary, #718096)', padding: 0, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary, #4a5568)', lineHeight: 1.6, marginBottom: onConfirm ? 20 : 0 }}>{children}</div>
        {onConfirm && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading} style={{ padding: '10px 20px', background: loading ? '#a0aec0' : confirmColor, color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {loading ? 'Procesando...' : confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
