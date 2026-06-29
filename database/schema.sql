CREATE DATABASE IF NOT EXISTS facturacion_db;
USE facturacion_db;

-- ============================================
-- TABLA: roles
-- ============================================
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  rol_id INT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- ============================================
-- TABLA: clientes
-- ============================================
CREATE TABLE clientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tipo_documento ENUM('DNI', 'RUC', 'CE') NOT NULL DEFAULT 'DNI',
  numero_documento VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  email VARCHAR(150),
  telefono VARCHAR(20),
  direccion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: categorias
-- ============================================
CREATE TABLE categorias (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE productos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_id INT,
  precio_venta DECIMAL(10,2) NOT NULL,
  precio_compra DECIMAL(10,2),
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT DEFAULT 5,
  igv BOOLEAN DEFAULT TRUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- ============================================
-- TABLA: ordenes_compra
-- ============================================
CREATE TABLE ordenes_compra (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NOT NULL,
  usuario_id INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente', 'aprobada', 'completada', 'anulada') DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================
-- TABLA: detalle_orden
-- ============================================
CREATE TABLE detalle_orden (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orden_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ============================================
-- TABLA: facturas
-- ============================================
CREATE TABLE facturas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  serie VARCHAR(4) NOT NULL,
  correlativo INT NOT NULL,
  numero_completo VARCHAR(20) GENERATED ALWAYS AS (CONCAT(serie, '-', LPAD(correlativo, 8, '0'))) STORED,
  orden_id INT,
  cliente_id INT NOT NULL,
  tipo ENUM('boleta', 'factura') NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  igv DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  estado_sunat ENUM('pendiente', 'enviado', 'aceptado', 'rechazado') DEFAULT 'pendiente',
  cdr_xml TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_compra(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

-- ============================================
-- TABLA: movimientos_stock
-- ============================================
CREATE TABLE movimientos_stock (
  id INT PRIMARY KEY AUTO_INCREMENT,
  producto_id INT NOT NULL,
  tipo ENUM('entrada', 'salida', 'ajuste') NOT NULL,
  cantidad INT NOT NULL,
  stock_anterior INT NOT NULL,
  stock_nuevo INT NOT NULL,
  referencia VARCHAR(100),
  usuario_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX idx_ordenes_estado ON ordenes_compra(estado);
CREATE INDEX idx_ordenes_usuario ON ordenes_compra(usuario_id);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX idx_movimientos_producto ON movimientos_stock(producto_id);

-- ============================================
-- INSERTAR ROLES BASE
-- ============================================
INSERT INTO roles (nombre, descripcion) VALUES
('super_admin', 'Acceso total al sistema'),
('admin', 'Gestiona secretarias, reportes, tracking'),
('secretaria', 'Emite boletas/facturas, genera ordenes'),
('almacen', 'Gestiona stock, entrada/salida de productos'),
('contador', 'Reportes exportables, solo lectura');

-- ============================================
-- INSERTAR USUARIO ADMIN POR DEFECTO
-- ============================================
-- Password: admin123 (cambiarlo en produccion)
INSERT INTO usuarios (nombre, email, password, rol_id) VALUES
('Administrador', 'admin@facturacion.com', '$2b$10$spUim1imFbsom6dtRTjdTOYekjMdLizPxnvpoVSaUeZpsqIh9u4Iq', 1);

-- ============================================
-- INSERTAR CATEGORIAS POR DEFECTO
-- ============================================
INSERT INTO categorias (nombre) VALUES
('General'),
('Electrónicos'),
('Ropa y Accesorios'),
('Alimentos y Bebidas'),
('Servicios');

-- ============================================
-- TABLA: audit_log (registro de acciones)
-- ============================================
CREATE TABLE audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  usuario_nombre VARCHAR(100),
  accion VARCHAR(50) NOT NULL,
  tabla VARCHAR(50) NOT NULL,
  registro_id INT,
  detalle TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_tabla ON audit_log(tabla);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);

-- ============================================
-- CONFIGURACION INICIAL SERIE FACTURACION
-- ============================================
CREATE TABLE configuracion (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clave VARCHAR(50) NOT NULL UNIQUE,
  valor VARCHAR(255) NOT NULL
);

INSERT INTO configuracion (clave, valor) VALUES
('serie_boleta', 'B001'),
('serie_factura', 'F001'),
('correlativo_boleta', '1'),
('correlativo_factura', '1'),
('igv_porcentaje', '18'),
('empresa_ruc', ''),
('empresa_razon_social', 'J & R inversiones JIPPI e.i.r.l.'),
('empresa_direccion', '');
