-- ============================================================
-- ALUMNI - Version corrigée (sans table inexistante)
-- ============================================================

-- 1. Tous les anciens élèves (Alumni)
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    c.est_actif,
    to_char(c.date_creation, 'DD/MM/YYYY') AS date_inscription,
    to_char(c.derniere_connexion, 'DD/MM/YYYY HH24:MI') AS derniere_connexion
FROM authentification.comptes c
WHERE c.role_actuel = 'ALUMNI'
ORDER BY c.nom, c.prenom;

-- 2. Alumni par année de diplôme (si table existe, sinon message)
-- La table gestion_ape.profils_alumni n'existe pas encore
-- Créer la table si besoin :
CREATE TABLE IF NOT EXISTS gestion_ape.profils_alumni (
    id_alumni UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID UNIQUE REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    derniere_classe VARCHAR(50),
    annee_diplome VARCHAR(10),
    situation_actuelle VARCHAR(100),
    profession VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);