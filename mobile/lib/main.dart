import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/api_client.dart';
import 'services/push_notifications.dart';
import 'theme.dart';
import 'role_router.dart';
import 'screens/role_select_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (!kIsWeb) {
    // Le web n'a pas de google-services.json / config Firebase web pour
    // l'instant — seules les notifications push mobiles sont câblées.
    try {
      await Firebase.initializeApp();
    } catch (_) {}
  }
  runApp(const CampusNumeriqueApp());
}

class CampusNumeriqueApp extends StatelessWidget {
  const CampusNumeriqueApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Campus Numérique',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const _StartupGate(),
    );
  }
}

/// Vérifie s'il y a déjà une session enregistrée (token stocké localement)
/// avant d'afficher l'écran de connexion — évite de redemander le mot de
/// passe à chaque redémarrage de l'appli. Route vers le bon espace selon
/// le rôle du compte connecté.
class _StartupGate extends StatefulWidget {
  const _StartupGate();

  @override
  State<_StartupGate> createState() => _StartupGateState();
}

class _StartupGateState extends State<_StartupGate> {
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    ApiClient.instance.loadSession().then((_) {
      if (mounted) setState(() => _ready = true);
      if (ApiClient.instance.isLoggedIn) PushNotifications.instance.init();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (!ApiClient.instance.isLoggedIn) return const RoleSelectScreen();
    return homeScreenFor(ApiClient.instance.user?['role_actuel']);
  }
}
