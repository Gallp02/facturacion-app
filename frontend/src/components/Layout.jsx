import { useState, useMemo } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useEmpresa } from '../context/EmpresaContext';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '📊', roles: ['super_admin', 'admin'] },
  { path: '/ordenes', label: 'Ordenes', icon: '📋', roles: ['super_admin', 'admin', 'secretaria'] },
  { path: '/facturas', label: 'Facturacion', icon: '🧾', roles: ['super_admin', 'admin', 'secretaria'] },
  { path: '/productos', label: 'Productos', icon: '📦', roles: ['super_admin', 'admin', 'secretaria', 'almacen'] },
  { path: '/clientes', label: 'Clientes', icon: '👥', roles: ['super_admin', 'admin', 'secretaria'] },
  { path: '/morosos', label: 'Morosos', icon: '💰', roles: ['super_admin', 'admin', 'secretaria'] },
  { path: '/movimientos-stock', label: 'Mov. Stock', icon: '📦', roles: ['super_admin', 'admin', 'almacen'] },
  { path: '/auditoria', label: 'Auditoria', icon: '📜', roles: ['super_admin', 'admin'] },
  { path: '/usuarios', label: 'Usuarios', icon: '🔐', roles: ['super_admin', 'admin'] },
  { path: '/empresas', label: 'Empresas', icon: '🏢', roles: ['super_admin'] },
  { path: '/config', label: 'Configuracion', icon: '⚙️', roles: ['super_admin'] },
  { path: '/reportes', label: 'Reportes', icon: '📈', roles: ['super_admin', 'admin', 'contador'] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { empresas, selectedEmpresa, selectEmpresa } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dateStr = useMemo(() => new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }), []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredMenu = menuItems.filter(
    (item) => item.roles.includes(usuario?.rol)
  );

  const sidebarContent = (
    <>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        textAlign: sidebarOpen ? 'left' : 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: sidebarOpen ? 100 : 32,
              height: 'auto',
              borderRadius: 4,
              objectFit: 'contain',
              flexShrink: 0
            }}
          />
          {sidebarOpen && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
                J & R inversiones
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1.2 }}>
                JIPPI e.i.r.l.
              </div>
            </div>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {filteredMenu.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', marginBottom: 2, borderRadius: 8,
                textDecoration: 'none',
                color: active ? 'white' : 'rgba(255,255,255,0.7)',
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontSize: 14, fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {sidebarOpen && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{usuario?.nombre}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{usuario?.rol}</div>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: '100%', padding: '8px', background: 'rgba(255,255,255,0.1)',
            color: 'white', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, marginBottom: 8
          }}
        >
          {sidebarOpen ? '◁ Colapsar' : '▷'}
        </button>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '8px', background: 'rgba(239,68,68,0.8)',
          color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
        }}>
          {sidebarOpen ? 'Cerrar Sesion' : 'X'}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: sidebarOpen ? 240 : 60,
        background: 'linear-gradient(180deg, #0f1f3a 0%, #1e3a5f 100%)',
        color: 'white', transition: 'width 0.2s',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50
      }}>
        {sidebarContent}
      </aside>

      <div style={{
        marginLeft: sidebarOpen ? 240 : 60,
        flex: 1, transition: 'margin-left 0.2s',
        minWidth: 0
      }}>
        <header style={{
          background: 'var(--card-bg, white)',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer',
                color: 'var(--text-primary, #1a202c)', padding: 4
              }}
              className="mobile-menu-btn"
            >
              ☰
            </button>
            <div style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
              {dateStr}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedEmpresa && (
              <select
                value={selectedEmpresa.id}
                onChange={(e) => {
                  const emp = empresas.find(e => e.id === parseInt(e.target.value));
                  if (emp) selectEmpresa(emp);
                }}
                style={{
                  background: 'var(--bg-secondary, #edf2f7)', border: 'none',
                  borderRadius: 8, padding: '6px 10px', fontSize: 12,
                  color: 'var(--text-primary, #1a202c)', cursor: 'pointer',
                  maxWidth: 180
                }}
                title="Empresa activa"
              >
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                ))}
              </select>
            )}
            <button
              onClick={toggle}
              title={dark ? 'Modo claro' : 'Modo oscuro'}
              style={{
                background: 'var(--bg-secondary, #edf2f7)', border: 'none',
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                fontSize: 16, lineHeight: 1
              }}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>{usuario?.nombre}</span>
            <span style={{
              background: '#dbeafe', color: '#1e3a5f', padding: '4px 8px',
              borderRadius: 12, fontSize: 11, fontWeight: 600
            }}>
              {usuario?.rol}
            </span>
          </div>
        </header>

        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.4)',
              display: 'none'
            }}
            className="mobile-overlay"
          >
            <div onClick={(e) => e.stopPropagation()} style={{
              width: 260, height: '100vh', background: 'linear-gradient(180deg, #0f1f3a 0%, #1e3a5f 100%)',
              padding: 16
            }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>×</button>
              </div>
              {filteredMenu.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
                    borderRadius: 8, textDecoration: 'none',
                    color: location.pathname === item.path ? 'white' : 'rgba(255,255,255,0.7)',
                    background: location.pathname === item.path ? 'rgba(255,255,255,0.15)' : 'transparent',
                    fontSize: 14, marginBottom: 4
                  }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <main style={{ padding: 24, background: 'var(--bg-main, #f8fafc)', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .mobile-overlay { display: block !important; }
          main > div { margin-left: 0 !important; }
          header > div:first-child > div:first-child { display: block !important; }
        }
      `}</style>
    </div>
  );
}
