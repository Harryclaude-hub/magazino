# Grundriss-Umbau: Stand

Stand: 26.09.2026, alle Etappen gebaut, dazu Ueberstand im Regal, Fuellstand und freies Verschieben im Grundriss (0033 angewandt).

## Fertig und live (Zweig `main`)

- **Etappe 0:** `BAUPLAN.md`.
- **Etappe 1:** eigene Groessen, Datenmodell in cm (0027, 0028, 0029
  angewandt), Seitenleiste am Computer.
- **Etappe 2:** Zeichner am Computer mit mehreren Grundrissen, Raeumen,
  Tueren, Fenstern, Moebeln, Regalen und Schraenken mit Faechern, Kisten
  setzen und stapeln; 0031 (Zusammenlegen fuer Rueckgaengig) angewandt.
- **Etappe 3:** Kiste am Handy platzieren, Kistenseite und Moebelseite mit
  Lageplan, Suche mit Platz und Hoehe (0030 angewandt).
- **Etappe 4:** 3D am Computer, Redesign, altes Raster entfernt (0032
  angewandt).

Jede Migration lief vorher als Probelauf auf der echten Datenbank ohne
Fehler. Gegenpruefungen: zwei Pruefer fuer 0028, je einer je Etappe; alle
bestaetigten Funde sind eingearbeitet (siehe `ENTSCHEIDUNGEN.md`).

## Offen

- Pruefen mit echtem Handy und echter Anmeldung (Zwei-Finger-Zoom,
  Platzieren in 4 Tipps, 3D mit echten Daten).
- Moebel mit einem Objekt verknuepfen geht nur im Zeichner am Computer.
- Regale und Schraenke haben in 3D keine Rueckwand.
- Weitere orange Knoepfe in Einstellungen, Chat und Zeichner koennten noch
  zu Umriss-Knoepfen werden (eine Hauptaktion je Seite).

## Arbeitsweise fuer eine neue Sitzung

1. `CLAUDE.md`, dieses Dokument, `ENTSCHEIDUNGEN.md` lesen; `BAUPLAN.md` nur
   bei Bedarf.
2. Migrationen: erst Probelauf (`do $probe$ ... raise exception`), dann
   anwenden. Angewandte Dateien nie aendern.
