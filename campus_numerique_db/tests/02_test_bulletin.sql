SELECT 
    c.nom, 
    c.prenom, 
    m.nom_matiere, 
    n.valeur_note, 
    m.coefficient,
    (n.valeur_note * m.coefficient) as points_obtenus
FROM pedagogie.notes n
JOIN vie_scolaire.profils_eleves pe ON n.id_eleve = pe.id_eleve
JOIN authentification.comptes c ON pe.id_user = c.id_user
JOIN pedagogie.matieres m ON n.id_matiere = m.id_matiere
WHERE n.est_validee_par_direction = TRUE;