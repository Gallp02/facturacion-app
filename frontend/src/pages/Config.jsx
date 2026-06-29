import { useState, useEffect } from 'react';
import { configAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Config() {
  const { addToast } = useToast();
  const { usuario } = useAuth();
  const isSuperAdmin = usuario?.rol === 'super_admin';
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await configAPI.getAll();
        setConfig(res.data);
      } catch (err) {
        addToast('Error al cargar configuracion', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (clave, valor) => {
    setConfig({ ...config, [clave]: valor });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await configAPI.update(config);
      addToast('Configuracion guardada correctamente', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al guardar configuracion', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: 'var(--text-secondary, #718096)' }}>Cargando...</div>;

  const fields = [
    { clave: 'serie_boleta', label: 'Serie Boleta' },
    { clave: 'serie_factura', label: 'Serie Factura' },
    { clave: 'correlativo_boleta', label: 'Correlativo Boleta' },
    { clave: 'correlativo_factura', label: 'Correlativo Factura' },
    { clave: 'igv_porcentaje', label: 'IGV %' },
    { clave: 'empresa_ruc', label: 'RUC Empresa' },
    { clave: 'empresa_razon_social', label: 'Razon Social' },
    { clave: 'empresa_direccion', label: 'Direccion' },
  ];

  if (!isSuperAdmin) {
    return (
      <div>
        <h1 style={{ margin: '0 0 16px', color: 'var(--text-primary, #1a202c)' }}>Configuracion</h1>
        <div style={{
          background: 'var(--card-bg, white)', padding: 40, borderRadius: 12,
          textAlign: 'center', color: 'var(--text-secondary, #a0aec0)', fontSize: 14
        }}>
          No tienes permisos para modificar la configuracion.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 24, color: 'var(--text-primary, #1a202c)' }}>Configuracion</h1>

      <form onSubmit={handleSubmit} style={{ background: 'var(--card-bg, white)', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {fields.map((f) => (
            <div key={f.clave}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #2d3748)' }}>
                {f.label}
              </label>
              <input
                value={config[f.clave] || ''}
                onChange={(e) => handleChange(f.clave, e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 14,
                  boxSizing: 'border-box', background: 'var(--card-bg, white)', color: 'var(--text-primary, #2d3748)'
                }}
              />
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving} style={{
          marginTop: 24, padding: '12px 32px',
          background: saving ? '#a0aec0' : '#3182ce', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer'
        }}>
          {saving ? 'Guardando...' : 'Guardar Configuracion'}
        </button>
      </form>
    </div>
  );
}
