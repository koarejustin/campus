# Cahier des charges — Système de paiement en ligne (scolarité, cotisations)

Document de travail progressif. À compléter au fur et à mesure des décisions,
notamment une fois l'établissement partenaire de déploiement identifié
(les infos de compte marchand, coordonnées bancaires, etc. dépendent de qui
héberge/exploite l'application).

## 1. Objectif

Permettre aux parents de payer en ligne, depuis l'app (web et Flutter) :
- La scolarité (frais de scolarité, inscription).
- Les cotisations APE.
- Tout autre frais scolaire (cantine, transport, activités, examens blancs...).

## 2. Contexte Burkina Faso — choix du moyen de paiement

Au Burkina Faso, l'écrasante majorité des paiements numériques passent par le
**Mobile Money** (Orange Money, Moov Money), pas par carte bancaire. Un
système pensé pour la France/l'Europe (Stripe, carte bancaire seule) ne
conviendrait pas au public réel de l'école.

**Recommandation** : passer par un agrégateur de paiement ouest-africain
plutôt que d'intégrer chaque opérateur mobile money séparément.

| Agrégateur | Points forts | À vérifier |
|---|---|---|
| **CinetPay** | Très utilisé en Afrique de l'Ouest francophone, couvre Orange Money/Moov Money/carte, API simple (redirection ou intégration) | Frais par transaction, délai d'activation du compte marchand |
| **PayDunya** | Alternative solide, mêmes opérateurs couverts | Idem |
| Intégration directe Orange Money / Moov Money API | Frais potentiellement plus bas à terme | Beaucoup plus lourd à développer et maintenir (une intégration par opérateur), conformité à gérer soi-même |

Ces agrégateurs gèrent la sécurité des transactions (l'école ne stocke jamais
de données de paiement) et fournissent une page de paiement hébergée + un
webhook de confirmation.

## 3. Pré-requis côté établissement (à faire AVANT toute intégration technique)

- [ ] Choisir l'agrégateur (CinetPay / PayDunya / autre).
- [ ] Ouvrir un compte marchand auprès de l'agrégateur choisi — nécessite
      généralement : pièce d'identité du responsable, RCCM ou équivalent pour
      l'établissement, RIB/compte pour la réception des fonds.
- [ ] Récupérer les clés API (clé publique + clé secrète) fournies par
      l'agrégateur une fois le compte validé.
- [ ] Décider qui reçoit l'argent : compte de l'établissement directement, ou
      compte relais géré par le développeur/l'exploitant de l'app (à trancher
      selon le modèle de déploiement — _dépend de l'établissement partenaire,
      à préciser ici une fois connu_).

## 4. Flux technique prévu (une fois le compte marchand actif)

1. Le parent choisit ce qu'il veut payer (scolarité / cotisation / autre) et
   le montant dans l'app.
2. Le backend crée une transaction en attente et appelle l'API de
   l'agrégateur pour obtenir une URL de paiement.
3. Le parent est redirigé vers la page de paiement sécurisée de l'agrégateur
   (Orange Money / Moov Money / carte) — l'app ne manipule jamais les
   identifiants de paiement du parent.
4. L'agrégateur notifie le backend par webhook (signé) une fois le paiement
   confirmé ou échoué.
5. Le backend met à jour le statut réel de la cotisation/scolarité
   (`statut_paiement`) et notifie le parent + la Direction.

## 5. Sécurité — points non négociables

- Ne jamais stocker de numéro de carte ou de données Mobile Money côté
  serveur — uniquement l'ID de transaction renvoyé par l'agrégateur.
- Vérifier la signature du webhook de confirmation (ne jamais faire confiance
  à un simple appel `success: true` non signé).
- Toute mise à jour de statut de paiement doit passer par le webhook vérifié
  ou par une action Direction authentifiée — jamais directement modifiable
  depuis le client (parent).
- Journaliser toutes les transactions (montant, date, référence agrégateur)
  pour permettre un rapprochement comptable.

## 6. Champs/infos à compléter une fois connus

- Nom de l'établissement partenaire de déploiement : `___________`
- Agrégateur retenu : `___________`
- Compte marchand actif (oui/non) : `___________`
- Qui reçoit les fonds (école directement / relais) : `___________`
- Frais de transaction négociés : `___________`

## 7. État actuel du système (pour référence)

Ce qui existe déjà et sur quoi s'appuiera l'intégration :
- Table `gestion_ape.cotisations_parents` (montant, statut_paiement,
  motif_cotisation, id_parent, id_eleve) — déjà utilisée par les
  cotisations APE et la Comptabilité Direction.
- Écran Direction "Comptabilité" (web + Flutter) — actuellement saisie
  manuelle du statut de paiement par la Direction, pas encore de paiement en
  ligne par le parent lui-même.
- Écran Parent "Cotisations" — actuellement lecture seule, le parent voit ce
  qu'il doit mais ne peut pas encore payer depuis l'app.
