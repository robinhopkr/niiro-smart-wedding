# Mobile Release Pipeline

Diese Pipeline stellt Mobile-Builds online ueber GitHub Actions und GitHub Releases bereit.

## CI-Toolchain

- GitHub Actions nutzt Node 22, weil `@capacitor/cli@8` das fuer den Build erwartet.

## Was sofort funktioniert

- Android: signiertes Release-APK und Release-AAB als GitHub-Artifact und bei Tags auch als Release-Download
- iOS: Signiertes IPA als GitHub-Artifact und bei Tags auch als Release-Download
- iOS App Store Connect / TestFlight: Upload bei `mobile-v*`-Tags, sobald Apple-Signing und Upload-Secrets gesetzt sind
- Mac: kurzfristig ueber dieselbe iPhone/iPad-App auf Apple-Silicon-Macs in App Store Connect verfuegbar

## GitHub Workflows

- `.github/workflows/mobile-android.yml`
- `.github/workflows/mobile-ios.yml`
- `.github/workflows/mobile-ios-simulator.yml`

## iOS Simulator

Fuer schnelle Build-Pruefungen ohne Apple-Signing gibt es zusaetzlich einen separaten Simulator-Workflow.

- Der Workflow baut auf `macos-latest` fuer den iOS Simulator
- Er braucht keine Zertifikate, kein Provisioning-Profil und keinen App-Store-Upload
- Er ist ideal fuer Smoke-Checks, wenn ihr lokal keinen Mac habt

Wichtig:

- Der Simulator ersetzt keinen echten Release-Build
- App Store Connect, TestFlight, Signierung und die Mac-Freigabe muessen weiterhin ueber den normalen iOS-Release-Workflow laufen

## Android

### Erforderliche Secrets fuer signierte Release-Builds

Lege diese GitHub Secrets an:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Dann erzeugt der Workflow:

- signiertes Release-APK
- signiertes Release-AAB
- automatische Android-Versionsnummern aus dem Tag, z. B. `mobile-v1.0.5` -> `versionName 1.0.5`

### Wichtige Aenderung

- GitHub Releases enthalten nur noch signierte Release-Dateien.
- Oeffentliche Debug-APKs werden nicht mehr als Release-Download veroeffentlicht.
- Fuer lokale Schnelltests kannst du Debug-Builds weiterhin direkt ueber Gradle oder Android Studio erzeugen.
- Die App prueft gegen das neueste GitHub-Release und blendet bei einer neueren Version einen Update-Hinweis mit APK-Download ein.

## iOS

Fuer iOS brauchst du Apple-Signing. Lege diese GitHub Secrets an:

- `IOS_CERTIFICATE_P12_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_KEYCHAIN_PASSWORD`
- `APP_STORE_CONNECT_USERNAME`
- `APP_STORE_CONNECT_APP_SPECIFIC_PASSWORD`

Optional als GitHub Variables:

- `IOS_EXPORT_METHOD` mit `ad-hoc`, `app-store` oder `enterprise`
- `CAPACITOR_SERVER_URL`, idealerweise `https://smartwedding.niiro.ai`

### Wichtig

- `ad-hoc`: direkt downloadbar/installierbar fuer registrierte Geraete
- `app-store`: fuer App Store Connect / TestFlight
- Ohne Apple-Signing kann kein installierbares iPhone-IPA erzeugt werden
- Bei `mobile-v*`-Tags nutzt der Workflow standardmaessig `app-store`
- Die Marketing-Version kommt aus dem Tag, z. B. `mobile-v1.2.3` -> `1.2.3`
- Die Build-Nummer wird automatisch aus GitHub-Run-Nummer und Run-Attempt erzeugt
- Fuer automatische Uploads nach App Store Connect nutzt der Workflow `xcrun altool`

### Einmalige App-Store-Connect-Einrichtung

Vor dem ersten Upload braucht ihr:

- einen App-Record mit Bundle-ID `com.niiro.smartwedding`
- App-Name `NiiRo Smart Wedding`
- Support-URL und Privacy-Policy-URL unter eurer produktiven Domain
- mindestens einen internen TestFlight-Tester
- Store-Metadaten wie Beschreibung, Keywords, Kategorien und Screenshots

## Mac

### Aktueller Release-Weg

Das aktuelle Repo enthaelt ein iOS-Capacitor-Projekt, aber noch kein eigenes `macOS`- oder `Mac Catalyst`-Target.
Der schnellste Mac-Release ist deshalb:

- iPhone/iPad-App regulär nach App Store Connect hochladen
- in App Store Connect die Verfuegbarkeit fuer Apple-Silicon-Macs aktivieren
- nach dem ersten Upload optional die Mac-Kompatibilitaet in App Store Connect verifizieren

Damit erscheint dieselbe iOS-App auch im Mac App Store auf kompatiblen Macs.

### Wann ein echter Mac-Build noetig ist

Ein eigener Mac-Build ist erst noetig, wenn ihr:

- ein separates macOS-Binary wollt
- Mac-spezifische UI oder Fensterlogik braucht
- Intel-Macs oder einen echten Catalyst-Track bedienen wollt

Dann braucht ihr zusaetzlich ein `Mac Catalyst`- oder `macOS`-Target in Xcode.

## Releases online bereitstellen

1. Code nach `master` pushen
2. Tag setzen, z. B. `mobile-v1.0.0`
3. Tag pushen
4. GitHub Release enthaelt danach die mobilen Dateien als Download
5. iOS-Tags landen zusaetzlich in App Store Connect / TestFlight, wenn `IOS_EXPORT_METHOD=app-store` und die Upload-Secrets gesetzt sind

## Empfohlene Tags

```bash
git tag mobile-v1.0.0
git push origin master --tags
```
