import { useState, useEffect, useCallback, useRef } from 'react';
import { usuariosAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import LoadingBar from '../components/LoadingBar';
import { exportToCSV } from '../utils/export';
import { getCache, setCache } from '../utils/pageCache';

export default function Usuarios() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const isSuperAdmin = usuario?.rol === 'super_admin';
  const cached = getCache('usuarios');
  const [usuarios, setUsuarios] = useState(cached?.usuarios || []);
  const [roles, setRoles] = useState(cached?.roles || []);
  const [loading, setLoading] = useState(!cached);
  const loadedRef = useRef(!!cached);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '', rol_id: '' });

  const loadData = useCallback(async (p, s) => {
    if (loadedRef.current) setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        usuariosAPI.getAll({ page: p, limit: 20, search: s }),
        usuariosAPI.getRoles()
      ]);
      setUsuarios(uRes.data.data);
      setTotal(uRes.data.total);
      setRoles(rRes.data);
      setCache('usuarios', { usuarios: uRes.data.data, total: uRes.data.total, roles: rRes.data });
    } catch (err) {
      addToast('Error al cargar usuarios', 'error');
    } finally {
      loadedRef.current = true;
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
    if (!form.nombre || !form.email || (!editing && !form.password) || !form.rol_id) {
      addToast('Complete todos los campos requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await usuariosAPI.update(editing, { ...form, password: form.password || undefined });
        addToast('Usuario actualizado', 'success');
      } else {
        await usuariosAPI.create(form);
        addToast('Usuario creado', 'success');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ nombre: '', email: '', password: '', telefono: '', rol_id: '' });
      loadData(page, search);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setForm({ nombre: u.nombre, email: u.email, password: '', telefono: u.telefono || '', rol_id: u.rol_id });
    setEditing(u.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await usuariosAPI.delete(confirmDelete.id);
      addToast('Usuario desactivado', 'success');
      setConfirmDelete(null);
      loadData(page, search);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al desactivar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setShowForm(true);
    setEditing(null);
    setForm({ nombre: '', email: '', password: '', telefono: '', rol_id: '' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ nombre: '', email: '', password: '', telefono: '', rol_id: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary, #1a202c)' }}>Usuarios</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => exportToCSV(usuarios, 'usuarios')} title="Exportar CSV"
            style={{ padding: '8px 14px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ⬇ CSV
          </button>
          {isSuperAdmin && (
            <button onClick={openCreate} style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              + Nuevo Usuario
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar usuario..." />
      </div>

      <Modal open={showForm && isSuperAdmin} onClose={closeForm} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} maxWidth={500}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Nombre *</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>{editing ? 'Nuevo Password (opcional)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Telefono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #1a202c)' }}>Rol *</label>
              <select value={form.rol_id} onChange={(e) => setForm({ ...form, rol_id: e.target.value })} required
                style={{ width: '100%', padding: 8, border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)' }}>
                <option value="">Seleccionar rol</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeForm} style={{ padding: '10px 20px', background: 'var(--bg-secondary, #edf2f7)', color: 'var(--text-primary, #2d3748)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#38a169', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {saving ? 'Guardando...' : editing ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <div style={{ position: 'relative' }}>
        {loading && <LoadingBar />}
        {!cached && !loadedRef.current ? null : (
        <div style={{ opacity: loading && loadedRef.current ? 0.5 : 1, transition: 'opacity 0.2s', background: 'var(--card-bg, white)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 600 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f7fafc)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Email</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Rol</th>
                  <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Activo</th>
                  {isSuperAdmin && <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border, #e2e8f0)' }}>Accion</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{u.nombre}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{u.email}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-primary, #2d3748)' }}>{u.rol}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: u.activo ? '#38a169' : '#e53e3e', fontWeight: 600 }}>
                        {u.activo ? 'Si' : 'No'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(u)} style={{ padding: '6px 12px', background: 'var(--bg-secondary, #edf2f7)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                            Editar
                          </button>
                          {u.id !== usuario?.id && (
                            <button onClick={() => setConfirmDelete({ id: u.id, nombre: u.nombre })} style={{ padding: '6px 12px', background: '#fed7d7', color: '#9b2c2c', border: '1px solid #feb2b2', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                              Desactivar
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {usuarios.length === 0 && !loading && (
                  <tr><td colSpan={isSuperAdmin ? 5 : 4} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #a0aec0)' }}>No hay usuarios registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={20} total={total} onChange={setPage} />
        </div>
        )}
      </div>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Desactivar Usuario"
        onConfirm={handleDelete}
        confirmText="Desactivar"
        loading={saving}
      >
        {confirmDelete && <p>¿Estas seguro de desactivar a <strong>{confirmDelete.nombre}</strong>?</p>}
      </Modal>
    </div>
  );
}
