-- =============================================================================
-- SCRIPT 02 : LE DICTIONNAIRE COMPLET (TYPES ENUM)
-- =============================================================================

-- 1. Rôles des utilisateurs (Pour le Script 03)
CREATE TYPE role_utilisateur AS ENUM (
    'ELEVE', 
    'PROFESSEUR', 
    'DIRECTION', 
    'SURVEILLANT', 
    'PARENT', 
    'ALUMNI'
);

-- 2. Fonctions de l'APE (Pour ton Script 04 qui bloquait tout à l'heure)
CREATE TYPE fonction_ape AS ENUM (
    'PRESIDENT', 
    'TRESORIER', 
    'SECRETAIRE', 
    'MEMBRE_ACTIF'
);

-- 3. Types de lien familial (Pour le Script 06)
CREATE TYPE type_parente AS ENUM (
    'PERE', 
    'MERE', 
    'TUTEUR_LEGAL', 
    'GRAND_FRERE', 
    'GRANDE_SOEUR', 
    'ONCLE_TANTE'
);