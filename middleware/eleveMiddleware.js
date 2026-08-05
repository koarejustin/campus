/**
 * MIDDLEWARE DE SÉCURITÉ - ESPACE ALUMNI
 * Campus Numérique FASO
 *
 * Ce middleware vérifie côté SERVEUR que :
 * 1. L'utilisateur est bien authentifié (token JWT valide)
 * 2. Son rôle dans la base est bien 'ALUMNI'
 * 3. Son compte est actif
 *
 * Sans ce middleware, n'importe quel utilisateur avec un token valide
 * (élève, prof, parent…) pourrait appeler les routes /alumni/...
 */

const db = require('../config/db');

const requireAlumni = async (req, res, next) => {
    try {
        // req.user est rempli par authMiddleware (vérification JWT)
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Non authentifié. Veuillez vous connecter.'
            });
        }

        // Vérification en base : le rôle doit être ALUMNI et le compte actif
        const result = await db.query(
            `SELECT role_actuel, est_actif
             FROM authentification.comptes
             WHERE id_user = $1`,
            [userId]
        );

        if (!result.rows.length) {
            return res.status(401).json({
                success: false,
                message: 'Compte introuvable.'
            });
        }

        const { role_actuel, est_actif } = result.rows[0];

        if (!est_actif) {
            return res.status(403).json({
                success: false,
                message: 'Compte désactivé. Contactez l\'administration.'
            });
        }

        if (role_actuel !== 'ALUMNI') {
            // Log de la tentative d'accès non autorisé
            console.warn(
                `[SECURITE] Tentative d'accès non autorisé à l'espace Alumni :`,
                `userId=${userId}, role=${role_actuel}, path=${req.path}`
            );
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Cet espace est réservé aux anciens élèves (Alumni).'
            });
        }

        // Tout est OK, on continue
        next();

    } catch (error) {
        console.error('requireAlumni middleware error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la vérification des droits.'
        });
    }
};

module.exports = requireAlumni;
