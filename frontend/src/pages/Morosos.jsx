import { useState, useEffect, useCallback, useRef } from 'react';
import { prestamosAPI, clientesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import LoadingBar from '../components/LoadingBar';
import { getCache, setCache } from '../utils/pageCache';

export default function Morosos() {
  const { addToast } = useToast();
  const cached = getCache('morosos');
  const [prestamos, setPrestamos] = useState(cached?.prestamos || []);
  const [total, setTotal] = useState(cached?.total || 0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(!!cached);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '', monto_total: '', numero_origen: '', cuotas: '', fecha_inicio: ''
  });
  const [clientes, setClientes] = useState([]);

  const [detalle, setDetalle] = useState(null);
  const [showDetalle, setShowDetalle] = useState(false);
  const [pagarLoading, setPagarLoading] = useState(null);

  const loadData = useCallback(async (p, s) => {
    if (loadedRef.current) setLoading(true);
    try {
      const res = await prestamosAPI.getAll({ page: p, limit: 20, search: s });
      setPrestamos(res.data.data);
      setTotal(res.data.total);
      setCache('morosos', { prestamos: res.data.data, total: res.data.total });
    } catch (err) {
      addToast('Error al cargar prestamos', 'error');
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(page, search); }, [page]);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const timer = setTimeout(() => { setPage(1); loadData(1, search); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreate = async () => {
    setForm({ cliente_id: '', monto_total: '', numero_origen: '', cuotas: '', fecha_inicio: '' });
    try {
      const res = await clientesAPI.getAll({ limit: 200 });
      setClientes(res.data.data);
    } catch (_) { }
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente_id || !form.monto_total || !form.numero_origen || !form.cuotas || !form.fecha_inicio) {
      addToast('Completa todos los campos', 'error');
      return;
    }
    setSaving(true);
    try {
      await prestamosAPI.create({
        cliente_id: form.cliente_id,
        monto_total: form.monto_total,
        numero_origen: form.numero_origen,
        cuotas: form.cuotas,
        fecha_inicio: form.fecha_inicio,
      });
      closeForm();
      loadData(page, search);
      addToast('Prestamo creado', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al crear prestamo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const res = await prestamosAPI.getById(id);
      setDetalle(res.data);
      setShowDetalle(true);
    } catch (_) {
      addToast('Error al obtener detalle', 'error');
    }
  };

  const pagarCuota = async (prestamoId, cuotaId, numeroCuota) => {
    if (!confirm(`Marcar cuota #${numeroCuota} como pagada?`)) return;
    setPagarLoading(cuotaId);
    try {
      await prestamosAPI.pagarCuota(prestamoId, cuotaId, new Date().toISOString().split('T')[0]);
      addToast('Cuota pagada', 'success');
      const res = await prestamosAPI.getById(prestamoId);
      setDetalle(res.data);
      loadData(page, search);
    } catch (_) {
      addToast('Error al pagar cuota', 'error');
    } finally {
      setPagarLoading(null);
    }
  };

  const estadoColor = (estado) => {
    const map = {
      activo: { bg: '#bee3f8', color: '#2a4365' },
      pagado: { bg: '#c6f6d5', color: '#276749' },
      cancelado: { bg: '#fed7d7', color: '#9b2c2c' },
    };
    return map[estado] || { bg: '#e2e8f0', color: '#4a5568' };
  };

  const badge = (estado) => {
    const c = estadoColor(estado);
    return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>{estado}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)', fontSize: 22, fontWeight: 800 }}>Morosos</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary, #718096)' }}>Gestion de prestamos y cuotas</p>
        </div>
        <button onClick={openCreate} style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Nuevo Prestamo</button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Buscar por cliente, apodo, DNI/RUC o N° origen..." />

      <div style={{ position: 'relative', marginTop: 16 }}>
        {loading && <LoadingBar />}
        {!cached && !loadedRef.current ? null : (
        <div style={{ opacity: loading && loadedRef.current ? 0.5 : 1, transition: 'opacity 0.2s', background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Cliente</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Monto Solicitado</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>N° Origen BCP</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Cuotas</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha Inicio</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha Fin</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Vencidas</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Estado</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>
                      <div>{p.cliente_nombre}</div>
                      {p.cliente_apodo && <div style={{ fontSize: 11, color: '#718096' }}>"{p.cliente_apodo}"</div>}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)', fontWeight: 600 }}>S/ {parseFloat(p.monto_total).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary, #2d3748)' }}>{p.numero_origen}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{p.cuotas_pendientes || 0}/{p.cuotas}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-primary, #2d3748)' }}>{new Date(p.fecha_inicio).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-primary, #2d3748)' }}>{new Date(p.fecha_fin).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {p.cuotas_vencidas > 0
                        ? <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#fed7d7', color: '#9b2c2c' }}>{p.cuotas_vencidas} vencidas</span>
                        : <span style={{ fontSize: 13, color: '#a0aec0' }}>-</span>}
                    </td>
                    <td style={{ padding: '10px 16px' }}>{badge(p.estado)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => verDetalle(p.id)} style={{ padding: '6px 12px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Ver Cuotas</button>
                    </td>
                  </tr>
                ))}
                {prestamos.length === 0 && !loading && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay prestamos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onChange={setPage} />
        </div>
        )}
      </div>

      <Modal open={showForm} title="Nuevo Prestamo" maxWidth={550} onClose={closeForm}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #4a5568)', marginBottom: 4 }}>Cliente *</label>
                <select
                  value={form.cliente_id} required
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14, background: 'var(--card-bg, white)', color: 'var(--text-primary, #1a202c)' }}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.apodo ? ` (${c.apodo})` : ''} - {c.numero_documento}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #4a5568)', marginBottom: 4 }}>Monto Total S/ *</label>
                  <input type="number" step="0.01" min="0" required value={form.monto_total}
                    onChange={(e) => setForm({ ...form, monto_total: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #1a202c)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #4a5568)', marginBottom: 4 }}>N° Origen BCP *</label>
                  <input type="text" required value={form.numero_origen}
                    onChange={(e) => setForm({ ...form, numero_origen: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #1a202c)' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #4a5568)', marginBottom: 4 }}>N° Cuotas *</label>
                  <input type="number" min="1" max="60" required value={form.cuotas}
                    onChange={(e) => setForm({ ...form, cuotas: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #1a202c)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #4a5568)', marginBottom: 4 }}>Fecha Inicio *</label>
                  <input type="date" required value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #1a202c)' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                  {form.monto_total && form.cuotas && parseInt(form.cuotas) > 0 && (
                    <div style={{ fontSize: 13, color: '#718096' }}>
                      <span style={{ fontWeight: 600, color: '#2d3748' }}>S/ {(parseFloat(form.monto_total) / parseInt(form.cuotas)).toFixed(2)}</span> x {form.cuotas} cuotas
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" onClick={closeForm} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-primary, #4a5568)' }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: '10px 20px', background: saving ? '#90cdf4' : '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{saving ? 'Guardando...' : 'Crear Prestamo'}</button>
            </div>
          </form>
        </Modal>

      {showDetalle && detalle && (
        <Modal open={showDetalle} title={`Prestamo - ${detalle.cliente_nombre}`} maxWidth={650} onClose={() => setShowDetalle(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20, fontSize: 13 }}>
            <div><strong>Cliente:</strong> {detalle.cliente_nombre}{detalle.cliente_apodo ? ` (${detalle.cliente_apodo})` : ''}</div>
            <div><strong>Documento:</strong> {detalle.cliente_doc}</div>
            <div><strong>Monto Total:</strong> S/ {parseFloat(detalle.monto_total).toFixed(2)}</div>
            <div><strong>N° Origen:</strong> {detalle.numero_origen}</div>
            <div><strong>N° Cuotas:</strong> {detalle.cuotas.length}</div>
            <div><strong>Monto por Cuota:</strong> S/ {parseFloat(detalle.monto_cuota).toFixed(2)}</div>
            <div><strong>Inicio:</strong> {new Date(detalle.fecha_inicio).toLocaleDateString()}</div>
            <div><strong>Fin:</strong> {new Date(detalle.fecha_fin).toLocaleDateString()}</div>
            <div><strong>Estado:</strong> {badge(detalle.estado)}</div>
          </div>

          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-primary, #1a202c)' }}>Cuotas</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>#</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Vencimiento</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Monto</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Estado</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha Pago</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {detalle.cuotas.map((c) => {
                const vencida = c.estado === 'pendiente' && new Date(c.fecha_vencimiento) < new Date(new Date().toDateString());
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)', background: vencida ? '#fff5f5' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{c.numero}</td>
                    <td style={{ padding: '8px 12px', color: vencida ? '#e53e3e' : 'inherit', fontWeight: vencida ? 600 : 400 }}>
                      {new Date(c.fecha_vencimiento).toLocaleDateString()}
                      {vencida && <span style={{ marginLeft: 6, fontSize: 11, color: '#e53e3e' }}>({Math.floor((new Date() - new Date(c.fecha_vencimiento)) / (1000 * 60 * 60 * 24))} dias de atraso)</span>}
                    </td>
                    <td style={{ padding: '8px 12px' }}>S/ {parseFloat(c.monto).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px' }}>{badge(c.estado)}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12 }}>{c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {c.estado === 'pendiente' ? (
                        <button onClick={() => pagarCuota(detalle.id, c.id, c.numero)} disabled={pagarLoading === c.id} style={{ padding: '4px 10px', background: pagarLoading === c.id ? '#90cdf4' : '#38a169', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>{pagarLoading === c.id ? '...' : 'Pagar'}</button>
                      ) : <span style={{ color: '#38a169', fontWeight: 600, fontSize: 12 }}>Pagado</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
