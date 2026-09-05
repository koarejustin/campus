-- ============================================================
-- AJOUTER LES IMAGES POUR CHAQUE ESPACE
-- ============================================================

-- 1. Espace Élèves
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('eleves', 'background', 'Fond espace élèves', '/uploads/espaces/eleves/', 1, true);

-- 2. Espace Professeurs
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('professeurs', 'background', 'Fond espace professeurs', '/uploads/espaces/professeurs/mon_image_profs.jpg', 1, true);

-- 3. Espace Parents
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('parents', 'background', 'Fond espace parents', '/uploads/espaces/parents/mon_image_parents.jpg', 1, true);

-- 4. Espace Direction
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('direction', 'background', 'Fond espace direction', '/uploads/espaces/direction/mon_image_direction.jpg', 1, true);

-- 5. Espace Alumni
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('alumni', 'background', 'Fond espace alumni', '/uploads/espaces/alumni/mon_image_alumni.jpg', 1, true);

-- 6. Page de connexion
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('login', 'background', 'Fond page connexion', '/uploads/espaces/login/mon_image_login.jpg', 1, true);

-- 7. Page d'accueil
INSERT INTO gestion.images_espaces (espace, type_image, titre, url_image, ordre, est_active)
VALUES ('accueil', 'hero', 'Bannière accueil', '/uploads/espaces/accueil/mon_image_accueil.jpg', 1, true);