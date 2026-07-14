@echo off
echo ==========================================
echo   Menjalankan Dompetrack (Backend ^& Frontend)
echo ==========================================
echo.

echo [1/2] Menjalankan Backend NestJS...
start powershell -NoExit -Command "cd backend; npm run start:dev"

echo [2/2] Menjalankan Frontend Vite...
start powershell -NoExit -Command "cd frontend; npm run dev"

echo.
echo Aplikasi sedang berjalan di jendela PowerShell baru!
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:3000
echo.
pause
