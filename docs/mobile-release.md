# Mobile Release Pipeline

Diese Pipeline stellt Mobile-Builds online ueber GitHub Actions und GitHub Releases bereit.

## CI-Toolchain

- GitHub Actions nutzt Node 22, weil `@capacitor/cli@8` das fuer den Build erwartet.

## Was sofort funktioniert

- Android: Debug-APK als GitHub-Artifact und bei Tags auch als Release-Download
- iOS: Signiertes IPA als GitHub-Artifact und bei Tags auch als Release-Download, sobald Apple-Signing-Secrets gesetzt sind

## GitHub Workflows

- `.github/workflows/mobile-android.yml`
- `.github/workflows/mobile-ios.yml`

## Android

### Ohne weitere Secrets

Der Android-Workflow baut immer ein installierbares Debug-APK. Das ist fuer interne Tests und direkte Downloads geeignet.

### Optional fuer signierte Release-Builds

Lege diese GitHub Secrets an:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Dann erzeugt der Workflow zusaetzlich:

- signiertes Release-APK
- signiertes Release-AAB

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
