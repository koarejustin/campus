-- ================================================================
-- 1. RÉCUPÉRER LES CHATS PERDUS (si forum_classe_old existe)
-- ================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema='vie_scolaire' AND table_name='forum_classe_old'
  ) THEN
    INSERT INTO vie_scolaire.forum_classe 
        (classe, id_auteur, nom_auteur, texte, created_at)
    SELECT classe, id_auteur, nom_auteur, texte, created_at
    FROM vie_scolaire.forum_classe_old
    WHERE NOT EXISTS (
        SELECT 1 FROM vie_scolaire.forum_classe fc
        WHERE fc.id_auteur = forum_classe_old.id_auteur
        AND fc.texte = forum_classe_old.texte
        AND ABS(EXTRACT(EPOCH FROM (fc.created_at - forum_classe_old.created_at))) < 5
    );
    RAISE NOTICE 'Messages récupérés depuis forum_classe_old';
  ELSE
    RAISE NOTICE 'Pas de forum_classe_old — rien à récupérer';
  END IF;
END $$;

-- 2. VÉRIFIER LES RESSOURCES
SELECT COUNT(*) AS total_ressources FROM pedagogie.ressources_pedagogiques WHERE est_visible = true;
SELECT id_ressource, titre, type_document, classe_concernee, id_prof FROM pedagogie.ressources_pedagogiques LIMIT 5;

-- 3. AJOUTER type_evaluation si elle n'existe pas encore
ALTER TABLE pedagogie.notes_evaluations 
ADD COLUMN IF NOT EXISTS type_evaluation VARCHAR(20) DEFAULT 'DEVOIR';

-- 4. VÉRIFIER LES NOTES
SELECT COUNT(*) AS total_notes, COUNT(DISTINCT id_eleve) AS nb_eleves FROM pedagogie.notes_evaluations;
