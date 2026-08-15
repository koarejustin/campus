import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class SurveillantCahiersScreen extends StatefulWidget {
  const SurveillantCahiersScreen({super.key});

  @override
  State<SurveillantCahiersScreen> createState() => _SurveillantCahiersScreenState();
}

class _SurveillantCahiersScreenState extends State<SurveillantCahiersScreen> {
  bool _loading = true;
  List<dynamic> _seances = [];
  final _classeCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final classe = _classeCtrl.text.trim();
      final path = '/surveillants/cahiers-texte${classe.isNotEmpty ? '?classe=${Uri.encodeQueryComponent(classe)}' : ''}';
      final data = await ApiClient.instance.get(path);
      setState(() => _seances = data['seances'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cahiers de texte')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _classeCtrl,
              decoration: InputDecoration(
                hintText: 'Filtrer par classe...',
                prefixIcon: const Icon(Icons.filter_list_rounded, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: kBorder)),
              ),
              onSubmitted: (_) => _load(),
            ),
          ),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 84))
                : _seances.isEmpty
                    ? const Center(child: Text('Aucune séance trouvée', style: TextStyle(color: kTextGray)))
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
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
                                            '${s['classe'] ?? ''} · ${s['matiere'] ?? ''}',
                                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: kSurveillantGradient.colors.first, letterSpacing: .3),
                                          ),
                                        ),
                                        Text(s['date_seance'] ?? '', style: const TextStyle(fontSize: 11, color: kTextGray)),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(s['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                    const SizedBox(height: 2),
                                    Text('Par ${s['prof_prenom'] ?? ''} ${s['prof_nom'] ?? ''}', style: const TextStyle(fontSize: 11.5, color: kTextGray, fontStyle: FontStyle.italic)),
                                    if ((s['contenu'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Text(s['contenu'], style: const TextStyle(fontSize: 12.5, color: kTextGray)),
                                    ],
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: (i * 60).ms, duration: 260.ms).slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
