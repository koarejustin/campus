-- Vue unifiée pour tous les utilisateurs (sans tables manquantes)
CREATE OR REPLACE VIEW vue_utilisateurs_unifiee AS
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    c.role_actuel AS role,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    to_char(c.date_creation, 'DD/MM/YYYY') AS date_inscription,
    to_char(c.derniere_connexion, 'DD/MM/YYYY') AS derniere_connexion,
    -- Info spécifique selon le rôle
    CASE 
        WHEN c.role_actuel IN ('DIRECTION', 'SURVEILLANT') THEN adm.poste_occupe
        WHEN c.role_actuel = 'PROFESSEUR' THEN p.specialite
        WHEN c.role_actuel = 'ELEVE' THEN pe.classe_actuelle
        WHEN c.role_actuel = 'PARENT' THEN pp.profession
        ELSE NULL
    END AS info_specifique,
    -- Rôle APE pour les parents
    CASE WHEN c.role_actuel = 'PARENT' AND b.id_membre IS NOT NULL THEN b.poste END AS role_ape
FROM authentification.comptes c
LEFT JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
LEFT JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
LEFT JOIN gestion_ape.profils_parents pp ON c.id_user = pp.id_user
LEFT JOIN gestion_ape.bureau_direction b ON pp.id_parent = b.id_parent
WHERE c.role_actuel IN ('DIRECTION', 'SURVEILLANT', 'PROFESSEUR', 'ELEVE', 'PARENT', 'ALUMNI');

-- Utiliser la vue
SELECT * FROM vue_utilisateurs_unifiee WHERE role = 'PROFESSEUR';
SELECT * FROM vue_utilisateurs_unifiee WHERE role = 'PARENT' AND role_ape IS NOT NULL;