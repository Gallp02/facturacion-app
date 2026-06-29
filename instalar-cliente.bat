@echo off
title INSTALACION - Sistema de Facturacion
color 0B
echo ============================================
echo  INSTALACION DEL SISTEMA DE FACTURACION
echo ============================================
echo.

:: Verificar que se ejecuta como administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Debes ejecutar este script como ADMINISTRADOR.
    echo Haz clic derecho ^> "Ejecutar como administrador"
    pause
    exit /b 1
)
echo [OK] Administrador detectado
echo.

:: Verificar Node.js
echo [1/7] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js NO instalado.
    echo Descargalo de: https://nodejs.org (v18 o superior)
    echo Usa la version LTS (Long Term Support)
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER%
echo.

:: Verificar npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm no encontrado
    pause
    exit /b 1
)
echo.

:: Verificar MySQL
echo [2/7] Verificando MySQL...
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] MySQL CLI no encontrado en PATH.
    echo Si MySQL esta instalado, asegurate de que el servicio este corriendo.
    echo Puedes verificar en: Servicios ^> MySQL80
    echo.
) else (
    echo [OK] MySQL encontrado
)
echo.

:: Configurar archivo .env
echo [3/7] Configurando archivo .env...
if not exist "%~dp0backend\.env" (
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
    echo [AVISO] Se creo archivo .env desde .env.example
    echo IMPORTANTE: Edita backend\.env con tus datos de MySQL
    echo   - DB_PASSWORD: password de root de MySQL
    echo   - JWT_SECRET: texto aleatorio para seguridad
    echo.
    pause
) else (
    echo [OK] .env ya existe
)
echo.

:: Instalar dependencias backend
echo [4/7] Instalando dependencias del backend...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias del backend
    pause
    exit /b 1
)
echo [OK] Backend listo
echo.

:: Instalar dependencias frontend
echo [5/7] Instalando dependencias del frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias del frontend
    pause
    exit /b 1
)
echo.
echo [6/7] Compilando frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Error compilando frontend
    pause
    exit /b 1
)
echo [OK] Frontend compilado
echo.

:: Configurar PM2
echo [7/7] Configurando servicio permanente (PM2)...
cd /d "%~dp0backend"

:: Instalar PM2 global si no existe
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo Instalando PM2...
    call npm install -g pm2
)

:: Iniciar la aplicacion con PM2
pm2 delete facturacion-api >nul 2>&1
pm2 start src/index.js --name facturacion-api
pm2 save

:: Configurar inicio automatico con Windows
echo.
echo Configurando inicio automatico al encender PC...
pm2 startup

echo.
echo ============================================
echo  INSTALACION COMPLETADA EXITOSAMENTE
echo ============================================
echo.
echo  Accede desde cualquier PC de la red:
echo  http://%COMPUTERNAME%:3000
echo  http://IP_DEL_SERVIDOR:3000
echo.
echo  Usuario: admin@facturacion.com
echo  Password: admin123
echo.
echo  IMPORTANTE: Cambia el password despues del
echo  primer ingreso. Ve a Usuarios ^> Editar.
echo.
echo ============================================
echo.

:: Abrir navegador
start http://localhost:3000

pause
