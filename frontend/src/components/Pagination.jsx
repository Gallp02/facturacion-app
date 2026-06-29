export default function Pagination({ page, limit, total, onChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    pages.push(i);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderTop: '1px solid var(--border, #e2e8f0)',
      fontSize: 13, color: 'var(--text-secondary, #64748b)',
      flexWrap: 'wrap', gap: 8
    }}>
      <span>
        Mostrando {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} de {total}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          style={{
            padding: '6px 12px', border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 6, background: 'var(--card-bg, white)',
            color: page <= 1 ? 'var(--text-secondary, #a0aec0)' : 'var(--text-primary, #2d3748)',
            cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12
          }}
        >Anterior</button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              padding: '6px 12px', border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 6,
              background: p === page ? '#3182ce' : 'var(--card-bg, white)',
              color: p === page ? 'white' : 'var(--text-primary, #2d3748)',
              cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 600 : 400
            }}
          >{p}</button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          style={{
            padding: '6px 12px', border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 6, background: 'var(--card-bg, white)',
            color: page >= totalPages ? 'var(--text-secondary, #a0aec0)' : 'var(--text-primary, #2d3748)',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12
          }}
        >Siguiente</button>
      </div>
    </div>
  );
}
