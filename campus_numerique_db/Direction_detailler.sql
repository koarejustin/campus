-- Direction avec tous les détails
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
    to_char(c.date_creation, 'DD/MM/YYYY') AS date_inscription,
    to_char(c.derniere_connexion, 'DD/MM/YYYY HH24:MI') AS derniere_connexion
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'DIRECTION'
ORDER BY adm.poste_occupe, c.nom;