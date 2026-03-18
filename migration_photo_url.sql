-- Ajouter colonne photo_url si elle n'existe pas dans profils_profs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'pedagogie' 
        AND table_name = 'profils_profs' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE pedagogie.profils_profs ADD COLUMN photo_url TEXT;
        RAISE NOTICE 'Colonne photo_url ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne photo_url existe déjà';
    END IF;
END $$;
