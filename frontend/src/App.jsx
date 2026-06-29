import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Ordenes from './pages/Ordenes';
import Facturas from './pages/Facturas';
import Usuarios from './pages/Usuarios';
import Config from './pages/Config';
import Reportes from './pages/Reportes';
import MovimientosStock from './pages/MovimientosStock';
import AuditLog from './pages/AuditLog';

function PrivateRoute({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary, #718096)' }}>Cargando...</div>;
  return usuario ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/productos" element={<PrivateRoute><Productos /></PrivateRoute>} />
              <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
              <Route path="/ordenes" element={<PrivateRoute><Ordenes /></PrivateRoute>} />
              <Route path="/facturas" element={<PrivateRoute><Facturas /></PrivateRoute>} />
              <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
              <Route path="/config" element={<PrivateRoute><Config /></PrivateRoute>} />
              <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />
              <Route path="/movimientos-stock" element={<PrivateRoute><MovimientosStock /></PrivateRoute>} />
              <Route path="/auditoria" element={<PrivateRoute><AuditLog /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
