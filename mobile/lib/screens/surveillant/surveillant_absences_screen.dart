import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class SurveillantAbsencesScreen extends StatefulWidget {
  const SurveillantAbsencesScreen({super.key});

  @override
  State<SurveillantAbsencesScreen> createState() => _SurveillantAbsencesScreenState();
}

class _SurveillantAbsencesScreenState extends State<SurveillantAbsencesScreen> {
  bool _loading = true;
  List<dynamic> _absences = [];

  int get _nbNonJustifiees => _absences.where((a) => a['justifiee'] != true).length;
  int get _nbJustifiees => _absences.where((a) => a['justifiee'] == true).length;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/surveillants/absences');
      setState(() => _absences = data['absences'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggleJustifiee(dynamic idAbsence, bool value) async {
    try {
      final r = await ApiClient.instance.put('/surveillants/absences/justification', {'id_absence': idAbsence, 'justifiee': value});
      if (r['message'] != null) await _load();
    } catch (_) {}
  }

  Future<void> _delete(dynamic id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cette absence ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: kRed))),
        ],
      ),
    );
    if (confirm == true) {
      await ApiClient.instance.delete('/surveillants/absences/$id');
      _load();
    }
  }

  void _openForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _AbsenceForm(onSaved: _load),
    );
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Absences')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kSurveillantGradient.colors.first,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Enregistrer'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8, itemHeight: 76))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _CountCard(label: 'Total', value: _absences.length, color: kAmber, icon: Icons.event_busy_rounded)
                            .animate().fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _CountCard(label: 'Non justifiées', value: _nbNonJustifiees, color: kRed, icon: Icons.cancel_rounded)
                            .animate(delay: 60.ms).fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _CountCard(label: 'Justifiées', value: _nbJustifiees, color: kGreen, icon: Icons.check_circle_rounded)
                            .animate(delay: 120.ms).fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_absences.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: Text('Aucune absence enregistrée', style: TextStyle(color: kTextGray))),
                    )
                  else
                    for (int i = 0; i < _absences.length; i++)
                      Builder(builder: (context) {
                        final a = _absences[i];
                        final justifiee = a['justifiee'] == true;
                        return Dismissible(
                          key: ValueKey(a['id_absence']),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 20),
                            decoration: BoxDecoration(color: kRed, borderRadius: BorderRadius.circular(14)),
                            child: const Icon(Icons.delete_rounded, color: Colors.white),
                          ),
                          confirmDismiss: (_) async {
                            await _delete(a['id_absence']);
                            return false;
                          },
                          child: Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: (justifiee ? kGreen : kRed).withValues(alpha: 0.12),
                                child: Icon(Icons.event_busy_rounded, color: justifiee ? kGreen : kRed, size: 18),
                              ),
                              title: Text('${a['prenom'] ?? ''} ${a['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                              subtitle: Text('${a['classe_actuelle'] ?? ''} · ${_formatDate(a['date_absence'])}${(a['raison_absence'] ?? '').toString().isNotEmpty ? ' · ${a['raison_absence']}' : ''}', style: const TextStyle(fontSize: 11)),
                              trailing: Switch(
                                value: justifiee,
                                activeThumbColor: kGreen,
                                onChanged: (v) => _toggleJustifiee(a['id_absence'], v),
                              ),
                            ),
                          ),
                        ).animate().fadeIn(delay: (180 + i * 40).ms, duration: 220.ms);
                      }),
                ],
              ),
            ),
    );
  }
}

class _CountCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final IconData icon;
  const _CountCard({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 8),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: value.toDouble()),
              duration: 700.ms,
              curve: Curves.easeOutCubic,
              builder: (context, v, _) => Text('${v.round()}', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
            ),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 10.5, color: kTextGray, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

class _AbsenceForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _AbsenceForm({required this.onSaved});

  @override
  State<_AbsenceForm> createState() => _AbsenceFormState();
}

class _AbsenceFormState extends State<_AbsenceForm> {
  final _codeCtrl = TextEditingController();
  final _raisonCtrl = TextEditingController();
  DateTime _date = DateTime.now();
  bool _justifiee = false;
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_codeCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Matricule élève requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/surveillants/absences', {
        'code_unique_eleve': _codeCtrl.text.trim(),
        'date_absence': '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
        'justifiee': _justifiee,
        'raison_absence': _raisonCtrl.text.trim(),
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
              const Text('Enregistrer une absence', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _codeCtrl, decoration: const InputDecoration(labelText: 'Matricule élève', hintText: 'CN-2026-XXXX', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today_rounded, size: 16),
                label: Text('${_date.day}/${_date.month}/${_date.year}'),
                onPressed: () async {
                  final picked = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2024), lastDate: DateTime(2030));
                  if (picked != null) setState(() => _date = picked);
                },
              ),
              const SizedBox(height: 10),
              TextField(controller: _raisonCtrl, decoration: const InputDecoration(labelText: 'Raison (optionnel)', border: OutlineInputBorder())),
              const SizedBox(height: 6),
              SwitchListTile(
                value: _justifiee,
                onChanged: (v) => setState(() => _justifiee = v),
                title: const Text('Justifiée', style: TextStyle(fontSize: 13)),
                activeThumbColor: kGreen,
                contentPadding: EdgeInsets.zero,
              ),
              if (_error != null) ...[
                const SizedBox(height: 6),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kSurveillantGradient.colors.first, foregroundColor: Colors.white),
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
