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
        await client.query('TRUNCATE authentification.comptes CASCADE');

        const classes = ['6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'];
        const passwordPlaceholder = "NON_ACTIVE";

        // 1. DIRECTION (Justin KOARE)
        console.log("👑 Création du compte DIRECTION...");
        const hashAdmin = await bcrypt.hash('Grace2010Admin', 10);

        // On récupère l'id_user généré par le RETURNING id_user
        const resAdmin = await client.query(
            `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
             VALUES ($1, $2, $3, 'DIRECTION', $4, $5, TRUE) RETURNING id_user`,
            ['DIR-2026-001', 'KOARE', 'Justin', hashAdmin, 'direction@campus.bf']
        );

        const idAdminUser = resAdmin.rows[0].id_user;

        // Liaison avec le profil administratif (Script 10)
        await client.query(
            `INSERT INTO authentification.profils_administratifs (id_user, poste_occupe, signature_numerique_active) 
             VALUES ($1, 'Directeur Général', TRUE)`,
            [idAdminUser]
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

            const idEleveUser = resE.rows[0].id_user;
            const saClasse = classes[i % classes.length];

            // Attribution du profil élève (Script 05)
            await client.query(
                `INSERT INTO vie_scolaire.profils_eleves (id_user, classe_actuelle) VALUES ($1, $2)`,
                [idEleveUser, saClasse]
            );

            // B. Insertion du Parent
            const resP = await client.query(
                `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
                 VALUES ($1, $2, $3, 'PARENT', $4, $5, TRUE) RETURNING id_user`,
                [`PAR-2026-${3000 + i}`, nomFamille, faker.person.firstName(), passwordPlaceholder, `parent${i}@mail.bf`]
            );

            const idParentUser = resP.rows[0].id_user;

            // Liaison avec le profil parent (Script 04)
            await client.query(
                `INSERT INTO gestion_ape.profils_parents (id_user, profession) 
                 VALUES ($1, $2)`,
                [idParentUser, faker.person.jobTitle()]
            );

            if (i % 50 === 0 && i !== 0) {
                console.log(`🚀 ${i} familles injectées (Comptes + Profils)...`);
            }
        }

        // 2.5 SURVEILLANTS (Moniteurs)
        console.log("👮 Création des Surveillants...");
        const surveillants_data = [
            { code: "SURV-2026-001", nom: "COULIBALY", prenom: "Moussa", poste: "Surveillant Général" },
            { code: "SURV-2026-002", nom: "KONE", prenom: "Hama", poste: "Surveillant Discipline" },
            { code: "SURV-2026-003", nom: "DIALLO", prenom: "Awa", poste: "Surveillante Absences" }
        ];

        for (const surv of surveillants_data) {
            const resSurv = await client.query(
                `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
                 VALUES ($1, $2, $3, 'SURVEILLANT', $4, $5, TRUE) RETURNING id_user`,
                [surv.code, surv.nom, surv.prenom, passwordPlaceholder, `${surv.code.toLowerCase()}@campus.bf`]
            );

            const idSurvUser = resSurv.rows[0].id_user;

            // Liaison avec le profil administratif
            await client.query(
                `INSERT INTO authentification.profils_administratifs (id_user, poste_occupe, signature_numerique_active) 
                 VALUES ($1, $2, FALSE)`,
                [idSurvUser, surv.poste]
            );
        }

        // 3. ALUMNI (Anciens élèves)
        console.log("⏳ Création de quelques ALUMNI (Anciens)...");
        const alumni_data = [
            { code: "ALUMNI-2026-001", nom: "OUEDRAOGO", prenom: "Abdoulaye" },
            { code: "ALUMNI-2026-002", nom: "TRAORE", prenom: "Fatoumata" },
            { code: "ALUMNI-2026-003", nom: "KONE", prenom: "Mohamed" }
        ];

        for (const alum of alumni_data) {
            await client.query(
                `INSERT INTO authentification.comptes (code_unique, nom, prenom, role_actuel, mot_de_passe, email, est_actif) 
                    VALUES ($1, $2, $3, 'ALUMNI', $4, $5, TRUE)`,
                [alum.code, alum.nom, alum.prenom, passwordPlaceholder, `${alum.code.toLowerCase()}@alumni.bf`]
            );
        }

        console.log("\n🎯 TERMINÉ ! L'établissement est prêt.");
        console.log("� Justin KOARE (DIR-2026-001) : Directeur Général");
        console.log("👮 3 Surveillants créés (SURV-2026-001/002/003)");
        console.log("👥 500 Élèves : Profils scolaires créés.");
        console.log("👨‍👩‍👧 500 Parents : Profils APE créés.");
        console.log("🎓 3 ALUMNI : Profils créés.");
        console.log("\n💡 TOUS LES COMPTES : Mot de passe initial = 'NON_ACTIVE' (à activer au 1er login)");

    } catch (err) {
        console.error("\n❌ ERREUR DURANT LA SIMULATION :");
        console.error("Message :", err.message);
    } finally {
        await client.end();
    }
}

simulationMassive();