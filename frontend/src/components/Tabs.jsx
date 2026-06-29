export default function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border, #e2e8f0)', marginBottom: 20 }}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            padding: '10px 20px',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: 'transparent',
            color: active === tab.key ? '#3182ce' : 'var(--text-secondary, #718096)',
            borderBottom: active === tab.key ? '2px solid #3182ce' : '2px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap'
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              background: active === tab.key ? '#3182ce' : 'var(--bg-secondary, #edf2f7)',
              color: active === tab.key ? 'white' : 'var(--text-secondary, #64748b)',
              padding: '2px 7px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
