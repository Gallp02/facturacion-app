import { useState } from 'react';

export default function SearchBar({ value = '', onChange, placeholder = 'Buscar...', onClear }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
      <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px 10px 38px',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 10, fontSize: 13,
          background: 'var(--card-bg, white)',
          color: 'var(--text-primary, #1a202c)',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s'
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--bg-secondary, #edf2f7)', border: 'none', borderRadius: '50%',
            width: 20, height: 20, cursor: 'pointer', fontSize: 12, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #718096)'
          }}
        >×</button>
      )}
    </div>
  );
}
