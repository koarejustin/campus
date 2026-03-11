-- =============================================================================
-- SCRIPT 10 : DIRECTION ET VIE SCOLAIRE ADMINISTRATIVE
-- Objectif : Validation officielle et gestion de la discipline.
-- =============================================================================

-- 1. Table des Profils Direction / Surveillance
CREATE TABLE IF NOT EXISTS authentification.profils_administratifs (
    id_admin UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    poste_occupe VARCHAR(100), -- 'Proviseur', 'Censeur', 'Surveillant Général'
    signature_numerique_active BOOLEAN DEFAULT FALSE -- [cite: 25]
);

-- 2. Gestion des Absences et Discipline (Surveillants)
-- Cloisonnement : Visible uniquement par l'élève et son parent[cite: 24].
CREATE TABLE IF NOT EXISTS vie_scolaire.suivi_disciplinaire (
    id_entree SERIAL PRIMARY KEY,
    id_eleve UUID REFERENCES vie_scolaire.profils_eleves(id_eleve) ON DELETE CASCADE,
    id_surveillant UUID REFERENCES authentification.profils_administratifs(id_admin),
    type_incident VARCHAR(50), -- 'Absence', 'Retard', 'Convocation'
    motif TEXT,
    date_incident TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_vu_par_parent BOOLEAN DEFAULT FALSE
);

-- 3. Canal Officiel (Direction)
-- Diffusion d'informations générales à toute l'école[cite: 26].
CREATE TABLE IF NOT EXISTS vie_scolaire.annonces_officielles (
    id_annonce SERIAL PRIMARY KEY,
    id_emetteur UUID REFERENCES authentification.profils_administratifs(id_admin),
    titre VARCHAR(255) NOT NULL,
    corps_annonce TEXT NOT NULL,
    priorite VARCHAR(20) DEFAULT 'Normale', -- 'Urgente', 'Info'
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vie_scolaire.suivi_disciplinaire IS 'Seuls les surveillants écrivent ici, et seuls les parents concernés lisent.';