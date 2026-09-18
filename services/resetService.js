// ================================================================
// RÉINITIALISATION COMPLÈTE — sert le bouton "Zone dangereuse" de
// Direction, ET RESET_AVANT_DEPLOIEMENT_REEL.sql (usage manuel en
// ligne de commande) reste utilisable séparément — les deux existent
// en parallèle, l'un ne remplace pas l'autre.
//
// Sécurité : cette fonction ne vérifie ni le rôle ni le mot de passe
// ni la phrase de confirmation — c'est la responsabilité de l'appelant
// (voir adminController.reinitialisationComplete). Ne jamais brancher
// ça sur une route sans ces trois vérifications.
// ================================================================
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const CHEMIN_SQL_RESET = path.join(__dirname, '..', 'campus_numerique_db', 'depannage', 'nettoyage', 'RESET_AVANT_DEPLOIEMENT_REEL.sql');
const GARDER_PREFIXES_STOCKAGE = ['logo_', 'espace_'];

// ✅ Lit la vraie liste de tables directement dans le script SQL (bloc
// TRUNCATE TABLE ... CASCADE) plutôt que de la retaper à la main ici —
// exactement le genre de double-liste qui a fini par diverger avec
// coefficients/images_espaces (18-19/09/2026). Une seule source de
// vérité : le script lui-même.
function listerTablesAVider() {
    const sql = fs.readFileSync(CHEMIN_SQL_RESET, 'utf8');
    const debut = sql.indexOf('TRUNCATE TABLE');
    const fin = sql.indexOf('CASCADE;', debut);
    if (debut === -1 || fin === -1) {
        throw new Error('Impossible de retrouver le bloc TRUNCATE TABLE dans le script SQL — format inattendu.');
    }
    const bloc = sql.slice(debut + 'TRUNCATE TABLE'.length, fin);
    return bloc
        .split('\n')
        .map(ligne => ligne.replace(/--.*$/, '').trim()) // retire les commentaires
        .join(' ')
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
}

// Snapshot complet de toutes les tables sur le point d'être vidées —
// à appeler et faire réussir AVANT tout TRUNCATE (lecture seule, donc
// sans risque). Si une seule table échoue, toute l'archive échoue :
// on préfère ne pas vider la base plutôt que de la vider sans
// sauvegarde fiable.
async function construireArchive() {
    const tables = listerTablesAVider();
    const contenu = {};
    for (const table of tables) {
        const r = await db.query(`SELECT * FROM ${table}`);
        contenu[table] = r.rows;
    }
    return {
        date_archive: new Date().toISOString(),
        raison: 'Sauvegarde automatique avant réinitialisation complète',
        tables: contenu,
    };
}

// Exécute le TRUNCATE + recrée le compte Direction générique — même
// fichier SQL que l'usage manuel en ligne de commande.
async function executerResetComplet() {
    const sql = fs.readFileSync(CHEMIN_SQL_RESET, 'utf8');
    await db.query(sql);
}

// Vide le bucket Supabase Storage des fichiers par compte, garde
// logo_*/espace_* — même logique que nettoyer_stockage_supabase.js.
async function nettoyerStockage() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return { supabase_configure: false, supprimes: 0 };
    }
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

    const { data: fichiers, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
    if (error) throw new Error('Listage bucket échoué: ' + error.message);

    const aSupprimer = fichiers.filter(f => !GARDER_PREFIXES_STOCKAGE.some(p => f.name.startsWith(p)));
    if (!aSupprimer.length) return { supabase_configure: true, supprimes: 0 };

    const { data: suppr, error: errSuppr } = await supabase.storage.from(BUCKET).remove(aSupprimer.map(f => f.name));
    if (errSuppr) throw new Error('Suppression bucket échouée: ' + errSuppr.message);
    return { supabase_configure: true, supprimes: suppr.length };
}

module.exports = { listerTablesAVider, construireArchive, executerResetComplet, nettoyerStockage };
