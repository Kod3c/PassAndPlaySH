Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Secret Hitler Multi-Device Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Checking PHP installation..." -ForegroundColor Yellow
try {
    $phpVersion = php --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PHP found!" -ForegroundColor Green
        Write-Host $phpVersion[0] -ForegroundColor Gray
    } else {
        throw "PHP not found"
    }
} catch {
    Write-Host "❌ PHP not found! Please install PHP and add it to your PATH." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host ""
Write-Host "[2/3] Setting up database..." -ForegroundColor Yellow
Set-Location backend
try {
    php init_db.php
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database ready!" -ForegroundColor Green
    } else {
        throw "Database setup failed"
    }
} catch {
    Write-Host "❌ Database setup failed!" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host ""
Write-Host "[3/3] Starting PHP server..." -ForegroundColor Yellow
Write-Host "🚀 Server starting at http://localhost:8000" -ForegroundColor Green
Write-Host "📱 Open pages/play.html in your browser to test" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

php -S localhost:8000 -t .


