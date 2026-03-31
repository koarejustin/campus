-- ============================================================
-- DIRECTION - Liste complète
-- ============================================================

-- 1. Tous les directeurs
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    adm.poste_occupe AS fonction,
    adm.signature_numerique_active AS signature_active,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    c.est_actif,
    to_char(c.date_creation, 'DD/MM/YYYY') AS date_inscription,
    to_char(c.derniere_connexion, 'DD/MM/YYYY HH24:MI') AS derniere_connexion
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION'
ORDER BY adm.poste_occupe, c.nom, c.prenom;

-- 2. Compter la direction
SELECT 
    COUNT(*) AS total,
    SUM(CASE WHEN c.est_actif THEN 1 ELSE 0 END) AS actifs,
    SUM(CASE WHEN c.mot_de_passe = 'NON_ACTIVE' THEN 1 ELSE 0 END) AS a_activer
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION';