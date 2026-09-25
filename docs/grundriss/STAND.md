# Grundriss-Umbau: Stand

Stand: 25.09.2026, nach Etappe 0.

## Fertig: Etappe 0 (Bauplan)

- `docs/grundriss/BAUPLAN.md` liegt vor. Er ersetzt das Lesen von
  `entwurf-teile.json`: spaetere Sitzungen lesen nur noch den Bauplan.
- Inhalt: Code-Karten mit Zeilenangaben, Datenmodell mit fertigem SQL fuer
  die Migrationen 0027 bis 0031 (jede mit Probelauf-Block), Geometrie,
  neue Funktionen in `api.ts`, Oberflaeche je Etappe, Reihenfolge und
  Pruefkriterien, offene Punkte.
- Das SQL wurde in einer Wegwerf-Datenbank auf dieser Maschine
  durchgespielt (leeres PostgreSQL 16, Migrationen 0001 bis 0031 der Reihe
  nach). Karams Supabase-Projekt wurde dabei nicht beruehrt.
- Noch nichts an Code oder Datenbank geaendert, nichts committet.

## Geplante Migrationen

| Nummer | Name | Etappe |
|---|---|---|
| 0027 | eigene_groessen | 1 |
| 0028 | grundriss_modell | 1 |
| 0029 | grundriss_umrechnung | 1 |
| 0030 | suche_mit_platz | 3 |
| 0031 | raster_entfernen | 4 |

Angewandt sind weiterhin nur 0001 bis 0026.

## Naechster Schritt: Etappe 1

Genaue Reihenfolge und "Fertig, wenn" stehen in BAUPLAN Abschnitt 6.
Kurz:

1. `src/lib/geometrie.ts` und `scripts/geometrie-pruefen.mjs`.
2. 0027: Probelauf, Bericht an Karam, anwenden.
3. 0028: Probelauf, Bericht an Karam, anwenden.
4. `types.ts`, `api.ts`, `errText`, Woerterbuecher (de und ar).
5. Eigene Groessen in der Oberflaeche, alter Raumplan nur noch lesend,
   `sw.js` auf `kistly-v3`. Commit, push.
6. 0029 (Umrechnung der alten Plaene): Probelauf auf echten Daten, Bericht
   an Karam, anwenden, Suche pruefen.
7. STAND.md und ENTSCHEIDUNGEN.md nachziehen, Commit, push.

## Offen fuer Karam

Die Punkte zum Entscheiden stehen in BAUPLAN Abschnitt 7. Sie kommen mit
Etappe 1 nach `docs/grundriss/ENTSCHEIDUNGEN.md`.
