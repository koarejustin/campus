-- 1. Annonces
SELECT COUNT(*) AS nb_annonces_vie_scolaire FROM vie_scolaire.annonces;
SELECT COUNT(*) AS nb_annonces_officielles FROM vie_scolaire.annonces_officielles;
SELECT COUNT(*) AS nb_gestion_annonces FROM gestion.annonces_officielles;

-- 2. Forum classe
SELECT COUNT(*) AS nb_messages_forum FROM vie_scolaire.forum_classe;
SELECT classe, COUNT(*) FROM vie_scolaire.forum_classe GROUP BY classe;

-- 3. Inter-classes
SELECT COUNT(*) AS nb_inter_classes FROM vie_scolaire.inter_classes_msgs;

-- 4. Orientation
SELECT COUNT(*) AS nb_orientations FROM pedagogie.avis_orientation;

-- 5. Mentorat
SELECT COUNT(*) AS nb_mentorat FROM gestion_ape.relations_mentorat;
