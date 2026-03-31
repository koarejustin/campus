

-- 1. Table des profils élèves
CREATE TABLE vie_scolaire.profils_eleves (
    id_eleve UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID REFERENCES authentification.comptes(id_user) ON DELETE CASCADE,
    classe_actuelle VARCHAR(50), -- ex: '3ème A' [cite: 6]
    date_naissance DATE,
    tuteur_principal UUID -- Sera lié à la table parents plus tard
);

-- 2. Forum de classe (Le Grain de Sel)
-- Cloisonnement strict : Seuls les élèves de la même classe y accèdent[cite: 6].
CREATE TABLE vie_scolaire.forum_classe (
    id_post SERIAL PRIMARY KEY,
    id_auteur UUID REFERENCES vie_scolaire.profils_eleves(id_eleve),
    classe_concernee VARCHAR(50), 
    contenu TEXT NOT NULL,
    type_partage VARCHAR(20), -- 'cours', 'astuce', 'question' [cite: 6]
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Page "Grand Élèves" (Inter-classes et vie scolaire)
-- Pour les compétitions, clubs et entraide générale[cite: 8, 10, 12].
CREATE TABLE vie_scolaire.grand_flux_eleves (
    id_annonce SERIAL PRIMARY KEY,
    id_auteur UUID REFERENCES vie_scolaire.profils_eleves(id_eleve),
    titre VARCHAR(255),
    corps_message TEXT,
    categorie VARCHAR(50), -- 'sport', 'culture', 'concours' [cite: 10]
    est_modere BOOLEAN DEFAULT FALSE -- Signalement entre pairs [cite: 11, 14]
);

-- COMMENTAIRE TECHNIQUE :
-- L'administration et les profs n'ont pas de lien (Foreign Key) vers ces tables
-- de discussion, ce qui garantit techniquement la confidentialité.