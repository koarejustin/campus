import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../utils.dart';
import '../widgets/skeleton.dart';

class CopiesScreen extends StatefulWidget {
  const CopiesScreen({super.key});

  @override
  State<CopiesScreen> createState() => _CopiesScreenState();
}

class _CopiesScreenState extends State<CopiesScreen> {
  bool _loading = true;
  List<dynamic> _copies = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/eleves/copies-scannees');
      setState(() => _copies = data['copies'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _noteColor(double? note) {
    if (note == null) return kTextGray;
    if (note >= 14) return kGreen;
    if (note >= 10) return kAmber;
    return kRed;
  }

  Future<void> _open(String? url) async {
    if (url == null || url.isEmpty) return;
    final full = url.startsWith('http') ? url : '${ApiClient.baseUrl.replaceFirst('/api', '')}$url';
    final uri = Uri.tryParse(full);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Copies corrigées')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 84))
          : _copies.isEmpty
              ? const Center(child: Text('Aucune copie partagée pour le moment', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _copies.length,
                    itemBuilder: (context, i) {
                      final c = _copies[i];
                      final note = toDoubleOrNull(c['note']);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          onTap: () => _open(c['url_fichier']),
                          leading: CircleAvatar(
                            backgroundColor: _noteColor(note).withValues(alpha: 0.12),
                            child: Icon(Icons.document_scanner_rounded, color: _noteColor(note), size: 20),
                          ),
                          title: Text('${c['nom_matiere'] ?? 'Matière'} · ${c['type_evaluation'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text('Par ${c['prof_prenom'] ?? ''} ${c['prof_nom'] ?? ''} · Trimestre ${c['trimestre'] ?? ''}', style: const TextStyle(fontSize: 11.5)),
                          trailing: note != null
                              ? Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(color: _noteColor(note).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                                  child: Text('${note.toStringAsFixed(1)}/20', style: TextStyle(color: _noteColor(note), fontWeight: FontWeight.w800, fontSize: 12)),
                                )
                              : const Icon(Icons.open_in_new_rounded, color: kTextGray, size: 18),
                        ),
                      ).animate().fadeIn(delay: (i * 60).ms, duration: 280.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                    },
                  ),
                ),
    );
  }
}
