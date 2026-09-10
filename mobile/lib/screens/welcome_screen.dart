import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme.dart';
import '../services/api_client.dart';
import 'role_select_screen.dart';

/// Écran de bienvenue affiché une fois au lancement de l'appli, avant le
/// choix d'espace — logo (photo réelle d'un baobab, arbre à palabres :
/// lieu traditionnel de transmission du savoir) qui s'anime, suivi du nom
/// de l'établissement chargé en direct depuis le serveur. Se ferme tout
/// seul après quelques secondes, ou au premier tap.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  String? _nomEtablissement;
  bool _configFailed = false;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _loadConfig();
    Future.delayed(const Duration(milliseconds: 3400), _goNext);
  }

  Future<void> _loadConfig() async {
    try {
      final data = await ApiClient.instance.get('/admin/config-public');
      final nom = (data['config'] as Map?)?['nom_etablissement'] as String?;
      if (mounted) setState(() => _nomEtablissement = (nom == null || nom.isEmpty) ? 'Campus Numérique' : nom);
    } catch (_) {
      if (mounted) setState(() => _configFailed = true);
    }
  }

  void _goNext() {
    if (!mounted || _leaving) return;
    _leaving = true;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 550),
        pageBuilder: (_, __, ___) => const RoleSelectScreen(),
        transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final schoolName = _configFailed ? 'Campus Numérique' : _nomEtablissement;
    return Scaffold(
      backgroundColor: kBg,
      body: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _goNext,
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 148,
                        height: 148,
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: kAmber, width: 3),
                          boxShadow: [
                            BoxShadow(color: kIndigo.withValues(alpha: 0.28), blurRadius: 30, spreadRadius: 2),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/baobab.png',
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stack) => Container(
                              color: kBorder,
                              alignment: Alignment.center,
                              child: const Icon(Icons.park_rounded, color: kIndigo, size: 48),
                            ),
                          ),
                        ),
                      )
                          .animate()
                          .scale(
                            duration: 750.ms,
                            curve: Curves.easeOutBack,
                            begin: const Offset(0.55, 0.55),
                            end: const Offset(1, 1),
                          )
                          .fadeIn(duration: 500.ms),
                      const SizedBox(height: 32),
                      const Text(
                        'Bienvenue',
                        style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: kTextDark),
                      )
                          .animate(delay: 450.ms)
                          .fadeIn(duration: 550.ms)
                          .slideY(begin: 0.35, end: 0, curve: Curves.easeOutCubic),
                      const SizedBox(height: 10),
                      SizedBox(
                        height: 26,
                        child: schoolName == null
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: kIndigo),
                              )
                            : Text(
                                schoolName,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: kIndigo),
                              ).animate().fadeIn(duration: 450.ms),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'PAYS DES HOMMES INTÈGRES',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kAmber, letterSpacing: 1.6),
                      ).animate(delay: 1000.ms).fadeIn(duration: 550.ms),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: const Text(
                  'Photo : Desijwo · CC BY-SA 4.0 · Wikimedia Commons',
                  style: TextStyle(fontSize: 10, color: kTextGray),
                  textAlign: TextAlign.center,
                ).animate(delay: 1300.ms).fadeIn(duration: 500.ms),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
