# Google Play Store Rollout

## Ziel

`NiiRo Smart Wedding` soll fuer Android ueber den Google Play Store verteilt werden, ohne den bestehenden Web-Checkout zu brechen.

## Status Phase 1

- Stripe bleibt fuer Web/Browserversion aktiv.
- Das Server-Backend kennt jetzt zusaetzlich `google_play` als Billing-Quelle.
- Android-Kaeufe koennen ueber `/api/billing/google-play` serverseitig verifiziert und als Brautpaar-Freischaltung gespeichert werden.
- Die Freischaltung wird pro Hochzeit gespeichert, nicht global.

## Benoetigte Env-Variablen

- `GOOGLE_PLAY_PACKAGE_NAME`
- `GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY`

## Geplanter Android-Clientfluss

1. Android-App startet den Kauf fuer das In-App-Produkt `GOOGLE_PLAY_COUPLE_ACCESS_PRODUCT_ID`.
2. Die native App erhaelt `purchaseToken` und `productId`.
3. Die App sendet diese Daten an `POST /api/billing/google-play`.
4. Der Server verifiziert den Kauf gegen die Google-Play-Developer-API.
5. Der Server bestaetigt den Kauf bei Google Play, speichert das Entitlement und schaltet den Paarbereich frei.

## Status Phase 2

- Native Android-Integration fuer Google Play Billing ist jetzt im Capacitor-Android-Projekt eingebaut.
- Der Android-Client kann den Kauf starten und `purchaseToken` an den Server senden.
- Fuer den echten Testkauf fehlt aktuell noch die Play-Console-Seite: Das Paket `com.niiro.smartwedding` ist ueber die API noch nicht auffindbar.

## Was noch fehlt

- App in Google Play Console mit Paket `com.niiro.smartwedding` anlegen
- ersten AAB in `Internal testing` hochladen
- In-App-Produkt `niiro_smart_wedding_couple_access` in Play Console anlegen
- Account-Deletion-Flow fuer den Play-Store-Review
- optional RTDN/PubSub fuer nachgelagerte Kaufereignisse und Revocations

## Weiterfuehrende Anleitung

Siehe auch [play-store-testing.md](./play-store-testing.md).
