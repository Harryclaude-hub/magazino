# Magazino (bis 14.11.2026 Kistly, danach kurz Fundkiste): Regeln fuer Claude

Diese Datei liest jede Claude-Sitzung in diesem Repo, auch in der Cloud.
Das Repo ist OEFFENTLICH. Was hier steht, darf jeder lesen.

## Mit wem du arbeitest

Karam, Eigentuemer von Magazino. Das Programm hiess bis 14.11.2026 Kistly, am 14.11. kurz Fundkiste; Lagerly ist darin aufgegangen und gibt es nicht mehr. Er spricht Deutsch, oft per Sprachnachricht
(Tippfehler und Woerter wie "TwoXX" sind Spracherkennung).

- **Jede Antwort beginnt mit "Passt, Karam."** Bei einer reinen
  Designaufgabe stattdessen mit "Jawohl, Chef."
- **Kein langer Gedankenstrich (U+2014), nirgends.** Nicht in Antworten,
  nicht im Quelltext, nicht in Kommentaren, nicht in Commit-Nachrichten.
- **Braucht Claude etwas von Karam** (Konto, Schluessel, Klick im
  Dashboard, Foto, Freigabe): immer als nummerierte Schritt-fuer-Schritt-
  Anleitung in Stichpunkten, mit direkten Links zu den Anbietern.
- Einfache Sprache, keine Fachbegriffe ohne Erklaerung.

## Was nie passieren darf

- **Kein Zugangscode, kein API-Schluessel, kein Passwort** in eine Datei,
  eine Commit-Nachricht oder das Repo. Nie nach einem Schluessel im Chat
  fragen; Karam traegt Schluessel selbst als Function Secret ein.
- **Kein `service_role`-Schluessel.** Nie danach fragen, nie benutzen.
- **Nichts gegen eine Datenbank ausfuehren, ohne dass Karam es gesagt
  hat.** Seine stehende Regel fuer diesen Umbau: jede Migration erst in
  einem `do $$`-Block durchspielen, der am Ende mit `raise exception` den
  Bericht ausgibt und damit alles zurueckrollt, Bericht zeigen, dann
  anwenden.
- **Magazino hat genau ein Supabase-Projekt: `vqpirkgvclfsduklnnzv`** (im Dashboard noch "kistly" genannt). Jedes
  andere Supabase-Projekt in Karams Konto gehoert zu anderen Programmen
  und ist tabu, weder lesend noch schreibend, auch nicht "nur kurz".
- Claude tippt keine Passwoerter in Anmeldefelder.

## Hausregeln im Code

- Datenbankzugriffe nur in `src/lib/api.ts` (und `src/lib/bildki.ts` fuer
  die Bilderkennung). Keine zweite Abfrage in einer Seite.
- `prefix`, `seq` und `code` einer Kiste vergibt nur die Datenbank.
- Angewandte Migrationen werden nie geaendert, ein Fehler bekommt eine
  neue Nummer. Angewandt sind 0001 bis 0048.
- Woerterbuecher in `src/lib/i18n/bausteine`: jeder Eintrag hat `de` UND
  `ar` mit denselben Platzhaltern. Arabisch laeuft von rechts nach links,
  Plaene und Karten werden nie gespiegelt, Seriennummern stehen immer
  links nach rechts.
- Laden, Fehler und leer sind drei verschiedene Zustaende. Kein Fehler
  wird still geschluckt.
- Dialoge setzen ihren Zustand beim Oeffnen zurueck.
- Design ist eine eigene, loeschbare Schicht in `src/design` (Farben und
  Groessen nur ueber CSS-Variablen, Bewegung hinter den Stufen ruhig,
  normal, voll). Bei Designauftraegen nie Logik aendern.

## Pruefen vor jedem Commit

```
npx tsc -b                        Typpruefung, muss still durchlaufen
npx oxlint                        nur Warnungen erlaubt
npm run build                     wie auf GitHub
node scripts/woerter-pruefen.mjs  bekannt: 8 Meldungen bei *.eins
node scripts/szene-pruefen.mjs    dazu geometrie-, zeichner-, kollision-,
                                  moebel-, aussen-, avatar-, osm-,
                                  siedlung-, siedlung-ui-, siedlung-innen-,
                                  siedlung-wohnungen-, siedlung-gemeinsam-,
                                  minikarte-, stadt-daten-, stadt-, innen-,
                                  physik-, fahren-, motor-fahren-,
                                  moebel-tragen- und bedienung-pruefen
Wo jemand wohnt (Siedlung, Adresse, Stockwerk), steht nie im Code, nur
in der Datenbank.
```

Dazu: keine Schluessel im Diff, kein U+2014, keine Wegwerf-Testseiten.
Commit-Nachrichten auf Deutsch, am Ende die Co-Authored-By-Zeile.
Jeder Push auf `main` geht sofort live (GitHub Pages).

## Wo der Stand steht

- `docs/UEBERGABE.md`: aktueller Stand und naechste Schritte (zuerst lesen).
- `docs/cloud/START.md`: urspruenglicher Auftrag des Grundriss-Umbaus.
- `docs/grundriss/entwurf-teile.json`: Material fuer den Grundriss-Umbau
  (Code-Karten, drei Entwuerfe, zwei Bewertungen).
- `docs/grundriss/BAUPLAN.md`: der Bauplan, sobald er geschrieben ist.
- `docs/grundriss/STAND.md`: Stand nach der letzten fertigen Etappe.
- `PLAN.md`: Fahrplan und Begruendungen der frueheren Bloecke.

## Name und Adresse (seit 14.11.2026)

- Das Programm heisst **Magazino** (blaues Logo mit M), Adresse https://harryclaude-hub.github.io/magazino/
  (Repo `Harryclaude-hub/magazino`, vorher `fundkiste`, davor `kistly`).
- Die alte Adresse /kistly/ leitet ueber ein kleines privates Repo `kistly` (nur eine
  Weiterleitungsseite, zeigt direkt auf /magazino/) weiter, weil auf gedruckten Etiketten
  QR-Codes mit der alten Adresse stehen. Dieses Repo nie loeschen, solange alte Etiketten
  benutzt werden. /fundkiste/ gibt es nicht mehr.
- Bewusst NICHT umbenannt, weil unsichtbar und mit Daten verknuepft: Ablehnungs-Kennungen
  `kistly:...` in der Datenbank, localStorage-Schluessel `kistly.*`, CSS-Klassen, Ordner
  `C:\Users\Home\kistly`.
