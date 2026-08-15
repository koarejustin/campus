import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class DirectionAgendaScreen extends StatefulWidget {
  const DirectionAgendaScreen({super.key});

  @override
  State<DirectionAgendaScreen> createState() => _DirectionAgendaScreenState();
}

class _DirectionAgendaScreenState extends State<DirectionAgendaScreen> {
  bool _loading = true;
  List<dynamic> _evenements = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/agenda');
      setState(() => _evenements = data['evenements'] ?? []);
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
      builder: (context) => _AgendaForm(onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agenda de l\'établissement')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kSurveillantGradient.colors.first,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Événement'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6))
          : RefreshIndicator(
              onRefresh: _load,
              child: _evenements.isEmpty
                  ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun événement planifié', style: TextStyle(color: kTextGray))))])
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                      itemCount: _evenements.length,
                      itemBuilder: (context, i) {
                        final e = _evenements[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: kSurveillantGradient.colors.first.withValues(alpha: 0.12), child: const Icon(Icons.event_rounded, color: Color(0xFF0EA5E9), size: 18)),
                            title: Text(e['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            subtitle: Text('${e['date_debut'] ?? ''}${(e['description'] ?? '').toString().isNotEmpty ? '\n${e['description']}' : ''}', style: const TextStyle(fontSize: 11.5)),
                            isThreeLine: (e['description'] ?? '').toString().isNotEmpty,
                            trailing: Text(e['type'] ?? '', style: const TextStyle(fontSize: 10, color: kTextGray)),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      },
                    ),
            ),
    );
  }
}

class _AgendaForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _AgendaForm({required this.onSaved});

  @override
  State<_AgendaForm> createState() => _AgendaFormState();
}

class _AgendaFormState extends State<_AgendaForm> {
  final _titreCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime? _dateDebut;
  String _type = 'general';
  bool _saving = false;
  String? _error;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(context: context, initialDate: now, firstDate: now.subtract(const Duration(days: 1)), lastDate: DateTime(now.year + 1));
    if (d == null || !mounted) return;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.now());
    setState(() => _dateDebut = DateTime(d.year, d.month, d.day, t?.hour ?? 8, t?.minute ?? 0));
  }

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty || _dateDebut == null) {
      setState(() => _error = 'Titre et date requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/admin/agenda', {
        'titre': _titreCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'date_debut': _dateDebut!.toIso8601String(),
        'type_activite': _type,
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
            const Text('Nouvel événement', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description (optionnel)', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _pickDate,
              icon: const Icon(Icons.event_rounded, size: 16),
              label: Text(_dateDebut != null ? '${_dateDebut!.day}/${_dateDebut!.month}/${_dateDebut!.year} à ${_dateDebut!.hour}h${_dateDebut!.minute.toString().padLeft(2, '0')}' : 'Choisir date et heure'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 46)),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'general', child: Text('Général')),
                DropdownMenuItem(value: 'reunion', child: Text('Réunion')),
                DropdownMenuItem(value: 'evenement', child: Text('Événement')),
                DropdownMenuItem(value: 'vacances', child: Text('Vacances')),
              ],
              onChanged: (v) => setState(() => _type = v ?? 'general'),
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
                style: ElevatedButton.styleFrom(backgroundColor: kSurveillantGradient.colors.first, foregroundColor: Colors.white),
                child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Ajouter', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
