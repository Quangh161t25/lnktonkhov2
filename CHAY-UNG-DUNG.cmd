@echo off
setlocal
cd /d "%~dp0"

echo ===================================================
echo   KHO HANG LNK ERP - KHOI DONG HE THONG REACT VITE
echo ===================================================
echo.

where npm >nul 2>nul
if not %errorlevel%==0 (
    echo [LOI] Khong tim thay Node.js va npm tren may tinh cua ban.
    echo Vui long cai dat Node.js tu https://nodejs.org de chay ung dung.
    pause
    exit /b 1
)

echo Dang khoi dong Web Server Vite tai http://localhost:3000 ...
start "LNK Kho ERP Server" /min cmd /c "npm run dev"

timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
endlocal
