import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class ProfDevoirsScreen extends StatefulWidget {
  const ProfDevoirsScreen({super.key});

  @override
  State<ProfDevoirsScreen> createState() => _ProfDevoirsScreenState();
}

class _ProfDevoirsScreenState extends State<ProfDevoirsScreen> {
  bool _loading = true;
  List<dynamic> _devoirs = [];
  List<String> _classes = [];
  List<String> _matieres = [];

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final data = await ApiClient.instance.get('/professeurs/mes-classes');
      setState(() {
        _classes = List<String>.from(data['classes'] ?? []);
        _matieres = List<String>.from(data['matieres'] ?? []);
      });
    } catch (_) {}
    await _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/devoirs');
      setState(() => _devoirs = data['devoirs'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _isLate(String? iso) {
    if (iso == null) return false;
    try {
      return DateTime.parse(iso).isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  Future<void> _delete(dynamic id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer ce devoir ?'),
        content: const Text('Cette action est définitive.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: kRed))),
        ],
      ),
    );
    if (confirm == true) {
      await ApiClient.instance.delete('/professeurs/devoirs/$id');
      _load();
    }
  }

  void _openForm({Map? devoir}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _DevoirForm(classes: _classes, matieres: _matieres, devoir: devoir, onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes devoirs')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        backgroundColor: kGreen,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouveau devoir'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 110))
          : _devoirs.isEmpty
              ? const Center(child: Text('Aucun devoir créé pour le moment', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: _devoirs.length,
                    itemBuilder: (context, i) {
                      final d = _devoirs[i];
                      final late = _isLate(d['date_limite']);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(color: (late ? kRed : kGreen).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                    child: Text(late ? '⚠️ Expiré' : '📅 En attente', style: TextStyle(color: late ? kRed : kGreen, fontSize: 10.5, fontWeight: FontWeight.w800)),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(color: kIndigo.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                    child: Text(d['matiere'] ?? '', style: const TextStyle(color: kIndigo, fontSize: 10.5, fontWeight: FontWeight.w800)),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(d['classe'] ?? '', style: const TextStyle(color: kTextGray, fontSize: 11, fontWeight: FontWeight.w700)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(d['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
                              const SizedBox(height: 3),
                              Text((d['description'] ?? '').toString().isNotEmpty ? d['description'] : 'Aucune description', style: const TextStyle(fontSize: 12.5, color: kTextGray)),
                              const SizedBox(height: 6),
                              Text('Pour le ${d['date_limite_fr'] ?? ''}', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: late ? kRed : kTextGray)),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _openForm(devoir: d),
                                      icon: const Icon(Icons.edit_rounded, size: 15),
                                      label: const Text('Modifier', style: TextStyle(fontSize: 12)),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: () => _delete(d['id_devoir'] ?? d['id']),
                                      style: OutlinedButton.styleFrom(foregroundColor: kRed, side: const BorderSide(color: kRed)),
                                      icon: const Icon(Icons.delete_rounded, size: 15),
                                      label: const Text('Supprimer', style: TextStyle(fontSize: 12)),
                                    ),
                                  ),
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

class _DevoirForm extends StatefulWidget {
  final List<String> classes;
  final List<String> matieres;
  final Map? devoir;
  final VoidCallback onSaved;
  const _DevoirForm({required this.classes, required this.matieres, this.devoir, required this.onSaved});

  @override
  State<_DevoirForm> createState() => _DevoirFormState();
}

class _DevoirFormState extends State<_DevoirForm> {
  String? _classe;
  String? _matiere;
  final _titreCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime _dateLimite = DateTime.now().add(const Duration(days: 7));
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.devoir != null;

  @override
  void initState() {
    super.initState();
    _classe = widget.devoir?['classe'] ?? (widget.classes.isNotEmpty ? widget.classes.first : null);
    _matiere = widget.devoir?['matiere'] ?? (widget.matieres.isNotEmpty ? widget.matieres.first : null);
    _titreCtrl.text = widget.devoir?['titre'] ?? '';
    _descCtrl.text = widget.devoir?['description'] ?? '';
    final dl = widget.devoir?['date_limite'];
    if (dl != null) {
      try {
        _dateLimite = DateTime.parse(dl);
      } catch (_) {}
    }
  }

  Future<void> _submit() async {
    if (_classe == null || _matiere == null || _titreCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Classe, matière et titre requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    final body = {
      'titre': _titreCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'matiere': _matiere,
      'classe': _classe,
      'date_limite': '${_dateLimite.year}-${_dateLimite.month.toString().padLeft(2, '0')}-${_dateLimite.day.toString().padLeft(2, '0')}',
    };
    try {
      final r = _isEdit
          ? await ApiClient.instance.put('/professeurs/devoirs/${widget.devoir!['id_devoir'] ?? widget.devoir!['id']}', body)
          : await ApiClient.instance.post('/professeurs/devoirs', body);
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
      height: MediaQuery.of(context).size.height * 0.85,
      child: Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text(_isEdit ? 'Modifier le devoir' : 'Nouveau devoir', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _classe,
              decoration: const InputDecoration(labelText: 'Classe', border: OutlineInputBorder()),
              items: widget.classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => _classe = v),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _matiere,
              decoration: const InputDecoration(labelText: 'Matière', border: OutlineInputBorder()),
              items: widget.matieres.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) => setState(() => _matiere = v),
            ),
            const SizedBox(height: 10),
            TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description (optionnel)', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              icon: const Icon(Icons.calendar_today_rounded, size: 16),
              label: Text('Date limite : ${_dateLimite.day}/${_dateLimite.month}/${_dateLimite.year}'),
              onPressed: () async {
                final picked = await showDatePicker(context: context, initialDate: _dateLimite, firstDate: DateTime(2024), lastDate: DateTime(2030));
                if (picked != null) setState(() => _dateLimite = picked);
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
                style: ElevatedButton.styleFrom(backgroundColor: kGreen, foregroundColor: Colors.white),
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Enregistrer', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}
