# ================================================================
# Nettoyage — Groupe 4 (confirme apres verification des references)
# mentorat.css et mentorat.js sont EXCLUS ici : ils sont utilises
# par alumni.html et eleve.html, ne pas les supprimer.
# ================================================================

$fichiers = @(
    # Fichiers morts confirmes (aucune reference nulle part)
    "notifications.js",
    "admin.js",
    "eleveRouteMoyennes.js",
    "dashboard_moyennes_frontend.js",
    "bulletin.js",
    "surveillance-forms.js",
    "surveillance-modals.html",

    # Doublons - on garde la version complete, on retire le sous-ensemble
    "Direction_detailler.sql",
    "surveillant_detaillé.sql",

    # Anciennes migrations jamais appliquees
    "migration_moyennes_v2.sql",
    "CREER_TABLES.sql",
    "16b_migration_coefficients.sql"
)

foreach ($f in $fichiers) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host "Supprime : $f" -ForegroundColor Green
    } else {
        Write-Host "Introuvable (deja absent) : $f" -ForegroundColor DarkGray
    }
}

Write-Host "`nTermine. Verifie que node server.js demarre toujours." -ForegroundColor Cyan
