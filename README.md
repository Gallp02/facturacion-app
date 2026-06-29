# Sistema de Facturacion

Sistema de facturación electrónica con gestión de clientes, productos, órdenes de compra, stock y reportes.

## Tecnologías

- **Backend:** Node.js + Express + MySQL
- **Frontend:** React + Vite
- **Autenticación:** JWT con roles (super_admin, admin, secretaria, almacen, contador)

## Requisitos

- Node.js v18+
- MySQL 8.0

## Instalación Rapida

1. Ejecuta `instalar-cliente.bat` como **ADMINISTRADOR**
2. El script instalara todo automaticamente
3. Accede a `http://localhost:3000`

## Instalacion Manual

```powershell
# 1. Clonar el repositorio
git clone <url-del-repo>
cd facturacion-app

# 2. Configurar base de datos
# Ejecuta database/schema.sql en MySQL

# 3. Configurar .env
copy backend\.env.example backend\.env
# Edita backend\.env con tus datos

# 4. Instalar backend
cd backend
npm install

# 5. Instalar y compilar frontend
cd ..\frontend
npm install
npm run build

# 6. Iniciar con PM2
cd ..\backend
npm install -g pm2
pm2 start src/index.js --name facturacion-api
pm2 save
pm2 startup
```

## Credenciales por Defecto

| Email | Password | Rol |
|-------|----------|-----|
| admin@facturacion.com | admin123 | super_admin |
| admin2@facturacion.com | admin123 | admin |
| secretaria@facturacion.com | admin123 | secretaria |
| almacen@facturacion.com | admin123 | almacen |
| contador@facturacion.com | admin123 | contador |

## Red Local

Cualquier PC en la misma red puede acceder via:
```
http://IP_DEL_SERVIDOR:3000
```
