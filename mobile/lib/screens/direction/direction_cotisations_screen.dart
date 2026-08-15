import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';

class DirectionCotisationsScreen extends StatefulWidget {
  const DirectionCotisationsScreen({super.key});

  @override
  State<DirectionCotisationsScreen> createState() => _DirectionCotisationsScreenState();
}

class _DirectionCotisationsScreenState extends State<DirectionCotisationsScreen> {
  bool _loading = true;
  List<dynamic> _cotisations = [];
  final Set<dynamic> _updating = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/cotisations');
      setState(() => _cotisations = data['cotisations'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _marquerPayee(dynamic idCotisation) async {
    setState(() => _updating.add(idCotisation));
    try {
      final r = await ApiClient.instance.put('/admin/cotisations/$idCotisation/statut', {'statut_paiement': 'PAYE'});
      if (r['success'] == true) await _load();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _updating.remove(idCotisation));
    }
  }

  void _openForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _PaiementForm(onSaved: _load),
    );
  }

  Color _statutColor(String? s) {
    switch (s) {
      case 'PAYE': return kGreen;
      case 'ANNULE': return kTextGray;
      default: return kAmber;
    }
  }

  String _statutLabel(String? s) {
    switch (s) {
      case 'PAYE': return 'Payé';
      case 'ANNULE': return 'Annulé';
      default: return 'En attente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = _cotisations.fold<double>(0, (sum, c) => sum + toDouble(c['montant']));
    final paye = _cotisations.where((c) => c['statut_paiement'] == 'PAYE').fold<double>(0, (sum, c) => sum + toDouble(c['montant']));
    return Scaffold(
      appBar: AppBar(title: const Text('Cotisations')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kApeGradient.colors.first,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Paiement'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                children: [
                  if (_cotisations.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: kApeGradient.colors.first.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(14)),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _chip('Collecté', '${paye.toStringAsFixed(0)} F'),
                          _chip('Total', '${total.toStringAsFixed(0)} F'),
                          _chip('Dossiers', '${_cotisations.length}'),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),
                  if (_cotisations.isEmpty)
                    const Padding(padding: EdgeInsets.only(top: 60), child: Center(child: Text('Aucune cotisation enregistrée', style: TextStyle(color: kTextGray))))
                  else
                    for (int i = 0; i < _cotisations.length; i++)
                      Builder(builder: (context) {
                        final c = _cotisations[i];
                        final statut = c['statut_paiement']?.toString();
                        final id = c['id_cotisation'];
                        final paye = statut == 'PAYE';
                        final busy = _updating.contains(id);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: _statutColor(statut).withValues(alpha: 0.12), child: Icon(Icons.payments_rounded, color: _statutColor(statut), size: 18)),
                            title: Text('${c['prenom'] ?? ''} ${c['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            subtitle: Text('${c['classe'] ?? ''} · ${c['motif_cotisation'] ?? 'Cotisation'}', style: const TextStyle(fontSize: 11)),
                            trailing: paye
                                ? Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text('${toDouble(c['montant']).toStringAsFixed(0)} F', style: TextStyle(color: _statutColor(statut), fontWeight: FontWeight.w800, fontSize: 12.5)),
                                      Text(_statutLabel(statut), style: TextStyle(color: _statutColor(statut), fontSize: 10)),
                                    ],
                                  )
                                : SizedBox(
                                    width: 100,
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text('${toDouble(c['montant']).toStringAsFixed(0)} F', style: TextStyle(color: _statutColor(statut), fontWeight: FontWeight.w800, fontSize: 12.5)),
                                        const SizedBox(height: 4),
                                        OutlinedButton(
                                          onPressed: (id == null || busy) ? null : () => _marquerPayee(id),
                                          style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6), minimumSize: Size.zero),
                                          child: busy
                                              ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                                              : const Text('Marquer payé', style: TextStyle(fontSize: 9.5)),
                                        ),
                                      ],
                                    ),
                                  ),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      }),
                ],
              ),
            ),
    );
  }

  Widget _chip(String label, String value) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontWeight: FontWeight.w900, color: kApeGradient.colors.first, fontSize: 14)),
        Text(label, style: const TextStyle(fontSize: 10.5, color: kTextGray)),
      ],
    );
  }
}

class _PaiementForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _PaiementForm({required this.onSaved});

  @override
  State<_PaiementForm> createState() => _PaiementFormState();
}

class _PaiementFormState extends State<_PaiementForm> {
  final _familleCtrl = TextEditingController();
  final _montantCtrl = TextEditingController();
  final _eleveCodeCtrl = TextEditingController();
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    final montant = double.tryParse(_montantCtrl.text.trim());
    if (_familleCtrl.text.trim().isEmpty || montant == null) {
      setState(() => _error = 'Motif/famille et montant requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/admin/paiement', {
        'famille': _familleCtrl.text.trim(),
        'montant': montant,
        if (_eleveCodeCtrl.text.trim().isNotEmpty) 'eleve_code': _eleveCodeCtrl.text.trim(),
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
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Enregistrer un paiement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Ce paiement sera immédiatement marqué comme payé.', style: TextStyle(fontSize: 11.5, color: kTextGray)),
            const SizedBox(height: 16),
            TextField(controller: _familleCtrl, decoration: const InputDecoration(labelText: 'Motif / Famille', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _montantCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Montant (FCFA)', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _eleveCodeCtrl, decoration: const InputDecoration(labelText: 'Matricule élève (optionnel)', hintText: 'CN-2026-XXXX', border: OutlineInputBorder())),
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
    );
  }
}
