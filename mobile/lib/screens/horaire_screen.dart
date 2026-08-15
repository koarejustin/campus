import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../services/api_client.dart';
import '../theme.dart';
import '../widgets/skeleton.dart';

class HoraireScreen extends StatefulWidget {
  const HoraireScreen({super.key});

  @override
  State<HoraireScreen> createState() => _HoraireScreenState();
}

class _HoraireScreenState extends State<HoraireScreen> {
  bool _loading = true;
  List<dynamic> _semaine = [];
  int _selectedDay = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await ApiClient.instance.get('/eleves/horaire');
      final semaine = (data['horaire']?['semaine'] as List?) ?? [];
      setState(() {
        _semaine = semaine;
        final todayName = const ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][DateTime.now().weekday - 1];
        final idx = semaine.indexWhere((d) => d['jour'] == todayName);
        _selectedDay = idx >= 0 ? idx : 0;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _isNow(String? heure) {
    if (heure == null || !heure.contains('-')) return false;
    try {
      final now = TimeOfDay.now();
      final parts = heure.split('-');
      final start = parts[0].split(':');
      final end = parts[1].split(':');
      final nowMin = now.hour * 60 + now.minute;
      final startMin = int.parse(start[0]) * 60 + int.parse(start[1]);
      final endMin = int.parse(end[0]) * 60 + int.parse(end[1]);
      return nowMin >= startMin && nowMin < endMin;
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final cours = _semaine.isNotEmpty && _selectedDay < _semaine.length
        ? (_semaine[_selectedDay]['cours'] as List? ?? [])
        : [];

    return Scaffold(
      appBar: AppBar(title: const Text('Emploi du temps')),
      body: _loading
          ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5, itemHeight: 64))
          : _semaine.isEmpty
              ? const Center(child: Text('Emploi du temps non disponible', style: TextStyle(color: kTextGray)))
              : Column(
                  children: [
                    SizedBox(
                      height: 44,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        itemCount: _semaine.length,
                        itemBuilder: (context, i) {
                          final selected = i == _selectedDay;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(_semaine[i]['jour'] ?? ''),
                              selected: selected,
                              selectedColor: kIndigo,
                              labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
                              onSelected: (_) => setState(() => _selectedDay = i),
                            ),
                          );
                        },
                      ),
                    ),
                    Expanded(
                      child: cours.isEmpty
                          ? const Center(child: Text('Aucun cours ce jour', style: TextStyle(color: kTextGray)))
                          : ListView.builder(
                              key: ValueKey(_selectedDay),
                              padding: const EdgeInsets.all(16),
                              itemCount: cours.length,
                              itemBuilder: (context, i) {
                                final c = cours[i];
                                final pause = (c['matiere'] ?? '').toString().toUpperCase().contains('PAUSE');
                                final now = _isNow(c['heure']);
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    side: now ? const BorderSide(color: kIndigo, width: 1.6) : BorderSide.none,
                                  ),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: pause ? kBg : kIndigo.withValues(alpha: 0.12),
                                      child: Icon(pause ? Icons.free_breakfast_rounded : Icons.menu_book_rounded, color: pause ? kTextGray : kIndigo, size: 18),
                                    ),
                                    title: Text(c['matiere'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700)),
                                    subtitle: pause ? null : Text('${c['prof'] ?? ''} · Salle ${c['salle'] ?? ''}', style: const TextStyle(fontSize: 12)),
                                    trailing: Text(
                                      c['heure'] ?? '',
                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: now ? kIndigo : kTextGray),
                                    ),
                                  ),
                                ).animate().fadeIn(delay: (i * 60).ms, duration: 260.ms).slideX(begin: 0.06, end: 0, curve: Curves.easeOutCubic);
                              },
                            ),
                    ),
                  ],
                ),
    );
  }
}
