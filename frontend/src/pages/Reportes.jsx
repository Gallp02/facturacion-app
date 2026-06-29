import { useState, useEffect } from 'react';
import { reportesAPI } from '../services/api';

export default function Reportes() {
  const [tab, setTab] = useState('usuarios');
  const [ordenesPorUsuario, setOrdenesPorUsuario] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'usuarios') {
      loadOrdenesPorUsuario();
    } else if (tab === 'movimientos') {
      loadMovimientos();
    }
  }, [tab]);

  const loadOrdenesPorUsuario = async () => {
    setLoading(true);
    try {
      const res = await reportesAPI.getOrdenesPorUsuario();
      setOrdenesPorUsuario(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMovimientos = async (filtros = {}) => {
    setLoading(true);
    try {
      const res = await reportesAPI.getMovimientosStock(filtros);
      setMovimientos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 24, color: '#1a202c' }}>Reportes</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'usuarios', label: 'Ventas por Usuario' },
          { key: 'movimientos', label: 'Movimientos de Stock' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px',
            background: tab === t.key ? '#3182ce' : '#edf2f7',
            color: tab === t.key ? 'white' : '#2d3748',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#718096', marginBottom: 16 }}>Cargando...</div>}

      {tab === 'usuarios' && !loading && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Usuario</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Total Ordenes</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Total Ventas</th>
              </tr>
            </thead>
            <tbody>
              {ordenesPorUsuario.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 16px' }}>{u.nombre}</td>
                  <td style={{ padding: '10px 16px' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px' }}>{u.total_ordenes}</td>
                  <td style={{ padding: '10px 16px' }}>S/ {parseFloat(u.total_ventas || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'movimientos' && !loading && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Producto</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Tipo</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Cantidad</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Stock Anterior</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Stock Nuevo</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Usuario</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Referencia</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 16px' }}>{m.producto_nombre}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: m.tipo === 'entrada' ? '#c6f6d5' : m.tipo === 'salida' ? '#fed7d7' : '#fefcbf',
                      color: m.tipo === 'entrada' ? '#276749' : m.tipo === 'salida' ? '#9b2c2c' : '#975a16'
                    }}>
                      {m.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>{m.cantidad}</td>
                  <td style={{ padding: '10px 16px' }}>{m.stock_anterior}</td>
                  <td style={{ padding: '10px 16px' }}>{m.stock_nuevo}</td>
                  <td style={{ padding: '10px 16px' }}>{m.usuario_nombre}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12 }}>{m.referencia || '-'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
