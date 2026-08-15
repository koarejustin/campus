import 'package:flutter/material.dart';
import '../../../services/api_client.dart';
import '../../../theme.dart';
import '../../../utils.dart';
import '../../../widgets/skeleton.dart';
import 'ape_role.dart';

class ApeCotisationsScreen extends StatefulWidget {
  const ApeCotisationsScreen({super.key});

  @override
  State<ApeCotisationsScreen> createState() => _ApeCotisationsScreenState();
}

class _ApeCotisationsScreenState extends State<ApeCotisationsScreen> {
  bool _loading = true;
  List<dynamic> _mesCotisations = [];
  List<dynamic> _toutes = [];
  Map<String, dynamic> _resumeBureau = {};
  final Set<dynamic> _updating = {};

  bool get _bureauGestion => ApeRole.instance.peutGererCotisations;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final calls = <Future<Map<String, dynamic>>>[ApiClient.instance.get('/parents/cotisations')];
      if (_bureauGestion) calls.add(ApiClient.instance.get('/ape/cotisations/toutes'));
      final results = await Future.wait(calls);
      setState(() {
        _mesCotisations = results[0]['cotisations'] ?? [];
        if (results.length > 1) {
          _toutes = results[1]['cotisations'] ?? [];
          _resumeBureau = results[1]['resume'] as Map<String, dynamic>? ?? {};
        }
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _marquerPayee(dynamic id) async {
    setState(() => _updating.add(id));
    try {
      final r = await ApiClient.instance.put('/ape/cotisations/$id/statut', {'statut_paiement': 'PAYE'});
      if (r['success'] == true) await _load();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _updating.remove(id));
    }
  }

  void _openForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _NouvelleCotisationForm(onSaved: _load),
    );
  }

  Color _statutColor(String? s) {
    switch (s) {
      case 'PAYE': return kGreen;
      case 'ANNULE': return kTextGray;
      default: return kAmber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: _bureauGestion
          ? FloatingActionButton.extended(onPressed: _openForm, backgroundColor: kApeGradient.colors.first, icon: const Icon(Icons.add_rounded), label: const Text('Cotisation'))
          : null,
      body: _loading
          ? ListView(padding: const EdgeInsets.all(16), children: const [SkeletonList(count: 5)])
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                children: [
                  const Text('Mes cotisations', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                  const SizedBox(height: 10),
                  if (_mesCotisations.isEmpty)
                    const Text('Aucune cotisation enregistrée', style: TextStyle(color: kTextGray)),
                  for (final c in _mesCotisations)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        dense: true,
                        leading: CircleAvatar(backgroundColor: _statutColor(c['statut_paiement']).withValues(alpha: 0.12), child: Icon(Icons.payments_rounded, color: _statutColor(c['statut_paiement']), size: 18)),
                        title: Text(c['motif_cotisation'] ?? 'Cotisation', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        subtitle: Text('${c['prenom_enfant'] ?? ''} ${c['nom_enfant'] ?? ''}', style: const TextStyle(fontSize: 11.5)),
                        trailing: Text('${toDouble(c['montant']).toStringAsFixed(0)} F', style: TextStyle(color: _statutColor(c['statut_paiement']), fontWeight: FontWeight.w800)),
                      ),
                    ),
                  if (_bureauGestion) ...[
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: kApeGradient.colors.first.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _resumeChip('Collecté', toDouble(_resumeBureau['total_collecte'])),
                          _resumeChip('Total', toDouble(_resumeBureau['total_attendu'])),
                          _resumeChip('Dossiers', (_resumeBureau['count'] ?? 0).toDouble(), isCount: true),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text('Vue d\'ensemble — tous les parents', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                    const SizedBox(height: 10),
                    for (final c in _toutes)
                      Builder(builder: (context) {
                        final paye = c['statut_paiement'] == 'PAYE';
                        final id = c['id_cotisation'];
                        final busy = _updating.contains(id);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            dense: true,
                            title: Text('${c['nom_parent'] ?? ''} ${c['prenom_parent'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                            subtitle: Text('${c['nom_enfant'] ?? ''} ${c['prenom_enfant'] ?? ''} · ${c['classe_actuelle'] ?? ''} · ${toDouble(c['montant']).toStringAsFixed(0)} F', style: const TextStyle(fontSize: 11)),
                            trailing: paye
                                ? const Icon(Icons.check_circle_rounded, color: kGreen)
                                : SizedBox(
                                    width: 90,
                                    child: OutlinedButton(
                                      onPressed: busy ? null : () => _marquerPayee(id),
                                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 4)),
                                      child: busy
                                          ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                                          : const Text('Marquer payé', style: TextStyle(fontSize: 10)),
                                    ),
                                  ),
                          ),
                        );
                      }),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _resumeChip(String label, double value, {bool isCount = false}) {
    return Column(
      children: [
        Text(isCount ? value.toInt().toString() : '${value.toStringAsFixed(0)} F', style: TextStyle(fontWeight: FontWeight.w900, color: kApeGradient.colors.first, fontSize: 13)),
        Text(label, style: const TextStyle(fontSize: 10, color: kTextGray)),
      ],
    );
  }
}

class _NouvelleCotisationForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _NouvelleCotisationForm({required this.onSaved});

  @override
  State<_NouvelleCotisationForm> createState() => _NouvelleCotisationFormState();
}

class _NouvelleCotisationFormState extends State<_NouvelleCotisationForm> {
  final _matriculeParentCtrl = TextEditingController();
  final _matriculeEleveCtrl = TextEditingController();
  final _montantCtrl = TextEditingController();
  final _motifCtrl = TextEditingController();
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    final montant = double.tryParse(_montantCtrl.text.trim());
    if (_matriculeParentCtrl.text.trim().isEmpty || montant == null) {
      setState(() => _error = 'Matricule parent et montant requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final parentRes = await ApiClient.instance.get('/ape/resoudre-matricule/${_matriculeParentCtrl.text.trim()}');
      if (parentRes['success'] != true) {
        setState(() => _error = 'Matricule parent introuvable');
        return;
      }
      String? idEleve;
      if (_matriculeEleveCtrl.text.trim().isNotEmpty) {
        final eleveRes = await ApiClient.instance.get('/ape/resoudre-matricule/${_matriculeEleveCtrl.text.trim()}');
        if (eleveRes['success'] == true) idEleve = eleveRes['compte']?['id_user'];
      }
      final r = await ApiClient.instance.post('/ape/cotisations', {
        'id_parent': parentRes['compte']?['id_user'],
        if (idEleve != null) 'id_eleve': idEleve,
        'montant': montant,
        'motif_cotisation': _motifCtrl.text.trim(),
      });
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
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.75,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Enregistrer une cotisation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _matriculeParentCtrl, decoration: const InputDecoration(labelText: 'Matricule parent', hintText: 'PAR-2026-XXXX', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _matriculeEleveCtrl, decoration: const InputDecoration(labelText: 'Matricule élève (optionnel)', hintText: 'CN-2026-XXXX', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _montantCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Montant (FCFA)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _motifCtrl, decoration: const InputDecoration(labelText: 'Motif', hintText: 'Cotisation annuelle', border: OutlineInputBorder())),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kApeGradient.colors.first, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Enregistrer', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
