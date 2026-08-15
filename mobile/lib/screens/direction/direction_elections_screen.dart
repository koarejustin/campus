import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

// Le dictionnaire "postes_labels" renvoyé par l'API ne correspond pas aux
// valeurs réellement envoyées par le web (bug confirmé côté direction.html :
// DG/SECRETAIRE_GENERAL/CHARGE_ACTIVITES/ADJOINT_ACTIVITES n'ont aucun label
// côté serveur). Le backend n'impose aucune valeur fixe (poste = VARCHAR
// libre), donc on définit ici notre propre liste cohérente plutôt que de
// dépendre du dictionnaire serveur cassé.
const Map<String, String> kPostesLabels = {
  'PRESIDENT': 'Président(e) des élèves',
  'VICE_PRESIDENT': 'Vice-Président(e)',
  'SECRETAIRE_GENERAL': 'Secrétaire général(e)',
  'TRESORIER': 'Trésorier(e)',
  'CHARGE_ACTIVITES': 'Chargé(e) des activités',
  'ADJOINT_ACTIVITES': 'Adjoint(e) activités',
  'CHEF_CLASSE': 'Chef de classe',
  'CHEF_CLASSE_ADJ': 'Chef de classe adjoint(e)',
};

class DirectionElectionsScreen extends StatefulWidget {
  const DirectionElectionsScreen({super.key});

  @override
  State<DirectionElectionsScreen> createState() => _DirectionElectionsScreenState();
}

class _DirectionElectionsScreenState extends State<DirectionElectionsScreen> {
  bool _loading = true;
  List<dynamic> _elections = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/elections');
      setState(() => _elections = data['elections'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _AssignPosteForm(onSaved: _load),
    );
  }

  Future<void> _retirer(String code) async {
    try {
      final r = await ApiClient.instance.delete('/admin/elections', body: {'eleve_code': code});
      if (r['success'] == true) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Élections scolaires')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kAmber,
        icon: const Icon(Icons.how_to_vote_rounded),
        label: const Text('Attribuer'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6))
          : RefreshIndicator(
              onRefresh: _load,
              child: _elections.isEmpty
                  ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun poste attribué', style: TextStyle(color: kTextGray))))])
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                      itemCount: _elections.length,
                      itemBuilder: (context, i) {
                        final e = _elections[i];
                        final label = kPostesLabels[e['poste']] ?? e['poste'] ?? '';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: kAmber.withValues(alpha: 0.12), child: const Icon(Icons.how_to_vote_rounded, color: kAmber, size: 18)),
                            title: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            subtitle: Text('$label · ${e['classe'] ?? ''}', style: const TextStyle(fontSize: 11.5)),
                            trailing: IconButton(icon: const Icon(Icons.close_rounded, size: 18, color: kRed), onPressed: () => _retirer(e['code_unique'])),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      },
                    ),
            ),
    );
  }
}

class _AssignPosteForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _AssignPosteForm({required this.onSaved});

  @override
  State<_AssignPosteForm> createState() => _AssignPosteFormState();
}

class _AssignPosteFormState extends State<_AssignPosteForm> {
  final _codeCtrl = TextEditingController();
  String _poste = 'PRESIDENT';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_codeCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Matricule élève requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/admin/elections', {'eleve_code': _codeCtrl.text.trim(), 'poste': _poste});
      if (r['success'] == true) {
        widget.onSaved();
        if (mounted) Navigator.pop(context);
      } else {
        setState(() => _error = r['message'] ?? 'Erreur');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Attribuer un poste', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Attribuer un nouveau poste à un élève qui en a déjà un le remplace.', style: TextStyle(fontSize: 11.5, color: kTextGray)),
            const SizedBox(height: 16),
            TextField(controller: _codeCtrl, decoration: const InputDecoration(labelText: 'Matricule élève', hintText: 'CN-2026-XXXX', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _poste,
              decoration: const InputDecoration(labelText: 'Poste', border: OutlineInputBorder()),
              items: [for (final e in kPostesLabels.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
              onChanged: (v) => setState(() => _poste = v ?? 'PRESIDENT'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: kAmber, foregroundColor: Colors.white),
                child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Attribuer', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
