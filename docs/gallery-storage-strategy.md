# Galerie-Storage-Strategie fuer grosse Fotografen-Uploads

## Ausgangslage

Die App speichert Fotografenbilder aktuell im Supabase-Storage-Bucket `hochzeitsfotos` und liefert sie im Gaestebereich direkt ueber die gespeicherte `publicUrl` aus.

Aktueller Codepfad:

- Upload: `src/app/api/photographer/photos/route.ts`
- Storage-Write: `src/lib/supabase/repository.ts` in `uploadGalleryFiles(...)`
- Auslieferung: `src/components/gallery/GalleryGrid.tsx`

Wichtige Beobachtungen:

- Fotografen koennen aktuell Originaldateien bis `50 MB` hochladen.
- Die Bilder werden ohne serverseitige Kompression oder Variantenbildung gespeichert.
- Die Galerie rendert die Bild-URL direkt und nutzt `unoptimized`, also ohne Optimierungs-Pipeline fuer die Auslieferung.

Das ist fuer kleine Galerien okay, fuer `1.000 Fotos pro Hochzeit` aber wirtschaftlich und technisch nicht ideal.

## Warum das in der aktuellen Form nicht gut skaliert

### 1. Das groessere Problem ist nicht nur Speicher, sondern Auslieferung

Reiner Speicher ist noch handhabbar. Kritischer ist, dass Gaeste heute praktisch die Originalbilder laden.

Modellbeispiel:

- 1.000 Fotos
- durchschnittlich 12 MB pro Foto
- 100 Gaeste
- jeder Gast schaut 200 Bilder an

Dann entstehen `20.000 Bildabrufe`. Wenn dabei Originale mit `12 MB` ausgeliefert werden, sind das rund `240 GB` Traffic fuer nur eine Hochzeit.

Das ist fast die komplette im Supabase-Pro-Plan enthaltene Egress-Menge fuer einen Monat.

### 2. Die Galerie wird fuer Gaeste langsamer als noetig

Gaeste brauchen keine 12-20 MB pro Foto im Browser. Fuer eine gute Webgalerie reichen normalerweise:

- Thumbnail: `40-80 KB`
- Grid-Karte: `120-250 KB`
- Lightbox / Vollansicht: `250-600 KB`

Originale gehoeren archiviert, nicht standardmaessig an alle Gaeste ausgeliefert.

### 3. Mehrere Hochzeiten summieren sich schnell

Wenn mehrere Brautpaare gleichzeitig Galerien mit vielen Bildern aktiv nutzen, steigen:

- Speichermenge
- Traffic
- Ladezeit
- Supportaufwand

linear oder sogar ueberproportional.

## Aktuelle Preisbasis

Stand: 11.03.2026

### Supabase

- Pro/Team: `100 GB` Storage inklusive, danach `0,021 USD / GB / Monat`
- Pro/Team: `250 GB` Egress inklusive, danach `0,09 USD / GB`
- Bildtransformationen sind zusaetzlich bepreist

Quelle:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/storage/pricing

### Cloudflare R2

- Standard: `0,015 USD / GB-Monat`
- Infrequent Access: `0,01 USD / GB-Monat`
- Egress ins Internet: `kostenlos`

Quelle:

- https://developers.cloudflare.com/r2/pricing/

### Cloudflare Images

- Externe Bilder optimieren: erste `5.000` eindeutigen Transformationen pro Monat frei
- danach `0,50 USD / 1.000` eindeutige Transformationen

Quelle:

- https://developers.cloudflare.com/images/pricing/

### Backblaze B2

- Storage: `0,005 USD / GB / Monat`
- freie Egress-Menge bis zum Dreifachen des durchschnittlich gespeicherten Volumens
- danach `0,01 USD / GB`

Quelle:

- https://www.backblaze.com/cloud-storage/transaction-pricing
- https://www.backblaze.com/cloud-storage/pricing

## Bewertung der aktuellen Architektur

### Haben wir bereits guenstigen Webspace?

`Teilweise.` Supabase Storage ist fuer Inhalte, Admin-Bilder und kleinere Galerien okay. Fuer grosse oeffentliche Hochzeitsgalerien ist es in der aktuellen Form aber nicht die beste wirtschaftliche Loesung, weil:

- Originale gespeichert werden
- Originale an Gaeste ausgeliefert werden
- Egress bei aktiven Galerien teuer werden kann

Das heisst:

- `Speicher allein` ist noch nicht das Kernproblem
- `Egress + fehlende Variantenbildung` ist das eigentliche Problem

## Empfehlung

## Zielbild

Die beste Kombination fuer NiiRo Smart Wedding ist:

1. `Supabase` bleibt fuer Datenbank, Auth, Sessions und Metadaten.
2. `Cloudflare R2 Standard` dient fuer alle oeffentlich oder halb-oeffentlich ausgelieferten Galerievarianten.
3. `Originaldateien` bleiben privat und werden nach einer Karenzzeit automatisch in ein guenstigeres Archiv verschoben:
   - entweder `R2 Infrequent Access`
   - oder spaeter optional `Backblaze B2`, wenn wir maximale Storage-Ersparnis wollen
4. Der Gaestebereich liefert nie die Originale aus, sondern nur optimierte Varianten.

## Warum ich genau das empfehle

### R2 fuer die Gaeste-Auslieferung

Fuer NiiRo Smart Wedding ist `kostenloser Egress` der groesste Hebel. Eine Hochzeitsgalerie wird oft von vielen Gaesten und mehrfach aufgerufen. Genau dort ist R2 wirtschaftlich stark.

### Supabase weiter fuer App-Logik

Wir muessen Auth, Sessions und den Rest der Anwendung nicht umbauen. Das reduziert Risiko und Einfuehrungsaufwand.

### Originale getrennt von Webvarianten

Damit erreichen wir gleichzeitig:

- bessere Ladezeit fuer Gaeste
- deutlich geringeren Traffic
- beherrschbare Storage-Kosten
- weiterhin volle Qualitaet im Originalarchiv

## Konkrete technische Loesung

### Beim Upload

Wenn der Fotograf Bilder hochlaedt:

1. Originaldatei privat speichern
2. daraus automatisch Webvarianten erzeugen
3. nur die Webvarianten fuer die Galerie freigeben

Empfohlene Varianten:

- `thumb`: 320 px, WebP/AVIF, fuer Uebersichten
- `grid`: 960 px, WebP/AVIF, fuer Galerieansicht
- `lightbox`: 1800 px, WebP/AVIF, fuer grosse Einzelansicht

Zusatzregeln:

- EXIF-Metadaten entfernen
- automatische Drehung anhand EXIF
- Qualitaetsziel auf visuell gut, aber webtauglich setzen

### In der Datenbank speichern

Pro Bild sollten kuenftig gespeichert werden:

- `originalPath`
- `thumbPath`
- `gridPath`
- `lightboxPath`
- `storageProvider`
- `sizeOriginalBytes`
- `sizeDerivedBytes`
- `width`
- `height`
- `uploadedBy`
- `visibility`

### In der Galerie ausliefern

Der Gaestebereich nutzt:

- Grid-Ansicht: `gridPath`
- Vorschaubild: `thumbPath`
- Lightbox: `lightboxPath`

Die Originaldatei bleibt privat und wird nicht direkt gerendert.

## Schutz vor Kostenexplosion

Zusatzregeln, die ich fuer NiiRo Smart Wedding klar empfehle:

### Quoten pro Hochzeit

- weiche Warnung ab `10 GB`
- harte Upload-Sperre ab `20 GB` Originaldaten pro Hochzeit
- zusaetzliche Warnung ab `1.500 Fotos`

Damit bleibt das Produkt wirtschaftlich kontrollierbar.

### Upload-Regeln

- maximale Einzeldatei fuer Fotografen: von `50 MB` auf `15 MB` senken
- nur `jpg`, `jpeg`, `png`, `webp`, `heic`
- optionale Stapelgroesse pro Upload begrenzen

### Lifecycle-Regeln

- Webvarianten bleiben in `R2 Standard`
- Originale wechseln nach `30 Tagen` in `R2 Infrequent Access`
- optional nach `180 Tagen` Archiv-Export anbieten

### Produktregel

Das Brautpaar bekommt:

- eine performante Webgalerie fuer Gaeste
- ein privates Originalarchiv

Wenn ein Paar sehr viele Originale dauerhaft online halten will, kann spaeter ein `Foto-Archiv-Add-on` eingefuehrt werden.

## Wirtschaftliche Einordnung

### Wenn wir nichts aendern

Bei aktiven Galerien zahlen wir das Risiko hauptsaechlich bei:

- Supabase-Egress
- langen Ladezeiten
- unnoetig grossem Traffic

### Wenn wir auf R2 plus Varianten gehen

Dann wird das Modell deutlich besser:

- oeffentliche Bildauslieferung ohne Egress-Kosten
- guenstigere Storage-Kosten als Supabase
- bessere Performance fuer Gaeste
- saubere Trennung zwischen Galerie und Archiv

### Wenn wir spaeter auch Archivkosten maximieren wollen

Dann ist `R2 fuer Varianten + B2 fuer kalte Originalarchive` die guenstigste Fortsetzung. Das lohnt sich aber eher ab groesserem Volumen. Fuer den naechsten sinnvollen Schritt reicht `R2 only` vollkommen.

## Empfehlung als Entscheidung

### Sofort umsetzen

1. Galerie-Auslieferung von Originaldateien beenden
2. Varianten beim Upload erzeugen
3. oeffentliche Galerievarianten nach `Cloudflare R2` legen
4. Originale privat halten
5. Upload-Limits und Quoten einfuehren

### Danach

6. alte Originale nach `R2 Infrequent Access` verschieben
7. optional spaeter `Backblaze B2` fuer kalte Archive pruefen

## Konkreter Umsetzungsplan fuer NiiRo Smart Wedding

### Phase 1

- neues Media-Abstraktionsmodul einfuehren
- R2-Bucket anlegen
- Fotografen-Upload so umbauen, dass Original + Varianten entstehen
- Galerie-Komponenten auf Varianten umstellen

### Phase 2

- Quoten und Admin-Anzeige fuer verbrauchten Speicher je Hochzeit
- Lifecycle-Regeln fuer Originale
- Warnhinweise fuer Brautpaar und Fotograf

### Phase 3

- Archiv-Export
- optional kostenpflichtiges Foto-Archiv-Add-on

## Klare Empfehlung

`Ja, wir brauchen eine andere Medienstrategie.` Nicht weil Supabase grundsaetzlich schlecht waere, sondern weil das aktuelle Modell mit Originalbildern fuer Gaeste wirtschaftlich und technisch unnoetig teuer ist.

Die pragmatisch beste Loesung fuer NiiRo Smart Wedding ist:

- `Supabase` fuer App und Metadaten behalten
- `Cloudflare R2` fuer oeffentliche Galerieauslieferung einsetzen
- `optimierte Bildvarianten` statt Originale ausliefern
- `Originale privat archivieren`

Das ist die beste Mischung aus:

- niedrigen Kosten
- guter Performance
- wenig Umbau-Risiko
- sauberer Skalierung fuer viele Brautpaare
