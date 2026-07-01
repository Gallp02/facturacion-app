import { useState, useEffect, useCallback } from 'react';
import { facturasAPI, ordenesAPI, clientesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useEmpresa } from '../context/EmpresaContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/export';

export default function Facturas() {
  const { addToast } = useToast();
  const { selectedEmpresa } = useEmpresa();
  const [facturas, setFacturas] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ orden_id: '', cliente_id: '', tipo: 'boleta', subtotal: '', igv: '', total: '' });

  const loadData = useCallback(async (p, s) => {
    setLoading(true);
    try {
      const [fRes, oRes, cRes] = await Promise.all([
        facturasAPI.getAll({ page: p, limit: 20, search: s }),
        ordenesAPI.getAll({ limit: 200 }),
        clientesAPI.getAll({ limit: 200 })
      ]);
      setFacturas(fRes.data.data);
      setTotal(fRes.data.total);
      setOrdenes((oRes.data.data || []).filter(o => o.estado !== 'anulada'));
      setClientes(cRes.data.data || []);
    } catch (err) {
      addToast('Error al cargar facturas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(page, search); }, [page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadData(1, search); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOrdenChange = (ordenId) => {
    const orden = ordenes.find(o => o.id === parseInt(ordenId));
    if (orden) {
      setForm({ ...form, orden_id: ordenId, cliente_id: orden.cliente_id, subtotal: orden.subtotal, igv: orden.igv, total: orden.total });
    } else {
      setForm({ ...form, orden_id: '', cliente_id: '', subtotal: '', igv: '', total: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) { addToast('Seleccione un cliente', 'error'); return; }
    if (!form.orden_id && (!form.subtotal || !form.total)) { addToast('Complete subtotal y total', 'error'); return; }
    setSaving(true);
    try {
      await facturasAPI.create({ ...form, empresa_id: selectedEmpresa?.id });
      setShowForm(false);
      setForm({ orden_id: '', cliente_id: '', tipo: 'boleta', subtotal: '', igv: '', total: '' });
      addToast('Factura emitida correctamente', 'success');
      loadData(page, search);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al emitir factura', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Facturacion</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar factura..." />
          <button onClick={() => exportToCSV(facturas, 'facturas')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            + Nueva Factura
          </button>
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setForm({ orden_id: '', cliente_id: '', tipo: 'boleta', subtotal: '', igv: '', total: '' }); }} title="Nueva Factura" maxWidth={500}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Orden de Compra</label>
              <select value={form.orden_id} onChange={(e) => handleOrdenChange(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="">Sin orden (factura directa)</option>
                {ordenes.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.cliente_nombre} - S/ {parseFloat(o.total).toFixed(2)}</option>)}
              </select>
            </div>
          </div>
          {!form.orden_id && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Cliente</label>
                <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Subtotal</label>
                <input type="number" step="0.01" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Total</label>
                <input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowForm(false); setForm({ orden_id: '', cliente_id: '', tipo: 'boleta', subtotal: '', igv: '', total: '' }); }} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Emitiendo...' : 'Emitir Factura'}
            </button>
          </div>
        </form>
      </Modal>

      {loading ? <TableSkeleton rows={6} cols={7} /> : (
        <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Numero</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Tipo</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Cliente</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Total</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Estado SUNAT</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Orden</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary, #2d3748)' }}>{f.numero_completo}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{f.tipo}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{f.cliente_nombre}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>S/ {parseFloat(f.total).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: f.estado_sunat === 'aceptado' ? '#c6f6d5' : f.estado_sunat === 'rechazado' ? '#fed7d7' : '#fefcbf',
                        color: f.estado_sunat === 'aceptado' ? '#276749' : f.estado_sunat === 'rechazado' ? '#9b2c2c' : '#975a16'
                      }}>
                        {f.estado_sunat}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-primary, #2d3748)' }}>{f.orden_codigo || '-'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-primary, #2d3748)' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {facturas.length === 0 && !loading && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay facturas emitidas</td></tr>
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
