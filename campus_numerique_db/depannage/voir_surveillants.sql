-- Surveillants avec statistiques
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    adm.poste_occupe AS fonction,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    (SELECT COUNT(*) FROM gestion.absences WHERE enregistre_par = c.id_user) AS absences_enregistrees,
    (SELECT COUNT(*) FROM gestion.convocations WHERE creee_par = c.id_user) AS convocations_creees,
    to_char(c.derniere_connexion, 'DD/MM/YYYY') AS derniere_connexion
FROM authentification.comptes c
JOIN authentification.profils_administratifs adm ON c.id_user = adm.id_user
WHERE c.role_actuel = 'SURVEILLANT'
ORDER BY adm.poste_occupe, c.nom;