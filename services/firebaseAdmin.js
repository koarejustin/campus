// ================================================================
// CAMPUS NUMÉRIQUE FASO — services/firebaseAdmin.js
// Initialise Firebase Admin (clé de service dans config/secrets/,
// jamais versionnée — voir .gitignore) et expose sendPush().
// ================================================================
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'config', 'secrets', 'firebase-service-account.json');

let messaging = null;
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    try {
        const { initializeApp, getApps, cert } = require('firebase-admin/app');
        const { getMessaging } = require('firebase-admin/messaging');
        const serviceAccount = require(SERVICE_ACCOUNT_PATH);
        if (!getApps().length) {
            initializeApp({ credential: cert(serviceAccount) });
        }
        messaging = getMessaging();
        console.log('✅ Firebase Admin initialisé (notifications push actives)');
    } catch (e) {
        console.warn('⚠️ Firebase Admin non initialisé:', e.message);
    }
} else {
    console.warn('⚠️ config/secrets/firebase-service-account.json introuvable — notifications push désactivées');
}

// Envoie une notification push à une liste de tokens FCM. Retire
// silencieusement les tokens invalides/expirés (appareil désinstallé,
// permission retirée) — ne bloque jamais le flux principal (la notification
// in-app en base est toujours créée, que le push réussisse ou non).
exports.sendPush = async (tokens, { title, body, data = {} }) => {
    if (!messaging || !tokens || !tokens.length) return { sent: 0, invalides: [] };

    const dataStr = {};
    for (const [k, v] of Object.entries(data)) dataStr[k] = String(v ?? '');

    try {
        const res = await messaging.sendEachForMulticast({
            tokens,
            notification: { title: title || 'Campus Numérique', body: body || '' },
            data: dataStr,
        });
        const invalides = [];
        res.responses.forEach((r, i) => {
            if (!r.success && ['messaging/invalid-registration-token', 'messaging/registration-token-not-registered'].includes(r.error?.code)) {
                invalides.push(tokens[i]);
            }
        });
        return { sent: res.successCount, invalides };
    } catch (e) {
        console.error('sendPush error:', e.message);
        return { sent: 0, invalides: [] };
    }
};

exports.isEnabled = () => !!messaging;
