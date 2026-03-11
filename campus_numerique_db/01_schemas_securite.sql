-- Activation de la cryptographie pour les IDs sécurisés (UUID)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Création des Schémas (Cloisonnement strict selon le cahier des charges)
CREATE SCHEMA IF NOT EXISTS authentification; -- Accès et sécurité
CREATE SCHEMA IF NOT EXISTS vie_scolaire;     -- Discipline et vie quotidienne
CREATE SCHEMA IF NOT EXISTS pedagogie;       -- Notes et excellence académique
CREATE SCHEMA IF NOT EXISTS gestion_ape;     -- Espace Parents et Bureau