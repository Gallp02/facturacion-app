import { useState, useEffect } from 'react';
import { empresasAPI } from '../services/api';
import { useEmpresa } from '../context/EmpresaContext';
import { useToast } from '../context/ToastContext';

export default function Empresas() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const { loadEmpresas } = useEmpresa();
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await empresasAPI.getAll();
      setList(res.data);
    } catch {
      addToast('Error al cargar empresas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicion = (empresa) => {
    setEditando(empresa.id);
    setForm({ ...empresa });
  };

  const guardar = async (id) => {
    try {
      await empresasAPI.update(id, form);
      addToast('Empresa actualizada', 'success');
      setEditando(null);
      load();
      loadEmpresas();
    } catch {
      addToast('Error al actualizar', 'error');
    }
  };

  const crear = async () => {
    try {
      await empresasAPI.create(form);
      addToast('Empresa creada', 'success');
      setForm({ ruc: '', razon_social: '', direccion: '', serie_boleta: 'B001', serie_factura: 'F001' });
      load();
      loadEmpresas();
    } catch {
      addToast('Error al crear empresa', 'error');
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>;

  const styles = {
    container: {
      background: 'var(--card-bg, white)', borderRadius: 12, padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid var(--border, #e2e8f0)'
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--border, #e2e8f0)', color: 'var(--text-secondary, #64748b)', fontWeight: 600 },
    td: { padding: '8px 12px', borderBottom: '1px solid var(--border, #e2e8f0)' },
    input: { width: '100%', padding: '6px 8px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 6, fontSize: 13, background: 'var(--input-bg, white)', color: 'var(--text-primary, #1a202c)' },
    btn: { padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16, color: 'var(--text-primary, #1a202c)' }}>Gestion de Empresas</h2>

      <div style={{ ...styles.container, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-primary, #1a202c)' }}>Nueva Empresa</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 100px auto', gap: 8, alignItems: 'end' }}>
          <input placeholder="RUC" value={form.ruc || ''} onChange={e => setForm({ ...form, ruc: e.target.value })} style={styles.input} />
          <input placeholder="Razon Social" value={form.razon_social || ''} onChange={e => setForm({ ...form, razon_social: e.target.value })} style={styles.input} />
          <input placeholder="Direccion" value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} style={styles.input} />
          <input placeholder="Serie Boleta" value={form.serie_boleta || 'B001'} onChange={e => setForm({ ...form, serie_boleta: e.target.value })} style={styles.input} />
          <input placeholder="Serie Factura" value={form.serie_factura || 'F001'} onChange={e => setForm({ ...form, serie_factura: e.target.value })} style={styles.input} />
          <button onClick={crear} style={{ ...styles.btn, background: '#1e3a5f', color: 'white' }}>Crear</button>
        </div>
      </div>

      <div style={styles.container}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>RUC</th>
              <th style={styles.th}>Razon Social</th>
              <th style={styles.th}>Direccion</th>
              <th style={styles.th}>S. Boleta</th>
              <th style={styles.th}>S. Factura</th>
              <th style={styles.th}>Corr. Bol.</th>
              <th style={styles.th}>Corr. Fac.</th>
              <th style={styles.th}>Activa</th>
              <th style={{ ...styles.th, width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(emp => (
              <tr key={emp.id}>
                {editando === emp.id ? (
                  <>
                    <td style={styles.td}><input value={form.ruc || ''} onChange={e => setForm({ ...form, ruc: e.target.value })} style={styles.input} /></td>
                    <td style={styles.td}><input value={form.razon_social || ''} onChange={e => setForm({ ...form, razon_social: e.target.value })} style={styles.input} /></td>
                    <td style={styles.td}><input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} style={styles.input} /></td>
                    <td style={styles.td}><input value={form.serie_boleta || ''} onChange={e => setForm({ ...form, serie_boleta: e.target.value })} style={styles.input} /></td>
                    <td style={styles.td}><input value={form.serie_factura || ''} onChange={e => setForm({ ...form, serie_factura: e.target.value })} style={styles.input} /></td>
                    <td style={styles.td}><input type="number" value={form.correlativo_boleta || 0} onChange={e => setForm({ ...form, correlativo_boleta: parseInt(e.target.value) || 0 })} style={{ ...styles.input, width: 70 }} /></td>
                    <td style={styles.td}><input type="number" value={form.correlativo_factura || 0} onChange={e => setForm({ ...form, correlativo_factura: parseInt(e.target.value) || 0 })} style={{ ...styles.input, width: 70 }} /></td>
                    <td style={styles.td}>
                      <input type="checkbox" checked={form.activa === 1 || form.activa === true} onChange={e => setForm({ ...form, activa: e.target.checked ? 1 : 0 })} />
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => guardar(emp.id)} style={{ ...styles.btn, background: '#22c55e', color: 'white', marginRight: 4 }}>Guardar</button>
                      <button onClick={() => setEditando(null)} style={{ ...styles.btn, background: '#e2e8f0', color: '#1a202c' }}>Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={styles.td}>{emp.ruc}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{emp.razon_social}</td>
                    <td style={styles.td}>{emp.direccion}</td>
                    <td style={styles.td}>{emp.serie_boleta}</td>
                    <td style={styles.td}>{emp.serie_factura}</td>
                    <td style={styles.td}>{emp.correlativo_boleta}</td>
                    <td style={styles.td}>{emp.correlativo_factura}</td>
                    <td style={styles.td}>{emp.activa ? 'Si' : 'No'}</td>
                    <td style={styles.td}>
                      <button onClick={() => abrirEdicion(emp)} style={{ ...styles.btn, background: '#dbeafe', color: '#1e3a5f' }}>Editar</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
