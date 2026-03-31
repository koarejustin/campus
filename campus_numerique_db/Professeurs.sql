-- ============================================================
-- PROFESSEURS - Liste complète
-- ============================================================

-- 1. Tous les professeurs
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    c.telephone,
    COALESCE(p.specialite, 'Non renseigné') AS specialite,
    COALESCE(p.matieres, ARRAY[]::text[]) AS matieres,
    COALESCE(p.classes, ARRAY[]::text[]) AS classes,
    p.annees_exp AS experience_ans,
    p.diplome,
    CASE 
        WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer'
        WHEN c.mot_de_passe IS NULL THEN '⚪ Sans mot de passe'
        ELSE '🟢 Actif'
    END AS statut_compte,
    c.est_actif,
    to_char(p.date_arrivee, 'DD/MM/YYYY') AS date_arrivee,
    to_char(c.derniere_connexion, 'DD/MM/YYYY HH24:MI') AS derniere_connexion,
    -- Statistiques
    (SELECT COUNT(*) FROM pedagogie.notes_evaluations WHERE id_professeur = c.id_user) AS notes_saisies,
    (SELECT COUNT(*) FROM pedagogie.ressources_pedagogiques rp 
     JOIN pedagogie.profils_profs pp ON rp.id_prof = pp.id_prof 
     WHERE pp.id_user = c.id_user) AS ressources_publiees,
    (SELECT COUNT(*) FROM pedagogie.cahiers_texte WHERE id_prof = c.id_user) AS seances_enseignees
FROM authentification.comptes c
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
ORDER BY c.nom, c.prenom;

-- 2. Professeurs par spécialité
SELECT 
    COALESCE(p.specialite, 'Non renseigné') AS specialite,
    COUNT(*) AS effectif
FROM authentification.comptes c
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
GROUP BY p.specialite
ORDER BY effectif DESC;

-- 3. Professeurs sans profil pédagogique (à compléter)
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    c.email,
    CASE WHEN c.mot_de_passe = 'NON_ACTIVE' THEN '🔴 À activer' ELSE '🟢 Actif' END AS statut
FROM authentification.comptes c
LEFT JOIN pedagogie.profils_profs p ON c.id_user = p.id_user
WHERE c.role_actuel = 'PROFESSEUR'
  AND p.id_user IS NULL
ORDER BY c.nom;

-- 4. Professeurs les plus actifs (notes saisies)
SELECT 
    c.code_unique AS matricule,
    c.nom,
    c.prenom,
    COUNT(n.id_evaluation) AS nb_notes_saisies,
    COUNT(DISTINCT n.id_eleve) AS nb_eleves_notes
FROM authentification.comptes c
LEFT JOIN pedagogie.notes_evaluations n ON c.id_user = n.id_professeur
WHERE c.role_actuel = 'PROFESSEUR'
GROUP BY c.code_unique, c.nom, c.prenom
ORDER BY nb_notes_saisies DESC
LIMIT 10;