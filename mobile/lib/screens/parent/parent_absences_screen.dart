import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';
import 'parent_state.dart';
import 'child_switcher.dart';

class ParentAbsencesScreen extends StatefulWidget {
  const ParentAbsencesScreen({super.key});

  @override
  State<ParentAbsencesScreen> createState() => _ParentAbsencesScreenState();
}

class _ParentAbsencesScreenState extends State<ParentAbsencesScreen> {
  bool _loading = true;
  List<dynamic> _absences = [];
  int _justifiees = 0;
  int _nonJustifiees = 0;

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
      final data = await ApiClient.instance.get('/parents/absences-enfant?enfant_id=$enfantId');
      setState(() {
        _absences = data['absences'] ?? [];
        _justifiees = data['absences_justifiees'] ?? 0;
        _nonJustifiees = data['absences_non_justifiees'] ?? 0;
      });
    } catch (_) {
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

  Color _statusColor(String? statut) => statut == 'JUSTIFIÉE' ? kGreen : kRed;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Absences')),
      body: Column(
        children: [
          ChildSwitcher(onChanged: _load),
          Expanded(
            child: _loading
                ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 66))
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Row(
                          children: [
                            Expanded(child: _countCard('Justifiées', _justifiees, kGreen)),
                            const SizedBox(width: 12),
                            Expanded(child: _countCard('Non justifiées', _nonJustifiees, kRed)),
                          ],
                        ),
                        const SizedBox(height: 20),
                        if (_absences.isEmpty)
                          const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: Text('Aucune absence enregistrée 🎉', style: TextStyle(color: kTextGray)))),
                        for (int i = 0; i < _absences.length; i++)
                          Builder(builder: (context) {
                            final a = _absences[i];
                            final color = _statusColor(a['statut']);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              child: ListTile(
                                leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(Icons.event_busy_rounded, color: color, size: 20)),
                                title: Text(_formatDate(a['date_absence']), style: const TextStyle(fontWeight: FontWeight.w700)),
                                subtitle: Text(a['raison_absence'] ?? 'Aucune raison précisée'),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(8)),
                                  child: Text(a['statut'] ?? '', style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.w800)),
                                ),
                              ),
                            ).animate().fadeIn(delay: (i * 60).ms, duration: 260.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
                          }),
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _countCard(String label, int value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$value', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: color)),
            Text(label, style: const TextStyle(fontSize: 12, color: kTextGray, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
