# SensiCom Togo

PWA de sensibilisation communautaire (VIH/IST/MST) en milieu universitaire, avec suivi
des orientations vers l'infirmerie par système de coupons.

## Principe d'anonymat

Aucune donnée d'identité civile n'est collectée ni stockée, à aucune étape. Le numéro
de téléphone sert au SMS de rappel puis n'est conservé que sous forme d'empreinte
SHA-256 accompagnée de ses 4 derniers chiffres, ce qui suffit à détecter les doublons
sans permettre de remonter à une personne.

## Rôles

| Rôle | Usage | Écrans |
| --- | --- | --- |
| Agent | Mobile, terrain, souvent hors ligne | Sessions, saisie anonyme, émission de coupons |
| Infirmier | Mobile, infirmerie | Recherche de coupon, enregistrement des actes |
| Administrateur | Desktop | Tableau de bord, alertes anti-fraude, référentiels, exports |

Le cloisonnement par zone est appliqué côté base par les politiques RLS : un infirmier
ne voit que les coupons de sa zone, un agent que ses propres saisies.

## Fonctionnement hors ligne

Toutes les saisies agent et infirmier sont écrites d'abord dans IndexedDB avec un
identifiant généré côté client, puis poussées vers Supabase par une file de
synchronisation ordonnée (sessions → personnes → coupons → actes). L'état de synchro
est visible en permanence dans l'en-tête. Un acte enregistré sur un coupon pas encore
synchronisé est rattaché automatiquement à l'arrivée de la session correspondante,
côté client comme côté serveur.

## Démarrage

```bash
npm install
npm run dev
```

Sans variables d'environnement Supabase, l'application démarre en **mode démonstration** :
tout fonctionne en local sur l'appareil, avec les comptes `agent@demo.tg`,
`infirmier@demo.tg` et `admin@demo.tg` (mot de passe `demo1234`).

## Configuration

Copiez `.env.example` vers `.env` et renseignez `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY`.

## Base de données

Les migrations dans `supabase/migrations/` sont à appliquer dans l'ordre :

1. `_schema.sql` — tables, contraintes, triggers de rapprochement
2. `_rls.sql` — politiques de sécurité par rôle et par zone
3. `_analytics.sql` — vues du tableau de bord et de détection de fraude
4. `_seed.sql` — référentiels de départ

Chaque compte créé dans Supabase Auth doit recevoir une ligne dans `profiles`
précisant son rôle et sa zone.

## SMS

L'Edge Function `send-reminder-sms` relaie vers une passerelle SMS tierce. Secrets à
définir côté Supabase : `SMS_API_URL`, `SMS_API_KEY`, `SMS_SENDER_ID`. Les envois
échoués ou hors ligne sont mis en file et rejoués au retour du réseau.

## Déploiement

Netlify, configuré par `netlify.toml` (build `npm run build`, publication `dist`).
Les variables `VITE_*` sont à définir dans les paramètres du site.
