# Designschicht

Alles in diesem Ordner ist reine Optik. Hier steht keine Berechnung, keine
Datenabfrage, keine Reihenfolge. Nimmt man den Ordner weg, sieht die App
schlicht aus und funktioniert unveraendert weiter.

Keine Datei ausserhalb dieses Ordners importiert fest von hier. Alles kommt
ueber `import.meta.glob` herein, und glob liefert einfach nichts, wenn der
Ordner fehlt:

- `src/main.tsx` bindet die Stylesheets ein (`./design/*.css`, ausser
  `buehne.css`, die nur mit der Startseite laedt).
- `src/components/Designteile.tsx` holt die Zeichnungen (`Kisten.tsx`), die
  Ladeanzeige beim Bilderlesen (`LeseBuehne.tsx`) und fuer die abgeschaltete
  Startseite `Buehne.tsx` und `motion.tsx`. Fehlt ein Teil, ist es dort
  `null`, und die Seiten zeigen ihren schlichten Ersatz (Symbol statt
  Zeichnung, nur Text statt Ladebild).

| Datei | Was |
|---|---|
| `apple.css` | der Apple-Look: Milchglas in Kopfzeile (`kopf-leiste`) und Tab-Leiste (`tab-leiste`), Federn fuer Blaetter, Alerts, Seitenmenue und Schalter (`d-schleier`, `d-blatt`, `d-alert`, `d-seite`, `schalter-knopf`), Haarlinien in Listen (`gruppe`), Pfeile am Auswahlfeld (`feld-auswahl`), Rahmen als Haarlinien, "gewaehlt" in Akzent, Anmeldeseite, Kontrast- und Transparenz-Wuensche des Systems |
| `oberflaeche.css` | Knoepfe werden beim Druecken dunkler und etwas kleiner (Klasse `knopf`), Hover an Tabellenzeilen, atmende Skelette, Foto-Zoom |
| `plan.css` | weiche Auswahl in Plan und Zeichner, pulsierender Ring um die gesuchte Kiste (`--plan-hervor`) |
| `kisten.css` | Farben der gezeichneten Kisten |
| `Kisten.tsx` | die gezeichneten Umzugskisten als SVG (leere Zustaende, Startseite) |
| `buehne.css` | warmer Grund, Knopfglanz, Glaskarten der Startseite |
| `Buehne.tsx` | haengt die Hintergrundebenen der Startseite ein und schreibt die Scrollhoehe nach `--sy` |
| `motion.tsx` | nur der kleine Bewegungs-Schalter der Startseite |
| `lesen.css` | Farben und Bewegung der Ladeanzeige beim Bilderlesen |
| `themen.css` | die fuenf weiteren Designs (Kontrast, Salbei, Ozean, Nacht, Graphit) als Farbwerte je `data-theme` |
| `LeseBuehne.tsx` | die Zeichnung dazu: Kiste im Sucher, Lichtstreifen, Funken |

## Bewegungsstufen

Der Wert steht als `data-motion` am `html`-Element und wird in
`localStorage` unter `kistly.motion` gemerkt. Standard ist `normal`. Die
Stufe selbst (Werte, Speichern, Setzen) steht in `src/lib/bewegung.ts`, der
Schalter in den Einstellungen benutzt nur diese Datei.

| Stufe | Was passiert | Kosten |
|---|---|---|
| `ruhig` | nichts bewegt sich, auch keine Einblendungen; kein Milchglas (Leisten sind einfarbig); Druecken nur als Farbe | keine |
| `normal` | Milchglas in Kopfzeile und Tab-Leiste, Blaetter, Alerts und Schalter kommen auf einer Feder, Knoepfe geben beim Druecken nach, Skelette atmen, Ring um "hier ist es" pulsiert | Unschaerfe der Leisten, sonst vernachlaessigbar |
| `voll` | dazu schwebende Zeichnungen, auf der Startseite driftende Kisten | Dauerbewegung, merkbar auf dem Akku |

Wer im Betriebssystem weniger Bewegung eingestellt hat
(`prefers-reduced-motion`), bekommt sie nicht, unabhaengig von der Stufe.

## Farben

Alle Farben stehen als CSS-Variablen in `src/index.css`, nicht hier und
nicht im JavaScript. Diese Dateien benutzen nur die Variablen. Plaene werden
nie gespiegelt und nie umgefaerbt.

Apple-Systemfarben in Ordnung "gruppiert": `--paper` grauer Grund,
`--surface` weisse Karte (dunkel #1C1C1E), `--raised` eine Stufe darueber
(dunkel #2C2C2E), `--ink`, `--muted` als primaere und sekundaere Schrift,
`--line` als Haarlinie, `--accent` Blau fuer Flaechen und Symbole,
`--accent-text` Blau fuer Schrift. Abgeleitet (rechnen aus diesen, darum
folgen die weiteren Designs von selbst): `--feld` graue Feldflaeche,
`--tint` getoente Akzentflaeche, `--glas-leiste`, `--seitenleiste`,
`--schalter-an`/`--schalter-aus`, `--schleier`. Das Blau des Schalters
aendert man in `--schalter-an` (z. B. auf `#34C759` fuer das iOS-Gruen).
Kurven: `--kurve`, `--feder-blatt`, `--feder-pop`, `--feder-schalter`.
Ein neues Design setzt neben den Grundfarben auch `--accent-text`.

## Rueckweg

**Ganze Schicht weg:** Ordner `src/design` loeschen, fertig. Build und App
laufen weiter (geprueft: Ordner verschoben, `npm run build` laeuft). Danach
gibt es keine Hover-Bewegung, keine Zeichnungen in leeren Zustaenden (dort
steht das Symbol), keinen pulsierenden Ring und eine schlichte Startseite.
Grundfarben, Abstaende, Ecken und Schatten bleiben, denn die stehen in
`src/index.css`.

Wer auch die Haken wegraeumen will (sie stoeren ohne Schicht nicht):

1. `src/components/Designteile.tsx` loeschen und in `ui.tsx` (Empty),
   `BildLesen.tsx` und `Landing.tsx` die Verwendungen entfernen.
2. In `src/main.tsx` die Zeile mit `import.meta.glob('./design/...')`.
3. Die Klassen `d-schleier`, `d-blatt`, `d-alert`, `d-seite`,
   `schalter-knopf`, `kopf-leiste`, `tab-leiste`, `gruppe`, `feld-auswahl`,
   `anmeldung`, `seitenleiste`, `knopf`, `leer-bild`, `foto-reihe`, `tabelle-zeile`,
   `plan-auswahl-ebene`, `plan-hervor-ebene`, `plan-ring`, `kn-glanz`,
   `kn-gross`, `kn-pfeil`, `karte-glas`, `karte-glas-stark`, `band`,
   `lese-karte`, `lese-balken` sind dann wirkungslos und koennen aus den
   Seiten entfernt werden.

**Nur ein Teil weg:** die jeweilige Datei loeschen. Eine `.css` faellt aus
dem glob heraus; `Kisten.tsx` oder `LeseBuehne.tsx` werden in
`Designteile.tsx` zu `null`, die Seiten zeigen den schlichten Ersatz.
