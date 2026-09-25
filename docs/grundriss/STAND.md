# Grundriss-Umbau: Stand

Stand: 25.09.2026, nach Etappe 1.

## Fertig und live (auf `main`, Commit `f7a2cf7`)

- **Etappe 0:** `BAUPLAN.md` (ersetzt `entwurf-teile.json`).
- **Etappe 1:**
  - Migrationen 0027 (eigene Groessen), 0028 (Grundriss-Modell mit allen
    Regeln), 0029 (Umrechnung) sind angewandt, jeweils nach Probelauf auf
    der echten Datenbank ohne Fehler. 0028 wurde vorher von zwei Pruefern
    gegengelesen (Funde eingearbeitet, siehe `ENTSCHEIDUNGEN.md` E20).
  - Umrechnung: 2 alte Raumplaene wurden je ein Raum im Grundriss "Neue
    Wohnung" ihres Umzugs; es standen keine Kisten darin, keine Regale.
  - Oberflaeche: eigene Groessen (Seite Groessen, Auswahl beim Anlegen von
    Kisten und Moebeln, Etiketten mit Namen), `src/lib/geometrie.ts` mit
    Pruefskript, Seitenleiste am Computer, alter Raumplan nur lesend.

## In Arbeit: Etappe 2 (Zeichner)

Laeuft auf dem Arbeitszweig `claude/vibrant-planck-jlsatf`, noch nicht
committet. Plan: `BAUPLAN.md` Abschnitt 5.2.

## Danach

- Etappe 3: Handy platzieren, Kistenseite mit Lageplan, 0030 neue Suche.
- Etappe 4: 3D, Redesign, 0031 altes Raster entfernen.

## Arbeitsweise fuer eine neue Sitzung

1. `CLAUDE.md`, `docs/cloud/START.md`, dieses Dokument und
   `BAUPLAN.md` (nur die Abschnitte der naechsten Etappe) lesen.
2. Migrationen: erst Probelauf (`do $probe$ ... raise exception`), dann
   anwenden. Angewandte Dateien nie aendern.
