-- Inter-classes : voir les données
SELECT classe_from, classe_to, COUNT(*) 
FROM vie_scolaire.inter_classes_msgs 
GROUP BY classe_from, classe_to;

-- Mentorat : voir les relations
SELECT rm.id_relation, rm.statut, rm.id_eleve, rm.id_alumni,
       c1.nom AS nom_eleve, c2.nom AS nom_alumni
FROM gestion_ape.relations_mentorat rm
LEFT JOIN authentification.comptes c1 ON c1.id_user = rm.id_eleve
LEFT JOIN authentification.comptes c2 ON c2.id_user = rm.id_alumni;

-- Forum : vérifier s'il y a une ancienne table
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'vie_scolaire' 
AND table_name LIKE '%forum%';
