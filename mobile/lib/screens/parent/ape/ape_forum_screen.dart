import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../services/api_client.dart';
import '../../../theme.dart';
import '../../../widgets/skeleton.dart';

class ApeForumScreen extends StatefulWidget {
  const ApeForumScreen({super.key});

  @override
  State<ApeForumScreen> createState() => _ApeForumScreenState();
}

class _ApeForumScreenState extends State<ApeForumScreen> {
  bool _loading = true;
  List<dynamic> _posts = [];
  final _ctrl = TextEditingController();
  bool _sending = false;
  final _myId = ApiClient.instance.userId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/ape/forum');
      setState(() => _posts = data['posts'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final texte = _ctrl.text.trim();
    if (texte.isEmpty) return;
    setState(() => _sending = true);
    try {
      final r = await ApiClient.instance.post('/ape/forum', {'contenu': texte});
      if (r['success'] == true) {
        _ctrl.clear();
        await _load();
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _like(dynamic id) async {
    try {
      final r = await ApiClient.instance.post('/ape/forum/$id/like', {});
      if (r['success'] == true) await _load();
    } catch (_) {}
  }

  String _formatDate(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')} à ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: _loading
              ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6, itemHeight: 76))
              : _posts.isEmpty
                  ? const Center(child: Text('Soyez le premier à écrire', style: TextStyle(color: kTextGray)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _posts.length,
                        itemBuilder: (context, i) {
                          final p = _posts[i];
                          final mine = p['id_auteur']?.toString() == _myId;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 15,
                                        backgroundColor: kApeGradient.colors.first.withValues(alpha: 0.12),
                                        child: Text((p['prenom'] ?? '?').toString().isNotEmpty ? p['prenom'][0] : '?', style: TextStyle(color: kApeGradient.colors.first, fontWeight: FontWeight.w800, fontSize: 12)),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text('${p['prenom'] ?? ''} ${p['nom'] ?? ''}${mine ? ' (vous)' : ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                                            Text(_formatDate(p['created_at']), style: const TextStyle(fontSize: 10.5, color: kTextGray)),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(p['contenu'] ?? '', style: const TextStyle(fontSize: 13.5)),
                                  const SizedBox(height: 6),
                                  InkWell(
                                    onTap: () => _like(p['id_post']),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.favorite_rounded, size: 16, color: Color(0xFFDB2777)),
                                        const SizedBox(width: 4),
                                        Text('${p['nb_likes'] ?? 0}', style: const TextStyle(fontSize: 12, color: kTextGray, fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ).animate().fadeIn(delay: (i * 50).ms, duration: 220.ms).slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                        },
                      ),
                    ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    decoration: InputDecoration(
                      hintText: 'Écrire un message au forum...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kBorder)),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: kApeGradient.colors.first,
                  child: _sending
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : IconButton(icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18), onPressed: _send),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
