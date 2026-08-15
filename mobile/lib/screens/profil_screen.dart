import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import 'role_select_screen.dart';

class ProfilScreen extends StatefulWidget {
  const ProfilScreen({super.key});

  @override
  State<ProfilScreen> createState() => _ProfilScreenState();
}

class _ProfilScreenState extends State<ProfilScreen> {
  bool _loading = true;
  Map<String, dynamic>? _profil;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.instance.get('/eleves/mon-profil');
      if (data['success'] == true) {
        setState(() => _profil = data['profil']);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await ApiClient.instance.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const RoleSelectScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final nom = _profil?['nom'] ?? ApiClient.instance.user?['nom'] ?? '';
    final prenom = _profil?['prenom'] ?? ApiClient.instance.user?['prenom'] ?? '';
    final code = _profil?['code_unique'] ?? ApiClient.instance.user?['code_unique'] ?? '';
    final classe = _profil?['classe'] ?? ApiClient.instance.user?['classe_actuelle'] ?? '';
    final email = _profil?['email'] as String?;
    final telephone = _profil?['telephone'] as String?;
    final poste = _profil?['poste_elu'];

    return Scaffold(
      appBar: AppBar(title: const Text('Mon profil')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Container(
                    width: 84,
                    height: 84,
                    decoration: const BoxDecoration(gradient: kBrandGradient, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: Text(
                      (prenom.isNotEmpty ? prenom[0] : '') + (nom.isNotEmpty ? nom[0] : ''),
                      style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900),
                    ),
                  ),
                ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack, begin: const Offset(0.6, 0.6), end: const Offset(1, 1)).fadeIn(duration: 300.ms),
                const SizedBox(height: 14),
                Center(child: Text('$prenom $nom', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kTextDark)))
                    .animate().fadeIn(delay: 150.ms, duration: 300.ms),
                if (poste != null)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('🎖️ $poste', style: const TextStyle(color: kIndigo, fontWeight: FontWeight.w700, fontSize: 12.5)),
                    ),
                  ),
                const SizedBox(height: 24),
                Card(
                  child: Column(
                    children: [
                      _InfoRow(label: 'Identifiant', value: code),
                      const Divider(height: 1),
                      _InfoRow(label: 'Classe', value: classe),
                      if (email != null && email.isNotEmpty) ...[
                        const Divider(height: 1),
                        _InfoRow(label: 'Email', value: email),
                      ],
                      if (telephone != null && telephone.isNotEmpty) ...[
                        const Divider(height: 1),
                        _InfoRow(label: 'Téléphone', value: telephone),
                      ],
                    ],
                  ),
                ).animate().fadeIn(delay: 220.ms, duration: 300.ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: OutlinedButton.icon(
                    onPressed: _logout,
                    icon: const Icon(Icons.logout_rounded, color: kRed),
                    label: const Text('Déconnexion', style: TextStyle(color: kRed, fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(side: const BorderSide(color: kRed)),
                  ),
                ).animate().fadeIn(delay: 300.ms, duration: 300.ms),
              ],
            ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: kTextGray, fontWeight: FontWeight.w600, fontSize: 13)),
          Text(value, style: const TextStyle(color: kTextDark, fontWeight: FontWeight.w800, fontSize: 13)),
        ],
      ),
    );
  }
}
