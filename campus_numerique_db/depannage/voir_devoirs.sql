-- ============================================================
-- VOIR LES DEVOIRS (annonces de devoirs par les profs)
-- ============================================================

SELECT
    d.titre, d.matiere, d.classe, d.date_limite, d.est_visible,
    p.nom AS nom_prof, p.prenom AS prenom_prof
FROM pedagogie.devoirs d
JOIN authentification.comptes p ON p.id_user = d.id_prof
ORDER BY d.date_creation DESC;

-- Devoirs à venir (date limite pas encore passée)
SELECT titre, matiere, classe, date_limite
FROM pedagogie.devoirs
WHERE date_limite >= CURRENT_DATE
ORDER BY date_limite ASC;
