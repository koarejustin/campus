import 'package:flutter/foundation.dart';
import '../../services/api_client.dart';

/// État partagé "enfant sélectionné" pour tout l'espace Parent — le web
/// n'avait AUCUN sélecteur multi-enfants (toujours enfants[0] en dur), on
/// corrige ça ici : un parent avec plusieurs enfants peut changer de vue
/// depuis n'importe quel écran, tous les onglets se mettent à jour.
class ParentState extends ChangeNotifier {
  ParentState._();
  static final ParentState instance = ParentState._();

  bool loading = true;
  List<dynamic> enfants = [];
  Map? selected;

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      final data = await ApiClient.instance.get('/parents/mes-enfants');
      enfants = data['enfants'] ?? [];
      if (enfants.isNotEmpty) {
        selected ??= enfants.first;
        if (!enfants.any((e) => e['id_enfant'] == selected?['id_enfant'])) {
          selected = enfants.first;
        }
      }
    } catch (_) {
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void select(Map enfant) {
    selected = enfant;
    notifyListeners();
  }

  String? get selectedId => selected?['id_enfant'];
}
