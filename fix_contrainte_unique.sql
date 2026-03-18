-- ══════════════════════════════════════════════
-- FIX : Ajouter contrainte UNIQUE sur profils_profs.id_user
-- (requis pour ON CONFLICT dans updateProfil)
-- ══════════════════════════════════════════════
ALTER TABLE pedagogie.profils_profs 
ADD CONSTRAINT IF NOT EXISTS profils_profs_id_user_unique UNIQUE (id_user);

-- Vérifier
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'pedagogie' AND table_name = 'profils_profs';
