-- ============================================================
-- DIAGNOSTIC - ABSENCES
-- ============================================================

-- 1. Compter les absences par période
SELECT 
    DATE_TRUNC('month', date_absence) AS mois,
    COUNT(*) AS total_absences,
    COUNT(*) FILTER (WHERE justifiee = true) AS justifiees,
    COUNT(*) FILTER (WHERE justifiee = false) AS non_justifiees
FROM gestion.absences
GROUP BY DATE_TRUNC('month', date_absence)
ORDER BY mois DESC;

-- 2. Top 10 des élèves les plus absents
SELECT 
    c.code_unique,
    c.nom,
    c.prenom,
    pe.classe_actuelle,
    COUNT(*) AS nb_absences,
    COUNT(*) FILTER (WHERE justifiee = true) AS justifiees,
    COUNT(*) FILTER (WHERE justifiee = false) AS non_justifiees
FROM gestion.absences a
JOIN authentification.comptes c ON a.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
WHERE a.date_absence >= DATE_TRUNC('year', NOW())
GROUP BY c.code_unique, c.nom, c.prenom, pe.classe_actuelle
ORDER BY nb_absences DESC
LIMIT 10;

-- 3. Voir la taille de la table absences
SELECT 
    pg_size_pretty(pg_total_relation_size('gestion.absences')) AS taille_totale,
    pg_size_pretty(pg_relation_size('gestion.absences')) AS taille_donnees,
    pg_size_pretty(pg_indexes_size('gestion.absences')) AS taille_index;