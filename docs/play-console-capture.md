# Play Console Capture

## Zweck

Dieses kleine Tool nimmt strukturierte Seiteninfos aus der Google Play Console lokal entgegen, damit wir einzelne Play-Schritte schneller auswerten koennen.

## Starten

```bash
npm run play:capture
```

Der Listener startet standardmaessig auf:

- Host: `127.0.0.1`
- Port: `8123`

## Browser-Snippet

Den Bookmarklet-/Console-Code aus dem Browser an den Listener senden:

```javascript
(async () => {
  const buttons = [...document.querySelectorAll('a,button,[role="button"]')]
    .map((el, i) => ({
      i,
      text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' '),
      href: el.href || null,
    }))
    .filter((item) => item.text)
    .slice(0, 80)

  const headings = [...document.querySelectorAll('h1,h2,h3')]
    .map((el) => (el.innerText || el.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 20)

  const payload = {
    title: document.title,
    url: location.href,
    headings,
    body: (document.body?.innerText || '').slice(0, 4000),
    buttons,
  }

  await fetch('http://127.0.0.1:8123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
})()
```

## Ausgabe

Alle Requests landen unter:

`tmp/play-console-capture`

- `latest.json` = letzter empfangener Stand
- `YYYY-MM-DDTHH-MM-SS...json` = archivierte Einzelstaende
