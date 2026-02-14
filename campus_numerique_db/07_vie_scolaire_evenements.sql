-- =============================================================================
-- SCRIPT 07 : VIE SCOLAIRE ET COHÉSION
-- Objectif : Gérer le Grand Flux, les compétitions et les vacances[cite: 35, 37].
-- =============================================================================

-- 1. Table du Grand Flux (Notifications et succès)
CREATE TABLE vie_scolaire.grand_flux (
    id_annonce SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    type_annonce VARCHAR(50), -- 'Succès Examens', 'Compétition', 'Alerte'
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_urgent BOOLEAN DEFAULT FALSE -- Pour déclencher un SMS ou notification In-App [cite: 35]
);

-- 2. Gestion des Événements et Clubs
CREATE TABLE vie_scolaire.evenements (
    id_event SERIAL PRIMARY KEY,
    nom_activite VARCHAR(200) NOT NULL,
    description TEXT,
    categorie VARCHAR(50), -- 'Sport', 'Culture', 'Soutien Vacances' [cite: 37]
    date_debut TIMESTAMP,
    date_fin TIMESTAMP,
    lieu VARCHAR(100) DEFAULT 'Au Lycée'
);

-- 3. Module de Médiation (Gestion des tensions)
-- Uniquement accessible par l'administration pour sensibiliser[cite: 36].
CREATE TABLE vie_scolaire.mediation (
    id_alerte SERIAL PRIMARY KEY,
    sujet_sensibilisation VARCHAR(255),
    message_paix TEXT,
    date_diffusion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);