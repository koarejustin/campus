import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../services/api_client.dart';
import '../../../theme.dart';
import '../../../utils.dart';
import '../../../widgets/skeleton.dart';
import 'ape_role.dart';

class ApeProjetsScreen extends StatefulWidget {
  const ApeProjetsScreen({super.key});

  @override
  State<ApeProjetsScreen> createState() => _ApeProjetsScreenState();
}

class _ApeProjetsScreenState extends State<ApeProjetsScreen> {
  bool _loading = true;
  List<dynamic> _projets = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/ape/projets');
      setState(() => _projets = data['projets'] ?? []);
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
      builder: (context) => _ProjetForm(onSaved: _load),
    );
  }

  Color _statutColor(String? s) {
    switch (s) {
      case 'TERMINE': return kGreen;
      case 'ANNULE': return kRed;
      default: return kAmber;
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: ApeRole.instance.estMembreBureau
          ? FloatingActionButton.extended(onPressed: _openForm, backgroundColor: kApeGradient.colors.first, icon: const Icon(Icons.add_rounded), label: const Text('Projet'))
          : null,
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 110))
          : _projets.isEmpty
              ? const Center(child: Text('Aucun projet APE pour le moment', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: _projets.length,
                    itemBuilder: (context, i) {
                      final p = _projets[i];
                      final color = _statutColor(p['statut']);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(child: Text(p['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5))),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                                    child: Text(p['statut'] ?? '', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800)),
                                  ),
                                ],
                              ),
                              if ((p['description'] ?? '').toString().isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(p['description'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                              ],
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Icon(Icons.payments_outlined, size: 14, color: kTextGray),
                                  const SizedBox(width: 4),
                                  Text(p['budget'] != null ? '${toDouble(p['budget']).toStringAsFixed(0)} FCFA' : 'Budget non défini', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                                  const SizedBox(width: 14),
                                  Icon(Icons.calendar_today_rounded, size: 13, color: kTextGray),
                                  const SizedBox(width: 4),
                                  Text('${_formatDate(p['date_debut'])} → ${p['date_fin'] != null ? _formatDate(p['date_fin']) : 'en cours'}', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: (i * 70).ms, duration: 260.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                    },
                  ),
                ),
    );
  }
}

class _ProjetForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _ProjetForm({required this.onSaved});

  @override
  State<_ProjetForm> createState() => _ProjetFormState();
}

class _ProjetFormState extends State<_ProjetForm> {
  final _titreCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _budgetCtrl = TextEditingController();
  DateTime? _dateFin;
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Titre requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/ape/projets', {
        'titre': _titreCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        if (_budgetCtrl.text.trim().isNotEmpty) 'budget': double.tryParse(_budgetCtrl.text.trim()),
        if (_dateFin != null) 'date_fin': '${_dateFin!.year}-${_dateFin!.month.toString().padLeft(2, '0')}-${_dateFin!.day.toString().padLeft(2, '0')}',
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
              const Text('Nouveau projet APE', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _budgetCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Budget (FCFA, optionnel)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today_rounded, size: 16),
                label: Text(_dateFin == null ? 'Date de fin (optionnel)' : '${_dateFin!.day}/${_dateFin!.month}/${_dateFin!.year}'),
                onPressed: () async {
                  final picked = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2024), lastDate: DateTime(2030));
                  if (picked != null) setState(() => _dateFin = picked);
                },
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
                  style: ElevatedButton.styleFrom(backgroundColor: kApeGradient.colors.first, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Créer', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
