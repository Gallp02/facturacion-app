import { useState, useEffect, useCallback, useRef } from 'react';
import { movimientosStockAPI, productosAPI, almacenesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/export';

export default function MovimientosStock() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const canManage = ['super_admin', 'admin', 'almacen'].includes(usuario?.rol);

  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ producto_id: '', tipo: 'entrada', almacen_id: '', cajas: 1, unitario: 0, referencia: '' });

  const loadData = useCallback(async (p, s, t) => {
    if (loadedRef.current) setLoading(true);
    try {
      const params = { page: p, limit: 20, search: s };
      if (t) params.tipo = t;
      const [mRes, pRes, aRes] = await Promise.all([
        movimientosStockAPI.getAll(params),
        productosAPI.getAll({ limit: 200 }),
        almacenesAPI.getAll()
      ]);
      setMovimientos(mRes.data.data);
      setTotal(mRes.data.total);
      setProductos(pRes.data.data || pRes.data);
      setAlmacenes(aRes.data);
    } catch (err) {
      addToast('Error al cargar movimientos', 'error');
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(page, search, tipoFilter); }, [page]);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const timer = setTimeout(() => { setPage(1); loadData(1, search, tipoFilter); }, 400);
    return () => clearTimeout(timer);
  }, [search, tipoFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.producto_id || !form.tipo || !form.almacen_id) {
      addToast('Complete producto, tipo y almacen', 'error');
      return;
    }
    if ((!form.cajas || form.cajas === 0) && (!form.unitario || form.unitario === 0)) {
      addToast('Ingrese al menos 1 caja o 1 unidad', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        cantidad: (parseInt(form.cajas) || 0) + (parseInt(form.unitario) || 0),
        cajas: parseInt(form.cajas) || 0,
        unitario: parseInt(form.unitario) || 0
      };
      await movimientosStockAPI.create(payload);
      addToast('Movimiento registrado correctamente', 'success');
      setShowForm(false);
      setForm({ producto_id: '', tipo: 'entrada', almacen_id: '', cajas: 1, unitario: 0, referencia: '' });
      loadData(page, search, tipoFilter);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al registrar movimiento', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tipoStyle = (tipo) => {
    switch (tipo) {
      case 'entrada': return { bg: '#c6f6d5', color: '#276749' };
      case 'salida': return { bg: '#fed7d7', color: '#9b2c2c' };
      case 'ajuste': return { bg: '#fefcbf', color: '#975a16' };
      default: return { bg: '#e2e8f0', color: '#4a5568' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Movimientos de Stock</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar producto o usuario..." />
          <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
            <option value="ajuste">Ajustes</option>
          </select>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderLeft: '1px solid var(--border, #e2e8f0)', paddingLeft: 12 }}>
            <button onClick={() => exportToCSV(movimientos, 'movimientos-stock')} title="Exportar CSV"
              style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              ⬇ CSV
            </button>
            {canManage && (
              <button onClick={() => { setShowForm(true); setForm({ producto_id: '', tipo: 'entrada', almacen_id: '', cajas: 0, unitario: 1, referencia: '' }); }}
                style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                + Nuevo Movimiento
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setForm({ producto_id: '', tipo: 'entrada', almacen_id: '', cajas: 1, unitario: 0, referencia: '' }); }} title="Nuevo Movimiento" maxWidth={550}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Producto *</label>
              <select value={form.producto_id} onChange={(e) => setForm({ ...form, producto_id: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="">Seleccionar producto</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Almacen *</label>
              <select value={form.almacen_id} onChange={(e) => setForm({ ...form, almacen_id: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="">Seleccionar</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="entrada">Entrada (+)</option>
                <option value="salida">Salida (-)</option>
                <option value="ajuste">Ajuste (+/-)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Cajas</label>
              <input type="number" min="0" value={form.cajas} onChange={(e) => setForm({ ...form, cajas: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Unidades</label>
              <input type="number" min="0" value={form.unitario} onChange={(e) => setForm({ ...form, unitario: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Referencia</label>
              <input placeholder="Opcional" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" onClick={() => { setShowForm(false); setForm({ producto_id: '', tipo: 'entrada', almacen_id: '', cajas: 1, unitario: 0, referencia: '' }); }} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </Modal>

      {loading ? (loadedRef.current ? <TableSkeleton rows={6} cols={7} /> : <div style={{ height: 400 }} />) : (
        <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Tipo</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Producto</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Almacen</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Cajas</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Uni</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Total</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Ref.</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Usuario</th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => {
                  const s = tipoStyle(m.tipo);
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                          {m.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-primary, #2d3748)' }}>{m.producto_nombre}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-primary, #2d3748)' }}>{m.almacen_nombre || '-'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-primary, #2d3748)' }}>{m.cajas || 0}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-primary, #2d3748)' }}>{m.unitario || 0}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: m.tipo === 'entrada' ? '#38a169' : m.tipo === 'salida' ? '#e53e3e' : '#d69e2e' }}>
                        {m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '-' : ''}{m.cantidad}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>{m.referencia || '-'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-primary, #2d3748)' }}>{m.usuario_nombre}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-primary, #2d3748)' }}>{new Date(m.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
                {movimientos.length === 0 && !loading && (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay movimientos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
