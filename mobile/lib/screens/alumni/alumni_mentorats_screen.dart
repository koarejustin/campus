import 'package:flutter/material.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../widgets/skeleton.dart';

class AlumniMentoratsScreen extends StatefulWidget {
  const AlumniMentoratsScreen({super.key});

  @override
  State<AlumniMentoratsScreen> createState() => _AlumniMentoratsScreenState();
}

class _AlumniMentoratsScreenState extends State<AlumniMentoratsScreen> {
  bool _loading = true;
  List<dynamic> _mesConseils = [];
  List<dynamic> _elevesDisponibles = [];
  List<dynamic> _orientations = [];
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
    _searchCtrl.addListener(_loadEleves);
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/alumni/mentorats?mine=true'),
        ApiClient.instance.get('/alumni/orientation/eleves'),
        ApiClient.instance.get('/mentorat/orientations/all'),
      ]);
      setState(() {
        _mesConseils = results[0]['mentorats'] ?? [];
        _elevesDisponibles = results[1]['eleves'] ?? [];
        _orientations = results[2]['eleves'] ?? [];
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadEleves() async {
    try {
      final data = await ApiClient.instance.get('/alumni/orientation/eleves?q=${Uri.encodeQueryComponent(_searchCtrl.text.trim())}');
      if (mounted) setState(() => _elevesDisponibles = data['eleves'] ?? []);
    } catch (_) {}
  }

  void _openPublierForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _ConseilForm(onSaved: _load),
    );
  }

  void _openMentorerForm(Map eleve) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _MentorerForm(eleve: eleve, onSaved: _load),
    );
  }

  void _openOrientationForm(Map eleve) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _OrientationForm(idRelation: eleve['id_relation'], onSaved: _load),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openPublierForm,
        backgroundColor: kAlumniGradient.colors.first,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Conseil'),
      ),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 6))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                children: [
                  const Text('Mes conseils de mentorat', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                  const SizedBox(height: 10),
                  if (_mesConseils.isEmpty) const Text('Aucun conseil publié pour le moment', style: TextStyle(color: kTextGray)),
                  for (final c in _mesConseils)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if ((c['titre'] ?? '').toString().isNotEmpty) Text(c['titre'], style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                            const SizedBox(height: 4),
                            Text(c['contenu_conseil'] ?? '', style: const TextStyle(fontSize: 13)),
                            if ((c['filiere_suggeree'] ?? '').toString().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: kAlumniGradient.colors.first.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                                child: Text(c['filiere_suggeree'], style: TextStyle(fontSize: 10.5, color: kAlumniGradient.colors.first, fontWeight: FontWeight.w700)),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 22),
                  const Text('Élèves disponibles pour mentorat', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _searchCtrl,
                    decoration: InputDecoration(
                      hintText: 'Rechercher un élève...',
                      isDense: true,
                      prefixIcon: const Icon(Icons.search_rounded, size: 18),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  if (_elevesDisponibles.isEmpty)
                    const Text('Aucun élève de Terminale trouvé', style: TextStyle(color: kTextGray)),
                  for (final e in _elevesDisponibles)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        dense: true,
                        leading: CircleAvatar(backgroundColor: kAlumniGradient.colors.first.withValues(alpha: 0.12), child: Text((e['prenom'] ?? '?').toString().isNotEmpty ? e['prenom'][0] : '?', style: TextStyle(color: kAlumniGradient.colors.first, fontWeight: FontWeight.w800))),
                        title: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        subtitle: Text(e['classe'] ?? '', style: const TextStyle(fontSize: 11)),
                        trailing: OutlinedButton(
                          onPressed: () => _openMentorerForm(e),
                          child: const Text('🤝 Mentorer', style: TextStyle(fontSize: 11)),
                        ),
                      ),
                    ),
                  if (_orientations.isNotEmpty) ...[
                    const SizedBox(height: 22),
                    const Text('Orientations de mes élèves mentorés', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: kTextDark)),
                    const SizedBox(height: 10),
                    for (final e in _orientations)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          dense: true,
                          title: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                          subtitle: Text(e['orientation_suggeree'] != null ? '· ${e['orientation_suggeree']}' : '· Non définie', style: TextStyle(fontSize: 11.5, color: e['orientation_suggeree'] != null ? kAlumniGradient.colors.first : kAmber)),
                          trailing: OutlinedButton(onPressed: () => _openOrientationForm(e), child: const Text('🎯 Orienter', style: TextStyle(fontSize: 11))),
                        ),
                      ),
                  ],
                ],
              ),
            ),
    );
  }
}

class _ConseilForm extends StatefulWidget {
  final VoidCallback onSaved;
  const _ConseilForm({required this.onSaved});
  @override
  State<_ConseilForm> createState() => _ConseilFormState();
}

class _ConseilFormState extends State<_ConseilForm> {
  final _titreCtrl = TextEditingController();
  final _contenuCtrl = TextEditingController();
  String _filiere = 'Terminale D';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_contenuCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Le conseil ne peut pas être vide');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/alumni/mentorats', {
        'titre': _titreCtrl.text.trim(),
        'contenu': _contenuCtrl.text.trim(),
        'filiere_suggeree': _filiere,
      });
      if (r['success'] == true) {
        widget.onSaved();
        if (mounted) Navigator.pop(context);
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
      height: MediaQuery.of(context).size.height * 0.8,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 16),
              const Text('Publier un conseil', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre (optionnel)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _contenuCtrl, maxLines: 5, decoration: const InputDecoration(labelText: 'Votre conseil', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _filiere,
                decoration: const InputDecoration(labelText: 'Filière', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'Terminale D', child: Text('Terminale D')),
                  DropdownMenuItem(value: 'Terminale C', child: Text('Terminale C')),
                  DropdownMenuItem(value: 'Terminale A', child: Text('Terminale A')),
                  DropdownMenuItem(value: 'BTS', child: Text('BTS')),
                  DropdownMenuItem(value: 'Licence', child: Text('Licence')),
                  DropdownMenuItem(value: 'Autre', child: Text('Autre')),
                ],
                onChanged: (v) => setState(() => _filiere = v ?? 'Autre'),
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kAlumniGradient.colors.first, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Publier', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MentorerForm extends StatefulWidget {
  final Map eleve;
  final VoidCallback onSaved;
  const _MentorerForm({required this.eleve, required this.onSaved});
  @override
  State<_MentorerForm> createState() => _MentorerFormState();
}

class _MentorerFormState extends State<_MentorerForm> {
  final _titreCtrl = TextEditingController();
  final _conseilCtrl = TextEditingController();
  final _objectifCtrl = TextEditingController();
  String _domaine = 'Orientation';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_conseilCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Écris un premier message pour cet élève');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final rel = await ApiClient.instance.post('/mentorat/relation/create', {
        'id_eleve': widget.eleve['id_user'],
        'domaines_assistance': [_domaine],
      });
      if (rel['success'] != true) {
        setState(() => _error = rel['message'] ?? 'Erreur');
        return;
      }
      final idRelation = rel['relation']?['id_relation'];
      await ApiClient.instance.post('/mentorat/journal/entree', {
        'id_relation': idRelation,
        'titre': _titreCtrl.text.trim().isEmpty ? 'Premier échange' : _titreCtrl.text.trim(),
        'contenu': _conseilCtrl.text.trim(),
        'type_entree': 'feedback',
      });
      if (_objectifCtrl.text.trim().isNotEmpty && idRelation != null) {
        await ApiClient.instance.post('/mentorat/objectif/create', {
          'id_relation': idRelation,
          'description': _objectifCtrl.text.trim(),
        });
      }
      widget.onSaved();
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Tu mentores maintenant ${widget.eleve['prenom']} 🎉'), backgroundColor: kGreen));
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
              Text('Démarrer un accompagnement — ${widget.eleve['prenom']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre (optionnel)', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _conseilCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Ton premier message / conseil', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _domaine,
                decoration: const InputDecoration(labelText: 'Domaine', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'Orientation', child: Text('🎯 Orientation')),
                  DropdownMenuItem(value: 'Méthodologie', child: Text('📚 Méthodologie')),
                  DropdownMenuItem(value: 'Carrière', child: Text('💼 Carrière')),
                  DropdownMenuItem(value: 'Motivation', child: Text('💪 Motivation')),
                ],
                onChanged: (v) => setState(() => _domaine = v ?? 'Orientation'),
              ),
              const SizedBox(height: 10),
              TextField(controller: _objectifCtrl, decoration: const InputDecoration(labelText: 'Premier objectif (optionnel)', border: OutlineInputBorder())),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kAlumniGradient.colors.first, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Commencer le mentorat', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrientationForm extends StatefulWidget {
  final int? idRelation;
  final VoidCallback onSaved;
  const _OrientationForm({required this.idRelation, required this.onSaved});
  @override
  State<_OrientationForm> createState() => _OrientationFormState();
}

class _OrientationFormState extends State<_OrientationForm> {
  String _orientation = 'Littérature';
  final _justifCtrl = TextEditingController();
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/mentorat/orientation/set', {
        'id_relation': widget.idRelation,
        'orientation': _orientation,
        'justification': _justifCtrl.text.trim(),
      });
      if (r['success'] == true) {
        widget.onSaved();
        if (mounted) Navigator.pop(context);
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
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Définir l\'orientation suggérée', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            RadioListTile<String>(value: 'Littérature', groupValue: _orientation, title: const Text('Littérature'), onChanged: (v) => setState(() => _orientation = v!)),
            RadioListTile<String>(value: 'Science', groupValue: _orientation, title: const Text('Science'), onChanged: (v) => setState(() => _orientation = v!)),
            const SizedBox(height: 10),
            TextField(controller: _justifCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Justification (optionnel)', border: OutlineInputBorder())),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: kAlumniGradient.colors.first, foregroundColor: Colors.white),
                child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Valider', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
