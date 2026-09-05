SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'pedagogie' AND table_name = 'profils_profs'
ORDER BY ordinal_position;