/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  SYNCHRONISATION DES CONVOCATIONS EN TEMPS RÉEL
 *  
 *  À ajouter à server.js ou routes/convocationsSocket.js
 *  Synchronise les statuts de convocations avec le tableau de bord moyennes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const db = require('./config/db');

/**
 * Événements WebSocket pour les convocations
 */
function setupConvocationsSocket(io) {

    io.on('connection', (socket) => {

        // ═══════════════════════════════════════════════════════════════════════════════
        // 1. Quand un parent consulte une convocation
        // ═══════════════════════════════════════════════════════════════════════════════

        socket.on('convocation:consulter', async (data) => {
            try {
                const { id_convocation, id_eleve, id_parent } = data;

                // Mettre à jour le statut en BDD
                await db.query(`
                    UPDATE gestion.convocations
                    SET 
                        statut = 'LU',
                        date_consultation = NOW(),
                        lu_par_parent = true
                    WHERE id_convocation = $1 AND id_eleve = $2
                `, [id_convocation, id_eleve]);

                // Notifier le directeur/surveillant
                io.to(`role-direction`).emit('convocation:mise-a-jour', {
                    id_convocation: id_convocation,
                    statut: 'LU',
                    date_consultation: new Date(),
                    message: `Convocation consultée par le parent`
                });

                // Notifier l'élève
                io.to(`eleve-${id_eleve}`).emit('convocation-maj', {
                    id_convocation: id_convocation,
                    nouveau_statut: 'LU'
                });

                console.log(`✓ Convocation ${id_convocation} consultée`);

            } catch (error) {
                console.error('Erreur convocation:consulter', error);
                socket.emit('error', { message: 'Erreur lors de la consultation' });
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // 2. Quand un parent valide un accusé de réception
        // ═══════════════════════════════════════════════════════════════════════════════

        socket.on('convocation:accuser-reception', async (data) => {
            try {
                const { id_convocation, id_eleve, id_parent, observations } = data;

                // Mettre à jour en BDD
                await db.query(`
                    UPDATE gestion.convocations
                    SET 
                        statut = 'VALIDE',
                        accusé_reception_date = NOW(),
                        accusé_reception_parent = $1,
                        observations_parent = $2,
                        lu_par_parent = true
                    WHERE id_convocation = $1 AND id_eleve = $2
                `, [id_convocation, id_eleve, id_parent, observations || null]);

                // Mettre à jour notification de gestion
                await db.query(`
                    UPDATE gestion.notifications
                    SET 
                        lue = true,
                        statut = 'VALIDE'
                    WHERE id_convocation = $1 AND id_user = $2
                `, [id_convocation, id_parent]);

                // Notifier direction/surveillance
                io.to(`role-direction`).emit('convocation:validee', {
                    id_convocation: id_convocation,
                    id_eleve: id_eleve,
                    date_validation: new Date(),
                    observations: observations
                });

                // Mettre à jour le tableau de bord de l'élève
                io.to(`eleve-${id_eleve}`).emit('tableau-de-bord:mise-a-jour', {
                    convocations_en_attente: await compterConvocationsEnAttente(id_eleve),
                    statut_convocations: 'VALIDEE'
                });

                // Mettre à jour la notification
                io.to(`parent-${id_parent}`).emit('notification:updated', {
                    type: 'CONVOCATION',
                    message: 'Accusé de réception enregistré',
                    statut: 'VALIDE'
                });

                console.log(`✓ Convocation ${id_convocation} validée par parent`);

            } catch (error) {
                console.error('Erreur convocation:accuser-reception', error);
                socket.emit('error', { message: 'Erreur lors de la validation' });
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // 3. Quand une nouvelle convocation est créée
        // ═══════════════════════════════════════════════════════════════════════════════

        socket.on('convocation:creee', async (data) => {
            try {
                const { id_eleve, motif, description, id_createur } = data;

                // Créer la convocation en BDD
                const convRes = await db.query(`
                    INSERT INTO gestion.convocations 
                    (id_eleve, motif, description, date_convocation, statut, creee_par)
                    VALUES ($1, $2, $3, NOW(), 'EN_ATTENTE', $4)
                    RETURNING id_convocation, date_convocation
                `, [id_eleve, motif, description, id_createur]);

                const { id_convocation, date_convocation } = convRes.rows[0];

                // Récupérer les parents de l'élève
                const parentsRes = await db.query(`
                    SELECT DISTINCT p.id_user 
                    FROM vie_scolaire.relations_parents_eleves rpe
                    JOIN authentification.comptes p ON p.id_user = rpe.id_parent
                    WHERE rpe.id_eleve = $1
                `, [id_eleve]);

                // Créer des notifications pour chaque parent
                for (const parent of parentsRes.rows) {
                    await db.query(`
                        INSERT INTO gestion.notifications 
                        (id_user, type, message, id_convocation, statut, lue)
                        VALUES ($1, 'CONVOCATION', $2, $3, 'EN_ATTENTE', false)
                    `, [parent.id_user, `Nouvelle convocation : ${motif}`, id_convocation]);

                    // Notifier le parent en temps réel
                    io.to(`parent-${parent.id_user}`).emit('convocation:nouvelle', {
                        id_convocation: id_convocation,
                        motif: motif,
                        description: description,
                        date: date_convocation,
                        statut: 'EN_ATTENTE'
                    });
                }

                // Notifier l'élève
                io.to(`eleve-${id_eleve}`).emit('tableau-de-bord:mise-a-jour', {
                    convocations_en_attente: (parentsRes.rows || []).length,
                    message: 'Vous avez reçu une nouvelle convocation'
                });

                console.log(`✓ Nouvelle convocation ${id_convocation} créée`);

            } catch (error) {
                console.error('Erreur convocation:creee', error);
                socket.emit('error', { message: 'Erreur lors de la création' });
            }
        });

        // ═══════════════════════════════════════════════════════════════════════════════
        // 4. Requête : Compter les convocations en attente
        // ═══════════════════════════════════════════════════════════════════════════════

        socket.on('convocations:compter', async (data) => {
            try {
                const { id_eleve } = data;

                const countRes = await db.query(`
                    SELECT COUNT(*) as total, 
                           SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END) as en_attente,
                           SUM(CASE WHEN statut = 'LU' THEN 1 ELSE 0 END) as lues,
                           SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END) as validees
                    FROM gestion.convocations
                    WHERE id_eleve = $1
                `, [id_eleve]);

                socket.emit('convocations:count-result', countRes.rows[0]);

            } catch (error) {
                console.error('Erreur convocations:compter', error);
                socket.emit('error', { message: 'Erreur lors du comptage' });
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compter les convocations en attente pour un élève
 */
async function compterConvocationsEnAttente(id_eleve) {
    const res = await db.query(`
        SELECT COUNT(*) as total FROM gestion.convocations
        WHERE id_eleve = $1 AND statut = 'EN_ATTENTE'
    `, [id_eleve]);

    return parseInt(res.rows[0].total) || 0;
}

/**
 * Mettre à jour les statistiques de convocations
 */
async function mettreAJourStatistiquesConvocations(id_eleve, io) {
    const stats = await db.query(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END) as en_attente,
            SUM(CASE WHEN statut = 'LU' THEN 1 ELSE 0 END) as lues,
            SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END) as validees
        FROM gestion.convocations
        WHERE id_eleve = $1
    `, [id_eleve]);

    // Émettre les stats au tableau de bord
    io.to(`eleve-${id_eleve}`).emit('convocations:statistiques', stats.rows[0]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTÉGRATION AVEC MOYENNES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mettre à jour le badge des convocations sur le tableau de bord
 * Appelé quand les moyennes se mettent à jour
 */
async function synchroniserConvocationsAvecMoyennes(id_eleve, io) {
    try {
        // Récupérer les convocations
        const convRes = await db.query(`
            SELECT 
                id_convocation,
                motif,
                statut,
                date_convocation
            FROM gestion.convocations
            WHERE id_eleve = $1
            ORDER BY date_convocation DESC
            LIMIT 5
        `, [id_eleve]);

        // Émettre les convocations au tableau de bord
        io.to(`eleve-${id_eleve}`).emit('tableau-de-bord:convocations-maj', {
            convocations: convRes.rows,
            nombre_en_attente: convRes.rows.filter(c => c.statut === 'EN_ATTENTE').length
        });

    } catch (error) {
        console.error('Erreur synchronisation convocations:', error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    setupConvocationsSocket,
    compterConvocationsEnAttente,
    mettreAJourStatistiquesConvocations,
    synchroniserConvocationsAvecMoyennes
};

/**
 * UTILISATION DANS SERVER.JS :
 * 
 * const { setupConvocationsSocket, synchroniserConvocationsAvecMoyennes } = require('./routes/convocationsSocket');
 * 
 * io.on('connection', (socket) => {
 *     setupConvocationsSocket(io);
 * });
 * 
 * // Quand une nouvelle note est ajoutée :
 * // await synchroniserConvocationsAvecMoyennes(id_eleve, io);
 */
