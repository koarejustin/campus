import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class DirectionCompositionsScreen extends StatefulWidget {
  const DirectionCompositionsScreen({super.key});

  @override
  State<DirectionCompositionsScreen> createState() => _DirectionCompositionsScreenState();
}

class _DirectionCompositionsScreenState extends State<DirectionCompositionsScreen> {
  bool _loading = true;
  List<dynamic> _compositions = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/compositions');
      setState(() => _compositions = data['compositions'] ?? []);
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
      builder: (context) => _CompositionForm(onSaved: _load),
    );
  }

  Future<void> _delete(dynamic id) async {
    try {
      final r = await ApiClient.instance.delete('/admin/compositions/$id');
      if (r['success'] == true) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Compositions & examens')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kIndigo,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Publier'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6))
          : RefreshIndicator(
              onRefresh: _load,
              child: _compositions.isEmpty
                  ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucune composition planifiée', style: TextStyle(color: kTextGray))))])
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                      itemCount: _compositions.length,
                      itemBuilder: (context, i) {
                        final c = _compositions[i];
                        final isExamen = c['type_composition'] == 'EXAMEN_BLANC';
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(color: (isExamen ? kAmber : kIndigo).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                      child: Text(isExamen ? 'Examen blanc' : 'Composition', style: TextStyle(fontSize: 10, color: isExamen ? kAmber : kIndigo, fontWeight: FontWeight.w700)),
                                    ),
                                    const Spacer(),
                                    IconButton(icon: const Icon(Icons.delete_outline_rounded, size: 18, color: kRed), constraints: const BoxConstraints(), onPressed: () => _delete(c['id_composition'])),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(c['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                                if ((c['description'] ?? '').toString().isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(c['description'], style: const TextStyle(fontSize: 12)),
                                ],
                                const SizedBox(height: 6),
                                Text('Du ${c['date_debut_fr'] ?? ''}${c['date_fin_fr'] != null ? ' au ${c['date_fin_fr']}' : ''}', style: const TextStyle(fontSize: 11, color: kTextGray)),
                                if (c['classes_concernees'] != null && (c['classes_concernees'] as List).isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text('Classes : ${(c['classes_concernees'] as List).join(', ')}', style: const TextStyle(fontSize: 11, color: kTextGray)),
                                  ),
                              ],
                            ),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      },
                    ),
            ),
    );
  }
}

class _CompositionForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _CompositionForm({required this.onSaved});

  @override
  State<_CompositionForm> createState() => _CompositionFormState();
}

class _CompositionFormState extends State<_CompositionForm> {
  final _titreCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _classesCtrl = TextEditingController();
  DateTime? _dateDebut;
  DateTime? _dateFin;
  String _type = 'COMPOSITION';
  bool _saving = false;
  String? _error;

  Future<void> _pickDate(bool debut) async {
    final now = DateTime.now();
    final d = await showDatePicker(context: context, initialDate: now, firstDate: now.subtract(const Duration(days: 1)), lastDate: DateTime(now.year + 1));
    if (d == null) return;
    setState(() => debut ? _dateDebut = d : _dateFin = d);
  }

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty || _dateDebut == null) {
      setState(() => _error = 'Titre et date de début requis');
      return;
    }
    if (_type == 'EXAMEN_BLANC' && _classesCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Les classes concernées sont requises pour un examen blanc');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final classes = _classesCtrl.text.trim().isNotEmpty ? _classesCtrl.text.trim().split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList() : null;
      final r = await ApiClient.instance.post('/admin/compositions', {
        'titre': _titreCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'type_composition': _type,
        'date_debut': _dateDebut!.toIso8601String(),
        if (_dateFin != null) 'date_fin': _dateFin!.toIso8601String(),
        if (classes != null) 'classes_concernees': classes,
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
      height: MediaQuery.of(context).size.height * 0.9,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Publier une composition', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'COMPOSITION', child: Text('Composition')),
                  DropdownMenuItem(value: 'EXAMEN_BLANC', child: Text('Examen blanc')),
                ],
                onChanged: (v) => setState(() => _type = v ?? 'COMPOSITION'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(true),
                      icon: const Icon(Icons.event_rounded, size: 16),
                      label: Text(_dateDebut != null ? '${_dateDebut!.day}/${_dateDebut!.month}/${_dateDebut!.year}' : 'Date début'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickDate(false),
                      icon: const Icon(Icons.event_rounded, size: 16),
                      label: Text(_dateFin != null ? '${_dateFin!.day}/${_dateFin!.month}/${_dateFin!.year}' : 'Date fin (opt.)'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(controller: _classesCtrl, decoration: InputDecoration(labelText: _type == 'EXAMEN_BLANC' ? 'Classes concernées (requis)' : 'Classes concernées (optionnel)', hintText: '3ème A, 3ème B', border: const OutlineInputBorder())),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Publier', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
