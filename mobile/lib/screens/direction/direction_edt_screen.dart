import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../download_helper.dart';

const List<String> kClassesEdt = ['6ème', '5ème', '4ème', '3ème', '2nde A', '2nde C', '1ère A', '1ère D', 'Tle A', 'Tle D'];
const List<String> kJoursEdt = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

class DirectionEdtScreen extends StatefulWidget {
  const DirectionEdtScreen({super.key});

  @override
  State<DirectionEdtScreen> createState() => _DirectionEdtScreenState();
}

class _DirectionEdtScreenState extends State<DirectionEdtScreen> {
  String _classe = '2nde A';
  bool _loading = true;
  List<dynamic> _semaine = [];
  List<dynamic> _profs = [];
  final Map<String, List<dynamic>> _cache = {};

  bool get _isDirection => ApiClient.instance.user?['role_actuel'] == 'DIRECTION';

  @override
  void initState() {
    super.initState();
    _load();
    if (_isDirection) _loadProfs();
  }

  Future<void> _loadProfs() async {
    try {
      final data = await ApiClient.instance.get('/admin/professeurs');
      setState(() => _profs = data['professeurs'] ?? []);
    } catch (_) {}
  }

  Future<void> _load({bool force = false}) async {
    if (!force && _cache.containsKey(_classe)) {
      setState(() => _semaine = _cache[_classe]!);
      return;
    }
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/admin/emploi-du-temps?classe=${Uri.encodeQueryComponent(_classe)}');
      final semaine = data['horaire']?['semaine'] ?? [];
      _cache[_classe] = semaine;
      setState(() => _semaine = semaine);
    } catch (_) {
      setState(() => _semaine = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reload() async {
    _cache.remove(_classe);
    await _load(force: true);
  }

  void _openForm({Map? seance, String? jourPrefill, String? heurePrefill}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _SeanceForm(
        classe: _classe,
        profs: _profs,
        seance: seance,
        jourPrefill: jourPrefill,
        heurePrefill: heurePrefill,
        onSaved: _reload,
      ),
    );
  }

  Future<void> _supprimer(dynamic id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cette séance ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer', style: TextStyle(color: kRed))),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      final r = await ApiClient.instance.delete('/admin/emploi-du-temps/$id');
      if (r['success'] == true) await _reload();
    } catch (_) {}
  }

  void _openImportSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _ImportEdtSheet(onDone: _reload),
    );
  }

  void _onCellTap(String jour, String heure, Map? cours) {
    if (!_isDirection) return;
    if (cours == null) {
      _openForm(jourPrefill: jour, heurePrefill: heure);
      return;
    }
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
            ListTile(title: Text(cours['matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800)), subtitle: Text('$jour · $heure')),
            ListTile(
              leading: const Icon(Icons.edit_rounded, color: kIndigo),
              title: const Text('Modifier'),
              onTap: () { Navigator.pop(context); _openForm(seance: cours); },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded, color: kRed),
              title: const Text('Supprimer', style: TextStyle(color: kRed)),
              onTap: () { Navigator.pop(context); _supprimer(cours['id']); },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final jours = _semaine.map((j) => j['jour'].toString()).toList();
    final heures = <String>{};
    for (final j in _semaine) {
      for (final c in (j['cours'] as List)) {
        heures.add(c['heure'].toString());
      }
    }
    final heuresList = heures.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Emploi du temps'),
        actions: [
          if (_isDirection) IconButton(icon: const Icon(Icons.upload_file_rounded), tooltip: 'Importer (Excel)', onPressed: _openImportSheet),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: DropdownButtonFormField<String>(
              initialValue: _classe,
              decoration: InputDecoration(isDense: true, filled: true, fillColor: kBg, border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none)),
              items: [for (final c in kClassesEdt) DropdownMenuItem(value: c, child: Text(c))],
              onChanged: (v) { setState(() => _classe = v ?? '2nde A'); _load(); },
            ),
          ),
        ),
      ),
      floatingActionButton: _isDirection
          ? FloatingActionButton.extended(
              onPressed: () => _openForm(),
              backgroundColor: kDirectionGradient.colors.first,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Séance'),
            )
          : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _semaine.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.calendar_month_outlined, size: 48, color: kTextGray),
                      const SizedBox(height: 10),
                      const Text('Aucun horaire saisi pour cette classe', style: TextStyle(color: kTextGray)),
                      if (_isDirection) ...[
                        const SizedBox(height: 14),
                        OutlinedButton.icon(onPressed: () => _openForm(), icon: const Icon(Icons.add_rounded), label: const Text('Ajouter la première séance')),
                        const SizedBox(height: 8),
                        TextButton.icon(onPressed: _openImportSheet, icon: const Icon(Icons.upload_file_rounded, size: 16), label: const Text('ou importer un fichier Excel')),
                      ],
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columnSpacing: 14,
                    headingRowColor: WidgetStateProperty.all(kDirectionGradient.colors.first.withValues(alpha: 0.06)),
                    columns: [
                      const DataColumn(label: Text('Heure', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5))),
                      for (final j in jours) DataColumn(label: Text(j, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5))),
                    ],
                    rows: [
                      for (final hr in heuresList)
                        DataRow(cells: [
                          DataCell(Text(hr, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: kTextGray))),
                          for (final j in jours) _buildCell(j, hr),
                        ]),
                    ],
                  ),
                ),
    );
  }

  DataCell _buildCell(String jour, String heure) {
    final jourData = _semaine.firstWhere((j) => j['jour'] == jour, orElse: () => null);
    final cours = jourData == null ? null : (jourData['cours'] as List).firstWhere((c) => c['heure'] == heure, orElse: () => null);
    return DataCell(
      Container(
        width: 90,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: cours != null
            ? BoxDecoration(color: kDirectionGradient.colors.first.withValues(alpha: 0.06), borderRadius: BorderRadius.circular(8))
            : null,
        child: cours == null
            ? (_isDirection ? const Icon(Icons.add_rounded, size: 16, color: kBorder) : null)
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(cours['matiere'] ?? '', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: kDirectionGradient.colors.first), maxLines: 1, overflow: TextOverflow.ellipsis),
                  if ((cours['salle'] ?? '').toString().isNotEmpty) Text(cours['salle'], style: const TextStyle(fontSize: 9.5, color: kTextGray)),
                  if ((cours['prof'] ?? '').toString().isNotEmpty) Text(cours['prof'], style: const TextStyle(fontSize: 9.5, color: kTextGray), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
      ),
      onTap: _isDirection ? () => _onCellTap(jour, heure, cours) : null,
    );
  }
}

class _SeanceForm extends StatefulWidget {
  final String classe;
  final List<dynamic> profs;
  final Map? seance;
  final String? jourPrefill;
  final String? heurePrefill;
  final VoidCallback onSaved;
  const _SeanceForm({required this.classe, required this.profs, this.seance, this.jourPrefill, this.heurePrefill, required this.onSaved});

  @override
  State<_SeanceForm> createState() => _SeanceFormState();
}

class _SeanceFormState extends State<_SeanceForm> {
  late String _jour;
  TimeOfDay? _heureDebut;
  TimeOfDay? _heureFin;
  final _matiereCtrl = TextEditingController();
  final _salleCtrl = TextEditingController();
  dynamic _idProf;
  bool _saving = false;
  String? _error;

  bool get _isEdit => widget.seance != null;

  @override
  void initState() {
    super.initState();
    final s = widget.seance;
    if (s != null) {
      _matiereCtrl.text = s['matiere'] ?? '';
      _salleCtrl.text = s['salle'] ?? '';
      _idProf = s['id_prof'];
      _jour = widget.jourPrefill ?? kJoursEdt.first;
      _heureDebut = _parseTime(s['heure_debut']);
      _heureFin = _parseTime(s['heure_fin']);
    } else {
      _jour = widget.jourPrefill ?? kJoursEdt.first;
      _heureDebut = _parseTime(widget.heurePrefill?.split('-').first);
      _heureFin = _parseTime(widget.heurePrefill?.split('-').last);
    }
  }

  TimeOfDay? _parseTime(String? s) {
    if (s == null) return null;
    final parts = s.split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  String _fmt(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _pickTime(bool debut) async {
    final t = await showTimePicker(context: context, initialTime: (debut ? _heureDebut : _heureFin) ?? const TimeOfDay(hour: 8, minute: 0));
    if (t == null) return;
    setState(() => debut ? _heureDebut = t : _heureFin = t);
  }

  Future<void> _submit() async {
    if (_matiereCtrl.text.trim().isEmpty || _heureDebut == null || _heureFin == null) {
      setState(() => _error = 'Matière et horaires requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final body = {
        'classe': widget.classe,
        'jour_semaine': _jour,
        'heure_debut': _fmt(_heureDebut!),
        'heure_fin': _fmt(_heureFin!),
        'matiere': _matiereCtrl.text.trim(),
        if (_idProf != null) 'id_prof': _idProf,
        if (_salleCtrl.text.trim().isNotEmpty) 'salle': _salleCtrl.text.trim(),
      };
      final r = _isEdit
          ? await ApiClient.instance.put('/admin/emploi-du-temps/${widget.seance!['id']}', body)
          : await ApiClient.instance.post('/admin/emploi-du-temps', body);
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
            Text(_isEdit ? 'Modifier la séance' : 'Nouvelle séance', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text(widget.classe, style: const TextStyle(fontSize: 12, color: kTextGray)),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _jour,
              decoration: const InputDecoration(labelText: 'Jour', border: OutlineInputBorder()),
              items: [for (final j in kJoursEdt) DropdownMenuItem(value: j, child: Text(j))],
              onChanged: (v) => setState(() => _jour = v ?? kJoursEdt.first),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: OutlinedButton.icon(onPressed: () => _pickTime(true), icon: const Icon(Icons.schedule_rounded, size: 16), label: Text(_heureDebut != null ? _fmt(_heureDebut!) : 'Début'))),
                const SizedBox(width: 10),
                Expanded(child: OutlinedButton.icon(onPressed: () => _pickTime(false), icon: const Icon(Icons.schedule_rounded, size: 16), label: Text(_heureFin != null ? _fmt(_heureFin!) : 'Fin'))),
              ],
            ),
            const SizedBox(height: 10),
            TextField(controller: _matiereCtrl, decoration: const InputDecoration(labelText: 'Matière', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            DropdownButtonFormField<dynamic>(
              initialValue: _idProf,
              decoration: const InputDecoration(labelText: 'Professeur (optionnel)', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem(value: null, child: Text('— Aucun —')),
                for (final p in widget.profs) DropdownMenuItem(value: p['id_user'], child: Text('${p['prenom'] ?? ''} ${p['nom'] ?? ''}')),
              ],
              onChanged: (v) => setState(() => _idProf = v),
            ),
            const SizedBox(height: 10),
            TextField(controller: _salleCtrl, decoration: const InputDecoration(labelText: 'Salle (optionnel)', border: OutlineInputBorder())),
            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: kDirectionGradient.colors.first, foregroundColor: Colors.white),
                child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(_isEdit ? 'Enregistrer' : 'Ajouter', style: const TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Import en masse depuis un fichier Excel — plus rapide que de saisir
/// séance par séance quand tout l'établissement change d'emploi du temps.
class _ImportEdtSheet extends StatefulWidget {
  final VoidCallback onDone;
  const _ImportEdtSheet({required this.onDone});

  @override
  State<_ImportEdtSheet> createState() => _ImportEdtSheetState();
}

class _ImportEdtSheetState extends State<_ImportEdtSheet> {
  String? _fileName;
  List<int>? _fileBytes;
  bool _loading = false;
  bool _downloading = false;
  String? _error;
  List<dynamic>? _preview;
  int _nbOk = 0;
  int _nbErreurs = 0;
  bool _committed = false;

  Future<void> _downloadTemplate() async {
    setState(() => _downloading = true);
    try {
      final bytes = await ApiClient.instance.getBytes('/admin/emploi-du-temps/modele');
      downloadBytes('modele_emploi_du_temps.xlsx', bytes);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erreur de téléchargement'), backgroundColor: kRed));
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['xlsx', 'xls']);
    if (result == null || result.files.isEmpty) return;
    final f = result.files.first;
    if (f.bytes == null) return;
    setState(() {
      _fileBytes = f.bytes;
      _fileName = f.name;
      _preview = null;
      _committed = false;
    });
    _preview1();
  }

  Future<void> _preview1() async {
    if (_fileBytes == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final r = await ApiClient.instance.multipart(
        '/admin/emploi-du-temps/import-excel',
        {'dryRun': 'true'},
        fileField: 'fichier',
        fileBytes: _fileBytes,
        fileName: _fileName,
      );
      if (r['success'] == true) {
        setState(() {
          _preview = r['resultats'] ?? [];
          _nbOk = r['nb_ok'] ?? 0;
          _nbErreurs = r['nb_erreurs'] ?? 0;
        });
      } else {
        setState(() => _error = r['message'] ?? 'Erreur de lecture du fichier');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmImport() async {
    if (_fileBytes == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final r = await ApiClient.instance.multipart(
        '/admin/emploi-du-temps/import-excel',
        {'dryRun': 'false'},
        fileField: 'fichier',
        fileBytes: _fileBytes,
        fileName: _fileName,
      );
      if (r['success'] == true) {
        setState(() {
          _preview = r['resultats'] ?? [];
          _nbOk = r['nb_ok'] ?? 0;
          _nbErreurs = r['nb_erreurs'] ?? 0;
          _committed = true;
        });
        widget.onDone();
      } else {
        setState(() => _error = r['message'] ?? 'Erreur import');
      }
    } catch (_) {
      setState(() => _error = 'Erreur réseau');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Importer un emploi du temps', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text('Une ligne = une séance. Toutes les classes peuvent être dans le même fichier.', style: TextStyle(fontSize: 11.5, color: kTextGray)),
            const SizedBox(height: 14),
            OutlinedButton.icon(
              onPressed: _downloading ? null : _downloadTemplate,
              icon: _downloading ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.download_rounded, size: 16),
              label: const Text('Télécharger le modèle Excel'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 44), foregroundColor: kDirectionGradient.colors.first, side: BorderSide(color: kDirectionGradient.colors.first)),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: _pickFile,
              icon: const Icon(Icons.attach_file_rounded),
              label: Text(_fileName ?? 'Choisir le fichier rempli (.xlsx)'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(double.infinity, 46)),
            ),
            if (_loading) const Padding(padding: EdgeInsets.only(top: 20), child: Center(child: CircularProgressIndicator())),
            if (_error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5))),
            if (_preview != null) ...[
              const SizedBox(height: 14),
              Row(
                children: [
                  Chip(label: Text('$_nbOk OK'), backgroundColor: kGreen.withValues(alpha: 0.12), labelStyle: const TextStyle(color: kGreen, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  if (_nbErreurs > 0) Chip(label: Text('$_nbErreurs erreur(s)'), backgroundColor: kRed.withValues(alpha: 0.12), labelStyle: const TextStyle(color: kRed, fontWeight: FontWeight.w700)),
                ],
              ),
              const SizedBox(height: 10),
              Expanded(
                child: ListView.builder(
                  itemCount: _preview!.length,
                  itemBuilder: (context, i) {
                    final row = _preview![i];
                    final ok = row['statut'] != 'ERREUR';
                    return ListTile(
                      dense: true,
                      leading: Icon(ok ? Icons.check_circle_rounded : Icons.error_rounded, color: ok ? kGreen : kRed, size: 18),
                      title: Text('${row['classe'] ?? ''} · ${row['jour'] ?? ''}${row['heure_debut'] != null ? ' ${row['heure_debut']}-${row['heure_fin']}' : ''}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                      subtitle: Text(ok ? '${row['matiere'] ?? ''}${row['professeur'] != null ? ' · ${row['professeur']}' : ''}' : row['message'] ?? '', style: const TextStyle(fontSize: 11)),
                    );
                  },
                ),
              ),
              const SizedBox(height: 10),
              if (!_committed)
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: (_loading || _nbOk == 0) ? null : _confirmImport,
                    style: ElevatedButton.styleFrom(backgroundColor: kDirectionGradient.colors.first, foregroundColor: Colors.white),
                    child: Text('Confirmer l\'import de $_nbOk séance(s)', style: const TextStyle(fontWeight: FontWeight.w800)),
                  ),
                )
              else
                SizedBox(width: double.infinity, height: 46, child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Terminé'))),
            ],
          ],
        ),
      ),
    );
  }
}
