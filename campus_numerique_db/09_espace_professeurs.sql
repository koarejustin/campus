-- =============================================================================
-- SCRIPT 09 : ESPACE PROFESSEURS
-- Objectif : Gestion pédagogique et espace privé entre collègues[cite: 15, 17].
-- =============================================================================

-- 1. Table des Profils Professeurs
CREATE TABLE IF NOT EXISTS pedagogie.profils_profs (
    id_prof UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    specialite VARCHAR(100), -- Ex: Mathématiques, Histoire-Géo
    biographie TEXT,
    date_arrivee DATE DEFAULT CURRENT_DATE
);

-- 2. Espace Privé : Discussions entre collègues (Invisibles pour l'administration)
-- Garantit l'étanchéité numérique totale.
CREATE TABLE IF NOT EXISTS pedagogie.salle_des_profs_virtuelle (
    id_message SERIAL PRIMARY KEY,
    id_auteur UUID REFERENCES pedagogie.profils_profs(id_prof),
    objet VARCHAR(255),
    message TEXT NOT NULL,
    categorie VARCHAR(50), -- 'Pédagogie', 'Organisation', 'Vie Sociale'
    date_envoi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Archivage des Cours et TD
-- Accessibles partout par le professeur[cite: 16].
CREATE TABLE IF NOT EXISTS pedagogie.ressources_pedagogiques (
    id_ressource SERIAL PRIMARY KEY,
    id_prof UUID REFERENCES pedagogie.profils_profs(id_prof),
    titre VARCHAR(255) NOT NULL,
    type_document VARCHAR(50), -- 'Cours', 'TD', 'Exercice'
    url_fichier TEXT, -- Lien vers le serveur de fichiers sécurisé [cite: 48]
    classe_concernee VARCHAR(50),
    date_depot TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pedagogie.salle_des_profs_virtuelle IS 'Espace de discussion strictement réservé aux profs, sans regard de la direction[cite: 17].';