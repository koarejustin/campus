@echo off
echo ========================================
echo   CAMPUS NUMERIQUE FASO - Lancement
echo ========================================
echo.

:: Lancer node server.js dans une nouvelle fenetre
start "Serveur Node" cmd /k "cd /d "%~dp0" && node server.js"

:: Attendre 3 secondes que le serveur demarre
timeout /t 3 /nobreak >nul

:: Lancer ngrok dans une nouvelle fenetre
start "Tunnel ngrok" cmd /k "cd /d "%~dp0" && ngrok.exe http 5000"

:: Attendre 4 secondes que ngrok demarre
timeout /t 4 /nobreak >nul

:: Afficher l'URL publique
echo.
echo Recuperation de votre URL publique...
curl -s http://localhost:4040/api/tunnels | findstr /o "public_url"
echo.
echo ========================================
echo  Copiez l'URL ci-dessus et envoyez-la
echo  a vos collaborateurs !
echo ========================================
echo.
pause
