/**
 * TEST RAPIDE - Vérifier que le serveur fonctionne
 * Exécute: node test-server.js
 */

const http = require('http');

function testServer() {
    console.log('🧪 Test du serveur Campus Numérique...\n');

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET',
        timeout: 5000
    };

    const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
            console.log('✅ Serveur répond correctement');
            console.log(`📊 Status Code: ${res.statusCode}\n`);

            console.log('🔗 ROUTES DISPONIBLES:');
            console.log('  • POST   /api/surveillants/absences');
            console.log('  • GET    /api/surveillants/absences');
            console.log('  • PUT    /api/surveillants/absences/justification');
            console.log('  • POST   /api/surveillants/convocations');
            console.log('  • GET    /api/surveillants/convocations');
            console.log('  • POST   /api/surveillants/incidents');
            console.log('  • GET    /api/surveillants/incidents');
            console.log('  • POST   /api/surveillants/announcements');
            console.log('  • GET    /api/surveillants/announcements');
            console.log('  • POST   /api/surveillants/activities');
            console.log('  • GET    /api/surveillants/activities\n');

            console.log('✨ Le serveur est prêt! Teste dans le navigateur:');
            console.log('   http://localhost:3000/login.html\n');

            process.exit(0);
        } else {
            console.log('❌ Erreur serveur:', res.statusCode);
            process.exit(1);
        }
    });

    req.on('error', (error) => {
        console.log('❌ Le serveur ne répond pas');
        console.log('   Erreur:', error.message);
        console.log('\n   Lance le serveur avec: node server.js\n');
        process.exit(1);
    });

    req.on('timeout', () => {
        console.log('❌ Timeout - Le serveur ne répond pas à temps');
        process.exit(1);
    });

    req.end();
}

testServer();
