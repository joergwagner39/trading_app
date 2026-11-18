# Trendradar – Aktienanalyse (Desktop & Mobil)

Web-App (PWA) für Chartanalyse, Trend-Screener, Watchlist und News. Läuft im Browser
und lässt sich auf Desktop (Chrome/Edge: „App installieren“) und Smartphone
(„Zum Home-Bildschirm“) als App installieren.

## Funktionen

- **Chartanalyse** – Candlestick-Chart mit SMA 50/200, Volumen und RSI.
  Automatische Einschätzung **bullisch / neutral / bärisch** (Score −100 … +100) mit Begründung.
- **Wann aufstocken?** – Empfehlung (Aufstocken / Halten / Abwarten / Nicht aufstocken),
  Kaufzonen (Rücksetzer an SMA 50, letztes Swing-Tief, 200-Tage-Linie) und Stop-Loss-Vorschlag.
- **News** zum jeweiligen Unternehmen.
- **Screener**
  - Trendstärkste Aktien (Trend-Score 0–100)
  - Aktien an der 200-Tage-Linie (± einstellbarer Abstand)
  - Aktien mit RSI unter 30 (Schwelle einstellbar)
  - Märkte: DAX-Werte, US Large Caps, Europa Large Caps oder die eigene Watchlist
- **Watchlist** – lokal im Gerät gespeichert, Export/Import zum Übertragen zwischen Geräten.

## Datenquelle

Kurse und News kommen über [`yahoo-finance2`](https://github.com/gadicc/yahoo-finance2)
von Yahoo Finance (kein API-Key nötig, inoffizielle Schnittstelle, Kurse ggf. verzögert).
Abruf und Berechnung laufen serverseitig (`app/api/*`), Ergebnisse werden 15 Min. gecacht.

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Ohne Internetzugang zu Yahoo: `DEMO_DATA=1 npm run dev` (synthetische Kurse, nur zum Testen).

## Deployment

Am einfachsten auf [Vercel](https://vercel.com): Repository importieren, fertig.
Danach die URL auf Handy/Desktop öffnen und als App installieren.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `lib/indicators.ts` | SMA, EMA, RSI, MACD, ADX, ATR, Swing-Tiefs |
| `lib/analysis.ts` | Signal-Score, Trend-Score, Kaufzonen, Empfehlung |
| `lib/data.ts` | Yahoo-Finance-Abruf, Cache, Demo-Daten |
| `lib/universe.ts` | Aktienlisten für den Screener |
| `app/api/*` | API: `history`, `news`, `search`, `scan` |
| `app/page.tsx` | Watchlist |
| `app/stock/[symbol]` | Aktienseite |
| `app/screener` | Screener |

## Hinweis

Keine Anlageberatung. Alle Signale werden automatisch aus technischen Indikatoren berechnet.
