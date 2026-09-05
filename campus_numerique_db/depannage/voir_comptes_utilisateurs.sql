-- ============================================================
-- GESTION DES COMPTES
-- ============================================================

-- 1. Tous les comptes avec statut
SELECT 
    code_unique AS matricule,
    nom,
    prenom,
    role_actuel AS rôle,
    email,
    telephone,
    CASE 
        WHEN mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut,
    est_actif,
    date_creation,
    derniere_connexion
FROM authentification.comptes
ORDER BY role_actuel, nom, prenom;

-- 2. Compter par rôle
SELECT 
    role_actuel,
    COUNT(*) AS total,
    SUM(CASE WHEN est_actif THEN 1 ELSE 0 END) AS actifs,
    SUM(CASE WHEN mot_de_passe = 'NON_ACTIVE' THEN 1 ELSE 0 END) AS à_activer
FROM authentification.comptes
GROUP BY role_actuel
ORDER BY total DESC;

-- 3. Utilisateurs inactifs (plus de 6 mois sans connexion)
SELECT 
    code_unique,
    nom,
    prenom,
    role_actuel,
    derniere_connexion,
    date_creation
FROM authentification.comptes
WHERE derniere_connexion < NOW() - INTERVAL '6 months'
   OR (derniere_connexion IS NULL AND date_creation < NOW() - INTERVAL '6 months')
ORDER BY derniere_connexion NULLS LAST;