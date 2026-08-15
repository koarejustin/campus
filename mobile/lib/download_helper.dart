import 'download_helper_stub.dart' if (dart.library.html) 'download_helper_web.dart' as impl;

/// Déclenche le téléchargement d'un fichier binaire — implémentation réelle
/// sur web (blob + clic programmatique), no-op sur mobile natif pour l'instant.
void downloadBytes(String filename, List<int> bytes) => impl.downloadBytes(filename, bytes);
