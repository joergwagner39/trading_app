# Trendradar – Aktienanalyse (Desktop & Mobil)

Web-App (PWA) für Chartanalyse, Trend-Screener, Watchlist und News. Läuft im Browser
und lässt sich auf Desktop (Chrome/Edge: „App installieren“) und Smartphone
(„Zum Home-Bildschirm“) als App installieren.

## Funktionen

- **Chartanalyse** – Candlestick-Chart mit SMA 50/200, Volumen und RSI.
  Automatische Einschätzung **bullisch / neutral / bärisch** (Score −100 … +100) mit Begründung.
- **Wann aufstocken?** – Empfehlung (Aufstocken / Halten / Abwarten / Nicht aufstocken),
  Kaufzonen (Rücksetzer an SMA 50, letztes Swing-Tief, 200-Tage-Linie) und Stop-Loss-Vorschlag.
- **TradingView live** – auf der Aktienseite umschaltbar: eingebetteter TradingView-Chart mit Live-Kursen und allen Zeichenwerkzeugen.
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
Abruf und Berechnung laufen serverseitig (`app/api/*`). Aktienseite und Watchlist aktualisieren sich jede Minute,
der Screener nutzt einen 15-Minuten-Cache.

TradingView bietet keine Daten-Schnittstelle; das eingebettete Widget zeigt Live-Kurse nur an.
Analyse und Screener basieren daher auf den Yahoo-Daten.

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

## TradingView-Indikator

`tradingview/trendradar.pine` enthält dieselbe Analyse als TradingView-Indikator
(Signal & Score, Empfehlung, Kaufzonen, Stop-Loss, Trendstärke) – live in deinen TradingView-Charts.
Zusätzlich:

- **Harmonische Muster**: Gartley, Bat, Alt-Bat, Butterfly, Crab, Deep Crab, Cypher – mit Zielen und Stop,
  plus Vorschau der Umkehrzone (PRZ) für entstehende Muster
- **Chartformationen**: Doppelboden/-top, Schulter-Kopf-Schulter (auch invers) mit Nackenlinien-Ausbruch
- **Kerzenmuster**: Engulfing, Hammer, Shooting Star (nur an relevanten Stellen)
- **Fibonacci**: Retracements des letzten großen Swings, Golden Pocket, Extensions 127,2/161,8 %
- **Dreiecke, Keile, Kanäle, Rechtecke** mit Ausbruchserkennung und Kursziel
- **Unterstützungs-/Widerstandszonen** aus gebündelten Wendepunkten (mit Anzahl Berührungen),
  nächste Unterstützung und nächster Widerstand in der Tabelle
- **Zielzonen** Ziel 1–3: Widerstände, Fib-Extensions und Musterziele kombiniert;
  ★ = mehrere Ziele auf einem Niveau (Konfluenz)

1. In TradingView einen Chart öffnen (Zeitraum **1D**), unten **Pine-Editor** öffnen.
2. Inhalt der Datei einfügen → **Zum Chart hinzufügen**, danach **Speichern**.
3. Alarme: **Alarm erstellen** → Bedingung „Trendradar“ → z. B. „RSI unter Schwelle“,
   „An der 200-Tage-Linie“, „Aufstock-Signal“, „Harmonisches Muster bullisch“, „Kurs erreicht PRZ“ oder „Golden Pocket erreicht“. Funktioniert auch auf einer ganzen Watchlist (je nach TradingView-Plan).
