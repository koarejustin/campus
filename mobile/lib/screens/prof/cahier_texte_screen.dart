import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class CahierTexteScreen extends StatefulWidget {
  const CahierTexteScreen({super.key});

  @override
  State<CahierTexteScreen> createState() => _CahierTexteScreenState();
}

class _CahierTexteScreenState extends State<CahierTexteScreen> {
  bool _loading = true;
  List<dynamic> _seances = [];
  List<String> _classes = [];
  String? _filtreClasse;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    try {
      final data = await ApiClient.instance.get('/professeurs/mes-classes');
      setState(() => _classes = List<String>.from(data['classes'] ?? []));
    } catch (_) {}
    await _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final path = '/professeurs/cahier-texte${_filtreClasse != null ? '?classe=${Uri.encodeQueryComponent(_filtreClasse!)}' : ''}';
      final data = await ApiClient.instance.get(path);
      setState(() => _seances = data['seances'] ?? []);
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
      builder: (context) => _SeanceForm(classes: _classes, onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cahier de texte')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kGreen,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouvelle séance'),
      ),
      body: Column(
        children: [
          if (_classes.isNotEmpty)
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('Toutes'),
                      selected: _filtreClasse == null,
                      selectedColor: kGreen,
                      labelStyle: TextStyle(color: _filtreClasse == null ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
                      onSelected: (_) { setState(() => _filtreClasse = null); _load(); },
                    ),
                  ),
                  for (final c in _classes)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(c),
                        selected: _filtreClasse == c,
                        selectedColor: kGreen,
                        labelStyle: TextStyle(color: _filtreClasse == c ? Colors.white : kTextDark, fontWeight: FontWeight.w700, fontSize: 12.5),
                        onSelected: (_) { setState(() => _filtreClasse = c); _load(); },
                      ),
                    ),
                ],
              ),
            ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 90))
                : _seances.isEmpty
                    ? const Center(child: Text('Aucune séance enregistrée', style: TextStyle(color: kTextGray)))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 90),
                          itemCount: _seances.length,
                          itemBuilder: (context, i) {
                            final s = _seances[i];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${s['classe'] ?? ''} · ${s['matiere'] ?? ''} · ${s['heure_debut'] ?? ''}-${s['heure_fin'] ?? ''}',
                                            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: kGreen, letterSpacing: .3),
                                          ),
                                        ),
                                        Text(s['date_seance'] ?? '', style: const TextStyle(fontSize: 11, color: kTextGray)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(s['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                    if ((s['contenu'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(s['contenu'], style: const TextStyle(fontSize: 12.5, color: kTextGray)),
                                    ],
                                    if ((s['taf'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                        decoration: BoxDecoration(color: kAmber.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                        child: Text('📌 TAF : ${s['taf']}', style: const TextStyle(fontSize: 11.5, color: kAmber, fontWeight: FontWeight.w700)),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: (i * 60).ms, duration: 260.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _SeanceForm extends StatefulWidget {
  final List<String> classes;
  final VoidCallback onSaved;
  const _SeanceForm({required this.classes, required this.onSaved});

  @override
  State<_SeanceForm> createState() => _SeanceFormState();
}

class _SeanceFormState extends State<_SeanceForm> {
  String? _classe;
  final _matiereCtrl = TextEditingController();
  final _titreCtrl = TextEditingController();
  final _contenuCtrl = TextEditingController();
  final _tafCtrl = TextEditingController();
  DateTime _date = DateTime.now();
  TimeOfDay _debut = const TimeOfDay(hour: 7, minute: 30);
  TimeOfDay _fin = const TimeOfDay(hour: 9, minute: 0);
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _classe = widget.classes.isNotEmpty ? widget.classes.first : null;
  }

  String _fmtTime(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _submit() async {
    if (_classe == null || _matiereCtrl.text.trim().isEmpty || _titreCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Classe, matière et titre requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/professeurs/cahier-texte', {
        'classe': _classe,
        'matiere': _matiereCtrl.text.trim(),
        'titre': _titreCtrl.text.trim(),
        'contenu': _contenuCtrl.text.trim(),
        'taf': _tafCtrl.text.trim(),
        'date_seance': '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
        'heure_debut': _fmtTime(_debut),
        'heure_fin': _fmtTime(_fin),
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
            const Text('Nouvelle séance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _classe,
              decoration: const InputDecoration(labelText: 'Classe', border: OutlineInputBorder()),
              items: widget.classes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => _classe = v),
            ),
            const SizedBox(height: 10),
            TextField(controller: _matiereCtrl, decoration: const InputDecoration(labelText: 'Matière', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre de la séance', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _contenuCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Contenu', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _tafCtrl, decoration: const InputDecoration(labelText: 'Travail à faire (optionnel)', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.calendar_today_rounded, size: 16),
                    label: Text('${_date.day}/${_date.month}/${_date.year}'),
                    onPressed: () async {
                      final picked = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2024), lastDate: DateTime(2030));
                      if (picked != null) setState(() => _date = picked);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.access_time_rounded, size: 16),
                    label: Text(_fmtTime(_debut)),
                    onPressed: () async {
                      final picked = await showTimePicker(context: context, initialTime: _debut);
                      if (picked != null) setState(() => _debut = picked);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.access_time_filled_rounded, size: 16),
                    label: Text(_fmtTime(_fin)),
                    onPressed: () async {
                      final picked = await showTimePicker(context: context, initialTime: _fin);
                      if (picked != null) setState(() => _fin = picked);
                    },
                  ),
                ),
              ],
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
