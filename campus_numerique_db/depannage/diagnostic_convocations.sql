-- ============================================================
-- DIAGNOSTIC - CONVOCATIONS
-- ============================================================

-- 1. Compter les convocations par statut
SELECT 
    CASE 
        WHEN date_convocation < NOW() THEN 'PASSÉES'
        WHEN date_convocation <= NOW() + INTERVAL '7 days' THEN 'URGENTES (7j)'
        ELSE 'À VENIR'
    END AS statut,
    COUNT(*) AS total
FROM gestion.convocations
GROUP BY statut
ORDER BY total DESC;

-- 2. Convocation par élève (top)
SELECT 
    c.code_unique,
    c.nom,
    c.prenom,
    COUNT(*) AS nb_convocations
FROM gestion.convocations conv
JOIN authentification.comptes c ON conv.id_eleve = c.id_user
GROUP BY c.code_unique, c.nom, c.prenom
ORDER BY nb_convocations DESC
LIMIT 10;

-- 3. Voir les convocations à venir
SELECT 
    conv.sujet,
    conv.date_convocation,
    c.code_unique AS eleve,
    c.nom,
    c.prenom,
    pe.classe_actuelle
FROM gestion.convocations conv
JOIN authentification.comptes c ON conv.id_eleve = c.id_user
JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
WHERE conv.date_convocation >= NOW()
ORDER BY conv.date_convocation ASC;