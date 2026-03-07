@echo off
echo ==========================================
echo   ☁️ Ras Mirqab - Cloud Deployment Setup
echo ==========================================
echo.
echo STEP 1: Setting up Git Configuration...
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "Initial Ras Mirqab Commit"
echo.
echo STEP 2: Logging in to GitHub...
echo (Follow the prompts in this window to log in via browser)
echo.
"C:\Program Files\GitHub CLI\gh.exe" auth login

echo.
echo STEP 3: Creating your GitHub repository and uploading...
echo.
"C:\Program Files\GitHub CLI\gh.exe" repo create ras-mirqab --public --source=. --remote=origin --push

echo.
echo ==========================================
echo   ✅ SUCCESS! Your project is on GitHub.
echo ==========================================
echo You can now host the frontend on GitHub Pages for free!
echo Read the DEPLOYMENT_GUIDE.md file for instructions on how to put the scraper online.
echo.
pause
