import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';
import 'absences_screen.dart';
import 'convocations_screen.dart';
import 'annonces_screen.dart';
import 'bulletin_screen.dart';
import 'ressources_screen.dart';
import 'devoirs_screen.dart';
import 'compositions_screen.dart';
import 'forum_screen.dart';
import 'parent/parent_absences_screen.dart';
import 'parent/parent_convocations_screen.dart';
import 'parent/parent_annonces_screen.dart';
import 'parent/parent_bulletin_screen.dart';
import 'parent/parent_cotisations_screen.dart';
import 'surveillant/surveillant_convocations_screen.dart';
import 'direction/direction_compositions_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _loading = true;
  List<dynamic> _notifications = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/notifications');
      setState(() => _notifications = data['notifications'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAsRead(dynamic id) async {
    try {
      await ApiClient.instance.put('/notifications/$id/read', {});
      setState(() {
        final n = _notifications.firstWhere((n) => n['id_notification'] == id, orElse: () => null);
        if (n != null) n['lue'] = true;
      });
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      await ApiClient.instance.put('/notifications/read-all', {});
      setState(() {
        for (final n in _notifications) {
          n['lue'] = true;
        }
      });
    } catch (_) {}
  }

  Future<void> _delete(dynamic id) async {
    try {
      await ApiClient.instance.delete('/notifications/$id');
      setState(() => _notifications.removeWhere((n) => n['id_notification'] == id));
    } catch (_) {}
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'ABSENCE': return Icons.event_busy_rounded;
      case 'CONVOCATION': return Icons.mail_rounded;
      case 'NOTE': return Icons.grade_rounded;
      case 'RESSOURCE': return Icons.menu_book_rounded;
      case 'ORIENTATION': return Icons.explore_rounded;
      case 'DEVOIR': return Icons.assignment_rounded;
      case 'FORUM_CLASSE': case 'INTER_CLASSE': return Icons.chat_bubble_rounded;
      case 'GRAND_ELEVES': case 'GRAND_ELEVES_COMMENTAIRE': return Icons.public_rounded;
      case 'ANNONCE': return Icons.campaign_rounded;
      case 'COMPOSITION': case 'EXAMEN_BLANC': return Icons.edit_note_rounded;
      case 'COTISATION_APE': return Icons.payments_rounded;
      default: return Icons.notifications_rounded;
    }
  }

  // Vers quel écran ouvrir selon le rôle actuel et le type de notification —
  // même logique que le web (naviguerVers), qui redirige selon le type et le
  // rôle plutôt qu'un lien générique difficile à réutiliser tel quel en Flutter.
  Widget? _screenFor(String? type) {
    final role = ApiClient.instance.user?['role_actuel'];
    switch (role) {
      case 'ELEVE':
        switch (type) {
          case 'ABSENCE': return const AbsencesScreen();
          case 'CONVOCATION': return const ConvocationsScreen();
          case 'ANNONCE': return const AnnoncesScreen();
          case 'NOTE': return const BulletinScreen();
          case 'RESSOURCE': return const RessourcesScreen();
          case 'DEVOIR': return const DevoirsScreen();
          case 'FORUM_CLASSE': case 'INTER_CLASSE': case 'GRAND_ELEVES': case 'GRAND_ELEVES_COMMENTAIRE':
            return const ForumScreen();
          case 'COMPOSITION': case 'EXAMEN_BLANC': return const CompositionsScreen();
        }
        break;
      case 'PARENT':
        switch (type) {
          case 'ABSENCE': return const ParentAbsencesScreen();
          case 'CONVOCATION': return const ParentConvocationsScreen();
          case 'ANNONCE': return const ParentAnnoncesScreen();
          case 'NOTE': return const ParentBulletinScreen();
          case 'COTISATION_APE': return const ParentCotisationsScreen();
        }
        break;
      case 'DIRECTION': case 'SURVEILLANT':
        switch (type) {
          case 'CONVOCATION': return const SurveillantConvocationsScreen();
          case 'COMPOSITION': case 'EXAMEN_BLANC': return const DirectionCompositionsScreen();
        }
        break;
    }
    return null;
  }

  Future<void> _onTap(Map n) async {
    final id = n['id_notification'];
    if (n['lue'] != true) await _markAsRead(id);
    final screen = _screenFor(n['type']);
    if (screen != null && mounted) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
    }
  }

  String _timeAgo(String? iso) {
    if (iso == null) return '';
    try {
      final d = DateTime.parse(iso);
      final diff = DateTime.now().difference(d);
      if (diff.inMinutes < 1) return 'À l\'instant';
      if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
      if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
      if (diff.inDays < 7) return 'Il y a ${diff.inDays} j';
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _notifications.any((n) => n['lue'] != true);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (hasUnread) TextButton(onPressed: _markAllAsRead, child: const Text('Tout marquer lu', style: TextStyle(fontSize: 12.5))),
        ],
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8, itemHeight: 68))
          : _notifications.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.notifications_off_outlined, size: 48, color: kTextGray),
                      SizedBox(height: 10),
                      Text('Aucune notification', style: TextStyle(color: kTextGray)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    itemCount: _notifications.length,
                    itemBuilder: (context, i) {
                      final n = _notifications[i];
                      final lue = n['lue'] == true;
                      final id = n['id_notification'];
                      final hasTarget = _screenFor(n['type']) != null;
                      return Dismissible(
                        key: ValueKey(id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          decoration: BoxDecoration(color: kRed, borderRadius: BorderRadius.circular(14)),
                          child: const Icon(Icons.delete_rounded, color: Colors.white),
                        ),
                        onDismissed: (_) => _delete(id),
                        child: Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          color: lue ? Colors.white : kIndigo.withValues(alpha: 0.04),
                          child: ListTile(
                            onTap: () => _onTap(n),
                            leading: Stack(
                              children: [
                                CircleAvatar(backgroundColor: kIndigo.withValues(alpha: 0.1), child: Icon(_iconFor(n['type']), color: kIndigo, size: 18)),
                                if (!lue)
                                  Positioned(
                                    right: 0, top: 0,
                                    child: Container(width: 9, height: 9, decoration: const BoxDecoration(color: kRed, shape: BoxShape.circle)),
                                  ),
                              ],
                            ),
                            title: Text(n['titre'] ?? '', style: TextStyle(fontWeight: lue ? FontWeight.w600 : FontWeight.w800, fontSize: 13)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if ((n['contenu'] ?? '').toString().isNotEmpty)
                                  Text(n['contenu'], style: const TextStyle(fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                                const SizedBox(height: 3),
                                Text(_timeAgo(n['created_at']), style: const TextStyle(fontSize: 10.5, color: kTextGray)),
                              ],
                            ),
                            trailing: hasTarget ? const Icon(Icons.chevron_right_rounded, color: kTextGray, size: 20) : null,
                          ),
                        ),
                      ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                    },
                  ),
                ),
    );
  }
}
