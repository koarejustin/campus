import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../../utils.dart';
import '../../widgets/skeleton.dart';

class AlumniJournalScreen extends StatefulWidget {
  const AlumniJournalScreen({super.key});

  @override
  State<AlumniJournalScreen> createState() => _AlumniJournalScreenState();
}

class _AlumniJournalScreenState extends State<AlumniJournalScreen> {
  bool _loading = true;
  List<dynamic> _eleves = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/mentorat/eleves');
      setState(() => _eleves = data['eleves'] ?? []);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4));
    return RefreshIndicator(
      onRefresh: _load,
      child: _eleves.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                const Center(
                  child: Column(
                    children: [
                      Icon(Icons.menu_book_outlined, size: 56, color: kTextGray),
                      SizedBox(height: 10),
                      Text('Aucun élève mentoré pour le moment', style: TextStyle(color: kTextGray)),
                    ],
                  ),
                ),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
              itemCount: _eleves.length,
              itemBuilder: (context, i) {
                final e = _eleves[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: kAlumniGradient.colors.first.withValues(alpha: 0.12),
                      child: Text((e['prenom'] ?? '?').toString().isNotEmpty ? e['prenom'][0] : '?', style: TextStyle(color: kAlumniGradient.colors.first, fontWeight: FontWeight.w800)),
                    ),
                    title: Text('${e['prenom'] ?? ''} ${e['nom'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                    subtitle: Text('${e['classe_actuelle'] ?? ''} · ${e['nb_entrees_journal'] ?? 0} entrées', style: const TextStyle(fontSize: 11.5)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: kTextGray),
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _EleveMentoreDetailScreen(eleve: e))),
                  ),
                ).animate().fadeIn(duration: 220.ms, delay: (i * 30).ms).slideX(begin: 0.05, end: 0);
              },
            ),
    );
  }
}

class _EleveMentoreDetailScreen extends StatefulWidget {
  final Map eleve;
  const _EleveMentoreDetailScreen({required this.eleve});

  @override
  State<_EleveMentoreDetailScreen> createState() => _EleveMentoreDetailScreenState();
}

class _EleveMentoreDetailScreenState extends State<_EleveMentoreDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tab;
  bool _loading = true;
  List<dynamic> _entrees = [];
  List<dynamic> _objectifs = [];
  Map<String, dynamic>? _resultats;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final idRelation = widget.eleve['id_relation'];
    final idEleve = widget.eleve['id_eleve'];
    try {
      final results = await Future.wait([
        ApiClient.instance.get('/mentorat/journal/$idRelation'),
        ApiClient.instance.get('/mentorat/objectifs/$idRelation'),
        ApiClient.instance.get('/mentorat/resultats-eleve/$idEleve'),
      ]);
      setState(() {
        _entrees = results[0]['entrees'] ?? [];
        _objectifs = results[1]['objectifs'] ?? [];
        _resultats = results[2];
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openEntreeForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _EntreeForm(idRelation: widget.eleve['id_relation'], onSaved: _load),
    );
  }

  void _openObjectifForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _ObjectifForm(idRelation: widget.eleve['id_relation'], onSaved: _load),
    );
  }

  Future<void> _deleteEntree(dynamic idJournal) async {
    try {
      final r = await ApiClient.instance.delete('/mentorat/journal/$idJournal');
      if (r['success'] == true) _load();
    } catch (_) {}
  }

  Future<void> _toggleObjectif(dynamic idObjectif, String statut) async {
    try {
      final r = await ApiClient.instance.put('/mentorat/objectif/$idObjectif', {'statut': statut});
      if (r['success'] == true) _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.eleve['prenom'] ?? ''} ${widget.eleve['nom'] ?? ''}'),
        backgroundColor: kAlumniGradient.colors.first,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tab,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [Tab(text: 'Journal'), Tab(text: 'Objectifs'), Tab(text: 'Résultats')],
        ),
      ),
      floatingActionButton: _tab.index == 1
          ? FloatingActionButton(onPressed: _openObjectifForm, backgroundColor: kAlumniGradient.colors.first, child: const Icon(Icons.flag_rounded))
          : (_tab.index == 0 ? FloatingActionButton(onPressed: _openEntreeForm, backgroundColor: kAlumniGradient.colors.first, child: const Icon(Icons.add_rounded)) : null),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5))
          : TabBarView(
              controller: _tab,
              children: [
                _buildJournal(),
                _buildObjectifs(),
                _buildResultats(),
              ],
            ),
    );
  }

  Widget _buildJournal() {
    if (_entrees.isEmpty) {
      return const Center(child: Text('Aucune entrée de journal', style: TextStyle(color: kTextGray)));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
      itemCount: _entrees.length,
      itemBuilder: (context, i) {
        final e = _entrees[i];
        final isMine = e['role_auteur'] == 'Alumni';
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: kAlumniGradient.colors.first.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text(e['type_entree'] ?? 'note', style: TextStyle(fontSize: 10, color: kAlumniGradient.colors.first, fontWeight: FontWeight.w700)),
                    ),
                    const Spacer(),
                    Text(e['role_auteur'] ?? '', style: const TextStyle(fontSize: 10.5, color: kTextGray)),
                    if (isMine)
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, size: 18, color: kRed),
                        onPressed: () => _deleteEntree(e['id_journal']),
                        constraints: const BoxConstraints(),
                        padding: const EdgeInsets.only(left: 8),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(e['titre'] ?? '', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5)),
                const SizedBox(height: 4),
                Text(e['contenu'] ?? '', style: const TextStyle(fontSize: 12.5)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildObjectifs() {
    if (_objectifs.isEmpty) {
      return const Center(child: Text('Aucun objectif défini', style: TextStyle(color: kTextGray)));
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
      itemCount: _objectifs.length,
      itemBuilder: (context, i) {
        final o = _objectifs[i];
        final done = o['statut'] == 'atteint';
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            leading: Icon(done ? Icons.check_circle_rounded : Icons.flag_outlined, color: done ? kGreen : kAmber),
            title: Text(o['description'] ?? '', style: TextStyle(fontSize: 13, decoration: done ? TextDecoration.lineThrough : null)),
            subtitle: Text(o['priorite'] ?? 'normal', style: const TextStyle(fontSize: 11)),
            trailing: done
                ? null
                : TextButton(onPressed: () => _toggleObjectif(o['id_objectif'], 'atteint'), child: const Text('Marquer atteint', style: TextStyle(fontSize: 11))),
          ),
        );
      },
    );
  }

  Widget _buildResultats() {
    final moyennes = (_resultats?['moyennes_par_trimestre'] as List?) ?? [];
    final parMatiere = (_resultats?['notes_par_matiere'] as List?) ?? [];
    if (moyennes.isEmpty && parMatiere.isEmpty) {
      return const Center(child: Text('Aucune donnée de résultats disponible', style: TextStyle(color: kTextGray)));
    }
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
      children: [
        if (moyennes.isNotEmpty) ...[
          const Text('Évolution par trimestre', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 12),
          SizedBox(
            height: 180,
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: true, drawVerticalLine: false),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, meta) => Text('T${v.toInt() + 1}', style: const TextStyle(fontSize: 10)))),
                  leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 30)),
                ),
                borderData: FlBorderData(show: false),
                minY: 0, maxY: 20,
                lineBarsData: [
                  LineChartBarData(
                    spots: [
                      for (int i = 0; i < moyennes.length; i++)
                        FlSpot(i.toDouble(), toDouble(moyennes[i]['moyenne_trimestre'])),
                    ],
                    isCurved: true,
                    color: kAlumniGradient.colors.first,
                    barWidth: 3,
                    dotData: const FlDotData(show: true),
                    belowBarData: BarAreaData(show: true, color: kAlumniGradient.colors.first.withValues(alpha: 0.12)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
        ],
        if (parMatiere.isNotEmpty) ...[
          const Text('Par matière', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 10),
          for (final m in parMatiere)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                dense: true,
                title: Text(m['nom_matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                subtitle: Text('Trimestre ${m['trimestre'] ?? ''}', style: const TextStyle(fontSize: 11)),
                trailing: Text('${toDouble(m['moyenne_matiere']).toStringAsFixed(1)}/20', style: TextStyle(fontWeight: FontWeight.w800, color: kAlumniGradient.colors.first)),
              ),
            ),
        ],
      ],
    );
  }
}

class _EntreeForm extends StatefulWidget {
  final dynamic idRelation;
  final VoidCallback onSaved;
  const _EntreeForm({required this.idRelation, required this.onSaved});

  @override
  State<_EntreeForm> createState() => _EntreeFormState();
}

class _EntreeFormState extends State<_EntreeForm> {
  final _titreCtrl = TextEditingController();
  final _contenuCtrl = TextEditingController();
  String _type = 'note';
  bool _prive = false;
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_titreCtrl.text.trim().isEmpty || _contenuCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Titre et contenu requis');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/mentorat/journal/entree', {
        'id_relation': widget.idRelation,
        'titre': _titreCtrl.text.trim(),
        'contenu': _contenuCtrl.text.trim(),
        'type_entree': _type,
        'is_prive': _prive,
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
              const Text('Nouvelle entrée de journal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              TextField(controller: _titreCtrl, decoration: const InputDecoration(labelText: 'Titre', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              TextField(controller: _contenuCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Contenu', border: OutlineInputBorder())),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'note', child: Text('Note')),
                  DropdownMenuItem(value: 'feedback', child: Text('Feedback')),
                  DropdownMenuItem(value: 'conseil', child: Text('Conseil')),
                  DropdownMenuItem(value: 'suivi', child: Text('Suivi')),
                ],
                onChanged: (v) => setState(() => _type = v ?? 'note'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                value: _prive,
                onChanged: (v) => setState(() => _prive = v),
                title: const Text('Note privée (non visible par l\'élève)', style: TextStyle(fontSize: 12.5)),
              ),
              if (_error != null) ...[
                const SizedBox(height: 6),
                Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity, height: 48,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: kAlumniGradient.colors.first, foregroundColor: Colors.white),
                  child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Ajouter', style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ObjectifForm extends StatefulWidget {
  final dynamic idRelation;
  final VoidCallback onSaved;
  const _ObjectifForm({required this.idRelation, required this.onSaved});

  @override
  State<_ObjectifForm> createState() => _ObjectifFormState();
}

class _ObjectifFormState extends State<_ObjectifForm> {
  final _descCtrl = TextEditingController();
  String _priorite = 'normal';
  bool _saving = false;
  String? _error;

  Future<void> _submit() async {
    if (_descCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Description requise');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final r = await ApiClient.instance.post('/mentorat/objectif/create', {
        'id_relation': widget.idRelation,
        'description': _descCtrl.text.trim(),
        'priorite': _priorite,
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
            const Text('Nouvel objectif', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            TextField(controller: _descCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder())),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: _priorite,
              decoration: const InputDecoration(labelText: 'Priorité', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'haute', child: Text('Haute')),
                DropdownMenuItem(value: 'normal', child: Text('Normale')),
                DropdownMenuItem(value: 'basse', child: Text('Basse')),
              ],
              onChanged: (v) => setState(() => _priorite = v ?? 'normal'),
            ),
            if (_error != null) ...[
              const SizedBox(height: 6),
              Text(_error!, style: const TextStyle(color: kRed, fontSize: 12.5)),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity, height: 48,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                style: ElevatedButton.styleFrom(backgroundColor: kAlumniGradient.colors.first, foregroundColor: Colors.white),
                child: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Créer', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
