-- ==========================================================
-- SCRIPT DE MAINTENANCE ET TESTS - ÉCOLE NUM
-- ==========================================================

-- 1. RÉINITIALISER UN UTILISATEUR PRÉCIS (ÉTAPE AVANT MOT DE PASSE)
-- Cette commande remplace le mot de passe actuel par 'NON_ACTIVE'
-- Cela force le système à demander un nouveau mot de passe au prochain login.
UPDATE authentification.comptes 
SET mot_de_passe = 'NON_ACTIVE' 
WHERE code_unique = 'MATRICULE_ICI'; -- Remplace par le matricule voulu


-- 2. RÉINITIALISER TOUS LES UTILISATEURS EN MODE ACTIVATION
-- Idéal pour tester le flux complet avec plusieurs personnes
UPDATE authentification.comptes 
SET mot_de_passe = 'NON_ACTIVE';


-- 3. AJOUT DE MATIÈRES POUR LES TESTS (TABLE COURS)
-- Pour que le Dashboard de Jonathan ne soit pas vide après connexion
INSERT INTO authentification.cours (titre, description, coefficient) VALUES
('Mathématiques', 'Analyse, Algèbre et Géométrie', 5),
('Physique-Chimie', 'Mécanique et Cinétique Chimique', 4),
('SVT', 'Génétique et Écologie', 3),
('Philosophie', 'Introduction à la pensée critique', 2)
ON CONFLICT DO NOTHING;


-- 4. VÉRIFIER LE STATUT AVANT DE TESTER
-- Vérifie que 'NON_ACTIVE' est bien présent dans la colonne mot_de_passe
SELECT code_unique, nom, prenom, mot_de_passe 
FROM authentification.comptes;