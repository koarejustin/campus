@echo off
echo ========================================
echo   CAMPUS NUMERIQUE FASO - Lancement local
echo ========================================
echo.
echo Ce script demarre uniquement le serveur en local, pour
echo developper/tester sur cette machine (http://localhost:3000).
echo L'application en production reste accessible en permanence
echo sur https://campus-1-v4kf.onrender.com — pas besoin de tunnel.
echo.

node server.js
