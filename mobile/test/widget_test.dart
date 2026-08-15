// Test de fumée basique : vérifie que l'appli démarre sans planter et
// affiche le portail de sélection de rôle (aucune session enregistrée).

import 'package:flutter_test/flutter_test.dart';

import 'package:campus_numerique_mobile/main.dart';

void main() {
  testWidgets('App starts and shows the role selection portal', (WidgetTester tester) async {
    await tester.pumpWidget(const CampusNumeriqueApp());
    await tester.pumpAndSettle();

    expect(find.text('Campus Numérique'), findsOneWidget);
    expect(find.text('Élève'), findsOneWidget);
    expect(find.text('Professeur'), findsOneWidget);
  });
}
