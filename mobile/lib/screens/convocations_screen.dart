import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class ConvocationsScreen extends StatefulWidget {
  const ConvocationsScreen({super.key});

  @override
  State<ConvocationsScreen> createState() => _ConvocationsScreenState();
}

class _ConvocationsScreenState extends State<ConvocationsScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _convocations = [];

  int get _nbEnAttente => _convocations.where((c) => c['statut'] != 'ACCUSE_RECU').length;
  int get _nbAccusees => _convocations.where((c) => c['statut'] == 'ACCUSE_RECU').length;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.instance.get('/eleves/convocations');
      if (data['success'] == true) {
        setState(() => _convocations = data['convocations'] ?? []);
      } else {
        setState(() => _error = data['message'] ?? 'Erreur de chargement');
      }
    } catch (e) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} à ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }

  Color _periodeColor(String? periode) {
    switch (periode) {
      case 'URGENTE':
        return kRed;
      case 'PASSEE':
        return kTextGray;
      default:
        return kAmber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Convocations')),
      body: _loading
          ? ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                Row(children: [
                  Expanded(child: Skeleton(height: 78)),
                  SizedBox(width: 12),
                  Expanded(child: Skeleton(height: 78)),
                ]),
                SizedBox(height: 20),
                SkeletonList(count: 4, itemHeight: 92),
              ],
            )
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kRed)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _CountCard(label: 'En attente', value: _nbEnAttente, color: kAmber)
                                .animate().fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _CountCard(label: 'Accusées', value: _nbAccusees, color: kGreen)
                                .animate(delay: 80.ms).fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (_convocations.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('Aucune convocation 🎉', style: TextStyle(color: kTextGray))),
                        )
                      else
                        for (int i = 0; i < _convocations.length; i++)
                          Builder(builder: (context) {
                            final c = _convocations[i];
                            final color = _periodeColor(c['periode']);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(child: Text(c['sujet'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5))),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                                          child: Text(c['periode'] ?? '', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w800)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(_formatDate(c['date_convocation']), style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w700, fontSize: 12.5)),
                                    if ((c['motif'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Text(c['motif'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                                    ],
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: (150 + i * 70).ms, duration: 280.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                          }),
                    ],
                  ),
                ),
    );
  }
}

class _CountCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _CountCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: value.toDouble()),
              duration: const Duration(milliseconds: 700),
              curve: Curves.easeOutCubic,
              builder: (context, v, _) => Text('${v.round()}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color)),
            ),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 12, color: kTextGray, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
