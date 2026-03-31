-- Professeurs - Version avec colonnes existantes
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    COALESCE(p.specialite, 'Non renseigné') AS specialite,
    COALESCE(p.matieres, ARRAY[]::text[]) AS matieres,
    -- p.annees_exp n'existe pas, on la retire
    -- p.biographie peut exister
    COALESCE(p.biographie, '') AS biographie,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    (SELECT COUNT(*) FROM pedagogie.notes_evaluations WHERE id_professeur = c.id_user) AS notes_saisies,
    to_char(c.derniere_connexion, 'DD/MM/YYYY') AS derniere_connexion
FROM authentification.comptes c
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
ORDER BY c.nom, c.prenom;