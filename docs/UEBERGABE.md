# Kistly: Uebergabe fuer eine neue (lokale) Claude-Sitzung

Stand: 26.09.2026. Diese Datei zuerst lesen, dann `CLAUDE.md` (Regeln).

## Wo alles ist

- Live: https://harryclaude-hub.github.io/kistly/ (jeder Push auf `main`
  geht sofort live, GitHub Pages).
- Repo: https://github.com/Harryclaude-hub/kistly, Zweig `main` ist aktuell
  (der Cloud-Arbeitszweig `claude/vibrant-planck-jlsatf` ist identisch).
- Datenbank: Supabase `vqpirkgvclfsduklnnzv` (nur dieses Projekt!).
  Migrationen 0001 bis 0033 sind angewandt.

## Was fertig ist

- Grundriss-Umbau komplett (Etappen 0 bis 4): eigene Groessen, Grundriss in
  cm mit Raeumen, Tueren (orange), Fenstern (blau), Moebeln, Regalen und
  Schraenken mit Faechern, Kisten setzen und stapeln (Datenbank prueft alle
  Regeln), Zeichner am Computer, Platz waehlen am Handy, Lageplan auf der
  Kistenseite, Suche mit Platz und Hoehe, 3D am Computer, neues Design,
  altes Raster entfernt.
- Nachtrag: Kisten duerfen bis 40 cm aus dem Regal ragen (angezeigt),
  Fuellstand 0 bis 100 % (Gruen bis Rot), Grundriss frei verschiebbar.

## Wichtige Dokumente

- `docs/grundriss/STAND.md`: Stand und offene Punkte.
- `docs/grundriss/ENTSCHEIDUNGEN.md`: alle Entscheidungen E1 bis E36.
- `docs/grundriss/BAUPLAN.md`: Datenmodell, Regeln, Code-Karten (nur bei
  Bedarf abschnittsweise lesen, er ist lang).
- `supabase/migrations/`: SQL; angewandte Dateien nie aendern, Fehler
  bekommen eine neue Nummer (naechste: 0034).
- Regel-Spiegel: SQL-Geometrie und `src/lib/geometrie.ts` immer zusammen
  aendern (`scripts/geometrie-pruefen.mjs`).

## Offen (naechste Schritte)

1. Mit echtem Handy testen: Platz waehlen, Zoomen mit zwei Fingern, 3D mit
   echten Daten am Computer.
2. Fuellstand auch beim Anlegen einer Kiste und im CSV-Export.
3. Moebel mit ihrer Inhaltsliste nur im Zeichner verknuepfbar; evtl. auch
   auf der Moebelseite.
4. Kleinigkeiten: Regale in 3D ohne Rueckwand; einige Seiten haben noch
   mehrere orange Knoepfe; in sehr schmalen Raeumen ueberdecken sich Masse.
5. Supabase-Sicherheitshinweise (alt, nicht aus dem Umbau): "Leaked password
   protection" in Auth einschalten; einige security-definer-Funktionen.
6. Bilderkennung: einziger Versuch (24.09.) brach mit Zeitueberschreitung
   ab; nicht Teil des Umbaus.

## Arbeitsweise

- Pruefen vor jedem Commit: `npx tsc -b`, `npx oxlint`, `npm run build`,
  `node scripts/woerter-pruefen.mjs` (8 bekannte Meldungen bei `*.eins`),
  `node scripts/geometrie-pruefen.mjs`, `zeichner-pruefen.mjs`,
  `szene-pruefen.mjs`; kein U+2014.
- Datenbank: jede Migration erst als Probelauf (`do $probe$ ... raise
  exception` mit Bericht), dann anwenden. Vorlagen fuer Probelaeufe stehen
  im Bauplan (Abschnitt 2).
- Karam will nicht nach Erlaubnis gefragt werden; Entscheidungen selbst
  treffen und in `ENTSCHEIDUNGEN.md` notieren.
