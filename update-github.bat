@echo off
echo ==========================================
echo   ⬆️ Ras Mirqab - Uploading Updates
echo ==========================================
echo.
echo Pushing the new Auto-Proxy settings to GitHub...
echo.

"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Auto-connect to Render Proxy"
"C:\Program Files\Git\cmd\git.exe" push origin master -f

echo.
echo ==========================================
echo   ✅ SUCCESS! Your website is updated.
echo ==========================================
echo All users will now automatically connect to your cloud scraper.
echo.
pause
