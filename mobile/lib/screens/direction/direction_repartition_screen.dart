import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class DirectionRepartitionScreen extends StatefulWidget {
  const DirectionRepartitionScreen({super.key});

  @override
  State<DirectionRepartitionScreen> createState() => _DirectionRepartitionScreenState();
}

class _DirectionRepartitionScreenState extends State<DirectionRepartitionScreen> {
  bool _loading = true;
  List<dynamic> _repartition = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/stats');
      final stats = data['stats'] as Map<String, dynamic>? ?? {};
      setState(() => _repartition = (stats['repartition_classes'] as List?) ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalEleves = _repartition.fold<int>(0, (s, c) => s + ((c['effectif'] ?? 0) as int));
    final maxEffectif = _repartition.isEmpty ? 0 : _repartition.map((c) => (c['effectif'] ?? 0) as int).reduce((a, b) => a > b ? a : b);

    return Scaffold(
      appBar: AppBar(title: const Text('Répartition par classe')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8, itemHeight: 56))
          : _repartition.isEmpty
              ? const Center(child: Text('Aucune classe pour le moment', style: TextStyle(color: kTextGray)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(Icons.class_rounded, color: kParentGradient.colors.first, size: 20),
                                    const SizedBox(height: 8),
                                    Text('${_repartition.length}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kTextDark)),
                                    const Text('Classes', style: TextStyle(fontSize: 11, color: kTextGray, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.groups_rounded, color: kIndigo, size: 20),
                                    const SizedBox(height: 8),
                                    Text('$totalEleves', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: kTextDark)),
                                    const Text('Élèves', style: TextStyle(fontSize: 11, color: kTextGray, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ).animate().fadeIn(duration: 300.ms),
                      const SizedBox(height: 20),
                      for (final indexed in _repartition.asMap().entries)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Row(
                            children: [
                              SizedBox(width: 74, child: Text(indexed.value['classe']?.toString() ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700))),
                              Expanded(
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: TweenAnimationBuilder<double>(
                                    tween: Tween(begin: 0, end: maxEffectif == 0 ? 0 : ((indexed.value['effectif'] ?? 0) as int) / maxEffectif),
                                    duration: 700.ms,
                                    curve: Curves.easeOutCubic,
                                    builder: (context, value, _) => LinearProgressIndicator(value: value, minHeight: 12, backgroundColor: kBg, color: kSurveillantGradient.colors.first),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              SizedBox(width: 28, child: Text('${indexed.value['effectif'] ?? 0}', textAlign: TextAlign.right, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: kTextGray))),
                            ],
                          ),
                        ).animate(delay: (indexed.key * 50).ms).fadeIn(duration: 260.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic),
                    ],
                  ),
                ),
    );
  }
}
