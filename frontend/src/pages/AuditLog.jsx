import { useState, useEffect, useCallback } from 'react';
import { auditLogAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/export';

export default function AuditLog() {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('lista');

  const loadData = useCallback(async (p, s) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 30, search: s };
      const [lRes, rRes] = await Promise.all([
        auditLogAPI.getAll(params),
        auditLogAPI.getResumen()
      ]);
      setLogs(lRes.data.data);
      setTotal(lRes.data.total);
      setResumen(rRes.data);
    } catch (err) {
      addToast('Error al cargar auditoria', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(page, search); }, [page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadData(1, search); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const accionColor = (accion) => {
    if (accion.includes('crear')) return '#38a169';
    if (accion.includes('actualizar') || accion.includes('cambiar')) return '#d69e2e';
    return '#3182ce';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Auditoria</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar en auditoria..." />
          <button onClick={() => exportToCSV(logs, 'auditoria')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border, #e2e8f0)', paddingBottom: 0 }}>
        {['lista', 'resumen'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: 'transparent', color: tab === t ? '#3182ce' : 'var(--text-secondary, #718096)',
              borderBottom: tab === t ? '2px solid #3182ce' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s'
            }}>
            {t === 'lista' ? 'Historial' : 'Resumen'}
          </button>
        ))}
      </div>

      {tab === 'resumen' && resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #3182ce' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginBottom: 4 }}>Acciones Hoy</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#3182ce' }}>{resumen.hoy}</div>
          </div>
          <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #38a169' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginBottom: 4 }}>Acciones por Tipo</div>
            {resumen.acciones?.slice(0, 5).map(a => (
              <div key={a.accion} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0', color: 'var(--text-primary, #2d3748)' }}>
                <span>{a.accion}</span>
                <span style={{ fontWeight: 700 }}>{a.total}</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #d69e2e' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #64748b)', marginBottom: 4 }}>Usuarios mas Activos</div>
            {resumen.usuarios?.slice(0, 5).map(u => (
              <div key={u.usuario_nombre} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0', color: 'var(--text-primary, #2d3748)' }}>
                <span>{u.usuario_nombre}</span>
                <span style={{ fontWeight: 700 }}>{u.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <TableSkeleton rows={6} cols={5} /> : (
        <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Tabla</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Usuario</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Detalle</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                  {logs.map((l) => {
                  let detalle = typeof l.detalle === 'string' ? l.detalle : JSON.stringify(l.detalle);
                  try { const p = JSON.parse(detalle); detalle = p?.body ? Object.keys(p.body).slice(0, 4).map(k => `${k}:${p.body[k]}`).join(', ') : detalle; } catch (e) { }
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: `${accionColor(l.accion)}20`, color: accionColor(l.accion) }}>
                          {l.accion}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{l.tabla}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{l.usuario_nombre}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary, #64748b)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={typeof l.detalle === 'string' ? l.detalle : JSON.stringify(l.detalle)}>
                        {String(detalle).substring(0, 80) || '-'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-primary, #2d3748)' }}>{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {logs.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay registros de auditoria</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={30} total={total} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
