import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'api_client.dart';

/// Notifications push (Firebase Cloud Messaging) — mobile uniquement pour
/// l'instant (le web nécessiterait une configuration séparée : clé VAPID +
/// service worker firebase-messaging-sw.js, non mise en place ici).
class PushNotifications {
  PushNotifications._();
  static final PushNotifications instance = PushNotifications._();

  bool _initialized = false;

  Future<void> init() async {
    if (kIsWeb || _initialized) return;
    _initialized = true;

    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      final token = await messaging.getToken();
      if (token != null) await _sendTokenToBackend(token);

      // Le token peut changer (réinstallation, restauration...) — le
      // backend doit rester à jour pour continuer à recevoir les push.
      messaging.onTokenRefresh.listen(_sendTokenToBackend);

      // App ouverte au premier plan : FCM n'affiche pas de bannière système
      // automatiquement dans ce cas — on se contente de laisser la
      // notification in-app (cloche) se charger au prochain rafraîchissement.
      FirebaseMessaging.onMessage.listen((_) {});
    } catch (_) {
      // Notifications push non critiques pour le fonctionnement de l'app.
    }
  }

  Future<void> _sendTokenToBackend(String token) async {
    if (!ApiClient.instance.isLoggedIn) return;
    try {
      await ApiClient.instance.post('/notifications/fcm-token', {'token': token, 'plateforme': 'android'});
    } catch (_) {}
  }
}
