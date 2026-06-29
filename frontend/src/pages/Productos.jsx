import { useState, useEffect, useCallback } from 'react';
import { productosAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/export';

export default function Productos() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const isSuperAdmin = usuario?.rol === 'super_admin';

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '', categoria_id: '',
    precio_venta: '', precio_compra: '', stock: '0', stock_minimo: '5', igv: true
  });

  const loadData = useCallback(async (p = page, s = search) => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        productosAPI.getAll({ page: p, limit: 20, search: s }),
        productosAPI.getCategorias()
      ]);
      setProductos(pRes.data.data);
      setTotal(pRes.data.total);
      setCategorias(cRes.data);
    } catch (err) {
      addToast('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadData(1, search); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.nombre || !form.precio_venta) {
      addToast('Codigo, nombre y precio venta requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await productosAPI.update(editing, form);
        addToast('Producto actualizado', 'success');
      } else {
        await productosAPI.create(form);
        addToast('Producto creado', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ codigo: '', nombre: '', descripcion: '', categoria_id: '', precio_venta: '', precio_compra: '', stock: '0', stock_minimo: '5', igv: true });
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (p) => {
    setForm({
      codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion || '',
      categoria_id: p.categoria_id || '', precio_venta: p.precio_venta,
      precio_compra: p.precio_compra || '', stock: p.stock, stock_minimo: p.stock_minimo, igv: p.igv
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ codigo: '', nombre: '', descripcion: '', categoria_id: '', precio_venta: '', precio_compra: '', stock: '0', stock_minimo: '5', igv: true });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Productos</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar producto..." />
          <button onClick={() => exportToCSV(productos, 'productos')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
          <button onClick={resetForm} style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {showForm ? 'Cancelar' : '+ Nuevo Producto'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--card-bg, white)', padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            <input placeholder="Codigo *" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <input placeholder="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <input placeholder="Descripcion" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }}>
              <option value="">Sin categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input placeholder="Precio Venta *" type="number" step="0.01" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} required
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <input placeholder="Precio Compra" type="number" step="0.01" value={form.precio_compra} onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <input placeholder="Stock Minimo" type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
              style={{ padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13 }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.igv} onChange={(e) => setForm({ ...form, igv: e.target.checked })} />
              Afecto a IGV
            </label>
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 12, padding: '10px 24px', background: saving ? '#a0aec0' : '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Producto'}
          </button>
        </form>
      )}

      {loading ? <TableSkeleton rows={6} cols={7} /> : (
        <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Codigo</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Categoria</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Precio</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Stock</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>IGV</th>
                  {isSuperAdmin && <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>}
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '10px 16px' }}>{p.codigo}</td>
                    <td style={{ padding: '10px 16px' }}>{p.nombre}</td>
                    <td style={{ padding: '10px 16px' }}>{p.categoria_nombre || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>S/ {parseFloat(p.precio_venta).toFixed(2)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: p.stock <= p.stock_minimo ? '#e53e3e' : 'var(--text-primary, #2d3748)', fontWeight: p.stock <= p.stock_minimo ? 700 : 400 }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>{p.igv ? 'Si' : 'No'}</td>
                    {isSuperAdmin && (
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => openEdit(p)} style={{ padding: '6px 12px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {productos.length === 0 && !loading && (
                  <tr><td colSpan={isSuperAdmin ? 7 : 6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay productos registrados</td></tr>
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
