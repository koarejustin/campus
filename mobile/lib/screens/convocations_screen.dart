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
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 92))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kRed)))
              : _convocations.isEmpty
                  ? const Center(child: Text('Aucune convocation 🎉', style: TextStyle(color: kTextGray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _convocations.length,
                        itemBuilder: (context, i) {
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
                          ).animate().fadeIn(delay: (i * 70).ms, duration: 280.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                        },
                      ),
                    ),
    );
  }
}
