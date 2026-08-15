# ================================================================
# Nettoyage — Groupes 1 et 2 uniquement (haute confiance)
# Lance ça depuis la racine de ton projet dans PowerShell.
# Les groupes 3/4 ne sont PAS inclus ici — décide toi-même après
# avoir lu le rapport.
# ================================================================

$fichiers = @(
    # Groupe 1 — code mort confirmé
    "getMoyennesAvancees_v2.js",
    "eleveRoutes_backup.js",
    "eleveMiddleware.js",
    "courseController.js",
    "courseRoutes.js",
    "Prof.sql",
    "alumni_profil_extension.sql",
    "Vue_unifie_codé.sql",
    "moteur_moyennes_bf_cpython-314.pyc",
    "tmp_alumni_script.js",
    "tmp_eleve_script.js",
    "EleveMoyennes.vue",
    "EXEMPLES_API_SURVEILLANTS.js",
    "logs_nodejs.txt",
    "logs_nodejs_error.txt",
    "logs_python.txt",
    "logs_python_error.txt",

    # Groupe 2 — environnement virtuel Python mal placé
    "python.exe",
    "pythonw.exe",
    "pip.exe",
    "pip3.exe",
    "pip3_14.exe",
    "dotenv.exe",
    "idna.exe",
    "uvicorn.exe",
    "typing_extensions.py",
    "pyvenv.cfg",
    "activate",
    "activate.bat",
    "activate.fish",
    "deactivate.bat",
    "Activate.ps1"
)

foreach ($f in $fichiers) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host "Supprimé : $f" -ForegroundColor Green
    } else {
        Write-Host "Introuvable (déjà absent) : $f" -ForegroundColor DarkGray
    }
}

Write-Host "`nTerminé. Vérifie que ton serveur démarre toujours avec 'node server.js' avant de continuer." -ForegroundColor Cyan
