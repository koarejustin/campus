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
WHERE TRIM(code_unique) ILIKE 'CN-2026-2340';





SELECT 
    c.code_unique as identifiant, 
    c.nom, 
    c.prenom, 
    p.profession,
    COALESCE(b.poste::TEXT, 'MEMBRE SIMPLE') as statut_ape
FROM authentification.comptes c
JOIN gestion_ape.profils_parents p ON c.id_user = p.id_user
LEFT JOIN gestion_ape.bureau_direction b ON p.id_parent = b.id_parent
WHERE c.role_actuel = 'PARENT'
ORDER BY statut_ape DESC;



SELECT 
    c.code_unique as identifiant, 
    c.nom, 
    c.prenom, 
    adm.poste_occupe, 
    adm.signature_numerique_active as a_droit_signature
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel IN ('DIRECTION', 'SURVEILLANT')
ORDER BY adm.poste_occupe;


-- 6. VOIR LES SURVEILLANTS (CADRE DE VIE SCOLAIRE)
-- Requête pour récupérer les surveillants avec leurs détails
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    adm.poste_occupe as fonction,
    adm.signature_numerique_active as signature_active,
    c.date_creation as date_embauche
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT'
ORDER BY adm.poste_occupe, c.nom;


-- 7. VOIR LES DIRECTEURS (MANAGEMENT ÉTABLISSEMENT)
-- Récupère tous les directeurs avec leurs poste respectif
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    adm.poste_occupe as fonction,
    adm.signature_numerique_active as signature_active,
    c.date_creation as date_embauche
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION'
ORDER BY adm.poste_occupe, c.nom;


-- 8. VOIR LES PARENTS (POUR TEST ESPACE PARENT)
-- Liste complète des parents
SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    p.profession,
    COALESCE(b.poste::TEXT, 'PARENT') as statut
FROM authentification.comptes c
JOIN gestion_ape.profils_parents p ON c.id_user = p.id_user
LEFT JOIN gestion_ape.bureau_direction b ON p.id_parent = b.id_parent
WHERE c.role_actuel = 'PARENT'
ORDER BY c.nom, c.prenom;




SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    adm.poste_occupe
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION'
ORDER BY c.nom;


SELECT 
    c.code_unique as matricule, 
    c.nom, 
    c.prenom, 
    p.profession
FROM authentification.comptes c
JOIN gestion_ape.profils_parents p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PARENT'
ORDER BY c.nom;


-- ==========================================================
-- BLOC AJOUTÉ : Requêtes pratiques pour gestion des SURVEILLANTS
-- ==========================================================
-- 1) Créer un surveillant (remplacez le mot de passe par un hash en production)
INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif, date_creation)
VALUES ('SURV-2026-004','DIAW','Aminata','SURVEILLANT','Password123','aminata@example.com', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (code_unique) DO NOTHING;

-- 2) Réinitialiser le mot de passe d'un surveillant (exemple simple)
UPDATE authentification.comptes
SET mot_de_passe = 'Justin', est_actif = TRUE
WHERE code_unique = 'SURV-2026-004';

-- 3) Lister tous les comptes ayant le rôle SURVEILLANT (utile si la jointure donne 0 lignes)
SELECT code_unique AS matricule, nom, prenom, role_actuel, est_actif, date_creation
FROM authentification.comptes
WHERE role_actuel = 'SURVEILLANT'
ORDER BY nom;

-- 4) Lister les surveillants *sans* profil administratif (diagnostic si la requête principale retourne 0 lignes)
SELECT c.code_unique AS matricule, c.nom, c.prenom
FROM authentification.comptes c
LEFT JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT' AND adm.id_user IS NULL;

-- 5) Requête détaillée des surveillants (avec date de création)
SELECT
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    adm.poste_occupe AS fonction,
    adm.signature_numerique_active AS signature_active,
    c.date_creation AS date_creation
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT'
ORDER BY adm.poste_occupe, c.nom;

-- Remarque: utilisez un hash bcrypt pour les mots de passe en production.


-- ==========================================================
-- CONTRAINTE MÉTIER: Parents doivent avoir AU MOINS un enfant
-- ou être membre du bureau APE pour pouvoir s'activer (est_actif = TRUE)
-- ==========================================================
-- Fonction trigger qui empêche l'activation d'un compte parent
CREATE OR REPLACE FUNCTION authentification.prevent_parent_activation()
RETURNS trigger AS $$
DECLARE
    has_relation BOOLEAN := FALSE;
    has_ape BOOLEAN := FALSE;
    parent_id UUID;
BEGIN
    IF (NEW.role_actuel = 'PARENT' AND NEW.est_actif = TRUE) THEN
        -- vérifier relation parent -> enfant
        SELECT EXISTS (SELECT 1 FROM vie_scolaire.relations_parents_eleves r WHERE r.id_parent = NEW.id_user) INTO has_relation;

        -- vérifier s'il est membre du bureau APE (via profils_parents -> bureau_direction)
        SELECT EXISTS (
            SELECT 1 FROM gestion_ape.bureau_direction b
            WHERE b.id_parent = (
                SELECT p.id_parent FROM gestion_ape.profils_parents p WHERE p.id_user = NEW.id_user LIMIT 1
            )
        ) INTO has_ape;

        IF NOT (has_relation OR has_ape) THEN
            RAISE EXCEPTION 'Activation refusée: un parent doit avoir au moins un enfant lié ou être membre du bureau APE.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger (remplace l'existant s'il y en a)
DROP TRIGGER IF EXISTS trg_prevent_parent_activation ON authentification.comptes;
CREATE TRIGGER trg_prevent_parent_activation
BEFORE INSERT OR UPDATE ON authentification.comptes
FOR EACH ROW EXECUTE FUNCTION authentification.prevent_parent_activation();


-- ==========================================================
-- EXEMPLES: Lier parents à leurs enfants
-- ==========================================================
-- Exemple 1: lier le parent avec matricule PAR001 à l'élève ELE001
INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente)
SELECT
    (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PAR001'),
    (SELECT id_user FROM authentification.comptes WHERE code_unique = 'ELE001'),
    'Parent'
ON CONFLICT DO NOTHING;

-- Exemple 2: lier un parent à plusieurs enfants
INSERT INTO vie_scolaire.relations_parents_eleves (id_parent, id_eleve, lien_parente)
SELECT
    (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PAR002'),
    (SELECT id_user FROM authentification.comptes WHERE code_unique = c),
    'Père'
FROM (VALUES ('ELE002'), ('ELE003')) AS v(c)
ON CONFLICT DO NOTHING;

-- Vérifications utiles
-- 1) Voir les enfants d'un parent
-- SELECT e.code_unique AS enfant, e.nom, e.prenom FROM vie_scolaire.relations_parents_eleves r JOIN authentification.comptes e ON r.id_eleve = e.id_user WHERE r.id_parent = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'PAR001');

-- 2) Voir les parents d'un élève
-- SELECT p.code_unique AS parent, p.nom, p.prenom FROM vie_scolaire.relations_parents_eleves r JOIN authentification.comptes p ON r.id_parent = p.id_user WHERE r.id_eleve = (SELECT id_user FROM authentification.comptes WHERE code_unique = 'ELE001');
