import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../screens/notifications_screen.dart';

/// Icône cloche avec badge de notifications non lues — à placer dans les
/// `actions` d'un AppBar. Recharge le compte à chaque fois qu'elle est
/// reconstruite (au retour sur l'écran) et au montage initial.
class NotificationBell extends StatefulWidget {
  final Color? color;
  const NotificationBell({super.key, this.color});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _count = 0;

  @override
  void initState() {
    super.initState();
    _loadCount();
  }

  Future<void> _loadCount() async {
    try {
      final data = await ApiClient.instance.get('/notifications/count');
      if (mounted) setState(() => _count = data['count'] ?? 0);
    } catch (_) {}
  }

  Future<void> _open() async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
    _loadCount();
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: _open,
      icon: Badge(
        label: Text('$_count'),
        isLabelVisible: _count > 0,
        backgroundColor: Colors.red,
        child: Icon(Icons.notifications_outlined, color: widget.color),
      ),
    );
  }
}
