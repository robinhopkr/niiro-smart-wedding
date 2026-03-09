# Mobile Release Pipeline

Diese Pipeline stellt Mobile-Builds online ueber GitHub Actions und GitHub Releases bereit.

## CI-Toolchain

- GitHub Actions nutzt Node 22, weil `@capacitor/cli@8` das fuer den Build erwartet.

## Was sofort funktioniert

- Android: signiertes Release-APK und Release-AAB als GitHub-Artifact und bei Tags auch als Release-Download
- iOS: Signiertes IPA als GitHub-Artifact und bei Tags auch als Release-Download, sobald Apple-Signing-Secrets gesetzt sind

## GitHub Workflows

- `.github/workflows/mobile-android.yml`
- `.github/workflows/mobile-ios.yml`

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

Optional als GitHub Variables:

- `IOS_EXPORT_METHOD` mit `ad-hoc`, `app-store` oder `enterprise`

### Wichtig

- `ad-hoc`: direkt downloadbar/installierbar fuer registrierte Geraete
- `app-store`: fuer App Store Connect / TestFlight
- Ohne Apple-Signing kann kein installierbares iPhone-IPA erzeugt werden

## Releases online bereitstellen

1. Code nach `master` pushen
2. Tag setzen, z. B. `mobile-v1.0.0`
3. Tag pushen
4. GitHub Release enthaelt danach die mobilen Dateien als Download

## Empfohlene Tags

```bash
git tag mobile-v1.0.0
git push origin master --tags
```
