import { useState, useEffect, useCallback } from 'react';
import { ordenesAPI, productosAPI, clientesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/export';

export default function Ordenes() {
  const { addToast } = useToast();
  const [ordenes, setOrdenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [confirmEstado, setConfirmEstado] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', notas: '', items: [{ producto_id: '', cantidad: 1 }] });

  const loadData = useCallback(async (p, s, est) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, search: s };
      if (est) params.estado = est;
      const [oRes, pRes, cRes] = await Promise.all([
        ordenesAPI.getAll(params),
        productosAPI.getAll({ limit: 200 }),
        clientesAPI.getAll({ limit: 200 })
      ]);
      setOrdenes(oRes.data.data);
      setTotal(oRes.data.total);
      setProductos(pRes.data.data || pRes.data);
      setClientes(cRes.data.data || cRes.data);
    } catch (err) {
      addToast('Error al cargar ordenes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(page, search, estadoFilter); }, [page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadData(1, search, estadoFilter); }, 400);
    return () => clearTimeout(timer);
  }, [search, estadoFilter]);

  const addItem = () => setForm({ ...form, items: [...form.items, { producto_id: '', cantidad: 1 }] });
  const removeItem = (index) => setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  const updateItem = (index, field, value) => {
    const items = [...form.items];
    items[index][field] = value;
    setForm({ ...form, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cliente_id) { addToast('Seleccione un cliente', 'error'); return; }
    if (!form.items[0]?.producto_id) { addToast('Agregue al menos un producto', 'error'); return; }
    setSaving(true);
    try {
      await ordenesAPI.create(form);
      setShowForm(false);
      setForm({ cliente_id: '', notas: '', items: [{ producto_id: '', cantidad: 1 }] });
      addToast('Orden creada correctamente', 'success');
      loadData(page, search, estadoFilter);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al crear orden', 'error');
    } finally {
      setSaving(false);
    }
  };

  const viewOrden = async (id) => {
    try {
      const res = await ordenesAPI.getById(id);
      setSelectedOrden(res.data);
    } catch (err) {
      addToast('Error al cargar orden', 'error');
    }
  };

  const handleEstadoChange = (id, estado) => {
    setConfirmEstado({ id, estado });
  };

  const confirmEstadoChange = async () => {
    if (!confirmEstado) return;
    setSaving(true);
    try {
      await ordenesAPI.updateEstado(confirmEstado.id, confirmEstado.estado);
      addToast('Estado actualizado', 'success');
      setConfirmEstado(null);
      loadData(page, search, estadoFilter);
      if (selectedOrden?.id === confirmEstado.id) setSelectedOrden({ ...selectedOrden, estado: confirmEstado.estado });
    } catch (err) {
      addToast('Error al actualizar estado', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Ordenes de Compra</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar orden..." />
          <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="completada">Completada</option>
            <option value="anulada">Anulada</option>
          </select>
          <button onClick={() => exportToCSV(ordenes, 'ordenes')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            + Nueva Orden
          </button>
        </div>
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setForm({ cliente_id: '', notas: '', items: [{ producto_id: '', cantidad: 1 }] }); }} title="Nueva Orden de Compra" maxWidth={650}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Cliente</label>
            <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required
              style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
              <option value="">Seleccionar cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.numero_documento})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Notas</label>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2}
              style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Productos</label>
              <button type="button" onClick={addItem} style={{ padding: '6px 12px', background: '#38a169', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                + Agregar Item
              </button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                <select value={item.producto_id} onChange={(e) => updateItem(i, 'producto_id', e.target.value)} required
                  style={{ flex: 2, padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} - Stock: {p.stock} - S/ {parseFloat(p.precio_venta).toFixed(2)}</option>)}
                </select>
                <input type="number" min="1" value={item.cantidad} onChange={(e) => updateItem(i, 'cantidad', parseInt(e.target.value) || 1)}
                  style={{ flex: 1, padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
                <button type="button" onClick={() => removeItem(i)} style={{ padding: '6px 10px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  X
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowForm(false); setForm({ cliente_id: '', notas: '', items: [{ producto_id: '', cantidad: 1 }] }); }} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Creando...' : 'Crear Orden'}
            </button>
          </div>
        </form>
      </Modal>

      {selectedOrden && (
        <div style={{ background: 'var(--card-bg, white)', padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Orden: {selectedOrden.codigo}</h3>
            <button onClick={() => setSelectedOrden(null)} style={{ padding: '6px 12px', background: 'var(--bg-secondary, #e2e8f0)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-primary, #2d3748)' }}>Cerrar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 16 }}>
            <div style={{ color: 'var(--text-primary, #2d3748)' }}><strong>Cliente:</strong> {selectedOrden.cliente_nombre}</div>
            <div style={{ color: 'var(--text-primary, #2d3748)' }}><strong>Documento:</strong> {selectedOrden.numero_documento}</div>
            <div style={{ color: 'var(--text-primary, #2d3748)' }}><strong>Estado:</strong>
              <select value={selectedOrden.estado} onChange={(e) => handleEstadoChange(selectedOrden.id, e.target.value)}
                style={{ marginLeft: 8, padding: '4px 8px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 4, fontSize: 12, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="completada">Completada</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
            <div style={{ color: 'var(--text-primary, #2d3748)' }}><strong>Total:</strong> S/ {parseFloat(selectedOrden.total).toFixed(2)}</div>
          </div>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary, #1a202c)' }}>Detalle</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #e2e8f0)', textAlign: 'left' }}>Producto</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #e2e8f0)', textAlign: 'right' }}>Cantidad</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #e2e8f0)', textAlign: 'right' }}>Precio</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border, #e2e8f0)', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrden.detalle?.map((d, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 12px', color: 'var(--text-primary, #2d3748)' }}>{d.producto_nombre}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-primary, #2d3748)' }}>{d.cantidad}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-primary, #2d3748)' }}>S/ {parseFloat(d.precio_unitario).toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-primary, #2d3748)' }}>S/ {parseFloat(d.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading ? <TableSkeleton rows={6} cols={7} /> : (
        <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Codigo</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Cliente</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Usuario</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Total</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Estado</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Fecha</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{o.codigo}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{o.cliente_nombre}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{o.usuario_nombre}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>S/ {parseFloat(o.total).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: o.estado === 'completada' ? '#c6f6d5' : o.estado === 'anulada' ? '#fed7d7' : o.estado === 'aprobada' ? '#bee3f8' : '#fefcbf',
                        color: o.estado === 'completada' ? '#276749' : o.estado === 'anulada' ? '#9b2c2c' : o.estado === 'aprobada' ? '#2a4365' : '#975a16'
                      }}>
                        {o.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-primary, #2d3748)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => viewOrden(o.id)} style={{ padding: '6px 12px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && !loading && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay ordenes registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onChange={setPage} />
        </div>
      )}

      <Modal
        open={!!confirmEstado}
        onClose={() => setConfirmEstado(null)}
        title="Cambiar Estado"
        onConfirm={confirmEstadoChange}
        confirmText="Confirmar Cambio"
        loading={saving}
      >
        {confirmEstado && (
          <p>¿Estas seguro de cambiar el estado a <strong>{confirmEstado.estado}</strong>?</p>
        )}
      </Modal>
    </div>
  );
}
