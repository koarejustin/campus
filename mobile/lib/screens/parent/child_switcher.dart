import 'package:flutter/material.dart';
import '../../theme.dart';
import 'parent_state.dart';

/// Chips horizontales pour changer d'enfant sélectionné — visible partout
/// où les données dépendent de l'enfant (tableau de bord, bulletin,
/// absences, convocations). Ne s'affiche que si le parent a &gt;1 enfant.
class ChildSwitcher extends StatelessWidget {
  final VoidCallback? onChanged;
  const ChildSwitcher({super.key, this.onChanged});

  @override
  Widget build(BuildContext context) {
    final ps = ParentState.instance;
    if (ps.enfants.length < 2) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        children: ps.enfants.map((e) {
          final selected = e['id_enfant'] == ps.selectedId;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(e['prenom'] ?? '', style: const TextStyle(fontSize: 12.5)),
              selected: selected,
              selectedColor: kParentGradient.colors.first,
              labelStyle: TextStyle(color: selected ? Colors.white : kTextDark, fontWeight: FontWeight.w700),
              avatar: CircleAvatar(
                radius: 10,
                backgroundColor: selected ? Colors.white24 : kParentGradient.colors.first.withValues(alpha: 0.12),
                child: Text(
                  (e['prenom'] ?? '?').toString().isNotEmpty ? e['prenom'][0] : '?',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: selected ? Colors.white : kParentGradient.colors.first),
                ),
              ),
              onSelected: (_) {
                ps.select(e);
                onChanged?.call();
              },
            ),
          );
        }).toList(),
      ),
    );
  }
}
