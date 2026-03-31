-- Vue unifiée (sans les colonnes qui n'existent pas)
CREATE OR REPLACE VIEW vue_utilisateurs_simple AS
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.role_actuel AS role,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN 'À activer'
        ELSE 'Actif'
    END AS statut,
    to_char(c.date_creation, 'DD/MM/YYYY') AS date_inscription,
    -- Info spécifique
    CASE 
        WHEN c.role_actuel IN ('DIRECTION', 'SURVEILLANT') THEN adm.poste_occupe
        WHEN c.role_actuel = 'PROFESSEUR' THEN p.specialite
        WHEN c.role_actuel = 'ELEVE' THEN pe.classe_actuelle
        ELSE NULL
    END AS info
FROM authentification.comptes c
LEFT JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
LEFT JOIN vie_scolaire.profils_eleves pe ON c.id_user = pe.id_user
WHERE c.role_actuel IN ('DIRECTION', 'SURVEILLANT', 'PROFESSEUR', 'ELEVE', 'PARENT', 'ALUMNI');

-- Utilisation
SELECT * FROM vue_utilisateurs_simple WHERE role = 'PROFESSEUR';
SELECT * FROM vue_utilisateurs_simple WHERE role = 'ELEVE';