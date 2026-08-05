-- =============================================================================
-- SCRIPT 16 : MATIERES ET COEFFICIENTS REELS - BURKINA FASO
-- Conforme au système éducatif post-primaire et secondaire
-- =============================================================================

-- 1. Suppression des anciennes données pour repartir de zéro
TRUNCATE TABLE IF EXISTS pedagogie.matieres CASCADE;
TRUNCATE TABLE IF EXISTS pedagogie.coefficients_par_classe CASCADE;

-- 2. TABLE MATIERES REELLES - Burkina Faso
-- ============================================
INSERT INTO pedagogie.matieres (libelle_matiere, coefficient, domaine, specialites_concernees)
VALUES
    -- LETTRES ET SCIENCES HUMAINES
    ('Français', 2, 'Lettres et Sciences Humaines', 'TOUS'),
    ('Anglais', 2, 'Lettres et Sciences Humaines', 'TOUS'),
    ('Allemand', 1, 'Lettres et Sciences Humaines', 'SECONDE_GENERALE'),
    ('Espagnol', 1, 'Lettres et Sciences Humaines', 'SECONDE_GENERALE'),
    ('Histoire-Géographie', 2, 'Lettres et Sciences Humaines', 'TOUS'),
    ('Éducation Civique et Morale (ECM)', 1, 'Lettres et Sciences Humaines', 'TOUS'),
    ('Philosophie', 3, 'Lettres et Sciences Humaines', 'TERMINALE'),

    -- SCIENCES EXACTES
    ('Mathématiques', 3, 'Sciences Exactes', 'TOUS'),
    ('Sciences de la Vie et de la Terre (SVT)', 2, 'Sciences Exactes', 'TOUS'),
    ('Physique-Chimie', 3, 'Sciences Exactes', 'SECONDE_ET_PLUS'),

    -- AUTRES DISCIPLINES
    ('Éducation Physique et Sportive (EPS)', 1, 'Disciplines Transversales', 'TOUS'),
    ('Dessin / Arts Plastiques', 1, 'Disciplines Transversales', 'OPTIONNEL'),
    ('Musique', 1, 'Disciplines Transversales', 'OPTIONNEL'),
    ('Informatique / TIC', 2, 'Disciplines Transversales', 'OPTIONNEL'),
    ('Sciences de l''Ingénieur', 2, 'Sciences Exactes', 'TERMINALE_C'),
    ('Littérature Générale', 2, 'Lettres et Sciences Humaines', 'TERMINALE_A4');

-- 3. TABLE COEFFICIENTS PAR CLASSE ET SÉRIE
-- ==========================================
-- 6ème à 4ème (PREMIER CYCLE) — Coefficients Uniformes
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    'SIXIEME', 'GENERAL',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 3
        WHEN 'Anglais' THEN 2
        WHEN 'Mathématiques' THEN 3
        WHEN 'Histoire-Géographie' THEN 2
        WHEN 'SVT' THEN 2
        WHEN 'Physique-Chimie' THEN 2
        WHEN 'EPS' THEN 1
        WHEN 'Éducation Civique et Morale (ECM)' THEN 1
        ELSE 1
    END,
    'EVALUATION_CONTINUE'
FROM pedagogie.matieres m
WHERE m.libelle_matiere IN (
    'Français', 'Anglais', 'Mathématiques', 'Histoire-Géographie',
    'Sciences de la Vie et de la Terre (SVT)', 'Physique-Chimie',
    'Éducation Physique et Sportive (EPS)', 'Éducation Civique et Morale (ECM)'
);

-- 5ème (PREMIER CYCLE) — Coefficients
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    'CINQUIEME', 'GENERAL',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 3
        WHEN 'Anglais' THEN 2
        WHEN 'Allemand' THEN 1
        WHEN 'Mathématiques' THEN 3
        WHEN 'Histoire-Géographie' THEN 2
        WHEN 'SVT' THEN 2
        WHEN 'Physique-Chimie' THEN 2
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 1
        ELSE 1
    END,
    'EVALUATION_CONTINUE'
FROM pedagogie.matieres m
WHERE m.libelle_matiere IN (
    'Français', 'Anglais', 'Allemand', 'Mathématiques', 'Histoire-Géographie',
    'Sciences de la Vie et de la Terre (SVT)', 'Physique-Chimie',
    'Éducation Physique et Sportive (EPS)', 'Éducation Civique et Morale (ECM)'
);

-- 4ème (PREMIER CYCLE) — Coefficients
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    'QUATRIEME', 'GENERAL',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 3
        WHEN 'Anglais' THEN 2
        WHEN 'Allemand' THEN 1
        WHEN 'Mathématiques' THEN 3
        WHEN 'Histoire-Géographie' THEN 2
        WHEN 'SVT' THEN 2
        WHEN 'Physique-Chimie' THEN 2
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 1
        ELSE 1
    END,
    'EVALUATION_CONTINUE'
FROM pedagogie.matieres m
WHERE m.libelle_matiere IN (
    'Français', 'Anglais', 'Allemand', 'Mathématiques', 'Histoire-Géographie',
    'Sciences de la Vie et de la Terre (SVT)', 'Physique-Chimie',
    'Éducation Physique et Sportive (EPS)', 'Éducation Civique et Morale (ECM)'
);

-- 3ème (PREMIER CYCLE) — Coefficients BFEM
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    'TROISIEME', 'GENERAL',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 4
        WHEN 'Anglais' THEN 3
        WHEN 'Allemand' THEN 2
        WHEN 'Mathématiques' THEN 4
        WHEN 'Histoire-Géographie' THEN 3
        WHEN 'SVT' THEN 3
        WHEN 'Physique-Chimie' THEN 3
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 2
        ELSE 1
    END,
    'COMPOSITION'
FROM pedagogie.matieres m
WHERE m.libelle_matiere IN (
    'Français', 'Anglais', 'Allemand', 'Mathématiques', 'Histoire-Géographie',
    'Sciences de la Vie et de la Terre (SVT)', 'Physique-Chimie',
    'Éducation Physique et Sportive (EPS)', 'Éducation Civique et Morale (ECM)'
);

-- SECONDE GÉNÉRALE (SECOND CYCLE)
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    'SECONDE', 'GENERALE',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 3
        WHEN 'Anglais' THEN 2
        WHEN 'Allemand' THEN 1
        WHEN 'Espagnol' THEN 1
        WHEN 'Mathématiques' THEN 3
        WHEN 'Histoire-Géographie' THEN 2
        WHEN 'SVT' THEN 2
        WHEN 'Physique-Chimie' THEN 2
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 1
        WHEN 'Informatique / TIC' THEN 2
        ELSE 1
    END,
    'EVALUATION_CONTINUE'
FROM pedagogie.matieres m
WHERE m.libelle_matiere IN (
    'Français', 'Anglais', 'Allemand', 'Espagnol', 'Mathématiques', 
    'Histoire-Géographie', 'Sciences de la Vie et de la Terre (SVT)', 
    'Physique-Chimie', 'Éducation Physique et Sportive (EPS)', 
    'Éducation Civique et Morale (ECM)', 'Informatique / TIC'
);

-- PREMIÈRE ET TERMINALE SÉRIE A4 (Littéraire - Langues)
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    classe, 'A4',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 5
        WHEN 'Philosophie' THEN 4
        WHEN 'Anglais' THEN 4
        WHEN 'Allemand' THEN 3
        WHEN 'Espagnol' THEN 3
        WHEN 'Littérature Générale' THEN 4
        WHEN 'Histoire-Géographie' THEN 3
        WHEN 'Mathématiques' THEN 2
        WHEN 'SVT' THEN 1
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 1
        ELSE 1
    END,
    'COMPOSITION'
FROM pedagogie.matieres m,
     (VALUES ('PREMIERE'), ('TERMINALE')) AS classes(classe)
WHERE m.libelle_matiere IN (
    'Français', 'Philosophie', 'Anglais', 'Allemand', 'Espagnol',
    'Littérature Générale', 'Histoire-Géographie', 'Mathématiques',
    'Sciences de la Vie et de la Terre (SVT)', 'Éducation Physique et Sportive (EPS)',
    'Éducation Civique et Morale (ECM)'
);

-- PREMIÈRE ET TERMINALE SÉRIE D (Sciences Naturelles)
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    classe, 'D',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 2
        WHEN 'Philosophie' THEN 2
        WHEN 'Anglais' THEN 2
        WHEN 'Mathématiques' THEN 4
        WHEN 'Physique-Chimie' THEN 5
        WHEN 'SVT' THEN 5
        WHEN 'Histoire-Géographie' THEN 1
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 1
        ELSE 1
    END,
    'COMPOSITION'
FROM pedagogie.matieres m,
     (VALUES ('PREMIERE'), ('TERMINALE')) AS classes(classe)
WHERE m.libelle_matiere IN (
    'Français', 'Philosophie', 'Anglais', 'Mathématiques',
    'Physique-Chimie', 'Sciences de la Vie et de la Terre (SVT)',
    'Histoire-Géographie', 'Éducation Physique et Sportive (EPS)',
    'Éducation Civique et Morale (ECM)'
);

-- PREMIÈRE ET TERMINALE SÉRIE C (Mathématiques et Sciences)
INSERT INTO pedagogie.coefficients_par_classe (classe, serie, matiere_id, coefficient_corrige, type_note)
SELECT 
    classe, 'C',
    m.id_matiere,
    CASE m.libelle_matiere
        WHEN 'Français' THEN 2
        WHEN 'Philosophie' THEN 2
        WHEN 'Anglais' THEN 2
        WHEN 'Mathématiques' THEN 5
        WHEN 'Physique-Chimie' THEN 5
        WHEN 'SVT' THEN 4
        WHEN 'Sciences de l''Ingénieur' THEN 4
        WHEN 'Histoire-Géographie' THEN 1
        WHEN 'EPS' THEN 1
        WHEN 'ECM' THEN 1
        ELSE 1
    END,
    'COMPOSITION'
FROM pedagogie.matieres m,
     (VALUES ('PREMIERE'), ('TERMINALE')) AS classes(classe)
WHERE m.libelle_matiere IN (
    'Français', 'Philosophie', 'Anglais', 'Mathématiques',
    'Physique-Chimie', 'Sciences de la Vie et de la Terre (SVT)',
    'Sciences de l''Ingénieur', 'Histoire-Géographie',
    'Éducation Physique et Sportive (EPS)', 'Éducation Civique et Morale (ECM)'
);

-- 4. VÉRIFICATION
SELECT 'Matieres créées' AS statut, COUNT(*) AS nombre FROM pedagogie.matieres;
SELECT 'Coefficients créés' AS statut, COUNT(*) AS nombre FROM pedagogie.coefficients_par_classe;
