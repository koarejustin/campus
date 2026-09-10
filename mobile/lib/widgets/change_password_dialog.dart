import 'package:flutter/material.dart';
import '../services/api_client.dart';
import '../theme.dart';

/// Boîte de dialogue générique "Changer mon mot de passe" — même endpoint
/// que le web (PUT /auth/changer-mot-de-passe), réutilisable depuis
/// n'importe quel écran Profil, quel que soit le rôle connecté.
Future<void> showChangePasswordDialog(BuildContext context) {
  return showDialog(
    context: context,
    builder: (_) => const _ChangePasswordDialog(),
  );
}

class _ChangePasswordDialog extends StatefulWidget {
  const _ChangePasswordDialog();

  @override
  State<_ChangePasswordDialog> createState() => _ChangePasswordDialogState();
}

class _ChangePasswordDialogState extends State<_ChangePasswordDialog> {
  final _ancienCtrl = TextEditingController();
  final _nouveauCtrl = TextEditingController();
  bool _obscureAncien = true;
  bool _obscureNouveau = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _ancienCtrl.dispose();
    _nouveauCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final ancien = _ancienCtrl.text;
    final nouveau = _nouveauCtrl.text;
    if (ancien.isEmpty || nouveau.isEmpty) {
      setState(() => _error = 'Les deux champs sont requis');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ApiClient.instance.put('/auth/changer-mot-de-passe', {
        'ancien_mot_de_passe': ancien,
        'nouveau_mot_de_passe': nouveau,
      });
      if (!mounted) return;
      if (r['success'] == true) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Mot de passe changé avec succès'), backgroundColor: kGreen),
        );
      } else {
        setState(() => _error = r['message'] ?? 'Erreur');
      }
    } catch (e) {
      if (mounted) setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Changer mon mot de passe'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _ancienCtrl,
            obscureText: _obscureAncien,
            decoration: InputDecoration(
              labelText: 'Mot de passe actuel',
              suffixIcon: IconButton(
                icon: Icon(_obscureAncien ? Icons.visibility_off : Icons.visibility, size: 18),
                onPressed: () => setState(() => _obscureAncien = !_obscureAncien),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _nouveauCtrl,
            obscureText: _obscureNouveau,
            decoration: InputDecoration(
              labelText: 'Nouveau mot de passe',
              suffixIcon: IconButton(
                icon: Icon(_obscureNouveau ? Icons.visibility_off : Icons.visibility, size: 18),
                onPressed: () => setState(() => _obscureNouveau = !_obscureNouveau),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
          ],
        ],
      ),
      actions: [
        TextButton(
          onPressed: _loading ? null : () => Navigator.of(context).pop(),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: _loading ? null : _submit,
          style: ElevatedButton.styleFrom(backgroundColor: kIndigo, foregroundColor: Colors.white),
          child: _loading
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Changer'),
        ),
      ],
    );
  }
}
