# Mobile App Setup

Die Hochzeits-App basiert auf `next@15`, Server Components, API-Routen und Supabase. Deshalb wird die Android-/iOS-App hier als native Capacitor-Huelle gebaut, die die gehostete Web-App oeffnet, statt die komplette App statisch in das Bundle zu exportieren.

## Voraussetzungen

- Die Web-App ist unter einer stabilen HTTPS-URL erreichbar.
- `NEXT_PUBLIC_APP_URL` oder `CAPACITOR_SERVER_URL` zeigt auf diese URL.
- Fuer iOS-Builds brauchst du spaeter zwingend macOS + Xcode.

## Wichtige Umgebungsvariablen

```env
CAPACITOR_SERVER_URL=https://hochzeit.example.com
CAPACITOR_APP_START_PATH=/demo
CAPACITOR_APP_ID=com.niiro.hochzeitsapp
CAPACITOR_APP_NAME=myWed by NiiRo AI
MOBILE_RELEASES_REPO=robinhopkr/hochzeits-rsvp
```

- `CAPACITOR_SERVER_URL`: Bevorzugte URL fuer die native App.
- `CAPACITOR_APP_START_PATH`: Standard ist `/demo`, damit die App direkt in die Hochzeitsoberflaeche startet.
- `MOBILE_RELEASES_REPO`: GitHub-Repo fuer die Update-Pruefung in der nativen App.
- Wenn `CAPACITOR_SERVER_URL` fehlt, wird `NEXT_PUBLIC_APP_URL` verwendet.
- Wenn beides fehlt, faellt Capacitor auf `https://hochzeits-rsvp.vercel.app/demo` zurueck.

## Lokale Entwicklung

- Android-Emulator: `CAPACITOR_SERVER_URL=http://10.0.2.2:3000`
- iOS-Simulator: `CAPACITOR_SERVER_URL=http://localhost:3000`
- Echte Geraete: immer eine echte HTTPS-Domain setzen

## Befehle

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:open:android
npm run mobile:open:ios
```

## Hinweise zur Auslieferung

- Android kannst du auf Windows vorbereiten und in Android Studio bauen.
- Das `ios/`-Projekt kann synchronisiert werden, aber Signierung, Simulator und App-Store-Build gehen erst auf macOS.
- Die aktuelle Loesung ist bewusst ein nativer Container fuer die bestehende Next.js-App. Wenn du spaeter ein komplett offline-faehiges Bundle willst, muessen serverseitige Seiten und API-Routen separat fuer Mobile entkoppelt werden.
- Fuer GitHub-Actions-Builds und Release-Assets siehe `docs/mobile-release.md`.
- Android prueft in der nativen App beim Start und beim Wiederaufnehmen, ob im GitHub-Repo ein neuerer Release vorhanden ist, und bietet dann den APK-Download direkt an.
