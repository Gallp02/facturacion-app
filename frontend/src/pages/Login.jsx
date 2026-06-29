import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      addToast(`Bienvenido ${user.nombre}`, 'success');
      if (user.rol === 'super_admin' || user.rol === 'admin') {
        navigate('/');
      } else if (user.rol === 'secretaria') {
        navigate('/ordenes');
      } else if (user.rol === 'almacen') {
        navigate('/productos');
      } else {
        navigate('/');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al iniciar sesion', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f1f3a 0%, #1e3a5f 50%, #2563eb 100%)'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-30%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-40%',
          left: '-20%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: 400 }}>
          <img
            src="/logo.png"
            alt="J & R inversiones JIPPI"
            style={{
              width: 300,
              maxWidth: '85%',
              height: 'auto',
              marginBottom: 20,
              filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
            }}
          />
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.5px'
          }}>
            J & R inversiones
          </h1>
          <p style={{
            margin: '4px 0 0',
            fontSize: 15,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.6)'
          }}>
            JIPPI e.i.r.l.
          </p>
          <p style={{
            margin: '20px 0 0',
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6
          }}>
            Sistema integral de facturacion electronica y gestion empresarial
          </p>
        </div>
      </div>

      <div style={{
        width: 440,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40
      }}>
        <div style={{
          background: 'white',
          padding: 40,
          borderRadius: 20,
          width: '100%',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img
              src="/logo.png"
              alt="Logo"
              style={{
                width: 80,
                height: 'auto',
                borderRadius: 8,
                margin: '0 auto 12px',
                objectFit: 'contain'
              }}
            />
            <h2 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#1e3a5f'
            }}>
              J & R inversiones JIPPI
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#718096' }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155'
              }}>
                Correo electronico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@facturacion.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155'
              }}>
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contrasena"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesion'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 12,
            color: '#94a3b8'
          }}>
            Sistema de Gestion v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
