export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: '14px 16px', background: 'var(--bg-secondary, #f7fafc)', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ height: 14, background: 'var(--skeleton, #e2e8f0)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ height: 12, background: 'var(--skeleton, #edf2f7)', borderRadius: 4, animation: 'pulse 1.5s infinite', animationDelay: `${(r * cols + c) * 0.05}s` }} />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--card-bg, white)', borderRadius: 16, padding: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid var(--skeleton, #e2e8f0)'
    }}>
      <div style={{ height: 12, width: '60%', background: 'var(--skeleton, #e2e8f0)', borderRadius: 4, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: 24, width: '40%', background: 'var(--skeleton, #edf2f7)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
    </div>
  );
}
