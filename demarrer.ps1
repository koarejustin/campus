#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT DE DÉMARRAGE COMPLET
# Démarre tous les services : API Python + Backend Node.js
# 
# Usage: .\demarrer.ps1
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CAMPUS NUMÉRIQUE - SYSTÈME DE CALCUL DES MOYENNES               ║" -ForegroundColor Cyan
Write-Host "║   Démarrage des services...                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Récupérer le chemin du script
$script_dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $script_dir

Write-Host "`n📁 Dossier de travail: $script_dir" -ForegroundColor Yellow

# ═══════════════════════════════════════════════════════════════════════════════
# 1. DÉMARRER L'API PYTHON (PORT 8001)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n🐍 Démarrage de l'API Python (Port 8001)..." -ForegroundColor Magenta

# Trouver Python dans le virtualenv
$python_exe = ".\.venv\Scripts\python.exe"
if (-Not (Test-Path $python_exe)) {
    # Si virtualenv n'existe pas, utiliser python global
    $python_exe = "python"
    Write-Host "   ⚠️ Virtualenv non trouvé, utilisation de python global" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Virtualenv trouvé: $python_exe" -ForegroundColor Green
}

# Lancer l'API Python en arrière-plan
$python_process = Start-Process -FilePath $python_exe `
    -ArgumentList "services/api_moyennes.py" `
    -WorkingDirectory $script_dir `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput "logs_python.txt" `
    -RedirectStandardError "logs_python_error.txt"

Write-Host "   ✅ API Python lancée (PID: $($python_process.Id))" -ForegroundColor Green
Write-Host "   📋 Logs: logs_python.txt" -ForegroundColor Gray

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# 2. DÉMARRER LE BACKEND NODE.JS (PORT 3000)
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n🟢 Démarrage du Backend Node.js (Port 3000)..." -ForegroundColor Magenta

# Utiliser npm pour lancer le serveur
$node_process = Start-Process -FilePath "npm" `
    -ArgumentList "start" `
    -WorkingDirectory $script_dir `
    -PassThru `
    -NoNewWindow `
    -RedirectStandardOutput "logs_nodejs.txt" `
    -RedirectStandardError "logs_nodejs_error.txt"

Write-Host "   ✅ Backend Node.js lancé (PID: $($node_process.Id))" -ForegroundColor Green
Write-Host "   📋 Logs: logs_nodejs.txt" -ForegroundColor Gray

Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════════
# 3. AFFICHER LE STATUT
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n╔════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ SERVICES DÉMARRÉS AVEC SUCCÈS                                ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  🐍 API Python...................... http://localhost:8001         ║" -ForegroundColor Cyan
Write-Host "║  🟢 Backend Node.js.................. http://localhost:3000        ║" -ForegroundColor Cyan
Write-Host "║                                                                    ║" -ForegroundColor Green
Write-Host "║  📊 Dashboard des moyennes........ http://localhost:3000/eleves   ║" -ForegroundColor Yellow
Write-Host "║                                                                    ║" -ForegroundColor Green
Write-Host "║  🛑 Pour arrêter les services, appuyez sur Ctrl+C                 ║" -ForegroundColor Red
Write-Host "║  📋 Consultez les logs:                                            ║" -ForegroundColor Gray
Write-Host "║     - logs_python.txt                                              ║" -ForegroundColor Gray
Write-Host "║     - logs_nodejs.txt                                              ║" -ForegroundColor Gray
Write-Host "╚════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

# Attendre que Ctrl+C soit pressé
Write-Host "`n⏳ Appuyez sur Ctrl+C pour arrêter tous les services..." -ForegroundColor Yellow

try {
    # Attendre indéfiniment
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    # Nettoyer à la fermeture
    Write-Host "`n`n🛑 Arrêt des services..." -ForegroundColor Red
    
    if ($python_process -and -not $python_process.HasExited) {
        Stop-Process -Id $python_process.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ API Python arrêtée" -ForegroundColor Yellow
    }
    
    if ($node_process -and -not $node_process.HasExited) {
        Stop-Process -Id $node_process.Id -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Backend Node.js arrêté" -ForegroundColor Yellow
    }
    
    Write-Host "`n✨ Services fermés correctement!" -ForegroundColor Green
}
