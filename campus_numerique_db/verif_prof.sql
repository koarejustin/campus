-- 1. Profils profs existants
SELECT pp.id_prof, pp.id_user, c.nom, c.prenom, c.role_actuel
FROM pedagogie.profils_profs pp
JOIN authentification.comptes c ON c.id_user = pp.id_user
ORDER BY c.nom;

-- 2. Cahiers de texte : id_prof utilisé
SELECT DISTINCT ct.id_prof, ct.classe, ct.matiere, COUNT(*) AS nb_seances
FROM pedagogie.cahiers_texte ct
GROUP BY ct.id_prof, ct.classe, ct.matiere
ORDER BY nb_seances DESC
LIMIT 10;

-- 3. Ressources : id_prof utilisé
SELECT DISTINCT rp.id_prof, rp.classe_concernee, COUNT(*) AS nb
FROM pedagogie.ressources_pedagogiques rp
GROUP BY rp.id_prof, rp.classe_concernee;

-- 4. Notes : id_professeur utilisé
SELECT DISTINCT n.id_professeur, COUNT(*) AS nb_notes
FROM pedagogie.notes_evaluations n
GROUP BY n.id_professeur;
