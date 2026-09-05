-- ============================================================
-- CRÉER UNE FONCTION DE NETTOYAGE AUTOMATIQUE
-- ============================================================

CREATE OR REPLACE FUNCTION maintenance_nettoyage()
RETURNS TEXT AS $$
DECLARE
    nb_absences int;
    nb_convocations int;
    nb_notifications int;
    nb_logs int;
    resultat TEXT := '';
BEGIN
    -- Nettoyage des absences de +2 ans
    WITH deleted AS (
        DELETE FROM gestion.absences 
        WHERE date_absence < NOW() - INTERVAL '2 years'
        RETURNING *
    )
    SELECT COUNT(*) INTO nb_absences FROM deleted;
    resultat := resultat || format('Absences supprimées: %s\n', nb_absences);
    
    -- Nettoyage des convocations de +1 an
    WITH deleted AS (
        DELETE FROM gestion.convocations 
        WHERE date_convocation < NOW() - INTERVAL '1 year'
        RETURNING *
    )
    SELECT COUNT(*) INTO nb_convocations FROM deleted;
    resultat := resultat || format('Convocations supprimées: %s\n', nb_convocations);
    
    -- Nettoyage des notifications lues de +30j
    WITH deleted AS (
        DELETE FROM gestion.notifications 
        WHERE (est_lu = true OR lue = true)
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING *
    )
    SELECT COUNT(*) INTO nb_notifications FROM deleted;
    resultat := resultat || format('Notifications supprimées: %s\n', nb_notifications);
    
    -- Nettoyage des logs de +6 mois
    WITH deleted AS (
        DELETE FROM gestion.audit_logs 
        WHERE created_at < NOW() - INTERVAL '6 months'
        RETURNING *
    )
    SELECT COUNT(*) INTO nb_logs FROM deleted;
    resultat := resultat || format('Logs supprimés: %s\n', nb_logs);
    
    -- ANALYZE après nettoyage
    ANALYZE;
    
    RETURN resultat;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la maintenance
SELECT maintenance_nettoyage();