import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class SurveillantIncidentsScreen extends StatefulWidget {
  const SurveillantIncidentsScreen({super.key});

  @override
  State<SurveillantIncidentsScreen> createState() => _SurveillantIncidentsScreenState();
}

class _SurveillantIncidentsScreenState extends State<SurveillantIncidentsScreen> {
  bool _loading = true;
  List<dynamic> _incidents = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/surveillants/incidents');
      setState(() => _incidents = data['incidents'] ?? []);
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
      builder: (context) => _IncidentForm(onSaved: _load),
    );
  }

  Color _urgenceColor(String? u) {
    switch (u?.toLowerCase()) {
      case 'haute':
      case 'grave': return kRed;
      case 'moyenne': return kAmber;
      default: return kSurveillantGradient.colors.first;
    }
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
      appBar: AppBar(title: const Text('Incidents')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kSurveillantGradient.colors.first,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Signaler'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 96))
          : _incidents.isEmpty
              ? const Center(child: Text('Aucun incident signalé', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: _incidents.length,
                    itemBuilder: (context, i) {
                      final inc = _incidents[i];
                      final color = _urgenceColor(inc['urgence']);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(inc['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14))),
                                  Text(_formatDate(inc['date_signalement']), style: const TextStyle(fontSize: 11, color: kTextGray)),
                                ],
                              ),
                              if ((inc['lieu'] ?? '').toString().isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text('📍 ${inc['lieu']}', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                              ],
                              if ((inc['description'] ?? '').toString().isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(inc['description'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                              ],
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: (i * 60).ms, duration: 250.ms).slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                    },
                  ),
                ),
    );
  }
}

class _IncidentForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _IncidentForm({required this.onSaved});

  @override
  State<_IncidentForm> createState() => _IncidentFormState();
}

class _IncidentFormState extends State<_IncidentForm> {
  final _titreCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _lieuCtrl = TextEditingController();
  String _urgence = 'normale';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Titre requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/surveillants/incidents', {
        'titre': _titreCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'lieu': _lieuCtrl.text.trim(),
        'urgence': _urgence,
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
      height: MediaQuery.of(context).size.height * 0.8,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Signaler un incident', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _lieuCtrl, decoration: const InputDecoration(labelText: 'Lieu (optionnel)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _urgence,
                decoration: const InputDecoration(labelText: 'Urgence', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'normale', child: Text('🟢 Normale')),
                  DropdownMenuItem(value: 'moyenne', child: Text('🟡 Moyenne')),
                  DropdownMenuItem(value: 'haute', child: Text('🔴 Haute')),
                ],
                onChanged: (v) => setState(() => _urgence = v ?? 'normale'),
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
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Signaler', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
