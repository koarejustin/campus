const { Pool } = require('pg');
const path = require('path');

// Configuration du chemin vers le fichier .env
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// Initialisation du Pool de connexion
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'campus_numerique_db',
    password: String(process.env.DB_PASSWORD),
    port: process.env.DB_PORT || 5432,
    // ⚠️ AJOUT CRUCIAL : Force l'encodage client en UTF8 pour les accents
    options: "-c client_encoding=UTF8"
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
    release();
});

module.exports = pool;