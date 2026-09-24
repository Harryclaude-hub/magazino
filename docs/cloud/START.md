# Kistly: Start fuer eine neue Sitzung (Cloud oder lokal)

Stand: 24.09.2026.

## 0a. Fuer Karam: so startest du

1. Oeffne https://claude.ai/code und melde dich an (mit dem Konto, auf dem
   das Guthaben von 250 EUR liegt).
2. Neue Sitzung starten und das Repo **Harryclaude-hub/kistly** waehlen.
   Fragt es nach GitHub, einmal verbinden und dem Repo den Zugriff geben.
3. Als Modell **Opus 5.5** waehlen.
4. Den **ganzen Inhalt dieser Datei** als erste Nachricht einfuegen und
   abschicken. Mehr brauchst du nicht zu schreiben.
5. Danach kannst du den Laptop zuklappen. Schau ab und zu in der
   Claude-App am Handy nach: Claude wartet, wenn es eine Freigabe oder
   ein Foto von dir braucht.

## 0b. Fuer Claude: dein Auftrag

Du uebernimmst Kistly mitten in einem grossen Umbau. Karam hat
entschieden:

- **Modell Opus 5.5, feste Kostengrenze 150 US-Dollar** fuer den ganzen
  Grundriss-Umbau. Nach jeder Etappe sagst du Karam, wie viel verbraucht
  ist, soweit du es sehen kannst. Bevor die Grenze erreicht ist, hoerst du
  an einer sauberen Stelle auf und fragst, ob es weitergeht.
- Sparsam arbeiten: grosse Pruefrunden mit mehreren Agenten nur fuer
  Datenbank, Geld und Schluessel, sonst ein Pruefer.
- Lies zuerst `CLAUDE.md` im Hauptordner (Regeln, die immer gelten), dann
  diese Datei ganz. Den Bauplan gibt es noch nicht als fertige Datei: der
  Entwurfs-Durchlauf wurde vor dem letzten Schritt angehalten. Alles
  Material liegt in `docs/grundriss/entwurf-teile.json` (5 Code-Karten,
  3 vollstaendige Entwuerfe, 2 Bewertungen). **Dein erster Bauschritt:**
  daraus `docs/grundriss/BAUPLAN.md` schreiben (vom bevorzugten Entwurf
  ausgehen, die besten Ideen der anderen uebernehmen, jeden Widerspruch
  ausdruecklich entscheiden; Abschnitte: Ziel und Entscheidungen,
  Datenmodell mit SQL ab Migration 0027, Geometrie-Modul, api.ts,
  Desktop-Rahmen und Design-Schicht, Zeichner, 3D, Handy: Kiste
  platzieren, Kistenseite und Suche, Etappen mit Abnahmekriterien,
  Risiken). Nicht neu kartieren, das Material reicht.
- Die Reihenfolge danach steht in Abschnitt 7.

## 1. Was Kistly ist

Umzugsprogramm als Web-App (PWA), Deutsch und Arabisch (von rechts nach
links). Jedes Zimmer und jede Person hat ein Kuerzel, jede Kiste eine
Nummer mit QR-Code. Fotos je Schicht einer Kiste, Bilderkennung schlaegt
den Inhalt vor, Suche ueber alle Umzuege, Raumplan mit Hoehen und Regalen.

| Was | Wo |
|---|---|
| Live | https://harryclaude-hub.github.io/kistly/ |
| Repo | https://github.com/Harryclaude-hub/kistly, Zweig `main` |
| Datenbank | Supabase-Projekt `vqpirkgvclfsduklnnzv` (nur dieses!) |
| Edge Functions | `bild-analyse` (Version 5), `push-send` (Version 1) |
| Veroeffentlichen | `.github/workflows/pages.yml`, jeder Push auf `main` |

## 2. Stand heute

- Alles Fertige ist auf `main` und live, zuletzt `84da1cd`
  (Bilderkennung).
- Migrationen 0001 bis 0026 sind angewandt. Die Dateien unter
  `supabase/migrations` stimmen mit der Datenbank ueberein.
- Fertig: Umzuege, Zimmer, Personen, Kisten, Moebel, Etiketten mit QR,
  Scannen, Chat, Export, Schnellansicht, Raumplan im 50-cm-Raster mit
  Hoehen, Stapeln und Regalen (0022, 0025), Kistengroessen 1 bis 10 in
  Litern nach DIN 323 R40 (0021), Schichten und Rahmen im Foto mit
  Ausschnitten (0023), Suche ueber alle Umzuege (0024, 0026), neue
  Ladeanzeige beim Bilderlesen.

### Bilderkennung

- Modell Qwen3.5-9B bei OVHcloud AI Endpoints, Schluessel liegt als
  Function Secret `OVH_AI_ENDPOINTS_TOKEN` (Karam hat ihn gesetzt).
- Qwen3.5 denkt standardmaessig lange nach. Darum schickt die Funktion
  `reasoning_effort: "none"`, streamt, bricht nach 25 s Nachdenken oder
  45 s Stille ab und fragt dann das Ersatzmodell Qwen3.8-27B (wird in der
  Kostenbremse eigens gebucht). Die App schickt ein Foto je Aufruf.
- **Offen:** Mit echten Fotos und diesem Stand ist es noch nicht
  gelaufen. Karam hat zwei Getraenkefotos in der Kiste `K-6-001`. Erster
  Schritt der naechsten Sitzung: Karam liest sie neu, dann
  `photo_analyses` (Status, Modell, Fehler) und das Funktionsprotokoll
  (Zeilen `[bild-analyse] tempo`: ms_bis_liste, denken_zeichen, ende)
  lesen. Faellt Qwen3.5-9B durch, das Secret `BILD_MODELL` auf
  `Qwen3.8-27B` setzen lassen, ohne neu auszurollen.

## 3. Der grosse Auftrag: Grundriss auf den Zentimeter

Karams Wunsch vom 24.09.2026, ausfuehrlich in `docs/grundriss/BAUPLAN.md`:

- **Desktop:** Wohnung zeichnen wie in ArchiCAD, auf den Zentimeter:
  Waende mit Meter- und Zentimeter-Eingabe, Nischen, Ecken, Balkon, ganze
  Wohnung, in Zimmer teilen, Hoehe, **Tueren immer orange, Fenster immer
  blau**, Regale und Schraenke mit Faechern, Moebel wie L-Couch oder
  Fernseher mit Massen zeichnen und platzieren wie in Minecraft,
  3D-Ansicht. Kraeftiger Kontrast Wand gegen Boden, nicht zu hell, nicht
  zu dunkel, Waende duerfen verschiedene Farben haben. Der Desktop soll die
  ganze Breite nutzen.
- **Handy:** nichts zeichnen. Beim Anlegen oder Zuordnen einer Kiste
  oeffnet sich das Zimmer, Karam setzt die Kiste (links, rechts, oben,
  unten, in cm), dann Hoehe oder Fach.
- **Kistenseite:** Fotos, ganz unten der Lageplan (Tuer orange, Fenster
  blau, am Desktop auch 3D).
- **Suche:** Treffer zeigen Kiste, Schicht und Zimmer; ein Tipp fuehrt
  zum Foto und zur Kiste.
- Beide Fassungen sollen schoener werden.

Karams Entscheidungen:
1. Den alten Raster-Plan **ersetzen** und vorhandene Daten umrechnen.
2. **Mehrere Grundrisse** je Umzug (neue Wohnung, alte Wohnung, Keller,
   Lager).
3. Migrationen: Probelauf, dann wendet Claude sie an (wenn die
   Datenbank-Verbindung da ist, sonst Anleitung fuer den SQL-Editor).
4. **In Etappen** live: 1 Datenmodell in cm und Desktop-Rahmen,
   2 Zeichner, 3 Handy platzieren, Kistenseite und Suche, 4 3D und Design.
   Jede Etappe muss allein laufen und darf die Live-App nicht brechen.

## 4. Arbeitsweise in der Cloud

- **Zuerst pruefen, was da ist:** Gibt es die Supabase-Werkzeuge? Wenn
  ja, nur mit Projekt `vqpirkgvclfsduklnnzv` arbeiten. Wenn nein:
  Migrationen als Datei schreiben und Karam eine Anleitung fuer den
  SQL-Editor geben
  (https://supabase.com/dashboard/project/vqpirkgvclfsduklnnzv/sql/new).
  Edge Functions ausrollen geht dann nur ueber Karam.
- **Git:** Arbeit auf einem eigenen Zweig; zum Veroeffentlichen einer
  fertigen Etappe mit Karam klaeren, ob auf `main` gemischt wird (jeder
  Push auf `main` geht sofort live).
- **Sichtpruefung:** Seiten hinter der Anmeldung mit erfundenen Daten in
  einer Wegwerfseite pruefen und die Wegwerfseite vor dem Commit loeschen.
  Karam meldet sich selbst an, Claude tippt keine Passwoerter.
- **Kosten:** Karam arbeitet mit einem Guthaben von 250 EUR. Sparsam:
  grosse Pruefrunden mit mehreren Agenten nur fuer Datenbank, Geld und
  Schluessel; sonst ein Pruefer. Nach jeder Etappe kurz sagen, wie viel
  verbraucht ist, soweit sichtbar.

## 5. Bekannte Fallen

- Drucken: ohne `print-color-adjust: exact` kommen die Farben nicht aufs
  Papier.
- `jsonb @>` ist eine Mengenfrage: `gesperrt @> '[[2,3]]'` ist auch wahr,
  wenn irgendwo eine 2 und eine 3 stehen. Dafuer gibt es
  `zelle_gesperrt(gesperrt, x, y)`.
- Der Speicher erlaubt Anlegen und Loeschen, kein Ueberschreiben: ein
  neuer Ausschnitt bekommt einen neuen Pfad.
- Nachruecken im Stapel laeuft als Trigger, der sich selbst aufruft;
  Waechter ist `pg_trigger_depth()`.
- Probelauf einer Migration: `next_seq` braucht gesetzte JWT-Angaben
  (`set_config('request.jwt.claims', ...)`) und eine Mitgliedschaft im
  Test-Umzug; fuer Zeilen-Sicherheit `set local role authenticated`.
- `inherit_project_from_item`: `project_id` immer ueberschreiben, nie nur
  setzen, wenn es leer ist (0014).
- Arabisch und Latein in einer Zeile: eine Menge wie "2x" steht in einem
  eigenen LTR-Stueck, das Leerzeichen dahinter, nicht darin.
- Supabase beendet eine Edge Function nach 150 s hart (Free-Plan). Lange
  Arbeit je Aufruf klein halten.
- OVH: `chat_template_kwargs` wird abgelehnt; ohne Schluessel antwortet
  OVH nur mit 429.

## 6. Weitere offene Punkte

- `push-send` benutzt noch `service_role`. Die VAPID-Schluessel gehoeren
  als Function Secrets hinein (Karam prueft, ob sie schon dort liegen),
  danach kann die Funktion ohne auskommen.
- Nach dem Neueinstufen der Kistengroessen die Etiketten neu drucken
  (Seite Groessen sammelt die Liste).
- Unentschieden: Soll ein Admin die Umzuege aller Nutzer sehen? Soll ein
  umbenanntes Kuerzel alle Nummern sofort neu vergeben?

## 7. Erste Schritte der naechsten Sitzung

1. `CLAUDE.md` und diese Datei lesen.
2. Pruefen, welche Werkzeuge da sind (Supabase, GitHub), und Karam in
   zwei Saetzen sagen, was geht und was nicht.
3. Bilderkennung mit Karams Fotos auswerten (Abschnitt 2).
4. `docs/grundriss/BAUPLAN.md` aus `docs/grundriss/entwurf-teile.json`
   schreiben und Karam in wenigen Saetzen zusammenfassen.
5. Etappe 1 bauen, pruefen, Karam zeigen, veroeffentlichen. Dann Etappe 2,
   3 und 4, jeweils mit Kostenstand.
