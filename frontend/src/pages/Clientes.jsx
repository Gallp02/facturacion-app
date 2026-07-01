import { useState, useEffect, useCallback } from 'react';
import { clientesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/export';

export default function Clientes() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const isSuperAdmin = usuario?.rol === 'super_admin';
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo_documento: 'DNI', numero_documento: '', nombre: '', email: '', telefono: '', direccion: ''
  });

  const loadData = useCallback(async (p, s) => {
    setLoading(true);
    try {
      const res = await clientesAPI.getAll({ page: p, limit: 20, search: s });
      setClientes(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      addToast('Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(page, search); }, [page]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); loadData(1, search); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numero_documento || !form.nombre) {
      addToast('Numero documento y nombre requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await clientesAPI.update(editing, form);
        addToast('Cliente actualizado', 'success');
      } else {
        await clientesAPI.create(form);
        addToast('Cliente creado', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ tipo_documento: 'DNI', numero_documento: '', nombre: '', email: '', telefono: '', direccion: '' });
      loadData(page, search);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c) => {
    setForm({
      tipo_documento: c.tipo_documento, numero_documento: c.numero_documento,
      nombre: c.nombre, email: c.email || '', telefono: c.telefono || '', direccion: c.direccion || ''
    });
    setEditing(c.id);
    setShowForm(true);
  };

  const openCreate = () => {
    setShowForm(true);
    setEditing(null);
    setForm({ tipo_documento: 'DNI', numero_documento: '', nombre: '', email: '', telefono: '', direccion: '' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ tipo_documento: 'DNI', numero_documento: '', nombre: '', email: '', telefono: '', direccion: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Clientes</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar cliente..." />
          <button onClick={() => exportToCSV(clientes, 'clientes')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
          <button onClick={openCreate} style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            + Nuevo Cliente
          </button>
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Editar Cliente' : 'Nuevo Cliente'} maxWidth={600}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Tipo Documento</label>
              <select value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">CE</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Numero Documento *</label>
              <input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Nombre / Razon Social *</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Telefono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Direccion</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeForm} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Guardando...' : editing ? 'Actualizar Cliente' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {loading ? <TableSkeleton rows={6} cols={6} /> : (
        <div style={{ background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Doc.</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Numero</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Email</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Telefono</th>
                  {isSuperAdmin && <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '10px 16px' }}>{c.tipo_documento}</td>
                    <td style={{ padding: '10px 16px' }}>{c.numero_documento}</td>
                    <td style={{ padding: '10px 16px' }}>{c.nombre}</td>
                    <td style={{ padding: '10px 16px' }}>{c.email || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{c.telefono || '-'}</td>
                    {isSuperAdmin && (
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => openEdit(c)} style={{ padding: '6px 12px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {clientes.length === 0 && !loading && (
                  <tr><td colSpan={isSuperAdmin ? 6 : 5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay clientes registrados</td></tr>
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
