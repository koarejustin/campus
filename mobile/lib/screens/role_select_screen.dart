import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme.dart';
import 'login_screen.dart';

/// Portail d'entrée — équivalent du login.html web qui propose un bouton
/// par rôle.
class RoleSelectScreen extends StatelessWidget {
  const RoleSelectScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 76, height: 76,
                    decoration: BoxDecoration(gradient: kBrandGradient, borderRadius: BorderRadius.circular(22)),
                    alignment: Alignment.center,
                    child: const Icon(Icons.school_rounded, color: Colors.white, size: 38),
                  ).animate().scale(duration: 450.ms, curve: Curves.easeOutBack, begin: const Offset(0.5, 0.5), end: const Offset(1, 1)).fadeIn(duration: 300.ms),
                  const SizedBox(height: 20),
                  const Text('Campus Numérique', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: kTextDark))
                      .animate().fadeIn(delay: 150.ms, duration: 300.ms),
                  const SizedBox(height: 4),
                  const Text('Choisis ton espace', style: TextStyle(fontSize: 14, color: kTextGray, fontWeight: FontWeight.w600))
                      .animate().fadeIn(delay: 220.ms, duration: 300.ms),
                  const SizedBox(height: 32),
                  _RoleCard(
                    icon: Icons.school_rounded,
                    label: 'Élève',
                    color: kIndigo,
                    delay: 300,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen(role: 'ELEVE'))),
                  ),
                  const SizedBox(height: 14),
                  _RoleCard(
                    icon: Icons.co_present_rounded,
                    label: 'Professeur',
                    color: kGreen,
                    delay: 370,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen(role: 'PROFESSEUR'))),
                  ),
                  const SizedBox(height: 14),
                  _RoleCard(
                    icon: Icons.family_restroom_rounded,
                    label: 'Parent',
                    color: kParentGradient.colors.first,
                    delay: 440,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen(role: 'PARENT'))),
                  ),
                  const SizedBox(height: 14),
                  _RoleCard(
                    icon: Icons.shield_rounded,
                    label: 'Surveillant',
                    color: kSurveillantGradient.colors.first,
                    delay: 510,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen(role: 'SURVEILLANT'))),
                  ),
                  const SizedBox(height: 14),
                  _RoleCard(
                    icon: Icons.workspace_premium_rounded,
                    label: 'Alumni',
                    color: kAlumniGradient.colors.first,
                    delay: 580,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen(role: 'ALUMNI'))),
                  ),
                  const SizedBox(height: 14),
                  _RoleCard(
                    icon: Icons.admin_panel_settings_rounded,
                    label: 'Direction',
                    color: kDirectionGradient.colors.first,
                    delay: 650,
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoginScreen(role: 'DIRECTION'))),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final int delay;
  final VoidCallback onTap;
  const _RoleCard({required this.icon, required this.label, required this.color, required this.delay, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                alignment: Alignment.center,
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kTextDark))),
              const Icon(Icons.chevron_right_rounded, color: kTextGray),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(delay: delay.ms, duration: 300.ms).slideY(begin: 0.15, end: 0, curve: Curves.easeOutCubic);
  }
}
