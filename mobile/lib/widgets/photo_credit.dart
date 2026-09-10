import 'package:flutter/material.dart';
import '../theme.dart';

/// Crédit obligatoire (licence CC BY-SA 4.0) de la photo du baobab utilisée
/// comme icône/logo de l'appli — placé volontairement en bas des écrans
/// Profil (visible seulement si on va le chercher), pas sur les écrans de
/// démarrage/navigation courante.
class PhotoCredit extends StatelessWidget {
  const PhotoCredit({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.only(top: 20, bottom: 4),
      child: Text(
        'Photo du logo : Desijwo · CC BY-SA 4.0 · Wikimedia Commons',
        style: TextStyle(fontSize: 9, color: kTextGray),
        textAlign: TextAlign.center,
      ),
    );
  }
}
