import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../services/push_notifications.dart';
import '../theme.dart';
import '../role_router.dart';

class _RoleMeta {
  final String label;
  final IconData icon;
  final String hint;
  const _RoleMeta(this.label, this.icon, this.hint);
}

const Map<String, _RoleMeta> _roleMeta = {
  'ELEVE': _RoleMeta('Espace Élève', Icons.school_rounded, 'CN-2026-XXXX'),
  'PROFESSEUR': _RoleMeta('Espace Professeur', Icons.co_present_rounded, 'PROF-2026-XXX'),
  'PARENT': _RoleMeta('Espace Parent', Icons.family_restroom_rounded, 'PAR-2026-XXXX'),
  'SURVEILLANT': _RoleMeta('Espace Surveillant', Icons.shield_rounded, 'SURV-2026-XXX'),
  'DIRECTION': _RoleMeta('Espace Direction', Icons.admin_panel_settings_rounded, 'DIR-2026-XXX'),
  'ALUMNI': _RoleMeta('Espace Alumni', Icons.workspace_premium_rounded, 'ALUMNI-2026-XXX'),
};

class LoginScreen extends StatefulWidget {
  final String role;
  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _codeCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _obscure = true;
  int _shakeTrigger = 0;

  _RoleMeta get _meta => _roleMeta[widget.role] ?? _roleMeta['ELEVE']!;

  Future<void> _submit() async {
    final code = _codeCtrl.text.trim();
    final pass = _passCtrl.text;
    if (code.isEmpty || pass.isEmpty) {
      setState(() {
        _error = 'Identifiant et mot de passe requis';
        _shakeTrigger++;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiClient.instance.login(code, pass, role: widget.role);
      if (!mounted) return;
      if (data['success'] == true) {
        final role = data['user']?['role_actuel'] ?? widget.role;
        PushNotifications.instance.init();
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => homeScreenFor(role)),
        );
      } else {
        setState(() {
          _error = data['message'] ?? 'Connexion refusée';
          _shakeTrigger++;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Erreur réseau : impossible de joindre le serveur';
        _shakeTrigger++;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

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
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back_rounded, color: kTextGray),
                      ),
                      const Spacer(),
                    ],
                  ),
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      gradient: kBrandGradient,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Icon(_meta.icon, color: Colors.white, size: 36),
                  ).animate().scale(duration: 450.ms, curve: Curves.easeOutBack, begin: const Offset(0.5, 0.5), end: const Offset(1, 1)).fadeIn(duration: 300.ms),
                  const SizedBox(height: 20),
                  const Text(
                    'Campus Numérique',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: kTextDark),
                  ).animate().fadeIn(delay: 150.ms, duration: 300.ms).slideY(begin: 0.2, end: 0),
                  Text(
                    _meta.label,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: kTextGray),
                  ).animate().fadeIn(delay: 220.ms, duration: 300.ms),
                  const SizedBox(height: 32),
                  KeyedSubtree(
                    key: ValueKey(_shakeTrigger),
                    child: Column(
                      children: [
                        TextField(
                          controller: _codeCtrl,
                          textInputAction: TextInputAction.next,
                          decoration: InputDecoration(
                            labelText: 'Identifiant',
                            hintText: _meta.hint,
                            border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                            enabledBorder: _error != null
                                ? const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12)), borderSide: BorderSide(color: kRed))
                                : null,
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _passCtrl,
                          obscureText: _obscure,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'Mot de passe',
                            border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                            enabledBorder: _error != null
                                ? const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12)), borderSide: BorderSide(color: kRed))
                                : null,
                            suffixIcon: IconButton(
                              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                              onPressed: () => setState(() => _obscure = !_obscure),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ).animate().shake(hz: 4, curve: Curves.easeInOut, duration: _shakeTrigger > 0 ? 400.ms : 0.ms),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: const TextStyle(color: kRed, fontSize: 13)),
                  ],
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kIndigo,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Se connecter', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
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
