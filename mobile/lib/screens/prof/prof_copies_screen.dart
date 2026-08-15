import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';

/// Historique des copies scannées envoyées — le backend le permet déjà
/// (GET /professeurs/copies-scannees) mais aucun écran web ne l'affichait.
class ProfCopiesScreen extends StatefulWidget {
  const ProfCopiesScreen({super.key});

  @override
  State<ProfCopiesScreen> createState() => _ProfCopiesScreenState();
}

class _ProfCopiesScreenState extends State<ProfCopiesScreen> {
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
      final data = await ApiClient.instance.get('/professeurs/copies-scannees');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Copies envoyées')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 76))
          : _copies.isEmpty
              ? const Center(child: Text('Aucune copie envoyée pour le moment', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _copies.length,
                    itemBuilder: (context, i) {
                      final c = _copies[i];
                      final note = toDoubleOrNull(c['note']);
                      final visible = c['visible_eleve'] == true;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: _noteColor(note).withValues(alpha: 0.12),
                            child: Icon(Icons.document_scanner_rounded, color: _noteColor(note), size: 20),
                          ),
                          title: Text('${c['prenom'] ?? ''} ${c['nom'] ?? ''} · ${c['nom_matiere'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          subtitle: Text(
                            '${c['type_evaluation'] ?? ''} · Trimestre ${c['trimestre'] ?? ''} · ${visible ? "Envoyée à l'élève" : "Gardée pour vous"}',
                            style: const TextStyle(fontSize: 11),
                          ),
                          trailing: note != null
                              ? Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(color: _noteColor(note).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                                  child: Text('${note.toStringAsFixed(1)}/20', style: TextStyle(color: _noteColor(note), fontWeight: FontWeight.w800, fontSize: 12)),
                                )
                              : null,
                        ),
                      ).animate().fadeIn(delay: (i * 60).ms, duration: 250.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
                    },
                  ),
                ),
    );
  }
}
