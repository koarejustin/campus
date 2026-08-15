# ================================================================
# Nettoyage — Groupe 3 (documentation redondante)
# Sans risque : ce sont uniquement des fichiers texte/documentation,
# rien qui touche au fonctionnement de l'appli.
# ================================================================

$fichiers = @(
    "00_LIRE_D_ABORD.txt",
    "ALLEZ_Y.txt",
    "CHECKLIST_VERIFICATION.md",
    "COMMANDES_POWERSHELL.txt",
    "DEMARRAGE_MANUEL_WINDOWS.md",
    "DEMARRER_EN_3_ETAPES.txt",
    "DEMARRER_MAINTENANT.txt",
    "DOCUMENTATION_MOYENNES.md",
    "DOCUMENTATION_SURVEILLANTS.md",
    "D_OU_VENAIENT_LES_ERREURS.md",
    "FINAL_STATUS.txt",
    "GUIDE_DEMARRAGE.md",
    "INDEX_FICHIERS.md",
    "LIRE_MOI_DABORD.txt",
    "QUICK_START.md",
    "README_DEMARRAGE.txt",
    "README_MOYENNES.md",
    "RESOLUTION_COMPLETE.md",
    "RESUME_COURT.txt",
    "RESUME_FINAL.md",
    "RESUME_INTEGRATION.md",
    "STATUS_RESUME.txt"
)

foreach ($f in $fichiers) {
    if (Test-Path $f) {
        Remove-Item $f -Force
        Write-Host "Supprime : $f" -ForegroundColor Green
    } else {
        Write-Host "Introuvable (deja absent) : $f" -ForegroundColor DarkGray
    }
}

Write-Host "`nTermine. cahier_de_charge.docx et le cahier des charges progressif restent tes seules references maintenant." -ForegroundColor Cyan
