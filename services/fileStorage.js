// ================================================================
// CAMPUS NUMÉRIQUE FASO — services/fileStorage.js
// Stocke les fichiers uploadés (photos de profil, ressources
// pédagogiques, copies scannées, médias salle des profs) sur Supabase
// Storage plutôt que sur le disque local du serveur : le disque de
// Render est éphémère et est effacé à chaque redéploiement, ce qui
// ferait perdre tous les fichiers déjà uploadés à la prochaine mise à
// jour du code. Si Supabase Storage n'est pas configuré (dev local
// sans les variables d'env), on retombe sur le disque local comme
// avant — même logique de dégradation gracieuse que firebaseAdmin.js.
// ================================================================
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        console.log('✅ Supabase Storage activé (uploads persistants)');
    } catch (e) {
        console.warn('⚠️ Supabase Storage non initialisé:', e.message);
    }
} else {
    console.warn('⚠️ SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY absents — uploads stockés sur disque local (non persistant sur Render)');
}

const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

exports.isEnabled = () => !!supabase;

/**
 * Enregistre un fichier reçu via multer.memoryStorage() (req.file avec
 * .buffer) et renvoie son URL publique.
 * - Supabase Storage configuré : URL absolue https://... (persiste entre
 *   les redéploiements).
 * - Sinon (dev local) : écrit sur disque et renvoie une URL relative
 *   /uploads/... comme avant.
 *
 * options.prefix : préfixe du nom de fichier (ex: 'photo', 'res', 'copie').
 * options.keyed  : si fourni (ex: id utilisateur), le nom de fichier est
 *   déterministe (remplace l'ancien fichier au lieu d'en créer un nouveau
 *   à chaque upload) — utilisé pour les photos de profil.
 */
exports.saveUploadedFile = async (file, { prefix = 'file', keyed } = {}) => {
    const ext = path.extname(file.originalname) || '';
    const filename = keyed
        ? `${prefix}_${keyed}${ext}`
        : `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;

    if (supabase) {
        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filename, file.buffer, { contentType: file.mimetype, upsert: !!keyed });
        if (error) throw new Error('Upload Supabase Storage échoué: ' + error.message);
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        return data.publicUrl;
    }

    fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, filename), file.buffer);
    return `/uploads/${filename}`;
};
