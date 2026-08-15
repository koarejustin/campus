const { Pool } = require('pg');
const path = require('path');

// Configuration du chemin vers le fichier .env
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// ✅ Supabase/Render exigent une connexion chiffrée (SSL) — absent avant,
// ce qui aurait fait échouer toute connexion une fois hébergé (fonctionnait
// seulement en local où SSL n'est pas exigé par un Postgres local par défaut).
// DATABASE_URL (fournie automatiquement par Supabase/Render) est prioritaire
// sur les champs séparés DB_* — pratique conservée pour le développement local.
const useConnectionString = !!process.env.DATABASE_URL;
const needsSSL = useConnectionString || process.env.DB_SSL === 'true';

const pool = new Pool({
    ...(useConnectionString
        ? { connectionString: process.env.DATABASE_URL }
        : {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || '127.0.0.1',
            database: process.env.DB_NAME || 'campus_numerique_db',
            password: String(process.env.DB_PASSWORD),
            port: process.env.DB_PORT || 5432,
        }),
    // Supabase utilise un certificat valide mais la chaîne de confiance
    // intermédiaire n'est pas toujours reconnue par Node — rejectUnauthorized
    // à false est la pratique standard recommandée par Supabase elle-même.
    ssl: needsSSL ? { rejectUnauthorized: false } : false,
    // ⚠️ AJOUT CRUCIAL : Force l'encodage client en UTF8 pour les accents + timezone Ouagadougou
    options: "-c client_encoding=UTF8 -c timezone=Africa/Ouagadougou"
});

// Test de connexion automatique au démarrage du serveur
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERREUR SQL : Impossible de se connecter à la base de données.');
        console.error('- Vérifie que PostgreSQL est lancé.');
        console.error('- Erreur précise :', err.message);
        return;
    }
    // Ajout d'une vérification visuelle dans la console
    console.log('✅ Connecté avec succès à la base : ' + process.env.DB_NAME);
    console.log('✅ Encodage forcé : UTF-8');
    console.log('✅ Timezone forcé : Africa/Ouagadougou');
    release();
});

module.exports = pool;