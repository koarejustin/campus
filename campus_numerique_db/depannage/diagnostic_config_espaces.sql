-- 1. Voir si la table configuration existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'gestion' AND table_name = 'configuration'
) AS table_configuration_existe;

-- 2. Voir les colonnes de la table si elle existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'gestion' AND table_name = 'configuration'
ORDER BY ordinal_position;

-- 3. Voir le contenu actuel de la configuration
SELECT * FROM gestion.configuration;

-- 4. Voir si la table images_espaces existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'gestion' AND table_name = 'images_espaces'
) AS table_images_existe;

-- 5. Voir les images déjà présentes
SELECT * FROM gestion.images_espaces;