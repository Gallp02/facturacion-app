@echo off
title Instalacion - Sistema de Facturacion
echo ============================================
echo  Instalando Sistema de Facturacion
echo ============================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo de: https://nodejs.org (v18+)
    pause
    exit /b 1
)
echo [OK] Node.js encontrado: 
node --version

:: Verificar MySQL
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] MySQL CLI no encontrado.
    echo Asegurate de tener MySQL instalado.
    echo Si usas XAMPP, abre el panel y asegurate que MySQL este corriendo.
    echo.
)

:: Instalar dependencias del backend
echo.
echo [1/4] Instalando dependencias del backend...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias del backend
    pause
    exit /b 1
)
echo [OK] Backend listo

:: Crear base de datos
echo.
echo [2/4] Creando base de datos...
echo Nota: Necesitas tu password de MySQL (root)
mysql -u root -p < "%~dp0database\schema.sql"
if %errorlevel% neq 0 (
    echo [AVISO] No se pudo ejecutar el script SQL automaticamente.
    echo Abre MySQL Workbench y ejecuta el archivo:
    echo %~dp0database\schema.sql
)

:: Construir frontend
echo.
echo [3/4] Construyendo frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Error instalando dependencias del frontend
    pause
    exit /b 1
)
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Error construyendo frontend
    pause
    exit /b 1
)
echo [OK] Frontend listo

:: Iniciar servidor
echo.
echo [4/4] Iniciando servidor...
cd /d "%~dp0backend"
echo Iniciando servidor en segundo plano...
start /B node src/index.js
echo.
echo NOTA: Para detener el servidor usa: taskkill /f /im node.exe

echo.
echo ============================================
echo  Instalacion completada!
echo ============================================
echo.
echo  Accede a la aplicacion:
echo  Local:    http://localhost:3000
echo  Red:      http://%COMPUTERNAME%:3000
echo.
echo  Usuario: admin@facturacion.com
echo  Password: admin123
echo.
echo  IMPORTANTE: Cambia el password despues del primer ingreso.
echo.
pause
