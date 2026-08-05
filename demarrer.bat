@echo off
REM ═══════════════════════════════════════════════════════════════════════════════
REM SCRIPT DE DÉMARRAGE COMPLET (Windows CMD)
REM Démarre tous les services : API Python + Backend Node.js
REM
REM Cliquez sur ce fichier ou lancez: demarrer.bat
REM ═══════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion
chcp 65001 > nul

echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║   CAMPUS NUMÉRIQUE - SYSTÈME DE CALCUL DES MOYENNES               ║
echo ║   Démarrage des services...                                        ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.

REM Récupérer le dossier courant
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo 📁 Dossier de travail: %cd%
echo.

REM ═══════════════════════════════════════════════════════════════════════════════
REM 1. DÉMARRER L'API PYTHON (PORT 8001)
REM ═══════════════════════════════════════════════════════════════════════════════
echo 🐍 Démarrage de l'API Python (Port 8001)...
echo   Cherche Python dans virtualenv...

if exist ".venv\Scripts\python.exe" (
    set PYTHON_EXE=.\.venv\Scripts\python.exe
    echo   ✅ Virtualenv trouvé: %PYTHON_EXE%
) else (
    set PYTHON_EXE=python
    echo   ⚠️ Virtualenv non trouvé, utilisation de python global
)

start "API Python" /min cmd /c "%PYTHON_EXE% services/api_moyennes.py" 2>>logs_python_error.txt 1>>logs_python.txt
echo   ✅ API Python lancée
echo   📋 Logs: logs_python.txt

timeout /t 2 > nul

REM ═══════════════════════════════════════════════════════════════════════════════
REM 2. DÉMARRER LE BACKEND NODE.JS (PORT 3000)
REM ═══════════════════════════════════════════════════════════════════════════════
echo.
echo 🟢 Démarrage du Backend Node.js ^(Port 3000^)...

start "Backend Node.js" /min cmd /c "npm start" 2>>logs_nodejs_error.txt 1>>logs_nodejs.txt
echo   ✅ Backend Node.js lancé
echo   📋 Logs: logs_nodejs.txt

timeout /t 2 > nul

REM ═══════════════════════════════════════════════════════════════════════════════
REM 3. AFFICHER LE STATUT
REM ═══════════════════════════════════════════════════════════════════════════════
cls
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║   ✅ SERVICES DÉMARRÉS AVEC SUCCÈS                                ║
echo ╠════════════════════════════════════════════════════════════════════╣
echo ║  🐍 API Python...................... http://localhost:8001         ║
echo ║  🟢 Backend Node.js.................. http://localhost:3000        ║
echo ║                                                                    ║
echo ║  📊 Dashboard des moyennes........ http://localhost:3000/eleves   ║
echo ║                                                                    ║
echo ║  Vérification de démarrage:                                        ║
echo ║   - Ouvrez http://localhost:8001 dans un navigateur               ║
echo ║   - Vous devriez voir: ^{"status": "ok"^}                          ║
echo ║                                                                    ║
echo ║  Para arrêter les services:                                        ║
echo ║   1. Ouvrez Windows Task Manager ^(Ctrl+Shift+Esc^)               ║
echo ║   2. Trouvez "python.exe" et cliquez "Terminer les tâches"       ║
echo ║   3. Trouvez "node.exe" et cliquez "Terminer les tâches"         ║
echo ║                                                                    ║
echo ║  📋 Consultez les logs:                                            ║
echo ║     - logs_python.txt                                              ║
echo ║     - logs_nodejs.txt                                              ║
echo ║     - logs_python_error.txt                                        ║
echo ║     - logs_nodejs_error.txt                                        ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
pause
