import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportesAPI, prestamosAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3182ce', '#38a169', '#dd6b20', '#e53e3e', '#805ad5', '#d69e2e', '#319795', '#ed64a6'];

const RADIAN = Math.PI / 180;
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const radius = outerRadius * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

const chartStyles = {
  card: {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    padding: 24
  },
  title: {
    margin: '0 0 16px',
    fontSize: 15,
    fontWeight: 700,
    color: '#1a202c'
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    color: '#a0aec0',
    fontSize: 13
  }
};

function ChartCard({ title, data, aspect = 1.5, donut = false }) {
  if (!data || data.length === 0) {
    return (
      <div style={chartStyles.card}>
        <h3 style={chartStyles.title}>{title}</h3>
        <div style={chartStyles.empty}>Sin datos disponibles</div>
      </div>
    );
  }
  return (
    <div style={chartStyles.card}>
      <h3 style={chartStyles.title}>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={donut ? 50 : 0}
            outerRadius={100}
            dataKey="value"
            nameKey="name"
            label={renderLabel}
            labelLine={{ stroke: '#cbd5e0', strokeWidth: 1 }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function CardStat({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'white',
      padding: '20px 24px',
      borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <div style={{ fontSize: 12, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a202c', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState(null);
  const [ventasCat, setVentasCat] = useState([]);
  const [estados, setEstados] = useState([]);
  const [topProd, setTopProd] = useState([]);
  const [tipoFact, setTipoFact] = useState([]);
  const [alertas, setAlertas] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [d, vc, e, tp, tf, a] = await Promise.all([
          reportesAPI.getDashboard(),
          reportesAPI.getVentasPorCategoria(),
          reportesAPI.getEstadoOrdenes(),
          reportesAPI.getTopProductos(),
          reportesAPI.getTipoFactura(),
          prestamosAPI.getAlertas()
        ]);
        setDash(d.data);
        setVentasCat(vc.data);
        setEstados(e.data);
        setTopProd(tp.data);
        setTipoFact(tf.data);
        setAlertas(a.data);
      } catch (err) {
        addToast('Error al cargar dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#718096', marginBottom: 8 }}>Cargando dashboard...</div>
          <div style={{ width: 200, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '40%', height: '100%', background: '#3182ce', borderRadius: 2, animation: 'loadPulse 1.5s infinite' }} />
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Ventas Hoy', value: `S/ ${parseFloat(dash?.ventas_hoy?.total_ventas || 0).toFixed(2)}`, sub: `${dash?.ventas_hoy?.total_ordenes || 0} ordenes`, color: '#3182ce' },
    { label: 'Ordenes Pendientes', value: dash?.ordenes_pendientes || 0, color: '#dd6b20' },
    { label: 'Stock Bajo', value: dash?.productos_bajo_stock || 0, color: '#e53e3e' },
    { label: 'Total Clientes', value: dash?.total_clientes || 0, color: '#38a169' },
  ];

  return (
    <div>
      <style>{`
        @keyframes loadPulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-card { animation: fadeUp 0.4s ease forwards; opacity: 0; }
        .dash-card:nth-child(1) { animation-delay: 0s; }
        .dash-card:nth-child(2) { animation-delay: 0.05s; }
        .dash-card:nth-child(3) { animation-delay: 0.1s; }
        .dash-card:nth-child(4) { animation-delay: 0.15s; }
        .chart-card { animation: fadeUp 0.4s ease forwards; opacity: 0; }
        .chart-card:nth-child(1) { animation-delay: 0.2s; }
        .chart-card:nth-child(2) { animation-delay: 0.25s; }
        .chart-card:nth-child(3) { animation-delay: 0.3s; }
        .chart-card:nth-child(4) { animation-delay: 0.35s; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#1a202c', fontSize: 22, fontWeight: 800 }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#718096' }}>
          Resumen general del sistema
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {cards.map((card, i) => (
          <div key={card.label} className="dash-card">
            <CardStat {...card} />
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: 20
      }}>
        <div className="chart-card">
          <ChartCard title="Ventas por Categoria" data={ventasCat} donut />
        </div>
        <div className="chart-card">
          <ChartCard title="Estado de Ordenes" data={estados} donut />
        </div>
        <div className="chart-card">
          <ChartCard title="Top 5 Productos" data={topProd} />
        </div>
        <div className="chart-card">
          <ChartCard title="Tipo de Factura" data={tipoFact} donut />
        </div>
      </div>

      {dash?.ventas_ultimos_7_dias?.length > 0 && (
        <div className="chart-card" style={{ marginTop: 20 }}>
          <div style={chartStyles.card}>
            <h3 style={chartStyles.title}>Ventas - Ultimos 7 dias</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={dash.ventas_ultimos_7_dias.map(d => ({ name: new Date(d.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }), value: parseFloat(d.total) }))}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                  dataKey="value" nameKey="name"
                  label={renderLabel}
                  labelLine={{ stroke: '#cbd5e0', strokeWidth: 1 }}
                >
                  {dash.ventas_ultimos_7_dias.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  formatter={(value) => `S/ ${parseFloat(value).toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {alertas && (alertas.vencidas?.length > 0 || alertas.proximas?.length > 0) && (
        <div className="chart-card" style={{ marginTop: 20 }}>
          <div style={chartStyles.card}>
            <h3 style={chartStyles.title}>
              Alertas de Morosos
              {alertas.total_vencidas > 0 && (
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#fed7d7', color: '#9b2c2c', verticalAlign: 'middle' }}>
                  {alertas.total_vencidas} vencidas
                </span>
              )}
              {alertas.total_proximas > 0 && (
                <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#fefcbf', color: '#975a16', verticalAlign: 'middle' }}>
                  {alertas.total_proximas} proximas
                </span>
              )}
            </h3>

            {alertas.vencidas.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e53e3e', marginBottom: 8 }}>Cuotas Vencidas</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fff5f5', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fed7d7' }}>Cliente</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fed7d7' }}>N° Origen</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fed7d7' }}>Vencimiento</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fed7d7' }}>Monto</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fed7d7' }}>Dias</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fed7d7' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.vencidas.slice(0, 10).map((c) => {
                      const dias = Math.floor((new Date() - new Date(c.fecha_vencimiento)) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #fed7d7' }}>
                          <td style={{ padding: '6px 10px' }}>{c.cliente_nombre}{c.cliente_apodo ? ` (${c.cliente_apodo})` : ''}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{c.numero_origen}</td>
                          <td style={{ padding: '6px 10px', color: '#e53e3e', fontWeight: 600 }}>{new Date(c.fecha_vencimiento).toLocaleDateString()}</td>
                          <td style={{ padding: '6px 10px' }}>S/ {parseFloat(c.monto).toFixed(2)}</td>
                          <td style={{ padding: '6px 10px', color: '#e53e3e', fontWeight: 600 }}>{dias}d</td>
                          <td style={{ padding: '6px 10px' }}>
                            <button onClick={() => navigate('/morosos')} style={{ padding: '3px 8px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Ir</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {alertas.proximas.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#d69e2e', marginBottom: 8 }}>Proximas a Vencer (7 dias)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#fffff0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fefcbf' }}>Cliente</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fefcbf' }}>N° Origen</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fefcbf' }}>Vencimiento</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fefcbf' }}>Monto</th>
                      <th style={{ padding: '6px 10px', borderBottom: '1px solid #fefcbf' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertas.proximas.slice(0, 10).map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #fefcbf' }}>
                        <td style={{ padding: '6px 10px' }}>{c.cliente_nombre}{c.cliente_apodo ? ` (${c.cliente_apodo})` : ''}</td>
                        <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{c.numero_origen}</td>
                        <td style={{ padding: '6px 10px', color: '#d69e2e', fontWeight: 600 }}>{new Date(c.fecha_vencimiento).toLocaleDateString()}</td>
                        <td style={{ padding: '6px 10px' }}>S/ {parseFloat(c.monto).toFixed(2)}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <button onClick={() => navigate('/morosos')} style={{ padding: '3px 8px', background: '#d69e2e', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Ir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
