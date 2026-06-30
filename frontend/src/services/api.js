import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const usuariosAPI = {
  getAll: (params) => api.get('/usuarios', { params }),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
  getRoles: () => api.get('/usuarios/roles'),
};

export const productosAPI = {
  getAll: (params) => api.get('/productos', { params }),
  getById: (id) => api.get(`/productos/${id}`),
  create: (data) => api.post('/productos', data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  getCategorias: () => api.get('/productos/categorias/all'),
  getStockBajo: () => api.get('/productos/stock/bajo'),
};

export const clientesAPI = {
  getAll: (params) => api.get('/clientes', { params }),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
};

export const ordenesAPI = {
  getAll: (params) => api.get('/ordenes', { params }),
  getById: (id) => api.get(`/ordenes/${id}`),
  create: (data) => api.post('/ordenes', data),
  updateEstado: (id, estado) => api.put(`/ordenes/${id}/estado`, { estado }),
};

export const facturasAPI = {
  getAll: (params) => api.get('/facturas', { params }),
  getById: (id) => api.get(`/facturas/${id}`),
  create: (data) => api.post('/facturas', data),
  updateEstadoSunat: (id, estado, cdr_xml) => api.put(`/facturas/${id}/estado-sunat`, { estado_sunat: estado, cdr_xml }),
};

export const reportesAPI = {
  getDashboard: () => api.get('/reportes/dashboard'),
  getOrdenesPorUsuario: () => api.get('/reportes/ordenes-por-usuario'),
  getMovimientosStock: (params) => api.get('/reportes/movimientos-stock', { params }),
  getVentasPorCategoria: () => api.get('/reportes/ventas-por-categoria'),
  getEstadoOrdenes: () => api.get('/reportes/estado-ordenes'),
  getTopProductos: () => api.get('/reportes/top-productos'),
  getTipoFactura: () => api.get('/reportes/tipo-factura'),
};

export const configAPI = {
  getAll: () => api.get('/config'),
  update: (data) => api.put('/config', data),
};

export const movimientosStockAPI = {
  getAll: (params) => api.get('/movimientos-stock', { params }),
  getByProducto: (productoId) => api.get(`/movimientos-stock/by-producto/${productoId}`),
  create: (data) => api.post('/movimientos-stock', data),
};

export const empresasAPI = {
  getAll: () => api.get('/empresas'),
  getById: (id) => api.get(`/empresas/${id}`),
  create: (data) => api.post('/empresas', data),
  update: (id, data) => api.put(`/empresas/${id}`, data),
};

export const auditLogAPI = {
  getAll: (params) => api.get('/audit-log', { params }),
  getResumen: () => api.get('/audit-log/resumen'),
};

export default api;
