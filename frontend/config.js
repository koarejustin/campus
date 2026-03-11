/* ================================================================
   CAMPUS NUMÉRIQUE FASO — config.js
   URL API auto-détectée selon l'appareil et le contexte
   À inclure dans TOUS les HTML AVANT les autres scripts
   <script src="config.js"></script>
   ================================================================ */

(function () {
  // Déterminer l'URL de base automatiquement
  // window.location.origin = protocole + hôte + port
  // Ex: http://localhost:5000 / https://buko.ngrok-free.dev / http://172.17.10.116:5000
  
  var origin = window.location.origin;
  
  // Si on est sur un fichier local (file://) → fallback localhost
  if (origin === 'null' || origin === 'file://') {
    origin = 'http://localhost:5000';
  }
  
  // URL API globale accessible dans tous les scripts
  window.API_BASE = origin + '/api';
  window.SERVER_BASE = origin;
  
  // Pour debug (visible dans console)
  console.log('🌐 API_BASE:', window.API_BASE);
})();
