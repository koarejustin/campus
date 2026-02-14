CREATE TABLE IF NOT EXISTS authentification.comptes (
    id_user UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_unique VARCHAR(50) UNIQUE NOT NULL, 
    nom VARCHAR(100) NOT NULL CHECK (length(nom) >= 2),
    prenom VARCHAR(150) NOT NULL CHECK (length(prenom) >= 2),
    email VARCHAR(255) UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    telephone VARCHAR(20) UNIQUE CHECK (telephone ~* '^\+?[0-9]{8,20}$'),
    mot_de_passe TEXT NOT NULL, 
    role_actuel role_utilisateur NOT NULL, 
    est_actif BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_comptes_email ON authentification.comptes(email);
CREATE INDEX IF NOT EXISTS idx_comptes_code_unique ON authentification.comptes(code_unique);