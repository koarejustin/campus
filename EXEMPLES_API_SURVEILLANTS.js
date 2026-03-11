// ============================================
// EXEMPLES PRATIQUES - API Surveillants
// Campus Numérique FASO
// ============================================

// 📌 À ajouter dans: frontend/script.js ou direction.html (section script)

/**
 * 1️⃣ GESTION DES ABSENCES
 */

// Enregistrer une absence
async function recordAbsence(id_eleve, date, raison) {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const response = await fetch('/api/surveillants/absences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_eleve: id_eleve,
                date: date,
                justification: false,
                raison: raison
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Absence enregistrée:', data.absence);
            alert('Absence enregistrée avec succès');
            return data.absence;
        } else {
            throw new Error('Erreur lors de l\'enregistrement');
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('Erreur: ' + error.message);
    }
}

// Consulter les absences
async function getAbsences(filtres = {}) {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        let url = '/api/surveillants/absences?';
        if (filtres.classe) url += `classe=${filtres.classe}&`;
        if (filtres.justifiee !== undefined) url += `justifiee=${filtres.justifiee}&`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`📊 ${data.count} absences trouvées:`);
            console.table(data.absences);
            return data.absences;
        }
    } catch (error) {
        console.error('❌ Erreur récupération absences:', error);
    }
}

// Exemple d'utilisation:
// recordAbsence('uuid-eleve', '2026-02-17', 'Maladie avec justificatif médical');
// getAbsences({ classe: '3e', justifiee: false });

/**
 * 2️⃣ GESTION DES CONVOCATIONS (PRIVÉES)
 */

// Créer une convocation
async function createConvocation(id_eleve, sujet, description, date_convocation) {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const response = await fetch('/api/surveillants/convocations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                id_eleve: id_eleve,
                sujet: sujet,
                description: description,
                date_convocation: date_convocation,
                motif: 'DISCIPLINE'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Convocation créée:', data.convocation);
            alert('Convocation créée et envoyée à l\'élève et son parent');
            return data.convocation;
        }
    } catch (error) {
        console.error('❌ Erreur création convocation:', error);
        alert('Erreur: ' + error.message);
    }
}

// Récupérer les convocations
async function getConvocations(filtres = {}) {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        let url = '/api/surveillants/convocations?';
        if (filtres.id_eleve) url += `id_eleve=${filtres.id_eleve}&`;
        if (filtres.statut) url += `statut=${filtres.statut}&`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`📋 ${data.count} convocations trouvées`);
            return data.convocations;
        }
    } catch (error) {
        console.error('❌ Erreur récupération convocations:', error);
    }
}

// Exemple d'utilisation:
// createConvocation('uuid-eleve', 'Retard réitéré', 'Discussion sur l\'assiduité', '2026-02-20T15:00:00');
// getConvocations({ statut: 'EN_ATTENTE' });

/**
 * 3️⃣ COHÉSION SCOLAIRE & PRÉVENTION
 */

// Envoyer un message de prévention
async function sendPreventionMessage(titre, contenu, type_classe = 'TOUT') {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const response = await fetch('/api/surveillants/prevention-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                titre: titre,
                contenu: contenu,
                destinataires: ['TOUS'],
                type_classe: type_classe
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Message de prévention envoyé:', data.prevention_message);
            alert('Message de sensibilisation envoyé à tous les élèves');
            return data.prevention_message;
        }
    } catch (error) {
        console.error('❌ Erreur envoi message prévention:', error);
        alert('Erreur: ' + error.message);
    }
}

// Signaler un incident / Tension
async function reportIncident(titre, description, type_incident, eleves_impliques, urgence = 'NORMALE') {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const response = await fetch('/api/surveillants/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                titre: titre,
                description: description,
                type_incident: type_incident,
                eleves_impliques: eleves_impliques,
                urgence: urgence
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Incident signalé:', data.incident);
            alert('Incident signalé et rapportés à la direction');
            return data.incident;
        }
    } catch (error) {
        console.error('❌ Erreur signalement incident:', error);
        alert('Erreur: ' + error.message);
    }
}

// Exemples d'utilisation:
/*
sendPreventionMessage(
    'Sensibilisation - Harcèlement Scolaire',
    `Le harcèlement scolaire est un problème sérieux.
    Si vous êtes victime, parlez à un adulte de confiance...`,
    'TOUT'
);

reportIncident(
    'Altercation entre élèves',
    'Altercation verbale entre deux élèves en cours de récréation',
    'ALTERCATION',
    ['uuid-eleve1', 'uuid-eleve2'],
    'HAUTE'
);
*/

/**
 * 4️⃣ CANAL OFFICIEL - ANNONCES
 */

// Publier une annonce officielle
async function publishOfficialAnnouncement(titre, contenu, type_annonce) {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const response = await fetch('/api/surveillants/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                titre: titre,
                contenu: contenu,
                type_annonce: type_annonce,
                destinataires: 'TOUS'
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Annonce officielle publiée');
            alert('Annonce publiée et visible par tous les élèves et parents');
            return data.announcement;
        }
    } catch (error) {
        console.error('❌ Erreur publication annonce:', error);
        alert('Erreur: ' + error.message);
    }
}

// Exemple:
/*
publishOfficialAnnouncement(
    'Dates d\'examens confirmées',
    'Les dates des examens du trimestre 2 sont confirmées pour le 1er mars 2026',
    'EXAMENS'
);
*/

/**
 * 5️⃣ LECTURE - LISTE DES SURVEILLANTS
 */

// Récupérer la liste des surveillants
async function getSurveillants() {
    try {
        const user = JSON.parse(localStorage.getItem('user_session') || '{}');
        const token = user.token;

        const response = await fetch('/api/surveillants/list', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`👮 ${data.count} surveillants trouvés:`);
            console.table(data.surveillants);
            return data.surveillants;
        }
    } catch (error) {
        console.error('❌ Erreur récupération surveillants:', error);
    }
}

// ============================================
// INTÉGRATION AUX BOUTONS HTML
// ============================================

// À ajouter aux boutons dans direction.html

/*
<!-- Bouton: Enregistrer une Absence -->
<button onclick="showAbsenceForm()" class="w-full py-2.5 px-4...">
    <i data-lucide="plus" class="w-4 h-4 inline mr-2"></i>
    Enregistrer une Absence
</button>

<!-- Bouton: Créer Convocation -->
<button onclick="showConvocationForm()" class="w-full py-2.5 px-4...">
    <i data-lucide="edit" class="w-4 h-4 inline mr-2"></i>
    Créer une Convocation
</button>

<!-- Bouton: Message Prévention -->
<button onclick="showPreventionForm()" class="py-2.5 px-4...">
    <i data-lucide="send" class="w-4 h-4 inline mr-2"></i>
    Envoyer Message de Prévention
</button>

<!-- Bouton: Signaler Incident -->
<button onclick="showIncidentForm()" class="py-2.5 px-4...">
    <i data-lucide="alert-circle" class="w-4 h-4 inline mr-2"></i>
    Signaler une Tension/Incident
</button>
*/

// Fonctions modales pour les formulaires
function showAbsenceForm() {
    const id_eleve = prompt('Entrer l\'ID de l\'élève:');
    const date = prompt('Date de l\'absence (YYYY-MM-DD):');
    const raison = prompt('Raison de l\'absence:');

    if (id_eleve && date && raison) {
        recordAbsence(id_eleve, date, raison);
    }
}

function showConvocationForm() {
    const id_eleve = prompt('Entrer l\'ID de l\'élève:');
    const sujet = prompt('Sujet de la convocation:');
    const description = prompt('Description:');
    const date = prompt('Date et heure (YYYY-MM-DDTHH:mm:ss):');

    if (id_eleve && sujet && description && date) {
        createConvocation(id_eleve, sujet, description, date);
    }
}

function showPreventionForm() {
    const titre = prompt('Titre du message:');
    const contenu = prompt('Contenu du message de sensibilisation:');

    if (titre && contenu) {
        sendPreventionMessage(titre, contenu);
    }
}

function showIncidentForm() {
    const titre = prompt('Titre de l\'incident:');
    const description = prompt('Description:');
    const type = prompt('Type (ALTERCATION/HARCLEMENT/AUTRE):');
    const urgence = prompt('Urgence (BASSE/NORMALE/HAUTE):');

    if (titre && description && type) {
        // À adapter selon les élèves impliqués
        reportIncident(titre, description, type, [], urgence);
    }
}

// ============================================
// TEST COMPLET DANS LA CONSOLE
// ============================================

/*
// Copier-coller dans la console du navigateur (F12):

// 1. Récupérer les surveillants
getSurveillants();

// 2. Récupérer les absences non justifiées
getAbsences({ justifiee: false });

// 3. Récupérer les convocations
getConvocations();

// Les autres fonctions utilisent des dialogues pour entrer les données
*/
