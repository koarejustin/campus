// ================================================================
// NETTOYAGE DU BUCKET SUPABASE STORAGE — compagnon de
// RESET_AVANT_DEPLOIEMENT_REEL.sql
// ================================================================
// TRUNCATE (SQL) ne touche QUE la base Postgres — les fichiers déjà
// uploadés (photos, ressources, copies scannées, messages vocaux/
// vidéo...) restent dans Supabase Storage, orphelins, et finissent
// par saturer l'espace de stockage si on répète les resets sans les
// nettoyer (voir services/fileStorage.js pour le detail des préfixes).
//
// GARDE (jamais supprimé, même ici) :
//   - logo_*    → logo de l'école (gestion.configuration.logo_url)
//   - espace_*  → photos des 6 cartes du portail (gestion.images_espaces)
// SUPPRIME : tout le reste — photo_*, photo-eleve_*, res_*, copie_*,
//   msg_* (photos de profil, ressources, copies scannées, messages
//   vocaux/vidéo/image) : du contenu par compte, sans valeur une fois
//   les comptes vidés.
//
// Usage : node campus_numerique_db/depannage/nettoyage/nettoyer_stockage_supabase.js
// (à lancer juste avant ou après RESET_AVANT_DEPLOIEMENT_REEL.sql —
// l'ordre n'a pas d'importance, les deux nettoyages sont indépendants)
// ================================================================
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
const GARDER_PREFIXES = ['logo_', 'espace_'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents — rien à nettoyer (uploads sur disque local).');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

(async () => {
    const { data: fichiers, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
    if (error) {
        console.error('❌ Impossible de lister le bucket:', error.message);
        process.exit(1);
    }

    const aGarder = fichiers.filter(f => GARDER_PREFIXES.some(p => f.name.startsWith(p)));
    const aSupprimer = fichiers.filter(f => !GARDER_PREFIXES.some(p => f.name.startsWith(p)));

    console.log(`📦 ${fichiers.length} fichier(s) dans le bucket "${BUCKET}"`);
    console.log(`✅ ${aGarder.length} gardé(s) : ${aGarder.map(f => f.name).join(', ') || '(aucun)'}`);
    console.log(`🗑️  ${aSupprimer.length} à supprimer.`);

    if (!aSupprimer.length) {
        console.log('Rien à supprimer, bucket déjà propre.');
        process.exit(0);
    }

    const { data: suppr, error: errSuppr } = await supabase.storage
        .from(BUCKET)
        .remove(aSupprimer.map(f => f.name));
    if (errSuppr) {
        console.error('❌ Erreur suppression:', errSuppr.message);
        process.exit(1);
    }

    console.log(`✅ ${suppr.length} fichier(s) supprimé(s) du bucket.`);
    process.exit(0);
})();
