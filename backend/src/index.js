const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const usuarioRoutes = require('./routes/usuarios');
const productoRoutes = require('./routes/productos');
const clienteRoutes = require('./routes/clientes');
const ordenRoutes = require('./routes/ordenes');
const facturaRoutes = require('./routes/facturas');
const reporteRoutes = require('./routes/reportes');
const configRoutes = require('./routes/config');
const movimientosStockRoutes = require('./routes/movimientosStock');
const auditLogRoutes = require('./routes/auditLog');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/config', configRoutes);
app.use('/api/movimientos-stock', movimientosStockRoutes);
app.use('/api/audit-log', auditLogRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
