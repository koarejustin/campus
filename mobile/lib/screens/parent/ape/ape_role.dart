import '../../../services/api_client.dart';

/// Vérifie une seule fois par session si le parent connecté fait partie du
/// bureau APE — pilote l'affichage des sections "bureau seulement", comme
/// le web (`body.classList.toggle('est-bureau', ...)`) mais côté Flutter.
class ApeRole {
  ApeRole._();
  static final ApeRole instance = ApeRole._();

  bool checked = false;
  bool estMembreBureau = false;
  String? poste; // PRESIDENT | TRESORIER | SECRETAIRE | MEMBRE_ACTIF

  bool get peutGererCotisations => poste == 'PRESIDENT' || poste == 'TRESORIER';

  Future<void> check() async {
    try {
      final data = await ApiClient.instance.get('/ape/mon-role');
      estMembreBureau = data['est_membre_bureau'] == true;
      poste = data['poste'];
    } catch (_) {
    } finally {
      checked = true;
    }
  }
}
