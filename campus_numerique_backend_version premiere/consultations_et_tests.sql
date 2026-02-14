-- ==========================================================
-- SCRIPT DE CONSULTATION ET MAINTENANCE - ÉCOLE NUM
-- ==========================================================

-- 1. SAVOIR QUEL ÉLÈVE FAIT QUELLE CLASSE
-- Cette requête joint les comptes avec leurs profils scolaires
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    p.classe_actuelle
FROM authentification.comptes c
JOIN vie_scolaire.profils_eleves p ON c.id_user = p.id_user
WHERE c.role_actuel = 'ELEVE'
ORDER BY p.classe_actuelle;


-- 2. RÉINITIALISER UN ÉLÈVE POUR ACTIVATION (ÉTAPE CRUCIALE)
-- À faire AVANT de tester la connexion sur le site
UPDATE authentification.comptes 
SET mot_de_passe = 'NON_ACTIVE' 
WHERE code_unique = 'CN-2026-2009'; -- Remplace par le matricule trouvé en (1)


-- 3. VOIR QUEL PARENT EST LIÉ À QUEL ENFANT
-- Utile pour tester l'Espace Parent
SELECT 
    p.nom as nom_parent, 
    p.prenom as prenom_parent,
    e.nom as nom_enfant,
    e.prenom as prenom_enfant,
    pe.classe_actuelle as classe_enfant
FROM authentification.comptes p
JOIN vie_scolaire.relations_parents_eleves r ON p.id_user = r.id_parent
JOIN authentification.comptes e ON r.id_eleve = e.id_user
JOIN vie_scolaire.profils_eleves pe ON e.id_user = pe.id_user;


-- 4. RÉINITIALISER TOUT LE MONDE D'UN COUP
-- Pour forcer l'activation de tous les comptes du système
UPDATE authentification.comptes 
SET mot_de_passe = 'NON_ACTIVE';


-- 5. VÉRIFICATION RAPIDE DU STATUT DE CONNEXION
SELECT 
    code_unique, 
    role_actuel,
    CASE 
        WHEN mot_de_passe = 'NON_ACTIVE' THEN '🔴 ATTENTE ACTIVATION'
        ELSE '🟢 ACTIVÉ (HASHÉ)'
    END as statut
FROM authentification.comptes;


-- 1. Création de la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS vie_scolaire.relations_parents_eleves (
    id_relation UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_parent UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    id_eleve UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    lien_parente VARCHAR(50), -- ex: Père, Mère, Tuteur
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ajout d'un test : Lier un parent à Jonathan BONNET
-- On cherche d'abord un parent dans ta base
INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente)
SELECT 
    (SELECT id_user FROM authentification.comptes WHERE role_actuel = 'PARENT' LIMIT 1),
    (SELECT id_user FROM authentification.comptes WHERE code_unique = 'CN-2026-2009'),
    'Père'
ON CONFLICT DO NOTHING;


UPDATE authentification.comptes 
SET mot_de_passe = 'NON_ACTIVE' 
WHERE TRIM(code_unique) ILIKE 'CN-2026-2300';