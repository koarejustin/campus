const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { fakerFR: faker } = require('@faker-js/faker');

const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'campus_numerique_db',
    password: 'Grace2010',
    port: 5432,
});

async function simulationMassive() {
    try {
        await client.connect();
        console.log("✅ Connexion à PostgreSQL réussie !");

        console.log("🧹 Nettoyage des schémas...");
        // On nettoie tout pour repartir sur une base propre
        await client.query('TRUNCATE authentification.comptes CASCADE');

        const classes = ['6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'];

        // Un mot de passe par défaut "scellé" pour les comptes non activés (évite l'erreur NOT NULL)
        const passwordPlaceholder = "NON_ACTIVE";

        // 1. DIRECTION
        console.log("👑 Création du compte DIRECTION...");
        const hashAdmin = await bcrypt.hash('Grace2010Admin', 10);
        await client.query(
            `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
             VALUES ($1, $2, $3, 'DIRECTION', $4, $5, TRUE)`,
            ['DIR-2026-001', 'KOARE', 'Justin', hashAdmin, 'direction@campus.bf']
        );

        // 2. ÉLÈVES ET PARENTS
        console.log("⏳ Création de 500 familles (Élèves + Parents)...");

        for (let i = 0; i < 500; i++) {
            const nomFamille = faker.person.lastName().toUpperCase();

            // A. Insertion de l'Élève
            const resE = await client.query(
                `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
                    VALUES ($1, $2, $3, 'ELEVE', $4, $5, TRUE) RETURNING id_user`,
                [`CN-2026-${2000 + i}`, nomFamille, faker.person.firstName(), passwordPlaceholder, `eleve${i}@ecole.bf`]
            );

            const idEleve = resE.rows[0].id_user;
            const saClasse = classes[i % classes.length];

            // B. Attribution de la classe dans vie_scolaire
            await client.query(
                `INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle) VALUES ($1, $2)`,
                [idEleve, saClasse]
            );

            // C. Insertion du Parent
            await client.query(
                `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
                 VALUES ($1, $2, $3, 'PARENT', $4, $5, TRUE)`,
                [`PAR-2026-${3000 + i}`, nomFamille, faker.person.firstName(), passwordPlaceholder, `parent${i}@mail.bf`]
            );

            if (i % 50 === 0 && i !== 0) {
                console.log(`🚀 ${i} familles injectées...`);
            }
        }

        console.log("\n🎯 TERMINÉ ! L'établissement est prêt.");
        console.log("👉 Justin KOARE (Admin) créé.");
        console.log("👉 500 Élèves et 500 Parents créés.");

    } catch (err) {
        console.error("\n❌ ERREUR DURANT LA SIMULATION :");
        console.error("Message :", err.message);
        console.error("Détail :", err.detail || "Pas de détail");
    } finally {
        await client.end();
    }
}

simulationMassive();