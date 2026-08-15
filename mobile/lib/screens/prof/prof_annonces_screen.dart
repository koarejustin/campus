import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class ProfAnnoncesScreen extends StatelessWidget {
  const ProfAnnoncesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Annonces'),
          bottom: const TabBar(
            labelColor: kGreen,
            unselectedLabelColor: kTextGray,
            indicatorColor: kGreen,
            tabs: [
              Tab(text: '📢 Officielles'),
              Tab(text: '✉️ Direction'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [_AnnoncesOfficielles(), _MessagesDirection()],
        ),
      ),
    );
  }
}

class _AnnoncesOfficielles extends StatefulWidget {
  const _AnnoncesOfficielles();

  @override
  State<_AnnoncesOfficielles> createState() => _AnnoncesOfficiellesState();
}

class _AnnoncesOfficiellesState extends State<_AnnoncesOfficielles> {
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
      final data = await ApiClient.instance.get('/professeurs/annonces');
      setState(() => _annonces = data['annonces'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _priorityColor(String? p) {
    if (p == null) return kIndigo;
    final up = p.toUpperCase();
    if (up.contains('URGENT')) return kRed;
    return kIndigo;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 90));
    if (_annonces.isEmpty) return const Center(child: Text('Aucune annonce', style: TextStyle(color: kTextGray)));
    return RefreshIndicator(
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
                      Expanded(child: Text(a['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14))),
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
    );
  }
}

class _MessagesDirection extends StatefulWidget {
  const _MessagesDirection();

  @override
  State<_MessagesDirection> createState() => _MessagesDirectionState();
}

class _MessagesDirectionState extends State<_MessagesDirection> {
  bool _loading = true;
  List<dynamic> _messages = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/professeurs/messages-prives');
      setState(() => _messages = data['messages'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(dynamic id) async {
    await ApiClient.instance.patch('/professeurs/messages-prives/$id/lu', {});
    _load();
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
    if (_loading) return const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 84));
    if (_messages.isEmpty) return const Center(child: Text('Aucun message', style: TextStyle(color: kTextGray)));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _messages.length,
        itemBuilder: (context, i) {
          final m = _messages[i];
          final isDirection = m['expediteur_role'] == 'DIRECTION';
          final unread = m['lu'] != true;
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              onTap: unread ? () => _markRead(m['id_message']) : null,
              leading: CircleAvatar(
                backgroundColor: isDirection ? kIndigo : kGreen,
                child: Text(
                  ((m['expediteur_prenom'] ?? '?').toString().isNotEmpty ? m['expediteur_prenom'][0] : '?').toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ),
              title: Row(
                children: [
                  Expanded(child: Text('${m['expediteur_prenom'] ?? ''} ${m['expediteur_nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: (isDirection ? kIndigo : kGreen).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                    child: Text(isDirection ? '📌 Direction' : '👤 Collègue', style: TextStyle(fontSize: 9.5, color: isDirection ? kIndigo : kGreen, fontWeight: FontWeight.w800)),
                  ),
                ],
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m['contenu'] ?? '', style: const TextStyle(fontSize: 12.5), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(_formatDate(m['created_at']), style: const TextStyle(fontSize: 10.5, color: kTextGray)),
                  ],
                ),
              ),
              trailing: unread ? Container(width: 9, height: 9, decoration: const BoxDecoration(color: kRed, shape: BoxShape.circle)) : null,
            ),
          ).animate().fadeIn(delay: (i * 60).ms, duration: 250.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
        },
      ),
    );
  }
}
