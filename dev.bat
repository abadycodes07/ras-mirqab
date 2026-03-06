@echo off
echo ==========================================
echo   🚀 Starting Ras Mirqab Dev Environment
echo ==========================================

:: Start the scraping proxy in a new console window
echo Starting News Proxy...
start "Ras Mirqab Proxy" cmd /c "node proxy.js"

:: Give it a second to start
timeout /t 2 /nobreak > nul

:: Start the web server (Caddy)
echo Starting Web Server...
if exist caddy.exe (
    start "Ras Mirqab Web" cmd /c "caddy.exe file-server --listen :8080"
) else (
    echo [WARNING] caddy.exe not found. Trying node-serve...
    start "Ras Mirqab Web" cmd /c "npx serve -l 8080"
)

:: Open the browser
echo Opening browser...
start http://localhost:8080

echo.
echo Dev environment is RUNNING!
echo Close this window to stop.
pause
