import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';
import 'direction_communication_screen.dart';

class DirectionProfsScreen extends StatefulWidget {
  const DirectionProfsScreen({super.key});

  @override
  State<DirectionProfsScreen> createState() => _DirectionProfsScreenState();
}

class _DirectionProfsScreenState extends State<DirectionProfsScreen> {
  bool _loading = true;
  List<dynamic> _profs = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/professeurs');
      setState(() => _profs = data['professeurs'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openAddForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _AddProfForm(onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Corps enseignant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.campaign_outlined),
            tooltip: 'Message à la salle des profs',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DirectionCommunicationScreen())),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddForm,
        backgroundColor: kGreen,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text('Professeur'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 8))
          : RefreshIndicator(
              onRefresh: _load,
              child: _profs.isEmpty
                  ? ListView(physics: const AlwaysScrollableScrollPhysics(), children: const [Padding(padding: EdgeInsets.only(top: 80), child: Center(child: Text('Aucun professeur', style: TextStyle(color: kTextGray))))])
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                      itemCount: _profs.length,
                      itemBuilder: (context, i) {
                        final p = _profs[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(backgroundColor: kGreen.withValues(alpha: 0.1), child: Text((p['prenom'] ?? '?').toString().isNotEmpty ? p['prenom'][0] : '?', style: const TextStyle(color: kGreen, fontWeight: FontWeight.w800))),
                            title: Text('${p['prenom'] ?? ''} ${p['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                            subtitle: Text('${p['specialite'] ?? ''} · ${p['nb_classes'] ?? 0} classe(s)', style: const TextStyle(fontSize: 11.5)),
                            trailing: IconButton(
                              icon: const Icon(Icons.mail_outline_rounded, color: kGreen, size: 20),
                              tooltip: 'Message privé',
                              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DirectionCommunicationScreen(initialDestinataire: p['code_unique'], initialPrive: true))),
                            ),
                          ),
                        ).animate().fadeIn(duration: 200.ms, delay: (i * 20).ms);
                      },
                    ),
            ),
    );
  }
}

class _AddProfForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _AddProfForm({required this.onSaved});

  @override
  State<_AddProfForm> createState() => _AddProfFormState();
}

class _AddProfFormState extends State<_AddProfForm> {
  final _prenomCtrl = TextEditingController();
  final _nomCtrl = TextEditingController();
  final _specialiteCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _telCtrl = TextEditingController();
  bool _saving = false;
  String? _error;
  Map<String, dynamic>? _result;

  Future<void> _submit() async {
    if (_prenomCtrl.text.trim().isEmpty || _nomCtrl.text.trim().isEmpty || _specialiteCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Prénom, nom et spécialité requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/admin/professeurs', {
        'prenom': _prenomCtrl.text.trim(),
        'nom': _nomCtrl.text.trim(),
        'specialite': _specialiteCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
        if (_telCtrl.text.trim().isNotEmpty) 'telephone': _telCtrl.text.trim(),
      });
      if (r['success'] == true) {
        setState(() => _result = r);
        widget.onSaved();
      } else {
        setState(() => _error = r['message'] ?? 'Erreur');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Nouveau professeur', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              if (_result != null) ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(children: [Icon(Icons.check_circle_rounded, color: kGreen, size: 18), SizedBox(width: 6), Text('Compte créé', style: TextStyle(fontWeight: FontWeight.w800, color: kGreen))]),
                      const SizedBox(height: 10),
                      Text('Matricule : ${_result!['code_unique']}', style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                      const SizedBox(height: 4),
                      Text('Mot de passe temporaire : ${_result!['mot_de_passe_temporaire']}', style: const TextStyle(fontWeight: FontWeight.w700, fontFamily: 'monospace')),
                      const SizedBox(height: 6),
                      const Text('⚠️ Notez ces identifiants maintenant, ils ne seront plus affichés ensuite.', style: TextStyle(fontSize: 11, color: kTextGray)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(width: double.infinity, height: 46, child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Fermer'))),
              ] else ...[
                TextField(controller: _prenomCtrl, decoration: const InputDecoration(labelText: 'Prénom', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _nomCtrl, decoration: const InputDecoration(labelText: 'Nom', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _specialiteCtrl, decoration: const InputDecoration(labelText: 'Spécialité / Matière', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email (optionnel)', border: OutlineInputBorder())),
                const SizedBox(height: 10),
                TextField(controller: _telCtrl, decoration: const InputDecoration(labelText: 'Téléphone (optionnel)', border: OutlineInputBorder())),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _submit,
                    style: ElevatedButton.styleFrom(backgroundColor: kGreen, foregroundColor: Colors.white),
                    child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Créer le compte', style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
