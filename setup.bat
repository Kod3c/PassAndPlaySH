@echo off
echo ========================================
echo Secret Hitler Multi-Device Setup
echo ========================================
echo.

echo [1/3] Checking PHP installation...
php --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP not found! Please install PHP and add it to your PATH.
    pause
    exit /b 1
)
echo ✅ PHP found!

echo.
echo [2/3] Setting up database...
cd backend
php init_db.php
if %errorlevel% neq 0 (
    echo ❌ Database setup failed!
    pause
    exit /b 1
)
echo ✅ Database ready!

echo.
echo [3/3] Starting PHP server...
echo 🚀 Server starting at http://localhost:8000
echo 📱 Open pages/play.html in your browser to test
echo.
echo Press Ctrl+C to stop the server
echo.

php -S localhost:8000 -t .



