Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Menjalankan Dompetrack (Backend & Frontend)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Menjalankan Backend NestJS..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; npm run start:dev`""

Write-Host "[2/2] Menjalankan Frontend Vite..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; npm run dev`""

Write-Host ""
Write-Host "Aplikasi sedang berjalan di jendela PowerShell baru!" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "- Backend: http://localhost:3000" -ForegroundColor Green
Write-Host ""
