import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';
import 'parent_state.dart';
import 'child_switcher.dart';

class ParentConvocationsScreen extends StatefulWidget {
  const ParentConvocationsScreen({super.key});

  @override
  State<ParentConvocationsScreen> createState() => _ParentConvocationsScreenState();
}

class _ParentConvocationsScreenState extends State<ParentConvocationsScreen> {
  bool _loading = true;
  List<dynamic> _convocations = [];
  final Set<dynamic> _accusing = {};

  @override
  void initState() {
    super.initState();
    ParentState.instance.addListener(_load);
    _load();
  }

  @override
  void dispose() {
    ParentState.instance.removeListener(_load);
    super.dispose();
  }

  Future<void> _load() async {
    final enfantId = ParentState.instance.selectedId;
    if (enfantId == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/parents/convocations-enfant?enfant_id=$enfantId');
      setState(() => _convocations = data['convocations'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _accuser(dynamic id) async {
    setState(() => _accusing.add(id));
    try {
      final r = await ApiClient.instance.post('/parents/convocations/$id/accuser', {});
      if (r['success'] == true) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Réception accusée ✓'), backgroundColor: kGreen));
        await _load();
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(r['message'] ?? 'Erreur'), backgroundColor: kRed));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur réseau'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _accusing.remove(id));
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

  Color _periodeColor(String? p) {
    switch (p) {
      case 'URGENTE': return kRed;
      case 'PASSEE': return kTextGray;
      default: return kAmber;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Convocations')),
      body: Column(
        children: [
          ChildSwitcher(onChanged: _load),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 110))
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
                            final accepte = c['statut'] == 'ACCUSE_RECU';
                            final id = c['id_convocation'];
                            final busy = _accusing.contains(id);
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
                                    Text(_formatDate(c['date_convocation']), style: const TextStyle(color: kAmber, fontWeight: FontWeight.w700, fontSize: 12.5)),
                                    if ((c['motif'] ?? '').toString().isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Text(c['motif'], style: const TextStyle(fontSize: 13, color: kTextGray)),
                                    ],
                                    const SizedBox(height: 10),
                                    if (accepte)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                        child: const Row(mainAxisSize: MainAxisSize.min, children: [
                                          Icon(Icons.check_circle_rounded, color: kGreen, size: 15),
                                          SizedBox(width: 6),
                                          Text('Accusé reçu', style: TextStyle(color: kGreen, fontWeight: FontWeight.w700, fontSize: 12)),
                                        ]),
                                      )
                                    else
                                      SizedBox(
                                        width: double.infinity, height: 40,
                                        child: OutlinedButton.icon(
                                          onPressed: busy ? null : () => _accuser(id),
                                          icon: busy
                                              ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                              : const Icon(Icons.mark_email_read_rounded, size: 16),
                                          label: const Text('Accuser réception', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ).animate().fadeIn(delay: (i * 70).ms, duration: 280.ms).slideY(begin: 0.08, end: 0, curve: Curves.easeOutCubic);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
