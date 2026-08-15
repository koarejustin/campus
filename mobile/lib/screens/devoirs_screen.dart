import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class DevoirsScreen extends StatefulWidget {
  const DevoirsScreen({super.key});

  @override
  State<DevoirsScreen> createState() => _DevoirsScreenState();
}

class _DevoirsScreenState extends State<DevoirsScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _devoirs = [];

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
      final data = await ApiClient.instance.get('/eleves/devoirs');
      if (data['success'] == true) {
        setState(() => _devoirs = data['devoirs'] ?? []);
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

  bool _isLate(String? iso) {
    if (iso == null) return false;
    try {
      return DateTime.parse(iso).isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Devoirs')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 110))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: kRed)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _devoirs.isEmpty
                      ? ListView(
                          children: const [
                            Padding(
                              padding: EdgeInsets.symmetric(vertical: 80),
                              child: Center(child: Text('Aucun devoir pour le moment 🎉', style: TextStyle(color: kTextGray))),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _devoirs.length,
                          itemBuilder: (context, i) {
                            final d = _devoirs[i];
                            final late = _isLate(d['date_limite']);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: kIndigo.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                          child: Text(d['matiere'] ?? '', style: const TextStyle(color: kIndigo, fontSize: 11, fontWeight: FontWeight.w800)),
                                        ),
                                        const Spacer(),
                                        Text(
                                          'Pour le ${_formatDate(d['date_limite'])}',
                                          style: TextStyle(fontSize: 11.5, color: late ? kRed : kTextGray, fontWeight: FontWeight.w700),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(d['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
                                    if ((d['description'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Text(d['description'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                                    ],
                                    const SizedBox(height: 8),
                                    Text(
                                      'Par ${d['prof_prenom'] ?? ''} ${d['prof_nom'] ?? ''}',
                                      style: const TextStyle(fontSize: 11.5, color: kTextGray, fontStyle: FontStyle.italic),
                                    ),
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: (i * 70).ms, duration: 300.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                          },
                        ),
                ),
    );
  }
}
