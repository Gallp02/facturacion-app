const mysql = require('mysql2/promise');
(async () => {
  const d = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'Facturacion2026!', database: 'facturacion_db', multipleStatements: true });

  await d.execute('CREATE TABLE IF NOT EXISTS almacenes (id INT PRIMARY KEY AUTO_INCREMENT, nombre VARCHAR(100) NOT NULL, direccion VARCHAR(255), activo BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
  console.log('tabla almacenes OK');

  await d.execute("INSERT IGNORE INTO almacenes (nombre, direccion) VALUES ('Villa El Salvador', 'Villa El Salvador'), ('Chorrillos', 'Chorrillos')");
  console.log('almacenes insertados OK');

  await d.execute('CREATE TABLE IF NOT EXISTS producto_almacen (id INT PRIMARY KEY AUTO_INCREMENT, producto_id INT NOT NULL, almacen_id INT NOT NULL, stock_cajas INT NOT NULL DEFAULT 0, stock_unitario INT NOT NULL DEFAULT 0, FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE, FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE, UNIQUE KEY uq_prod_alm (producto_id, almacen_id))');
  console.log('tabla producto_almacen OK');

  await d.execute('INSERT INTO producto_almacen (producto_id, almacen_id, stock_cajas, stock_unitario) SELECT id, 1, 0, stock FROM productos WHERE activo = 1 ON DUPLICATE KEY UPDATE stock_unitario = VALUES(stock_unitario)');
  console.log('stock migrado a Villa El Salvador OK');

  try {
    await d.execute('ALTER TABLE movimientos_stock ADD COLUMN almacen_id INT');
    await d.execute('ALTER TABLE movimientos_stock ADD FOREIGN KEY (almacen_id) REFERENCES almacenes(id)');
    console.log('columna almacen_id OK');
  } catch (e) { console.log('almacen_id:', e.message.substring(0, 80)); }

  try {
    await d.execute('ALTER TABLE movimientos_stock ADD COLUMN cajas INT DEFAULT 0');
    console.log('columna cajas OK');
  } catch (e) { console.log('cajas:', e.message.substring(0, 80)); }

  try {
    await d.execute('ALTER TABLE movimientos_stock ADD COLUMN unitario INT DEFAULT 0');
    console.log('columna unitario OK');
  } catch (e) { console.log('unitario:', e.message.substring(0, 80)); }

  await d.end();
  console.log('DB actualizada correctamente');
})();
