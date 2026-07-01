import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { EmpresaProvider } from './context/EmpresaContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Ordenes from './pages/Ordenes';
import Facturas from './pages/Facturas';
import Usuarios from './pages/Usuarios';
import Empresas from './pages/Empresas';
import Config from './pages/Config';
import Reportes from './pages/Reportes';
import MovimientosStock from './pages/MovimientosStock';
import AuditLog from './pages/AuditLog';

function PrivateRoute() {
  const { usuario, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #718096)' }}>Cargando...</div>;
  return usuario ? <EmpresaProvider><Outlet /></EmpresaProvider> : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/productos" element={<Productos />} />
                  <Route path="/clientes" element={<Clientes />} />
                  <Route path="/ordenes" element={<Ordenes />} />
                  <Route path="/facturas" element={<Facturas />} />
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/config" element={<Config />} />
                  <Route path="/empresas" element={<Empresas />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/movimientos-stock" element={<MovimientosStock />} />
                  <Route path="/auditoria" element={<AuditLog />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
