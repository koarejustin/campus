import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class AbsencesScreen extends StatefulWidget {
  const AbsencesScreen({super.key});

  @override
  State<AbsencesScreen> createState() => _AbsencesScreenState();
}

class _AbsencesScreenState extends State<AbsencesScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _absences = [];
  int _justifiees = 0;
  int _nonJustifiees = 0;

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
      final data = await ApiClient.instance.get('/eleves/absences');
      if (data['success'] == true) {
        setState(() {
          _absences = data['absences'] ?? [];
          _justifiees = data['absences_justifiees'] ?? 0;
          _nonJustifiees = data['absences_non_justifiees'] ?? 0;
        });
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
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return iso;
    }
  }

  Color _statusColor(String? statut) {
    switch (statut) {
      case 'JUSTIFIÉE':
        return kGreen;
      case 'NON JUSTIFIÉE':
        return kRed;
      default:
        return kAmber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Absences')),
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
                SkeletonList(count: 5),
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
                            child: _CountCard(label: 'Justifiées', value: _justifiees, color: kGreen)
                                .animate().fadeIn(duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _CountCard(label: 'Non justifiées', value: _nonJustifiees, color: kRed)
                                .animate().fadeIn(delay: 80.ms, duration: 300.ms).slideY(begin: 0.2, end: 0, curve: Curves.easeOutCubic),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (_absences.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('Aucune absence enregistrée 🎉', style: TextStyle(color: kTextGray))),
                        ),
                      for (int i = 0; i < _absences.length; i++)
                        Builder(builder: (context) {
                          final a = _absences[i];
                          final statut = a['statut'] as String?;
                          final color = _statusColor(statut);
                          final urgent = statut == 'NON JUSTIFIÉE';
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: color.withValues(alpha: 0.12),
                                child: Icon(Icons.event_busy_rounded, color: color, size: 20),
                              ),
                              title: Text(_formatDate(a['date_absence']), style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(a['raison_absence'] ?? 'Aucune raison précisée'),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  statut ?? '',
                                  style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w800),
                                ),
                              ).animate(
                                onPlay: urgent ? (c) => c.repeat(reverse: true) : null,
                              ).scaleXY(
                                end: urgent ? 1.08 : 1.0,
                                duration: 900.ms,
                                curve: Curves.easeInOut,
                              ),
                            ),
                          ).animate().fadeIn(delay: (150 + i * 60).ms, duration: 280.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
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
