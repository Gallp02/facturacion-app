import { useState, useEffect, useCallback, useRef } from 'react';
import { productosAPI, almacenesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import LoadingBar from '../components/LoadingBar';
import { exportToCSV } from '../utils/export';
import { getCache, setCache } from '../utils/pageCache';

export default function Productos() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const isSuperAdmin = usuario?.rol === 'super_admin';

  const cached = getCache('productos');
  const [productos, setProductos] = useState(cached?.productos || []);
  const [categorias, setCategorias] = useState(cached?.categorias || []);
  const [loading, setLoading] = useState(!cached);
  const loadedRef = useRef(!!cached);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [almacenes, setAlmacenes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProducto, setStockProducto] = useState(null);
  const [stockForm, setStockForm] = useState({ almacen_id: '', stock_cajas: '', stock_unitario: '' });
  const [savingStock, setSavingStock] = useState(false);

  // Advanced filters
  const [filtroIgv, setFiltroIgv] = useState('');
  const [filtroStockMin, setFiltroStockMin] = useState('');
  const [filtroStockMax, setFiltroStockMax] = useState('');
  const [filtroPrecioMin, setFiltroPrecioMin] = useState('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('');

  const [form, setForm] = useState({
    codigo: '', nombre: '', descripcion: '', categoria_id: '',
    precio_venta: '', precio_compra: '', stock: '0', stock_minimo: '5', igv: true
  });

  const buildParams = useCallback((p, s, f, igv, stMin, stMax, prMin, prMax) => {
    const params = { page: p, limit: 20, search: s };
    if (f) params.categoria_id = f;
    if (igv !== '') params.igv = igv;
    if (stMin !== '') params.stock_min = stMin;
    if (stMax !== '') params.stock_max = stMax;
    if (prMin !== '') params.precio_min = prMin;
    if (prMax !== '') params.precio_max = prMax;
    return params;
  }, []);

  const loadData = useCallback(async (p = page, s = search, f = filtroCategoria, igv = filtroIgv, stMin = filtroStockMin, stMax = filtroStockMax, prMin = filtroPrecioMin, prMax = filtroPrecioMax) => {
    if (loadedRef.current) setLoading(true);
    try {
      const params = buildParams(p, s, f, igv, stMin, stMax, prMin, prMax);
      const [pRes, cRes, aRes] = await Promise.all([
        productosAPI.getAll(params),
        productosAPI.getCategorias(),
        almacenesAPI.getAll()
      ]);
      setProductos(pRes.data.data);
      setTotal(pRes.data.total);
      setCategorias(cRes.data);
      setAlmacenes(aRes.data);
      setCache('productos', { productos: pRes.data.data, total: pRes.data.total, categorias: cRes.data });
    } catch (err) {
      addToast('Error al cargar productos', 'error');
    } finally {
      loadedRef.current = true;
      setLoading(false);
    }
  }, [page, search, filtroCategoria, filtroIgv, filtroStockMin, filtroStockMax, filtroPrecioMin, filtroPrecioMax, buildParams]);

  useEffect(() => { loadData(); }, [page, filtroCategoria, filtroIgv, filtroStockMin, filtroStockMax, filtroPrecioMin, filtroPrecioMax]);

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const timer = setTimeout(() => { setPage(1); loadData(1, search, filtroCategoria, filtroIgv, filtroStockMin, filtroStockMax, filtroPrecioMin, filtroPrecioMax); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const resetFilters = () => {
    setSearch('');
    setFiltroCategoria('');
    setFiltroIgv('');
    setFiltroStockMin('');
    setFiltroStockMax('');
    setFiltroPrecioMin('');
    setFiltroPrecioMax('');
    setPage(1);
  };

  const hasActiveFilters = search || filtroCategoria || filtroIgv !== '' || filtroStockMin || filtroStockMax || filtroPrecioMin || filtroPrecioMax;

  const openStockModal = (p) => {
    setStockProducto(p);
    setStockForm({ almacen_id: almacenes[0]?.id || '', stock_cajas: '0', stock_unitario: '0' });
    setShowStockModal(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    if (!stockForm.almacen_id) { addToast('Selecciona un almacen', 'error'); return; }
    setSavingStock(true);
    try {
      await almacenesAPI.updateProductoStock(stockProducto.id, stockForm);
      addToast('Stock actualizado', 'success');
      setShowStockModal(false);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al actualizar stock', 'error');
    } finally {
      setSavingStock(false);
    }
  };

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

  const openCreate = () => {
    setShowForm(true);
    setEditing(null);
    setForm({ codigo: '', nombre: '', descripcion: '', categoria_id: '', precio_venta: '', precio_compra: '', stock: '0', stock_minimo: '5', igv: true });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ codigo: '', nombre: '', descripcion: '', categoria_id: '', precio_venta: '', precio_compra: '', stock: '0', stock_minimo: '5', igv: true });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Productos</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => exportToCSV(productos, 'productos')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
          <button onClick={openCreate} style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            + Nuevo Producto
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, codigo, descripcion..." />
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)', cursor: 'pointer' }}>
          <option value="">Todas las categorias</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button onClick={() => setShowFilters(!showFilters)}
          style={{ padding: '8px 14px', background: showFilters ? '#3182ce' : 'var(--bg-secondary, #edf2f7)', color: showFilters ? 'white' : 'var(--text-primary, #2d3748)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
          Filtros
        </button>
        {hasActiveFilters && (
          <button onClick={resetFilters}
            style={{ padding: '8px 14px', background: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {showFilters && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end', padding: 14, background: 'var(--bg-secondary, #f7fafc)', borderRadius: 10, border: '1px solid var(--border, #e2e8f0)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #718096)' }}>IGV</label>
            <select value={filtroIgv} onChange={(e) => setFiltroIgv(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)', cursor: 'pointer', minWidth: 100 }}>
              <option value="">Todos</option>
              <option value="1">Si</option>
              <option value="0">No</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #718096)' }}>Stock minimo</label>
            <input type="number" value={filtroStockMin} onChange={(e) => setFiltroStockMin(e.target.value)} placeholder="0"
              style={{ width: 90, padding: '8px 10px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #718096)' }}>Stock maximo</label>
            <input type="number" value={filtroStockMax} onChange={(e) => setFiltroStockMax(e.target.value)} placeholder="9999"
              style={{ width: 90, padding: '8px 10px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #718096)' }}>Precio minimo</label>
            <input type="number" step="0.01" value={filtroPrecioMin} onChange={(e) => setFiltroPrecioMin(e.target.value)} placeholder="0.00"
              style={{ width: 100, padding: '8px 10px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #718096)' }}>Precio maximo</label>
            <input type="number" step="0.01" value={filtroPrecioMax} onChange={(e) => setFiltroPrecioMax(e.target.value)} placeholder="9999.99"
              style={{ width: 100, padding: '8px 10px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
          </div>
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Editar Producto' : 'Nuevo Producto'} maxWidth={600}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Codigo *</label>
              <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Nombre *</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Categoria</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="">Sin categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Precio Venta *</label>
              <input type="number" step="0.01" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Precio Compra</label>
              <input type="number" step="0.01" value={form.precio_compra} onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Descripcion</label>
              <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Stock</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Stock Minimo</label>
              <input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)', marginBottom: 16 }}>
            <input type="checkbox" checked={form.igv} onChange={(e) => setForm({ ...form, igv: e.target.checked })} />
            Afecto a IGV
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeForm} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Guardando...' : editing ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Modal>

      <div style={{ position: 'relative' }}>
        {loading && <LoadingBar />}
        {!cached && !loadedRef.current ? null : (
        <div style={{ opacity: loading && loadedRef.current ? 0.5 : 1, transition: 'opacity 0.2s', background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 800 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Codigo</th>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Nombre</th>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Categoria</th>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Precio</th>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Stock x Almacen</th>
                    <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>IGV</th>
                    {(usuario?.rol === 'super_admin' || usuario?.rol === 'admin' || usuario?.rol === 'almacen') && <th style={{ padding: '12px 14px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>}
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <td style={{ padding: '10px 14px' }}>{p.codigo}</td>
                      <td style={{ padding: '10px 14px' }}>{p.nombre}</td>
                      <td style={{ padding: '10px 14px' }}>{p.categoria_nombre || '-'}</td>
                      <td style={{ padding: '10px 14px' }}>S/ {parseFloat(p.precio_venta).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        {p.almacenes_stock && p.almacenes_stock.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {p.almacenes_stock.map((pa, i) => {
                              const bajo = (pa.stock_cajas + pa.stock_unitario) <= p.stock_minimo;
                              return (
                                <span key={i} style={{ color: bajo ? '#e53e3e' : 'var(--text-primary, #2d3748)', fontWeight: bajo ? 700 : 400 }}>
                                  {pa.almacen_nombre}: {pa.stock_cajas} cajas / {pa.stock_unitario} uni
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#a0aec0' }}>Sin stock</span>
                        )}
                        <button onClick={() => openStockModal(p)}
                          style={{ marginTop: 4, padding: '2px 8px', background: 'transparent', border: '1px solid var(--border, #e2e8f0)', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary, #718096)' }}>
                          Ajustar
                        </button>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{p.igv ? 'Si' : 'No'}</td>
                      {(usuario?.rol === 'super_admin' || usuario?.rol === 'admin' || usuario?.rol === 'almacen') && (
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => openEdit(p)} style={{ padding: '6px 12px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                            Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {productos.length === 0 && !loading && (
                    <tr><td colSpan={(usuario?.rol === 'super_admin' || usuario?.rol === 'admin' || usuario?.rol === 'almacen') ? 7 : 6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay productos registrados</td></tr>
                  )}
                </tbody>
              </table>
          </div>
          <Pagination page={page} limit={20} total={total} onChange={setPage} />
        </div>
        )}
      </div>
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title={`Ajustar Stock - ${stockProducto?.nombre || ''}`} maxWidth={450}>
        <form onSubmit={handleStockSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Almacen</label>
              <select value={stockForm.almacen_id} onChange={(e) => setStockForm({ ...stockForm, almacen_id: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="">Seleccionar...</option>
                {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Cajas</label>
                <input type="number" value={stockForm.stock_cajas} onChange={(e) => setStockForm({ ...stockForm, stock_cajas: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Unidades</label>
                <input type="number" value={stockForm.stock_unitario} onChange={(e) => setStockForm({ ...stockForm, stock_unitario: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowStockModal(false)}
              style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={savingStock}
              style={{ padding: '10px 24px', background: savingStock ? '#a0aec0' : '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {savingStock ? 'Guardando...' : 'Guardar Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
