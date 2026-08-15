import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class AlumniDemandesScreen extends StatefulWidget {
  final VoidCallback onChanged;
  const AlumniDemandesScreen({super.key, required this.onChanged});

  @override
  State<AlumniDemandesScreen> createState() => _AlumniDemandesScreenState();
}

class _AlumniDemandesScreenState extends State<AlumniDemandesScreen> {
  bool _loading = true;
  List<dynamic> _demandes = [];
  final Set<dynamic> _busy = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/mentorat/demandes');
      setState(() => _demandes = data['demandes'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _repondre(dynamic id, bool accepter) async {
    setState(() => _busy.add(id));
    try {
      final r = await ApiClient.instance.put('/mentorat/demandes/$id/repondre', {'accepter': accepter});
      if (r['success'] == true) {
        setState(() => _demandes.removeWhere((d) => d['id_demande'] == id));
        widget.onChanged();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(accepter ? 'Demande acceptée 🎉' : 'Demande refusée'),
            backgroundColor: accepter ? kGreen : kTextGray,
          ));
        }
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4))
        : RefreshIndicator(
            onRefresh: _load,
            child: _demandes.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                      const Center(
                        child: Column(
                          children: [
                            Icon(Icons.inbox_rounded, size: 56, color: kTextGray),
                            SizedBox(height: 10),
                            Text('Aucune demande en attente', style: TextStyle(color: kTextGray)),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                    itemCount: _demandes.length,
                    itemBuilder: (context, i) {
                      final d = _demandes[i];
                      final id = d['id_demande'];
                      final busy = _busy.contains(id);
                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: kAlumniGradient.colors.first.withValues(alpha: 0.12),
                                    child: Text((d['prenom'] ?? '?').toString().isNotEmpty ? d['prenom'][0] : '?', style: TextStyle(color: kAlumniGradient.colors.first, fontWeight: FontWeight.w800)),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${d['prenom'] ?? ''} ${d['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
                                        Text(d['classe'] ?? '', style: const TextStyle(fontSize: 11.5, color: kTextGray)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              if ((d['message'] ?? '').toString().isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(color: kBg, borderRadius: BorderRadius.circular(10)),
                                  child: Text(d['message'], style: const TextStyle(fontSize: 12.5)),
                                ),
                              ],
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton(
                                      onPressed: busy ? null : () => _repondre(id, false),
                                      style: OutlinedButton.styleFrom(foregroundColor: kRed, side: const BorderSide(color: kRed)),
                                      child: const Text('Refuser'),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: ElevatedButton(
                                      onPressed: busy ? null : () => _repondre(id, true),
                                      style: ElevatedButton.styleFrom(backgroundColor: kGreen, foregroundColor: Colors.white),
                                      child: busy
                                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                          : const Text('Accepter'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(duration: 250.ms).slideY(begin: 0.08, end: 0);
                    },
                  ),
          );
  }
}
