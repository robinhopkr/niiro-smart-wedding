# Google Play Testkauf

## Aktueller Status

Die Service-Account-Anbindung funktioniert technisch. Der aktuelle Blocker ist die Google Play Console selbst:

- Die Play-API meldet fuer `com.niiro.smartwedding` aktuell `Package not found`.
- Das bedeutet: Das Android-Paket ist in der Play Console noch nicht als App angelegt oder noch nicht mit einem ersten AAB erfasst.

## Naechste Schritte in Google Play Console

1. Neue App in der Play Console anlegen
   - Paketname: `com.niiro.smartwedding`
   - App-Name: `NiiRo Smart Wedding`

2. Ersten AAB in `Internal testing` hochladen
   - Unser Release-AAB verwenden
   - Danach ist die Paket-ID in Play fest mit der App verbunden

3. In-App-Produkt anlegen
   - Produkt-ID: `niiro_smart_wedding_couple_access`
   - Typ: einmaliges In-App-Produkt
   - Preis: `129,00 EUR` waehrend Launch-Angebot oder spaeter `179,00 EUR`

4. Service Account in Play Console berechtigen
   - `niiro-smart-wedding@niiro-ai-photo-studio.iam.gserviceaccount.com`
   - in `Users and permissions`

5. Interne Tester anlegen
   - fuer Installations-Test
   - zusaetzlich `licensed testers`, wenn In-App-Kaeufe ohne echte Belastung getestet werden sollen

6. Opt-in-Link aus `Internal testing` oeffnen und Android-App aus dem Play Store installieren

## Wichtige offizielle Hinweise

- Interne Tests koennen sofort nach Upload eines AAB gestartet werden und sind fuer bis zu 100 Tester gedacht.
- Interne Tester koennen die Test-App kostenlos installieren.
- In-App-Kaeufe muessen Tester trotzdem bezahlen, ausser sie sind zusaetzlich als `licensed testers` hinterlegt.

Quellen:

- https://support.google.com/googleplay/android-developer/answer/9845334
- https://support.google.com/googleplay/android-developer/answer/1153481

## Lokaler Schnellcheck

Mit diesem Repo koennt ihr den Play-Status jetzt lokal pruefen:

```bash
node scripts/check-google-play-setup.mjs \
  --credentials "C:\\Users\\info\\Downloads\\niiro-ai-photo-studio-802d03648764.json" \
  --package "com.niiro.smartwedding" \
  --product "niiro_smart_wedding_couple_access"
```

Typische Ergebnisse:

- `404 Package not found`
  Die App ist in Play Console noch nicht mit dieser Paket-ID angelegt bzw. es wurde noch kein AAB dafuer hochgeladen.

- `404` nur bei `inappproducts.get`
  Die App existiert, aber das In-App-Produkt wurde noch nicht angelegt.

- `403`
  Der Service Account hat in der Play Console noch nicht die noetigen Rechte.
