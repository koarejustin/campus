import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class ParentAnnoncesScreen extends StatefulWidget {
  const ParentAnnoncesScreen({super.key});

  @override
  State<ParentAnnoncesScreen> createState() => _ParentAnnoncesScreenState();
}

class _ParentAnnoncesScreenState extends State<ParentAnnoncesScreen> {
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
      final data = await ApiClient.instance.get('/parents/annonces');
      setState(() => _annonces = data['annonces'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _priorityColor(String? p) {
    if (p == null) return kIndigo;
    return p.toUpperCase().contains('URGENT') ? kRed : kIndigo;
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
      appBar: AppBar(title: const Text('Annonces')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 96))
          : _annonces.isEmpty
              ? const Center(child: Text('Aucune annonce pour le moment', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _annonces.length,
                    itemBuilder: (context, i) {
                      final a = _annonces[i];
                      final color = _priorityColor(a['priorite']);
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
                                const SizedBox(height: 8),
                                Text(a['contenu'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                              ],
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
