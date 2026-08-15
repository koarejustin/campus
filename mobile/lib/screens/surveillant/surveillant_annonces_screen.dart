import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class SurveillantAnnoncesScreen extends StatefulWidget {
  const SurveillantAnnoncesScreen({super.key});

  @override
  State<SurveillantAnnoncesScreen> createState() => _SurveillantAnnoncesScreenState();
}

class _SurveillantAnnoncesScreenState extends State<SurveillantAnnoncesScreen> {
  bool _loading = true;
  List<dynamic> _annonces = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final r = await ApiClient.instance.getList('/surveillants/announcements');
      setState(() => _annonces = r);
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
      builder: (context) => _PublierForm(onSaved: _load),
    );
  }

  Color _typeColor(String? t) => (t ?? '').toUpperCase() == 'URGENT' ? kRed : kSurveillantGradient.colors.first;

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
      appBar: AppBar(title: const Text('Annonces')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openForm,
        backgroundColor: kSurveillantGradient.colors.first,
        icon: const Icon(Icons.campaign_rounded),
        label: const Text('Publier'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 90))
          : _annonces.isEmpty
              ? const Center(child: Text('Aucune annonce', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: _annonces.length,
                    itemBuilder: (context, i) {
                      final a = _annonces[i];
                      final color = _typeColor(a['type']);
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
                                  Expanded(child: Text(a['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5))),
                                  Text(_formatDate(a['date_publication']), style: const TextStyle(fontSize: 11, color: kTextGray)),
                                ],
                              ),
                              if ((a['contenu'] ?? '').toString().isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(a['contenu'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                              ],
                              const SizedBox(height: 6),
                              Text('Destinataires : ${a['destinataires'] ?? 'tous'}', style: const TextStyle(fontSize: 10.5, color: kTextGray, fontStyle: FontStyle.italic)),
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

class _PublierForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _PublierForm({required this.onSaved});

  @override
  State<_PublierForm> createState() => _PublierFormState();
}

class _PublierFormState extends State<_PublierForm> {
  final _titreCtrl = TextEditingController();
  final _contenuCtrl = TextEditingController();
  String _destinataires = 'tous';
  String _type = 'INFO';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty || _contenuCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Titre et message requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/surveillants/announcements', {
        'titre': _titreCtrl.text.trim(),
        'contenu': _contenuCtrl.text.trim(),
        'type_annonce': _type,
        'destinataires': _destinataires,
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
              const Text('Publier une annonce', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _contenuCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Message', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _destinataires,
                decoration: const InputDecoration(labelText: 'Destinataires', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'tous', child: Text('Tous')),
                  DropdownMenuItem(value: 'profs', child: Text('Professeurs')),
                  DropdownMenuItem(value: 'parents', child: Text('Parents')),
                  DropdownMenuItem(value: 'eleves', child: Text('Élèves')),
                ],
                onChanged: (v) => setState(() => _destinataires = v ?? 'tous'),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'INFO', child: Text('🔵 Info')),
                  DropdownMenuItem(value: 'URGENT', child: Text('🔴 Urgent')),
                  DropdownMenuItem(value: 'REUNION', child: Text('📅 Réunion')),
                  DropdownMenuItem(value: 'FELICITATIONS', child: Text('🎉 Félicitations')),
                ],
                onChanged: (v) => setState(() => _type = v ?? 'INFO'),
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
