-- 1. Mentorat : voir les relations avec statut
SELECT rm.id_relation, rm.statut, rm.id_eleve, rm.id_alumni,
       c1.nom AS nom_eleve, c1.prenom AS prenom_eleve,
       c2.nom AS nom_alumni, c2.prenom AS prenom_alumni
FROM gestion_ape.relations_mentorat rm
LEFT JOIN authentification.comptes c1 ON c1.id_user = rm.id_eleve
LEFT JOIN authentification.comptes c2 ON c2.id_user = rm.id_alumni;

-- 2. Inter-classes : voir les messages
SELECT classe_from, classe_to, nom_auteur, 
       LEFT(texte, 50) AS debut_texte,
       created_at
FROM vie_scolaire.inter_classes_msgs
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier si forum_classe avait une ancienne table
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name LIKE '%forum%'
ORDER BY table_schema, table_name;
