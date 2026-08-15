import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';

class DirectionCommunicationScreen extends StatefulWidget {
  final String? initialDestinataire;
  final bool initialPrive;
  const DirectionCommunicationScreen({super.key, this.initialDestinataire, this.initialPrive = false});

  @override
  State<DirectionCommunicationScreen> createState() => _DirectionCommunicationScreenState();
}

class _DirectionCommunicationScreenState extends State<DirectionCommunicationScreen> {
  final _messageCtrl = TextEditingController();
  late final _destinataireCtrl = TextEditingController(text: widget.initialDestinataire ?? '');
  late bool _prive = widget.initialPrive;
  bool _sending = false;
  String? _error;
  String? _success;

  Future<void> _envoyer() async {
    if (_messageCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Le message ne peut pas être vide');
      return;
    }
    if (_prive && _destinataireCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Indiquez le destinataire (nom ou matricule)');
      return;
    }
    setState(() { _sending = true; _error = null; _success = null; });
    try {
      final r = await ApiClient.instance.post('/admin/message-prof', {
        'message': _messageCtrl.text.trim(),
        'prive': _prive,
        if (_prive) 'destinataire': _destinataireCtrl.text.trim(),
      });
      if (r['success'] == true) {
        setState(() {
          _success = r['message'] ?? 'Message envoyé';
          _messageCtrl.clear();
          _destinataireCtrl.clear();
        });
      } else {
        setState(() => _error = r['message'] ?? 'Erreur');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Message aux professeurs')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: kDirectionGradient.colors.first.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(14)),
            child: Row(
              children: [
                Icon(_prive ? Icons.lock_outline_rounded : Icons.campaign_rounded, color: kDirectionGradient.colors.first, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _prive ? 'Message privé à un professeur' : 'Message diffusé dans la salle des profs',
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5),
                  ),
                ),
                Switch(value: _prive, activeColor: kDirectionGradient.colors.first, onChanged: (v) => setState(() => _prive = v)),
              ],
            ),
          ).animate().fadeIn(duration: 250.ms),
          const SizedBox(height: 16),
          if (_prive) ...[
            TextField(controller: _destinataireCtrl, decoration: const InputDecoration(labelText: 'Destinataire (nom ou matricule)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
          ],
          TextField(controller: _messageCtrl, maxLines: 5, decoration: const InputDecoration(labelText: 'Message', border: OutlineInputBorder())),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
          ],
          if (_success != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Row(children: [const Icon(Icons.check_circle_rounded, color: kGreen, size: 18), const SizedBox(width: 8), Expanded(child: Text(_success!, style: const TextStyle(color: kGreen, fontWeight: FontWeight.w700, fontSize: 12.5)))]),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity, height: 48,
            child: ElevatedButton(
              onPressed: _sending ? null : _envoyer,
              style: ElevatedButton.styleFrom(backgroundColor: kDirectionGradient.colors.first, foregroundColor: Colors.white),
              child: _sending
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_prive ? 'Envoyer en privé' : 'Diffuser à la salle des profs', style: const TextStyle(fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}
