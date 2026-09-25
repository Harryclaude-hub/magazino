# Kistly: Bauplan Grundriss-Umbau

Stand: 25.09.2026, Etappe 0. Geschrieben aus `docs/grundriss/entwurf-teile.json`
(5 Code-Karten, 3 Entwuerfe, 2 Bewertungen) und `docs/cloud/START.md`.
Ab jetzt ist dieses Dokument die einzige Bauvorlage. Das JSON wird nicht mehr
gelesen.

**Vorrang:** START.md Abschnitt 5 vor diesem Bauplan, dieser Bauplan vor den
Entwuerfen. Wo der Bauplan eine Luecke in Abschnitt 5 fuellt, steht die
Entscheidung mit Begruendung in Abschnitt 7 (fuer `ENTSCHEIDUNGEN.md`).

**Woher was stammt:** Geruest und Etappen-Denken aus dem Entwurf "handy"
(verlustfreie, selbstpruefende Umrechnung, kurze Handy-Strecke, Kiste gegen
Kiste nur Warnung). Raummodell (Polygon mit Kanteneigenschaften, Oeffnungen an
Kante und Abstand) und Zeichner-Bedienung aus "bedienung". Rechtemodell (nur
`security invoker`, RLS, kein Umgehungsschalter fuer Clients), Probelauf-Muster,
Rest-Bericht und "nur SQL rechnet Hoehen" aus "daten". Alle Fehlerfunde der
beiden Bewertungen sind eingearbeitet (Liste in 7.3).

**Schon erledigt vor Etappe 1:** Commit `5f129b1` "Computer-Rahmen": linke
Seitenleiste ab 1024 px (`src/components/Seitenleiste.tsx`), Suchkopf mit Taste
`/` (`SuchKopf` ebd. Z. 159), `src/lib/desktop.ts` mit `useIstDesktop()`,
`AppLayout.tsx` Z. 129 bis 167 (untere Leiste in `lg:hidden`), breitere `Page`.
Etappe 1 baut darauf auf und macht das nicht noch einmal.

Inhalt:

1. Code-Karten kompakt (heutiger Code, Einhaengepunkte)
2. Datenmodell und Migrationen 0027 bis 0031 mit SQL und Probelauf
3. Geometrie: Spezifikation `src/lib/geometrie.ts`
4. `api.ts`: Typen und Funktionen
5. Oberflaeche je Etappe
6. Reihenfolge und Pruefkriterien je Etappe
7. Entscheidungen und offene Punkte

---

## 1. Code-Karten kompakt

Pfade relativ zu `/home/user/kistly`. Zeilen Stand `5f129b1`.

### 1.1 Routen und Rahmen

- `src/App.tsx`: Routen Z. 69 bis 121. `/s/:itemId` -> `ScanResolve` (hinter
  `Gate`, ohne Rahmen). `/app` -> `AppLayout` mit `index` Dashboard,
  `einstellungen`, `scan` (ScanHub), `suche` (Suche). `/app/p/:pid` ->
  `ProjectLayout` mit Kindern `bereiche`, `zimmer/:tagId`,
  **`zimmer/:tagId/plan` -> RaumPlan (Z. 104, Import Z. 21)**, `person/:tagId`,
  `moebel`, `moebel/:id`, `kisten`, `kisten/:iid`, `etiketten`, `export`,
  `groessen`, `scan`, `chat`, `team`, `einstellungen`. Neue Routen kommen hier
  dazu (Abschnitt 5).
- `src/pages/AppLayout.tsx`: Kontext `useAppShell()` (lastProject, unread),
  Seitenleiste Z. 129, `SuchKopf` Z. 162, untere Leiste Z. 167 in
  `lg:hidden`. Eintraege der Seitenleiste als Liste `eintraege` (Z. 130 bis
  160): hier kommt "Grundriss" dazu. Realtime-Kanal auf `messages` greift direkt
  auf `supabase` zu (bekannte Ausnahme, nicht ausweiten).
- `src/components/AppShell.tsx`: `AppHeader` (title, subtitle, back, actions),
  `Page` (`wide`, `className`), `NavTab`, `BottomNav` Z. 153 (misst sich und
  schreibt `--nav-h`, am Desktop 0, weil `lg:hidden`).
- `src/components/Seitenleiste.tsx`: `Seitenleiste` (Z. 41, einklappbar,
  `localStorage 'kistly.leiste'` mit try/catch, Umzugswechsler), `LeistenSymbole`,
  `SuchKopf` (Z. 159).
- `src/lib/desktop.ts`: `DESKTOP_AB = 1024`, `useIstDesktop()`. Fuer den
  Zeichner kommt `useZeichnen()` dazu (1024 px UND `(any-pointer: fine)`).
- `src/pages/ProjectLayout.tsx`: `useProject()` liefert project, tags, rooms,
  people, tagById, members, role, canEdit, isOwner, reloadTags. Laden und
  Fehler ohne Kopf (bekannter Mangel, Etappe 4).
- `src/components/ui.tsx`: Card, Button, Field, Input, Select, Chip, Modal
  (Handy Bodenblatt, setzt selbst NICHTS zurueck), ConfirmDialog (onConfirm
  muss Fehler fangen), ErrorBox, Empty, Loading, CodeChip, StatusPill, QrPanel.
  Drei Zustaende: `Loading`, `ErrorBox` mit Nochmal, `Empty`.
- `src/index.css`: alle Farben als Variablen (`--paper --surface --raised --ink
  --muted --line --accent --danger --warn --ok`, hell `:root` Z. 39, dunkel
  `.dark` Z. 56). Klassen `t-name t-sub t-serial` (Mono, ltr, isolate),
  `.spiegeln`, `.zebra`. Plan-Tokens kommen in Etappe 2 dazu.
- `src/design/`: Buehne.tsx, Kisten.tsx, buehne.css, motion.tsx, LeseBuehne.tsx,
  lesen.css, README.md. `Settings.tsx` importiert `design/motion` (Z. 20):
  Loeschen des Ordners bricht den Build, bis Etappe 4 das loest.
- `public/sw.js` Z. 6: `VERSION = 'kistly-v2'`. Bei jeder Umstellung mit
  Migration (0029, 0030) um eins erhoehen, damit alte Stande aus dem Cache
  fliegen.

### 1.2 Kisten anlegen, Kistenseite, Moebel

- `src/pages/Items.tsx` (824 Z.): Kistenliste und einziger Anlege-Dialog.
  `ARTEN` Z. 46, **`SizePicker` Z. 51 bis 107** (exportiert, importiert von
  ItemDetail Z. 47, Furniture, FurnitureDetail). Draft Z. 224, **stilles
  `rooms[0]` Z. 227**, `?room=none` landet als `'none'` im Draft, Dialog setzt
  sich beim Oeffnen NICHT zurueck (Hausregel verletzt; Muster richtig in
  `Furniture.tsx` Z. 111 bis 118). `onCreate` Z. 242 bis 308 (Schleife bis 50x
  `createItem`, Teilerfolg, danach bleibt man auf der Liste). Modal Z. 657 bis
  821 (Nummernvorschau Z. 676, Zimmer Z. 691, Person Z. 709, SizePicker Z. 747).
  Realtime nur UPDATE Z. 203.
- `src/pages/ItemDetail.tsx` (1374 Z.): Kopfkarte Z. 454 bis 573 mit Knopf
  **"Im Raumplan zeigen" Z. 489 bis 498**. Inhalt ab Z. 576, `?inhalt=` rueckt
  die Zeile in den Blick (Z. 215 bis 224, Ring Z. 600). Fotos ab Z. 763,
  Verlauf Z. 1046, **Abstandshalter Z. 1098: hier kommt der Abschnitt "Wo steht
  die Kiste" davor**. Bearbeiten-Dialog Z. 1102 bis 1258 (jedes Feld speichert
  sofort ueber `patch`), SizePicker Z. 1170, eigene Hoehe Z. 1178 bis 1222.
  `zahlLesen` kommt aus `lib/raumplan.ts` (Z. 67).
- `src/pages/Furniture.tsx`: Moebel anlegen (gleiche Tabelle `items`, kind
  `furniture`), Standardgroesse 8, Zimmer Pflicht.
- `src/pages/FurnitureDetail.tsx` (992 Z.): Teile Z. 417, Seitenfotos Z. 538,
  AngabenDialog Z. 822 (mit Speichern-Knopf). Wertet `?inhalt=` NICHT aus.
- `src/pages/AreaDetail.tsx`: Knopf Raumplan Z. 190 bis 200 (`/zimmer/:id/plan`),
  "Kiste anlegen" -> `/kisten?neu=1&room=`.
- `src/components/ItemRow.tsx`: `zielFuerItem()` (Moebel -> `/moebel/:id`).
- `src/pages/Labels.tsx`: Groesse auf dem Etikett Z. 399 bis 404
  (`etiketten.groesse_liter`), Groessenziffer Z. 237. Hier zeigt Etappe 1 bei
  eigener Groesse deren Namen.

### 1.3 Scannen und Schnellansicht

- `src/pages/ScanHub.tsx` (alle Umzuege): `run()` Z. 170 bis 235, Refs gegen
  Kamera-Neustart Z. 126 bis 137 (neue Zustaende nur ueber Refs lesen!), Knopf
  "Zum Zimmer" Z. 492 bis 494 fuehrt heute auf die gefilterte Liste.
- `src/pages/ScanPage.tsx` (im Umzug): `handleItem` Z. 54 bis 95, Auto-Status nur
  mit canEdit.
- `src/components/Schnellansicht.tsx`: Vollbild nach dem Scan, laedt selbst ueber
  `ladeSchnellansicht` (kein `useProject`!). Zimmer-Chips Z. 347 bis 373,
  Angekommen-Knopf ab Z. 375: **dazwischen kommt "Im Zimmer platzieren"**.
- `src/lib/scan.ts`: greift direkt auf Supabase zu (bekannte Ausnahme).
- Falle: Auto-Status beim Scannen steht auf `arrived`. Der Platz-Ablauf aendert
  den Status nie.

### 1.4 Suche

- `src/pages/Suche.tsx` (493 Z.), Route `/app/suche` ausserhalb ProjectLayout.
  `ortText` Z. 174 bis 184 (**`z.plan_x === null` -> ohne Platz**), `hoeheText`
  Z. 186, `zurKiste` Z. 194, `zumPlan` Z. 199 (`/zimmer/:room/plan?kiste=`),
  Modal mit Fundblatt Z. 331 bis 369, **`<Fundort>` Z. 466**. Suchzustaende
  Z. 254 bis 266 (zu kurz, Fehler, laedt, nichts, Treffer) bleiben getrennt.
  Ref `geschrieben` (Z. 94 bis 107) verhindert Buchstabenverlust, nicht ersetzen.
- `src/components/raumplan/Fundort.tsx`: kleiner Nur-Lese-Plan (laedt
  `ladeRaumplan`, `ladeZimmerKisten`, `ladeRegale`). Faellt in Etappe 2 weg,
  ersetzt durch `components/plan/Lageplan.tsx`.
- `src/components/PunktBild.tsx` (Foto mit rotem Rahmen, Reset an offen und
  eintragId), `Ausschnitt.tsx`, `lib/rahmen.ts`: bleiben.
- `src/lib/types.ts` `SuchTreffer` Z. 222 bis 256 spiegelt die 32 Spalten von
  `inhalt_suchen` (0026) 1:1.

### 1.5 Groessen

- `src/lib/groessen.ts`: `useKistenGroessenStand()` (laedt/da/fehler),
  `useKistenGroessen()`, `hatLiter(kind)`, `literText`, `stufeFuerLiter` (nur
  Anzeige im Rechner), `groesseSatz`. Tabelle `kisten_groessen` (0021, Stufe
  1 bis 10, `bis_liter` exklusiv, Aussenmasse L x B x H).
- `src/pages/Groessen.tsx` (326 Z.): Rechner, Tabelle der zehn Groessen (Z. 172),
  Liste zum Neueinstufen (`updateItem(k.id, {size})` Z. 106), feste Leiste mit
  `bottom: var(--nav-h)`. **Hier kommt "Meine Groessen" dazu.**
- `SizePicker` (siehe 1.2).

### 1.6 Alter Raumplan (wird ersetzt)

- `src/pages/RaumPlan.tsx` (1127 Z.), Route `zimmer/:tagId/plan`. Faellt in
  Etappe 2 weg.
- `src/components/raumplan/`: Plan2D.tsx, Plan3D.tsx, PlanSeite.tsx,
  PlanFormular.tsx, RegalDialog.tsx, BrettWahl.tsx, Fundort.tsx, doppeltipp.ts.
  Fallen in Etappe 2 weg.
- `src/lib/raumplan.ts`: baueRaster, stapelAn, passtDrauf, kisteHoehe,
  findeKiste, randSeite, **`zahlLesen` Z. 241 (von Groessen.tsx und ItemDetail
  benutzt)**, `brettListeLesen` Z. 256. `zahlLesen` und `brettListeLesen` ziehen
  in Etappe 1 nach `lib/geometrie.ts`; der Rest faellt in Etappe 2 weg.
- `src/lib/api.ts` Raumplan-Block Z. 525 bis 716: `ladeKistenGroessen` (bleibt),
  `inhaltSuchen` Z. 544 (bleibt, Spalten aendern sich in Etappe 3),
  `ladeRaumplan` Z. 565, `speichereRaumplan` Z. 591, `loescheRaumplan` Z. 612,
  `ladeZimmerKisten` Z. 623, `setzePlatz` Z. 643, `raeumePlatz` Z. 661,
  `ladeRegale` Z. 674, `legeRegalAn` Z. 691, `aendereRegal` Z. 705,
  `loescheRegal` Z. 712. Alle ausser den beiden ersten fallen in Etappe 2 weg.
- `src/lib/supabase.ts` `errText` Z. 40: `hint 'kistly:xyz.abc'` ->
  Woerterbuch `fehler.db.xyz.abc` (Z. 58 bis 62), `items_plan_platz2` ->
  `fehler.db.raumplan.platz_belegt` (Z. 63). Platzhalter aus `details` werden
  heute NICHT gelesen; Etappe 1 aendert das.
- Datenbank alt: `room_plans` (0017, ein Plan je Zimmer-Tag, Raster, `gesperrt`
  jsonb, Tuer an Zelle und Seite), `regale` (0022, Zellen, `boeden_cm int[]`),
  `items.plan_x/plan_y/plan_z`, `regal_id`, `regal_boden`, `eigene_hoehe_cm`
  (5 bis 300), Index `items_plan_platz2`. Trigger auf `items` (BEFORE,
  alphabetisch): `items_a_sperre` (0025), `items_bi`/`items_bu` (0002, Nummer),
  `items_deckbild` (0012), `items_plan` (Funktion `items_plan_pruefen`, 0022).
  AFTER: `items_ai`/`items_au`, `items_stapel_nachruecken` (0022, Waechter
  `pg_trigger_depth() > 1`). Sperren `raum_sperre(uuid, bool)` und
  `zelle_sperre` (0025, Schluessel `'raum:' || id`).

### 1.7 Woerterbuecher

- `src/lib/i18n/woerter.ts` legt die Bausteine zusammen (doppelte Schluessel
  werden gemeldet). Neue Bausteine dort eintragen.
- `src/lib/i18n/bausteine/`: u. a. `raumplan.ts` (raumplan.*, 261 Z., faellt in
  Etappe 4 weg), `fehler.ts` (`fehler.db.raumplan.*` Z. 89 bis 177), `suche.ts`,
  `kisten.ts`, `groessen.ts`, `moebel.ts`, `scannen.ts`, `schnell.ts`,
  `gemeinsam.ts` (nav.*, leiste.*).
- Form: `'schluessel': { de: '...', ar: '...' }`, Platzhalter `{name}` in beiden
  gleich. `scripts/woerter-pruefen.mjs` prueft Platzhalter, U+2014 und benutzte
  Schluessel (bekannt: 9 Meldungen bei `*.eins`).

### 1.8 Datenbank-Grundlagen, die der Umbau benutzt

- `public.is_member(uuid)`, `is_editor(uuid)` (0001, security definer, in
  Policies). `assert_tag(p_tag uuid, p_project uuid, p_kind tag_kind)` (0002;
  Reihenfolge Tag, Projekt, Art!). `next_seq` (0006, prueft `is_editor`).
- Nummer: `items_before_insert/update` (0002) bauen `PREFIX-GROESSE-LAUF` aus
  `size`; neue Groesse = neuer Code, alter Code nach `item_code_history`.
  **Darum muss die Stufe einer eigenen Groesse gesetzt sein, bevor `items_bi`
  bzw. `items_bu` laufen** (Trigger `items_ab_groesse`, alphabetisch davor).
- `inherit_project_from_item` (0014): `project_id` IMMER aus dem Elternteil
  ueberschreiben. Gleiches Muster fuer alle neuen Tabellen.
- 0006 hat allen Funktionen EXECUTE entzogen; jede neue Funktion bekommt
  `revoke ... from public, anon; grant ... to authenticated;` (Trigger laufen
  als Aufrufer und brauchen EXECUTE fuer alles, was sie aufrufen).
- 0008: Waechter duerfen Kaskaden beim Loeschen eines Umzugs nicht blockieren;
  Erkennungszeichen: die Zeile in `projects` ist schon weg.
- `inhalt_suchen(p_q text, p_max int)` (0026): security invoker, 32 Spalten,
  `strpos` statt LIKE, Punktestufen 1,0/0,95/0,9/0,8/<=0,79.
- RLS-Muster: `<t>_select using is_member(project_id)`, schreiben
  `is_editor(project_id)`; `revoke all ... from anon`.

---

## 2. Datenmodell und Migrationen

### 2.1 Ueberblick

| Nr. | Datei | Zweck | Etappe |
|---|---|---|---|
| 0027 | `0027_eigene_groessen.sql` | Tabelle `eigene_groessen`, `items.eigene_groesse_id`, Stufe aus dem Volumen, `kiste_masse`, Loeschschutz | 1 |
| 0028 | `0028_grundriss_modell.sql` | Geometrie in SQL, Tabellen `grundrisse`, `raeume`, `oeffnungen`, `objekte`, Platz-Spalten an `items`, alle Regeln aus START 5.2, Nachruecken, Sperren, RLS, RPCs | 1 |
| 0029 | `0029_grundriss_umrechnung.sql` | Alte Raumplaene, Regale und Plaetze umrechnen, Bericht `grundriss_umrechnung`, altes Raster einfrieren, `inhalt_suchen` uebergangsweise auf das neue Modell | 1 |
| 0030 | `0030_suche_mit_platz.sql` | `inhalt_suchen` neu (Grundriss, Raum, Unterlage, Fach, Hoehe, auch Dinge in Moebeln) | 3 |
| 0031 | `0031_grundriss_zusammenlegen.sql` | `grundriss_speichern` mit `umhaengen` (Rueckgaengig nach dem Teilen), Raeume erst am Ende loeschen | 2 |
| 0032 | `0032_raster_entfernen.sql` | Alte Tabellen, Spalten, Funktionen und Trigger des Rasters entfernen | 4 |

Etappe 2 braucht keine Migration: `grundriss_speichern` (0028) traegt den
Zeichner. Zeigt sich beim Bauen ein Fehler in 0027 bis 0029, bekommt er eine
neue Nummer (0030 usw. rutschen dann weiter). Angewandte Dateien nie aendern.

**Regeln fuer alle Migrationsdateien (damit der Probelauf sie unveraendert
einsetzen kann):**

- Funktionskoerper nur mit `$fn$`, nie mit `$$`; keine eigenen `do`-Bloecke,
  kein `begin;`/`commit;`, kein `create index concurrently`.
- Keine nackten `select`-Anweisungen. Einzige Ausnahme ist der Aufruf in 0029,
  im Probelauf steht dort `perform`.
- Jede Funktion: `set search_path = public` (Suche: `public, extensions`),
  danach `revoke execute ... from public, anon; grant execute ... to
  authenticated;`. Kein `security definer`.
- Jede Ablehnung: `errcode = 'check_violation'`, `hint = 'kistly:grundriss.<kennung>'`
  (eigene Groessen: `'kistly:groesse.<kennung>'`), `detail` = JSON mit den
  Platzhaltern fuer das Woerterbuch (`{"code":"W-3-007","n":2}`).
- Kein U+2014, auch nicht in Kommentaren.

**Anwenden:** Mit Datenbank-Werkzeug `apply_migration` (eine Transaktion).
Ohne Werkzeug fuegt Karam die Datei im SQL-Editor zwischen `begin;` und
`commit;` ein (Anleitung START 1.3 Punkt 1). Vorher immer der Probelauf.

**Probelauf (Karams stehende Regel, Fallen aus START 7):**

```sql
-- Probelauf NNNN. Endet IMMER mit ERROR "PROBELAUF ...". Nichts bleibt stehen.
do $probe$
declare
  v_bericht text := '';
  -- weitere v_... Variablen
begin
  -- A. Der Text der Migrationsdatei, unveraendert (0029: select -> perform)
  -- B. Testdaten als Besitzer anlegen (RLS greift fuer postgres nicht)
  -- C. Als Karam weiter:  perform set_config('request.jwt.claims',
  --      json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  --    execute 'set local role authenticated';
  --    (next_seq braucht die Claims UND eine Mitgliedschaft)
  -- D. Erwartete Ablehnungen in begin ... exception when others then
  --      get stacked diagnostics v_hint = pg_exception_hint; ... end;
  -- E. execute 'reset role';  Umzug loeschen (prueft die Kaskaden)
  raise exception 'PROBELAUF NNNN%', v_bericht;
end $probe$;
```

Der Bericht steht in der Fehlermeldung. Karam liest ihn (oder Claude zeigt
ihn), erst dann wird angewandt. Zeilen `FEHLER:` im Bericht heissen: nicht
anwenden.

### 2.2 Begriffe und Einheiten (gilt fuer SQL und TS)

- Ganze Zentimeter (`int`), Koordinaten je Grundriss 0 bis 50000, Ursprung
  links oben, x nach rechts, y nach unten (Draufsicht), z nach oben ab Boden.
- **Raum:** `punkte int[]` flach `[x0,y0,x1,y1,...]`, 3 bis 200 Punkte, im
  Uhrzeigersinn am Bildschirm (doppelte Schnuersenkelflaeche > 0 bei y nach
  unten), einfach (keine Kante beruehrt eine nicht benachbarte), keine doppelten
  Nachbarpunkte, keine zuruecklaufende Kante. Schraege Kanten sind erlaubt.
- **Kante k** (0-basiert) laeuft von Punkt k zu Punkt `(k+1) % n`. Wand = Kante.
  Wanddicke 12 cm nur zur Darstellung, mittig auf der Kante; gemeinsame Kanten
  zweier Raeume sind dieselbe Linie und damit eine Wand.
- **Oeffnung:** Raum, Kante, `abstand_cm` vom Kantenanfang, Breite, Hoehe,
  Bruestung (Tuer 0). Geprueft: Kante existiert, `(abstand+breite)^2 <=
  Kantenlaenge^2` (ganzzahlig, keine Wurzel), Bruestung+Hoehe <= Raumhoehe,
  keine Ueberlappung auf derselben Kante.
- **Objekt:** Art `moebel|regal|schrank`, `x,y` = die Ecke, die ungedreht links
  oben liegt (lokaler Ursprung), `breite_cm` entlang lokal x, `tiefe_cm` entlang
  lokal y, Drehung 0/90/180/270 im Uhrzeigersinn **um diese Ecke**. Dadurch
  bleibt jede Ecke ganzzahlig. Lokal nach global:
  0: `(x+lx, y+ly)`, 90: `(x-ly, y+lx)`, 180: `(x-lx, y-ly)`, 270: `(x+ly, y-lx)`.
  L-Form (nur Moebel): Rechteck mit rechteckigem Ausschnitt `ausschnitt_breite_cm`
  x `ausschnitt_tiefe_cm` an der lokalen Ecke `lo|ro|ru|lu` (links oben, rechts
  oben, rechts unten, links unten in der ungedrehten Draufsicht).
- **Faecher** (Regal, Schrank): `brett_cm int[]` = Oberkanten der Fachboeden
  ueber dem Objektboden, aufsteigend, 1 bis 30 Werte, erster >= 0, Abstand
  zweier Werte >= 3, letzter <= `hoehe_cm - 3`. Brettdicke 2 cm. **Ebene e**
  (1 = unten) steht auf `brett_cm[e]` und reicht bis `brett_cm[e+1] - 2` bzw.
  bei der obersten bis `hoehe_cm - 2`. **Spalten** `spalten` (1 bis 20) teilen
  die Breite gleich, Teiler 2 cm: Spalte s reicht lokal von
  `(s-1)*(B+2)/S` bis `s*(B+2)/S - 2`. Ein Fach ist (Ebene, Spalte). Oben auf
  dem Objekt (Unterlage `objekt`) steht man auf `hoehe_cm` bis zur Raumdecke.
- **Platz einer Kiste** (Spalten an `items`): `platz_raum_id`, Mittelpunkt
  `platz_x`, `platz_y`, `platz_drehung` 0/90 (0: Laenge entlang x), genau eine
  Unterlage `unterlage_art`: `boden`, `kiste` (`unterlage_item_id`), `objekt`
  (`unterlage_objekt_id`, oben drauf) oder `fach` (`unterlage_objekt_id`,
  `fach_ebene`, `fach_spalte`). Der Grundriss ergibt sich aus dem Raum (nicht
  gespeichert, siehe 7.1 E2).
- **Masse einer Kiste** (`kiste_masse`): eigene Groesse vor `eigene_hoehe_cm`
  (nur Hoehe) vor `kisten_groessen` vor Rueckfall 60 x 40 x 40.
- **Hoehe** nie gespeichert (`kiste_basis`): Boden 0; auf Kiste = deren
  Oberkante; auf Objekt = Objekthoehe; im Fach = `brett_cm[ebene]`.
  **Grenze** kommt von der untersten Unterlage der Kette: Boden oder Objekt ->
  Raumhoehe; Fach -> Fachdecke. Oberkante jeder Kiste <= Grenze.
- **"Liegt darauf"** (5.2 "ueberwiegend darauf" = Mittelpunkt ueber der
  Unterlage): auf Kiste u: `|2*(x-ux)| <= Ausdehnung_x(u)` und
  `|2*(y-uy)| <= Ausdehnung_y(u)` (Rand zaehlt); auf Objekt: Mittelpunkt in der
  Objektflaeche (Rand zaehlt, echter Ausschnitt nicht); im Fach: Mittelpunkt in
  der Spalte und innerhalb der Tiefe.
- **Punkt im Polygon:** Rand zaehlt als drinnen, Strahl nach +x, halboffene
  Regel, alles `bigint`. Genau dieselbe Regel in `geometrie.ts`.

### 2.3 Migration 0027_eigene_groessen.sql (Etappe 1)

```sql
-- =====================================================================
-- Kistly 0027_eigene_groessen
--
-- Karam kann je Umzug eigene Groessen speichern (Name, Laenge, Breite,
-- Hoehe in cm, bei Moebeln optional L-Form) und sie beim Anlegen mit
-- einem Tipp waehlen (START 5.1a).
--
-- 1. Die Stufe 1 bis 10 in der Nummer setzt bei einer eigenen Groesse die
--    Datenbank selbst: Laenge mal Breite mal Hoehe durch 1000 sind Liter,
--    eingeordnet nach kisten_groessen.bis_liter (0021). Das geschieht im
--    Trigger items_ab_groesse, der alphabetisch vor items_bi/items_bu
--    laeuft, damit die Nummer schon mit der richtigen Stufe entsteht.
-- 2. kiste_masse ist ab jetzt die einzige Regel fuer Laenge, Breite und
--    Hoehe einer Kiste: eigene Groesse, sonst eigene Hoehe (nur Hoehe),
--    sonst kisten_groessen, sonst 60 x 40 x 40.
-- 3. Eine benutzte Groesse laesst sich nicht loeschen; die Ablehnung nennt
--    die Zahl der Kisten und Moebel. Aendern der Masse stuft alle Kisten
--    mit dieser Groesse neu ein (neue Nummer, der alte Code bleibt
--    scannbar). Die Pruefung der Plaetze kommt mit 0028 dazu.
-- =====================================================================

create table public.eigene_groessen (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects(id) on delete cascade,
  name                 text not null check (length(btrim(name)) between 1 and 60),
  art                  text not null default 'kiste' check (art in ('kiste', 'moebel')),
  laenge_cm            int  not null check (laenge_cm between 1 and 1000),
  breite_cm            int  not null check (breite_cm between 1 and 1000),
  hoehe_cm             int  not null check (hoehe_cm  between 1 and 1000),
  -- nur Moebel: L-Form als Rechteck mit rechteckigem Ausschnitt
  ausschnitt_breite_cm int,
  ausschnitt_tiefe_cm  int,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint eigene_groessen_l_check check (
    num_nonnulls(ausschnitt_breite_cm, ausschnitt_tiefe_cm) in (0, 2)
    and (ausschnitt_breite_cm is null or (
          art = 'moebel'
      and ausschnitt_breite_cm between 1 and laenge_cm - 1
      and ausschnitt_tiefe_cm  between 1 and breite_cm - 1)))
);

create unique index eigene_groessen_name_key
  on public.eigene_groessen (project_id, lower(btrim(name)));
create index eigene_groessen_project_idx
  on public.eigene_groessen (project_id, art, name);

alter table public.items
  add column eigene_groesse_id uuid references public.eigene_groessen(id) on delete set null;
create index items_eigene_groesse_idx on public.items (eigene_groesse_id)
  where eigene_groesse_id is not null;

-- ------------------------------------------------ Stufe aus dem Volumen
create function public.groesse_stufe(p_laenge int, p_breite int, p_hoehe int)
returns smallint language sql stable set search_path = public as $fn$
  select coalesce(
    (select min(g.stufe) from public.kisten_groessen g
      where g.bis_liter is not null
        and (p_laenge::numeric * p_breite * p_hoehe / 1000) < g.bis_liter),
    10)::smallint
$fn$;

-- ------------------------------------------- Masse einer Kiste, eine Regel
create function public.kiste_masse(p_size smallint, p_eigene_hoehe smallint, p_groesse uuid,
  out laenge_cm int, out breite_cm int, out hoehe_cm int)
language sql stable set search_path = public as $fn$
  select coalesce(e.laenge_cm, g.laenge_cm::int, 60),
         coalesce(e.breite_cm, g.breite_cm::int, 40),
         coalesce(e.hoehe_cm, p_eigene_hoehe::int, g.hoehe_cm::int, 40)
    from (select 1) d
    left join public.eigene_groessen e on e.id = p_groesse
    left join public.kisten_groessen g on g.stufe = p_size
$fn$;

-- --------------------------------------------- Trigger an eigene_groessen
create function public.eigene_groessen_vorher()
returns trigger language plpgsql set search_path = public as $fn$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.project_id := old.project_id;   -- eine Groesse wandert nie in einen anderen Umzug
  end if;
  new.name := btrim(new.name);
  return new;
end $fn$;

create trigger eigene_groessen_vorher
  before insert or update on public.eigene_groessen
  for each row execute function public.eigene_groessen_vorher();

create function public.eigene_groessen_weg()
returns trigger language plpgsql set search_path = public as $fn$
declare
  v_kisten int;
  v_moebel int;
begin
  -- Wird der ganze Umzug geloescht, ist die Projektzeile schon weg (0008).
  if not exists (select 1 from public.projects where id = old.project_id) then
    return old;
  end if;
  select count(*) filter (where kind <> 'furniture'),
         count(*) filter (where kind = 'furniture')
    into v_kisten, v_moebel
    from public.items where eigene_groesse_id = old.id;
  if v_kisten + v_moebel > 0 then
    raise exception 'Diese Groesse wird noch benutzt (% Kisten, % Moebel)', v_kisten, v_moebel
      using errcode = 'check_violation', hint = 'kistly:groesse.benutzt',
            detail = json_build_object('kisten', v_kisten, 'moebel', v_moebel)::text;
  end if;
  return old;
end $fn$;

create trigger eigene_groessen_weg
  before delete on public.eigene_groessen
  for each row execute function public.eigene_groessen_weg();

-- Masse geaendert: alle Kisten mit dieser Groesse neu einstufen. Die
-- Nummer aendert sich dann ueber items_bu, der alte Code bleibt scannbar.
-- 0028 ersetzt den Koerper und prueft zusaetzlich die Plaetze.
create function public.eigene_groessen_nachher()
returns trigger language plpgsql set search_path = public as $fn$
declare
  v_stufe smallint;
begin
  if (new.laenge_cm, new.breite_cm, new.hoehe_cm)
     is not distinct from (old.laenge_cm, old.breite_cm, old.hoehe_cm) then
    return null;
  end if;
  v_stufe := public.groesse_stufe(new.laenge_cm, new.breite_cm, new.hoehe_cm);
  update public.items set size = v_stufe
   where eigene_groesse_id = new.id and size <> v_stufe;
  return null;
end $fn$;

create trigger eigene_groessen_nachher
  after update on public.eigene_groessen
  for each row execute function public.eigene_groessen_nachher();

-- --------------------------------------------------- Trigger an items
-- Laeuft vor items_bi/items_bu ('items_ab' < 'items_bi'), damit die Nummer
-- mit der Stufe der eigenen Groesse entsteht. Die Oberflaeche rechnet die
-- Stufe nie selbst.
create function public.items_ab_groesse()
returns trigger language plpgsql set search_path = public as $fn$
declare
  e public.eigene_groessen;
  v_projekt uuid;
begin
  if new.eigene_groesse_id is null then
    return new;
  end if;
  v_projekt := case when tg_op = 'UPDATE' then old.project_id else new.project_id end;
  select * into e from public.eigene_groessen where id = new.eigene_groesse_id;
  if e.id is null or e.project_id <> v_projekt then
    raise exception 'Diese Groesse gehoert zu einem anderen Umzug'
      using errcode = 'check_violation', hint = 'kistly:groesse.anderer_umzug';
  end if;
  new.size := public.groesse_stufe(e.laenge_cm, e.breite_cm, e.hoehe_cm);
  return new;
end $fn$;

create trigger items_ab_groesse
  before insert or update on public.items
  for each row execute function public.items_ab_groesse();

-- ------------------------------ Vorschau vor dem Aendern (Oberflaeche fragt)
create function public.eigene_groesse_folgen(p_id uuid, p_laenge int, p_breite int, p_hoehe int)
returns jsonb language sql stable set search_path = public as $fn$
  select jsonb_build_object(
    'kisten', count(*) filter (where i.kind <> 'furniture'),
    'moebel', count(*) filter (where i.kind = 'furniture'),
    'stufe_neu', public.groesse_stufe(p_laenge, p_breite, p_hoehe),
    'neue_nummer', count(*) filter (where i.size <> public.groesse_stufe(p_laenge, p_breite, p_hoehe)))
    from public.items i
   where i.eigene_groesse_id = p_id
$fn$;

-- ------------------------------------------------------------------ RLS
alter table public.eigene_groessen enable row level security;

create policy eigene_groessen_select on public.eigene_groessen for select to authenticated
  using (public.is_member(project_id));
create policy eigene_groessen_insert on public.eigene_groessen for insert to authenticated
  with check (public.is_editor(project_id));
create policy eigene_groessen_update on public.eigene_groessen for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy eigene_groessen_delete on public.eigene_groessen for delete to authenticated
  using (public.is_editor(project_id));
revoke all on public.eigene_groessen from anon;

-- ---------------------------------------------------------------- Rechte
revoke execute on function public.groesse_stufe(int, int, int) from public, anon;
grant  execute on function public.groesse_stufe(int, int, int) to authenticated;
revoke execute on function public.kiste_masse(smallint, smallint, uuid) from public, anon;
grant  execute on function public.kiste_masse(smallint, smallint, uuid) to authenticated;
revoke execute on function public.eigene_groesse_folgen(uuid, int, int, int) from public, anon;
grant  execute on function public.eigene_groesse_folgen(uuid, int, int, int) to authenticated;
revoke execute on function public.eigene_groessen_vorher() from public, anon;
revoke execute on function public.eigene_groessen_weg() from public, anon;
revoke execute on function public.eigene_groessen_nachher() from public, anon;
revoke execute on function public.items_ab_groesse() from public, anon;
```

**Probelauf 0027** (Teil A = Dateitext oben):

```sql
do $probe$
declare
  v_bericht text := '';
  v_user uuid; v_projekt uuid; v_zimmer uuid; v_kiste uuid; v_moebel uuid;
  v_g uuid; v_g2 uuid; v_code text; v_size int; v_hint text; v_det text; v_j jsonb;
begin
  -- ===== A. Text von 0027_eigene_groessen.sql hier einfuegen =====

  -- ===== B. Testumzug als Besitzer =====
  select id into v_user from auth.users order by created_at limit 1;
  insert into public.projects (name, owner_id) values ('Probelauf 0027', v_user) returning id into v_projekt;
  insert into public.project_members (project_id, user_id, role) values (v_projekt, v_user, 'owner');

  -- ===== C. Als Karam =====
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.tags (project_id, kind, name, short) values (v_projekt, 'room', 'Wohnzimmer', 'PW')
    returning id into v_zimmer;
  insert into public.items (project_id, room_id, size) values (v_projekt, v_zimmer, 5)
    returning id, code into v_kiste, v_code;
  v_bericht := v_bericht || E'\nKiste angelegt: ' || v_code;

  insert into public.eigene_groessen (project_id, name, laenge_cm, breite_cm, hoehe_cm)
    values (v_projekt, 'Grosse Box IKEA', 60, 40, 35) returning id into v_g;   -- 84 l
  update public.items set eigene_groesse_id = v_g where id = v_kiste returning code, size into v_code, v_size;
  v_bericht := v_bericht || E'\nmit eigener Groesse 60x40x35 (84 l): Stufe ' || v_size || ', Nummer ' || v_code
    || case when v_size = 9 then ' ok' else ' FEHLER: erwartet 9' end;

  -- Die Oberflaeche schickt eine falsche Stufe mit: die DB setzt ihre eigene
  update public.items set size = 3 where id = v_kiste returning size into v_size;
  v_bericht := v_bericht || E'\nfalsche Stufe vom Client ueberschrieben: '
    || case when v_size = 9 then 'ok' else 'FEHLER ' || v_size end;

  v_j := public.eigene_groesse_folgen(v_g, 40, 30, 17);
  v_bericht := v_bericht || E'\nVorschau 40x30x17: ' || v_j::text;
  update public.eigene_groessen set laenge_cm = 40, breite_cm = 30, hoehe_cm = 17 where id = v_g;
  select size, code into v_size, v_code from public.items where id = v_kiste;
  v_bericht := v_bericht || E'\nnach Aendern der Masse: Stufe ' || v_size || ', Nummer ' || v_code
    || case when v_size = 2 then ' ok' else ' FEHLER: erwartet 2' end;
  v_bericht := v_bericht || E'\nalter Code in item_code_history: '
    || (select count(*) from public.item_code_history where item_id = v_kiste);

  begin
    delete from public.eigene_groessen where id = v_g;
    v_bericht := v_bericht || E'\nFEHLER: benutzte Groesse liess sich loeschen';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_det = pg_exception_detail;
    v_bericht := v_bericht || E'\nLoeschen abgelehnt: ' || coalesce(v_hint, '?') || ' ' || coalesce(v_det, '');
  end;

  begin
    insert into public.eigene_groessen (project_id, name, laenge_cm, breite_cm, hoehe_cm)
      values (v_projekt, ' grosse box ikea ', 10, 10, 10);
    v_bericht := v_bericht || E'\nFEHLER: doppelter Name ging durch';
  exception when unique_violation then
    v_bericht := v_bericht || E'\ndoppelter Name abgelehnt: ok';
  end;

  begin
    insert into public.eigene_groessen (project_id, name, art, laenge_cm, breite_cm, hoehe_cm, ausschnitt_breite_cm, ausschnitt_tiefe_cm)
      values (v_projekt, 'L-Couch', 'kiste', 250, 160, 80, 90, 70);
    v_bericht := v_bericht || E'\nFEHLER: L-Form bei Kiste ging durch';
  exception when check_violation then
    v_bericht := v_bericht || E'\nL-Form nur bei Moebeln: ok';
  end;

  insert into public.eigene_groessen (project_id, name, art, laenge_cm, breite_cm, hoehe_cm, ausschnitt_breite_cm, ausschnitt_tiefe_cm)
    values (v_projekt, 'L-Couch', 'moebel', 250, 160, 80, 90, 70) returning id into v_g2;
  insert into public.items (project_id, room_id, kind, eigene_groesse_id) values (v_projekt, v_zimmer, 'furniture', v_g2)
    returning size, code into v_size, v_code;
  v_bericht := v_bericht || E'\nMoebel mit L-Couch (3200 l): Stufe ' || v_size || ', Nummer ' || v_code;

  update public.items set eigene_groesse_id = null where id = v_kiste returning size into v_size;
  v_bericht := v_bericht || E'\nGroesse abgewaehlt, Stufe bleibt: ' || v_size;
  delete from public.eigene_groessen where id = v_g;
  v_bericht := v_bericht || E'\nunbenutzte Groesse geloescht: ok';

  -- ===== E. Aufraeumen wie im echten Leben: Umzug loeschen =====
  execute 'reset role';
  delete from public.projects where id = v_projekt;
  v_bericht := v_bericht || E'\nUmzug samt eigenen Groessen geloescht: ok';

  raise exception 'PROBELAUF 0027%', v_bericht;
end $probe$;
```

### 2.4 Migration 0028_grundriss_modell.sql (Etappe 1)

Das Herzstueck. Reihenfolge in der Datei: Tabellen, Platz-Spalten, Geometrie,
Masse und Hoehen, Objekt-Geometrie, Pruefungen, Nachruecken, Trigger, RLS,
RPCs, Rechte.

**Pruefmodus.** Schreibt jemand direkt (PostgREST oder `platz_setzen`), prueft
jeder BEFORE-Trigger sofort alles, was ihn betrifft. Der Zeichner schreibt
dagegen ueber `grundriss_speichern`, oft viele Zeilen auf einmal (Raum teilen,
Raum verschieben). Dort setzt die RPC transaktionslokal `kistly.spaeter = 'an'`:
die Trigger normalisieren und sperren nur, das Nachruecken ruht, und am Ende
prueft die RPC jeden beruehrten Raum vollstaendig (`raum_fehler`). Einen Client
kann diesen Schalter nicht setzen (`set_config` ist ueber PostgREST nicht
erreichbar), und die RPC laesst nie ungeprueft etwas stehen.

**Sperren.** Eine exklusive Advisory-Sperre je Raum, Schluessel wie 0025
(`raum_sperre(raum_id, true)`, wiederverwendet). Wer mehrere Raeume braucht,
sperrt sie aufsteigend nach `id::text`. Verschachtelte Schreibvorgaenge
(Nachruecken, Mitnehmen) bleiben in schon gesperrten Raeumen; Advisory-Sperren
derselben Sitzung sind wiedereintrittsfaehig.

```sql
-- =====================================================================
-- Kistly 0028_grundriss_modell
--
-- Neues Ortsmodell in ganzen Zentimetern (START 5.1, 5.2):
--   grundrisse  mehrere je Umzug
--   raeume      Polygon im Uhrzeigersinn, Hoehe, innen/draussen, Farben
--   oeffnungen  Tuer oder Fenster an (Raum, Kante, Abstand)
--   objekte     Moebel, Regal, Schrank; Regal und Schrank mit Faechern
--   items       Platz: Raum, Mittelpunkt, Drehung, genau eine Unterlage
--
-- Die Datenbank prueft jede Regel (Punkt im Polygon, Unterlage, Hoehe,
-- Faecher). Hoehen werden nie gespeichert, nur abgeleitet (kiste_basis).
-- Dieselben Regeln stehen als Spiegel in src/lib/geometrie.ts; Aenderungen
-- immer an beiden Stellen.
--
-- Das alte Raster (room_plans, regale, items.plan_*) bleibt unberuehrt;
-- 0029 rechnet es um und friert es ein, 0031 entfernt es.
-- =====================================================================

-- ============================================================ 1. Tabellen
create table public.grundrisse (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 60),
  sort       int  not null default 0,
  version    int  not null default 0,   -- zaehlt nur grundriss_speichern hoch
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index grundrisse_project_idx on public.grundrisse (project_id, sort, created_at);

create table public.raeume (
  id           uuid primary key default gen_random_uuid(),
  grundriss_id uuid not null references public.grundrisse(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,   -- setzt der Trigger
  tag_id       uuid references public.tags(id) on delete set null,                -- Kistly-Zimmer oder leer
  name         text not null default '' check (length(name) <= 60),               -- fuer Raeume ohne Zimmer
  art          text not null default 'innen' check (art in ('innen', 'draussen')),
  punkte       int[] not null,                                                     -- [x0,y0,x1,y1,...]
  hoehe_cm     int  not null default 250 check (hoehe_cm between 50 and 600),
  bodenfarbe   text check (bodenfarbe is null or bodenfarbe ~ '^#[0-9A-Fa-f]{6}$'),
  wandfarben   text[],                                                             -- je Kante, null = Standard
  sort         int  not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint raeume_punkte_form check (
    array_ndims(punkte) = 1 and array_length(punkte, 1) between 6 and 400
    and array_length(punkte, 1) % 2 = 0),
  constraint raeume_wandfarben_check check (
    wandfarben is null or array_length(wandfarben, 1) * 2 = array_length(punkte, 1))
);
-- Ein Zimmer hoechstens einmal je Grundriss; in alter und neuer Wohnung darf es je einmal vorkommen.
create unique index raeume_tag_je_grundriss on public.raeume (grundriss_id, tag_id) where tag_id is not null;
create index raeume_grundriss_idx on public.raeume (grundriss_id);
create index raeume_tag_idx on public.raeume (tag_id) where tag_id is not null;

create table public.oeffnungen (
  id           uuid primary key default gen_random_uuid(),
  raum_id      uuid not null references public.raeume(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  art          text not null check (art in ('tuer', 'fenster')),   -- Farbe fest: Tuer orange, Fenster blau
  kante        int  not null check (kante >= 0),
  abstand_cm   int  not null check (abstand_cm >= 0),
  breite_cm    int  not null check (breite_cm between 20 and 600),
  hoehe_cm     int  not null check (hoehe_cm between 20 and 600),
  bruestung_cm int  not null default 0 check (bruestung_cm between 0 and 400),
  anschlag     text not null default 'links' check (anschlag in ('links', 'rechts')),   -- nur Zeichnung
  aufschlag    text not null default 'innen' check (aufschlag in ('innen', 'aussen')),  -- nur Zeichnung
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint oeffnungen_tuer_boden check (art = 'fenster' or bruestung_cm = 0)
);
create index oeffnungen_raum_idx on public.oeffnungen (raum_id, kante);

create table public.objekte (
  id                   uuid primary key default gen_random_uuid(),
  raum_id              uuid not null references public.raeume(id) on delete cascade,
  project_id           uuid not null references public.projects(id) on delete cascade,
  art                  text not null check (art in ('moebel', 'regal', 'schrank')),
  name                 text not null default '' check (length(name) <= 60),
  x                    int  not null check (x between 0 and 50000),   -- lokaler Ursprung
  y                    int  not null check (y between 0 and 50000),
  breite_cm            int  not null check (breite_cm between 5 and 2000),
  tiefe_cm             int  not null check (tiefe_cm  between 5 and 2000),
  hoehe_cm             int  not null check (hoehe_cm  between 1 and 600),
  drehung              smallint not null default 0 check (drehung in (0, 90, 180, 270)),
  form                 text not null default 'rechteck' check (form in ('rechteck', 'l')),
  ausschnitt_breite_cm int,
  ausschnitt_tiefe_cm  int,
  ausschnitt_ecke      text check (ausschnitt_ecke in ('lo', 'ro', 'ru', 'lu')),
  brett_cm             int[],                                  -- nur regal/schrank
  spalten              smallint not null default 1 check (spalten between 1 and 20),
  farbe                text check (farbe is null or farbe ~ '^#[0-9A-Fa-f]{6}$'),
  item_id              uuid references public.items(id) on delete set null,   -- Moebel-Eintrag
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint objekte_l_form_check check (
       (form = 'rechteck' and num_nonnulls(ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke) = 0)
    or (form = 'l' and art = 'moebel'
        and ausschnitt_breite_cm between 1 and breite_cm - 1
        and ausschnitt_tiefe_cm  between 1 and tiefe_cm - 1
        and ausschnitt_ecke is not null)),
  constraint objekte_faecher_check check (
       (art = 'moebel' and brett_cm is null and spalten = 1)
    or (art in ('regal', 'schrank') and brett_cm is not null
        and array_ndims(brett_cm) = 1 and array_length(brett_cm, 1) between 1 and 30))
);
create index objekte_raum_idx on public.objekte (raum_id);
create unique index objekte_item_key on public.objekte (item_id) where item_id is not null;

-- ====================================================== 2. Platz an items
alter table public.items
  add column platz_raum_id       uuid references public.raeume(id) on delete set null,
  add column platz_x             int,
  add column platz_y             int,
  add column platz_drehung       smallint,
  add column unterlage_art       text,
  add column unterlage_item_id   uuid references public.items(id) on delete set null,
  add column unterlage_objekt_id uuid references public.objekte(id) on delete set null,
  add column fach_ebene          smallint,
  add column fach_spalte         smallint;

-- "on delete set null" trifft nur eine Spalte; items_platz_pruefen leert
-- dann den ganzen Platz, bevor dieser Check greift (Falle aus 0018/0019).
alter table public.items add constraint items_platz_check check (
  (platz_raum_id is null
     and num_nonnulls(platz_x, platz_y, platz_drehung, unterlage_art, unterlage_item_id,
                      unterlage_objekt_id, fach_ebene, fach_spalte) = 0)
  or (platz_raum_id is not null
     and platz_x between 0 and 50000 and platz_y between 0 and 50000
     and platz_drehung in (0, 90)
     and (   (unterlage_art = 'boden'  and num_nonnulls(unterlage_item_id, unterlage_objekt_id, fach_ebene, fach_spalte) = 0)
          or (unterlage_art = 'kiste'  and unterlage_item_id is not null
                                       and num_nonnulls(unterlage_objekt_id, fach_ebene, fach_spalte) = 0)
          or (unterlage_art = 'objekt' and unterlage_objekt_id is not null
                                       and num_nonnulls(unterlage_item_id, fach_ebene, fach_spalte) = 0)
          or (unterlage_art = 'fach'   and unterlage_objekt_id is not null and unterlage_item_id is null
                                       and fach_ebene >= 1 and fach_spalte >= 1))));

create index items_platz_raum_idx on public.items (platz_raum_id) where platz_raum_id is not null;
create index items_unterlage_item_idx on public.items (unterlage_item_id) where unterlage_item_id is not null;
create index items_unterlage_objekt_idx on public.items (unterlage_objekt_id) where unterlage_objekt_id is not null;

-- ==================================================== 3. Geometrie (Spiegel: src/lib/geometrie.ts)
-- Punkt i (0-basiert) steht in p[2i+1], p[2i+2]. Kante k: Punkt k -> Punkt (k+1) % n.

-- Doppelte vorzeichenbehaftete Flaeche. > 0 heisst: im Uhrzeigersinn am Bildschirm.
create function public.geo_flaeche2(p int[]) returns bigint
language sql immutable parallel safe set search_path = public as $fn$
  select coalesce(sum(p[2*i+1]::bigint * p[2*((i+1) % m.n)+2]
                    - p[2*((i+1) % m.n)+1]::bigint * p[2*i+2]), 0)
    from (select array_length(p, 1) / 2 as n) m, generate_series(0, m.n - 1) i
$fn$;

-- Beruehren oder schneiden sich zwei geschlossene Strecken?
create function public.geo_strecken_schneiden(
  p1x bigint, p1y bigint, p2x bigint, p2y bigint,
  q1x bigint, q1y bigint, q2x bigint, q2y bigint)
returns boolean language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  d1 int := sign((q2x - q1x) * (p1y - q1y) - (q2y - q1y) * (p1x - q1x))::int;
  d2 int := sign((q2x - q1x) * (p2y - q1y) - (q2y - q1y) * (p2x - q1x))::int;
  d3 int := sign((p2x - p1x) * (q1y - p1y) - (p2y - p1y) * (q1x - p1x))::int;
  d4 int := sign((p2x - p1x) * (q2y - p1y) - (p2y - p1y) * (q2x - p1x))::int;
begin
  if d1 * d2 < 0 and d3 * d4 < 0 then return true; end if;
  if d1 = 0 and p1x between least(q1x, q2x) and greatest(q1x, q2x)
            and p1y between least(q1y, q2y) and greatest(q1y, q2y) then return true; end if;
  if d2 = 0 and p2x between least(q1x, q2x) and greatest(q1x, q2x)
            and p2y between least(q1y, q2y) and greatest(q1y, q2y) then return true; end if;
  if d3 = 0 and q1x between least(p1x, p2x) and greatest(p1x, p2x)
            and q1y between least(p1y, p2y) and greatest(p1y, p2y) then return true; end if;
  if d4 = 0 and q2x between least(p1x, p2x) and greatest(p1x, p2x)
            and q2y between least(p1y, p2y) and greatest(p1y, p2y) then return true; end if;
  return false;
end $fn$;

-- null = gueltig, sonst 'punkte' | 'bereich' | 'doppelt' | 'kreuzt' | 'umlauf'
-- (gleiche Kennungen, gleiche Reihenfolge wie polygonFehler in geometrie.ts)
create function public.geo_polygon_fehler(p int[]) returns text
language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int; i int; j int; k int;
  x1 bigint; y1 bigint; x2 bigint; y2 bigint; x3 bigint; y3 bigint;
begin
  if p is null or array_ndims(p) <> 1 or array_length(p, 1) % 2 <> 0
     or array_length(p, 1) < 6 or array_length(p, 1) > 400 then
    return 'punkte';
  end if;
  n := array_length(p, 1) / 2;
  for i in 1 .. 2 * n loop
    if p[i] is null or p[i] < 0 or p[i] > 50000 then return 'bereich'; end if;
  end loop;
  for i in 0 .. n - 1 loop
    j := (i + 1) % n;
    if p[2*i+1] = p[2*j+1] and p[2*i+2] = p[2*j+2] then return 'doppelt'; end if;
  end loop;
  -- Zwei Nachbarkanten duerfen nicht aufeinander zuruecklaufen.
  for i in 0 .. n - 1 loop
    j := (i + 1) % n; k := (i + 2) % n;
    x1 := p[2*i+1]; y1 := p[2*i+2]; x2 := p[2*j+1]; y2 := p[2*j+2]; x3 := p[2*k+1]; y3 := p[2*k+2];
    if (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1) = 0
       and (x2 - x1) * (x3 - x2) + (y2 - y1) * (y3 - y2) < 0 then
      return 'kreuzt';
    end if;
  end loop;
  -- Nicht benachbarte Kanten beruehren sich nicht.
  for i in 0 .. n - 1 loop
    for j in i + 1 .. n - 1 loop
      if j = i + 1 or (i = 0 and j = n - 1) then continue; end if;
      if public.geo_strecken_schneiden(
           p[2*i+1], p[2*i+2], p[2*((i+1) % n)+1], p[2*((i+1) % n)+2],
           p[2*j+1], p[2*j+2], p[2*((j+1) % n)+1], p[2*((j+1) % n)+2]) then
        return 'kreuzt';
      end if;
    end loop;
  end loop;
  if public.geo_flaeche2(p) <= 0 then return 'umlauf'; end if;
  return null;
end $fn$;

-- 1 innen, 0 auf dem Rand, -1 aussen. f skaliert das Polygon (f = 2 fuer halbe cm).
create function public.geo_punkt_lage(p int[], px bigint, py bigint, f int default 1)
returns smallint language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := array_length(p, 1) / 2; i int; j int;
  xi bigint; yi bigint; xj bigint; yj bigint; k bigint;
  drin boolean := false;
begin
  for i in 0 .. n - 1 loop
    j := (i + n - 1) % n;
    xi := f::bigint * p[2*i+1]; yi := f::bigint * p[2*i+2];
    xj := f::bigint * p[2*j+1]; yj := f::bigint * p[2*j+2];
    if (xj - xi) * (py - yi) = (yj - yi) * (px - xi)
       and px between least(xi, xj) and greatest(xi, xj)
       and py between least(yi, yj) and greatest(yi, yj) then
      return 0;
    end if;
    if (yi > py) <> (yj > py) then
      k := (xj - xi) * (py - yi) - (px - xi) * (yj - yi);
      if (k > 0) = (yj > yi) then drin := not drin; end if;
    end if;
  end loop;
  return case when drin then 1 else -1 end;
end $fn$;

-- Rand zaehlt als drinnen.
create function public.geo_punkt_im_polygon(p int[], px int, py int) returns boolean
language sql immutable parallel safe set search_path = public as $fn$
  select public.geo_punkt_lage(p, px, py, 1) >= 0
$fn$;

-- Trifft die Strecke das OFFENE Rechteck (x0,x1) x (y0,y1)? Beruehren zaehlt nicht.
create function public.geo_strecke_trifft_offen(
  sx1 bigint, sy1 bigint, sx2 bigint, sy2 bigint,
  rx0 bigint, ry0 bigint, rx1 bigint, ry1 bigint)
returns boolean language sql immutable parallel safe set search_path = public as $fn$
  select not (
       greatest(sx1, sx2) <= rx0 or least(sx1, sx2) >= rx1
    or greatest(sy1, sy2) <= ry0 or least(sy1, sy2) >= ry1
    or least(s.a, s.b, s.c, s.d) >= 0 or greatest(s.a, s.b, s.c, s.d) <= 0)
  from (select
      sign((sx2 - sx1) * (ry0 - sy1) - (sy2 - sy1) * (rx0 - sx1)) as a,
      sign((sx2 - sx1) * (ry0 - sy1) - (sy2 - sy1) * (rx1 - sx1)) as b,
      sign((sx2 - sx1) * (ry1 - sy1) - (sy2 - sy1) * (rx1 - sx1)) as c,
      sign((sx2 - sx1) * (ry1 - sy1) - (sy2 - sy1) * (rx0 - sx1)) as d) s
$fn$;

-- Liegt das Rechteck ganz im Polygon (Beruehren der Wand erlaubt)?
-- Mitte echt innen UND keine Polygonkante im offenen Rechteck.
create function public.geo_rechteck_im_polygon(p int[], x0 int, y0 int, x1 int, y1 int)
returns boolean language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := array_length(p, 1) / 2; i int; j int;
begin
  if x0 >= x1 or y0 >= y1 then return false; end if;
  if public.geo_punkt_lage(p, x0::bigint + x1, y0::bigint + y1, 2) <> 1 then return false; end if;
  for i in 0 .. n - 1 loop
    j := (i + 1) % n;
    if public.geo_strecke_trifft_offen(p[2*i+1], p[2*i+2], p[2*j+1], p[2*j+2], x0, y0, x1, y1) then
      return false;
    end if;
  end loop;
  return true;
end $fn$;

-- Laenge von Kante k im Quadrat (keine Wurzel, ganzzahlig).
create function public.geo_kante_laenge2(p int[], k int) returns bigint
language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := array_length(p, 1) / 2;
  j int := (k + 1) % n;
  dx bigint := p[2*j+1] - p[2*k+1];
  dy bigint := p[2*j+2] - p[2*k+2];
begin
  return dx * dx + dy * dy;
end $fn$;

-- ======================================================= 4. Kisten
-- Liegt Punkt (px,py) ueber der Grundflaeche einer Kiste mit Mitte (ux,uy)?
create function public.kiste_traegt(p_ux int, p_uy int, p_udreh smallint,
  p_ulaenge int, p_ubreite int, p_x int, p_y int)
returns boolean language sql immutable parallel safe set search_path = public as $fn$
  select abs(2 * (p_x - p_ux)) <= case when p_udreh = 90 then p_ubreite else p_ulaenge end
     and abs(2 * (p_y - p_uy)) <= case when p_udreh = 90 then p_ulaenge else p_ubreite end
$fn$;

-- ======================================================= 5. Objekte
create function public.objekt_lokal(o public.objekte, p_x int, p_y int, out lx int, out ly int)
language sql immutable parallel safe set search_path = public as $fn$
  select case o.drehung when 0 then p_x - o.x when 90 then p_y - o.y
                        when 180 then o.x - p_x else o.y - p_y end,
         case o.drehung when 0 then p_y - o.y when 90 then o.x - p_x
                        when 180 then o.y - p_y else p_x - o.x end
$fn$;

create function public.objekt_global(o public.objekte, p_lx int, p_ly int, out x int, out y int)
language sql immutable parallel safe set search_path = public as $fn$
  select case o.drehung when 0 then o.x + p_lx when 90 then o.x - p_ly
                        when 180 then o.x - p_lx else o.x + p_ly end,
         case o.drehung when 0 then o.y + p_ly when 90 then o.y + p_lx
                        when 180 then o.y - p_ly else o.y - p_lx end
$fn$;

-- Punkt in der Objektflaeche (Rand zaehlt, echtes Inneres des L-Ausschnitts nicht).
create function public.objekt_enthaelt(o public.objekte, p_x int, p_y int) returns boolean
language sql immutable parallel safe set search_path = public as $fn$
  select l.lx between 0 and o.breite_cm and l.ly between 0 and o.tiefe_cm
     and not (o.form = 'l' and case o.ausschnitt_ecke
           when 'lo' then l.lx < o.ausschnitt_breite_cm and l.ly < o.ausschnitt_tiefe_cm
           when 'ro' then l.lx > o.breite_cm - o.ausschnitt_breite_cm and l.ly < o.ausschnitt_tiefe_cm
           when 'ru' then l.lx > o.breite_cm - o.ausschnitt_breite_cm and l.ly > o.tiefe_cm - o.ausschnitt_tiefe_cm
           else           l.lx < o.ausschnitt_breite_cm and l.ly > o.tiefe_cm - o.ausschnitt_tiefe_cm
         end)
    from public.objekt_lokal(o, p_x, p_y) l
$fn$;

-- Punkt in Spalte s eines Regals oder Schranks (und innerhalb der Tiefe).
create function public.objekt_im_fach(o public.objekte, p_spalte int, p_x int, p_y int) returns boolean
language sql immutable parallel safe set search_path = public as $fn$
  select l.ly between 0 and o.tiefe_cm
     and o.spalten * l.lx >= (p_spalte - 1) * (o.breite_cm + 2)
     and o.spalten * l.lx <= p_spalte * (o.breite_cm + 2) - 2 * o.spalten
    from public.objekt_lokal(o, p_x, p_y) l
$fn$;

-- Bis wohin eine Ebene reicht: Unterkante des naechsten Bretts (2 cm), oben 2 cm Deckel.
create function public.fach_decke(o public.objekte, p_ebene int) returns int
language sql immutable parallel safe set search_path = public as $fn$
  select case when p_ebene < array_length(o.brett_cm, 1)
              then o.brett_cm[p_ebene + 1] - 2 else o.hoehe_cm - 2 end
$fn$;

create function public.faecher_gueltig(p_brett int[], p_hoehe int) returns boolean
language plpgsql immutable parallel safe set search_path = public as $fn$
declare
  n int := coalesce(array_length(p_brett, 1), 0); i int;
begin
  if n < 1 or n > 30 or p_brett[1] is null or p_brett[1] < 0 then return false; end if;
  for i in 2 .. n loop
    if p_brett[i] is null or p_brett[i] - p_brett[i - 1] < 3 then return false; end if;
  end loop;
  return p_hoehe - p_brett[n] >= 3;
end $fn$;

-- Die Flaeche als achsparallele Rechtecke in Grundriss-cm (1 bei Rechteck, 2 bei L).
create function public.objekt_rechtecke(o public.objekte)
returns table (x0 int, y0 int, x1 int, y1 int)
language sql immutable parallel safe set search_path = public as $fn$
  with m as (
    select coalesce(o.ausschnitt_breite_cm, 0) as aw, coalesce(o.ausschnitt_tiefe_cm, 0) as ad,
           o.breite_cm as bw, o.tiefe_cm as bd),
  lokal as (
              select 0 as a, 0 as b, bw as c, bd as d from m where o.form = 'rechteck'
    union all select aw, 0, bw, ad        from m where o.form = 'l' and o.ausschnitt_ecke = 'lo'
    union all select 0, ad, bw, bd        from m where o.form = 'l' and o.ausschnitt_ecke = 'lo'
    union all select 0, 0, bw - aw, ad    from m where o.form = 'l' and o.ausschnitt_ecke = 'ro'
    union all select 0, ad, bw, bd        from m where o.form = 'l' and o.ausschnitt_ecke = 'ro'
    union all select 0, 0, bw, bd - ad    from m where o.form = 'l' and o.ausschnitt_ecke = 'ru'
    union all select 0, bd - ad, bw - aw, bd from m where o.form = 'l' and o.ausschnitt_ecke = 'ru'
    union all select 0, 0, bw, bd - ad    from m where o.form = 'l' and o.ausschnitt_ecke = 'lu'
    union all select aw, bd - ad, bw, bd  from m where o.form = 'l' and o.ausschnitt_ecke = 'lu')
  select least(p.x, q.x), least(p.y, q.y), greatest(p.x, q.x), greatest(p.y, q.y)
    from lokal
    cross join lateral public.objekt_global(o, lokal.a, lokal.b) p
    cross join lateral public.objekt_global(o, lokal.c, lokal.d) q
$fn$;

-- ================================================ 6. Fehler und Pruefmodus
create function public.grundriss_fehler(p_kennung text, p_werte jsonb default '{}'::jsonb)
returns jsonb language sql immutable set search_path = public as $fn$
  select jsonb_build_object('kennung', p_kennung, 'werte', coalesce(p_werte, '{}'::jsonb))
$fn$;

create function public.grundriss_werfen(p jsonb) returns void
language plpgsql set search_path = public as $fn$
begin
  if p is null then return; end if;
  raise exception 'Grundriss-Regel verletzt: % %', p->>'kennung', coalesce(p->'werte', '{}'::jsonb)::text
    using errcode = 'check_violation',
          hint    = 'kistly:grundriss.' || (p->>'kennung'),
          detail  = coalesce(p->'werte', '{}'::jsonb)::text;
end $fn$;

create function public.grundriss_spaeter() returns boolean
language sql stable set search_path = public as $fn$
  select coalesce(current_setting('kistly.spaeter', true), '') = 'an'
$fn$;

-- ================================================ 7. Hoehe einer Kiste
-- Unterkante, Grenze (Raumdecke oder Fachdecke der untersten Unterlage),
-- Art und Objekt der untersten Unterlage, Zahl der Kisten darunter.
-- DIE EINZIGE Hoehenrechnung (Spiegel: kisteBasis in geometrie.ts).
create function public.kiste_basis(p_item uuid,
  out unten_cm int, out grenze_cm int, out wurzel_art text, out wurzel_objekt uuid, out tiefe int)
language plpgsql stable set search_path = public as $fn$
declare
  r public.items;
  u public.items;
  o public.objekte;
  v_i int := 0;
begin
  unten_cm := 0; tiefe := 0;
  select * into r from public.items where id = p_item;
  if r.id is null or r.platz_raum_id is null then
    unten_cm := null;
    return;
  end if;
  loop
    v_i := v_i + 1;
    if v_i > 60 then unten_cm := null; grenze_cm := null; return; end if;   -- nie: Kreise lehnt platz_fehler ab
    if r.unterlage_art = 'kiste' then
      select * into u from public.items where id = r.unterlage_item_id;
      if u.id is null or u.platz_raum_id is null then unten_cm := null; return; end if;
      unten_cm := unten_cm + (public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id)).hoehe_cm;
      tiefe := tiefe + 1;
      r := u;
      continue;
    end if;
    wurzel_art := r.unterlage_art;
    if r.unterlage_art = 'boden' then
      select hoehe_cm into grenze_cm from public.raeume where id = r.platz_raum_id;
    else
      select * into o from public.objekte where id = r.unterlage_objekt_id;
      wurzel_objekt := o.id;
      if r.unterlage_art = 'objekt' then
        unten_cm := unten_cm + o.hoehe_cm;
        select hoehe_cm into grenze_cm from public.raeume where id = r.platz_raum_id;
      else
        unten_cm := unten_cm + o.brett_cm[r.fach_ebene];
        grenze_cm := public.fach_decke(o, r.fach_ebene);
      end if;
    end if;
    return;
  end loop;
end $fn$;

-- ================================================ 8. Pruefungen
-- Alle Regeln fuer den Platz einer Kiste (START 5.2). k ist die Zeile, wie
-- sie werden soll. p_mit_baum: auch alles pruefen, was auf ihr liegt (bei
-- Groessenaenderung; beim Versetzen erledigt das platz_nachruecken).
create function public.platz_fehler(k public.items, p_mit_baum boolean default false)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  r        public.raeume;
  u        public.items;
  o        public.objekte;
  m        record;
  mu       record;
  b        record;
  v_unten  int;
  v_grenze int;
  v_oben   int;
  v_id     uuid;
  v_i      int := 0;
  v_code   text;
  v_max    int;
begin
  if k.platz_raum_id is null then
    return null;
  end if;
  if k.kind = 'furniture' then
    return public.grundriss_fehler('moebel_kein_platz', jsonb_build_object('code', k.code));
  end if;
  select * into r from public.raeume where id = k.platz_raum_id;
  if r.id is null or r.project_id <> k.project_id then
    return public.grundriss_fehler('raum_fehlt', jsonb_build_object('code', k.code));
  end if;
  if not public.geo_punkt_im_polygon(r.punkte, k.platz_x, k.platz_y) then
    return public.grundriss_fehler('draussen', jsonb_build_object('code', k.code));
  end if;
  select * into m from public.kiste_masse(k.size, k.eigene_hoehe_cm, k.eigene_groesse_id);

  if k.unterlage_art = 'boden' then
    v_unten := 0;
    v_grenze := r.hoehe_cm;

  elsif k.unterlage_art = 'kiste' then
    select * into u from public.items where id = k.unterlage_item_id;
    if u.id is null or u.id = k.id or u.platz_raum_id is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    if u.platz_raum_id <> k.platz_raum_id then
      return public.grundriss_fehler('unterlage_anderer_raum', jsonb_build_object('code', k.code));
    end if;
    v_id := u.unterlage_item_id;                   -- kein Kreis in "liegt auf"
    while v_id is not null loop
      v_i := v_i + 1;
      if v_id = k.id or v_i > 60 then
        return public.grundriss_fehler('kreis', jsonb_build_object('code', k.code, 'unter', u.code));
      end if;
      select i.unterlage_item_id into v_id from public.items i where i.id = v_id;
    end loop;
    select * into mu from public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id);
    if not public.kiste_traegt(u.platz_x, u.platz_y, u.platz_drehung, mu.laenge_cm, mu.breite_cm,
                               k.platz_x, k.platz_y) then
      return public.grundriss_fehler('nicht_darauf', jsonb_build_object('code', k.code, 'unter', u.code));
    end if;
    select * into b from public.kiste_basis(u.id);
    if b.unten_cm is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    v_unten := b.unten_cm + mu.hoehe_cm;
    v_grenze := b.grenze_cm;

  else   -- 'objekt' oder 'fach'
    select * into o from public.objekte where id = k.unterlage_objekt_id;
    if o.id is null then
      return public.grundriss_fehler('unterlage_fehlt', jsonb_build_object('code', k.code));
    end if;
    if o.raum_id <> k.platz_raum_id then
      return public.grundriss_fehler('unterlage_anderer_raum', jsonb_build_object('code', k.code));
    end if;
    if k.unterlage_art = 'objekt' then
      if not public.objekt_enthaelt(o, k.platz_x, k.platz_y) then
        return public.grundriss_fehler('nicht_darauf_objekt',
          jsonb_build_object('code', k.code, 'name', o.name, 'art', o.art));
      end if;
      v_unten := o.hoehe_cm;
      v_grenze := r.hoehe_cm;
    else
      if o.art = 'moebel' then
        return public.grundriss_fehler('kein_regal', jsonb_build_object('code', k.code, 'name', o.name));
      end if;
      if k.fach_ebene > coalesce(array_length(o.brett_cm, 1), 0) or k.fach_spalte > o.spalten then
        return public.grundriss_fehler('fach_fehlt',
          jsonb_build_object('code', k.code, 'name', o.name, 'ebene', k.fach_ebene, 'spalte', k.fach_spalte));
      end if;
      if not public.objekt_im_fach(o, k.fach_spalte, k.platz_x, k.platz_y) then
        return public.grundriss_fehler('nicht_im_fach',
          jsonb_build_object('code', k.code, 'name', o.name, 'ebene', k.fach_ebene, 'spalte', k.fach_spalte));
      end if;
      v_unten := o.brett_cm[k.fach_ebene];
      v_grenze := public.fach_decke(o, k.fach_ebene);
    end if;
  end if;

  v_oben := v_unten + m.hoehe_cm;
  if v_oben > v_grenze then
    return public.grundriss_fehler('zu_hoch',
      jsonb_build_object('code', k.code, 'oben', v_oben, 'grenze', v_grenze));
  end if;

  if p_mit_baum then
    select c.code into v_code from public.items c
     where c.unterlage_item_id = k.id and c.platz_raum_id is not null
       and (c.platz_raum_id <> k.platz_raum_id
            or not public.kiste_traegt(k.platz_x, k.platz_y, k.platz_drehung,
                                       m.laenge_cm, m.breite_cm, c.platz_x, c.platz_y))
     limit 1;
    if v_code is not null then
      return public.grundriss_fehler('nicht_darauf', jsonb_build_object('code', v_code, 'unter', k.code));
    end if;
    with recursive baum(id, code, oben, tiefe) as (
      select c.id, c.code, v_oben + (public.kiste_masse(c.size, c.eigene_hoehe_cm, c.eigene_groesse_id)).hoehe_cm, 1
        from public.items c
       where c.unterlage_item_id = k.id and c.platz_raum_id is not null
      union all
      select c.id, c.code, baum.oben + (public.kiste_masse(c.size, c.eigene_hoehe_cm, c.eigene_groesse_id)).hoehe_cm,
             baum.tiefe + 1
        from public.items c join baum on c.unterlage_item_id = baum.id
       where baum.tiefe < 60 and c.platz_raum_id is not null)
    select baum.code, baum.oben into v_code, v_max
      from baum where baum.oben > v_grenze order by baum.tiefe limit 1;
    if v_code is not null then
      return public.grundriss_fehler('zu_hoch',
        jsonb_build_object('code', v_code, 'oben', v_max, 'grenze', v_grenze));
    end if;
  end if;
  return null;
end $fn$;

create function public.objekt_fehler(o public.objekte, r public.raeume) returns jsonb
language plpgsql stable set search_path = public as $fn$
declare
  q record;
begin
  for q in select * from public.objekt_rechtecke(o) loop
    if not public.geo_rechteck_im_polygon(r.punkte, q.x0, q.y0, q.x1, q.y1) then
      return public.grundriss_fehler('objekt_draussen', jsonb_build_object('name', o.name, 'art', o.art));
    end if;
  end loop;
  if o.hoehe_cm > r.hoehe_cm then
    return public.grundriss_fehler('objekt_zu_hoch', jsonb_build_object('name', o.name, 'art', o.art));
  end if;
  return null;
end $fn$;

create function public.oeffnung_fehler(e public.oeffnungen, r public.raeume) returns jsonb
language plpgsql stable set search_path = public as $fn$
declare
  v_n    int := array_length(r.punkte, 1) / 2;
  v_ende bigint;
begin
  if e.kante >= v_n then
    return public.grundriss_fehler('oeffnung_kante', jsonb_build_object('art', e.art));
  end if;
  v_ende := e.abstand_cm::bigint + e.breite_cm;
  if v_ende * v_ende > public.geo_kante_laenge2(r.punkte, e.kante) then
    return public.grundriss_fehler('oeffnung_zu_breit', jsonb_build_object('art', e.art));
  end if;
  if e.bruestung_cm + e.hoehe_cm > r.hoehe_cm then
    return public.grundriss_fehler('oeffnung_zu_hoch', jsonb_build_object('art', e.art));
  end if;
  if exists (select 1 from public.oeffnungen x
              where x.raum_id = e.raum_id and x.kante = e.kante and x.id <> e.id
                and x.abstand_cm < e.abstand_cm + e.breite_cm
                and e.abstand_cm < x.abstand_cm + x.breite_cm) then
    return public.grundriss_fehler('oeffnungen_ueberlappen', jsonb_build_object('art', e.art));
  end if;
  return null;
end $fn$;

-- Passt alles im Raum zu diesem (neuen) Raum? Fuer Aenderungen an Umriss oder Hoehe.
create function public.raum_inhalt_fehler(r public.raeume) returns jsonb
language plpgsql stable set search_path = public as $fn$
declare
  v_n    int;
  v_code text;
  v_f    jsonb;
  o      public.objekte;
  e      public.oeffnungen;
begin
  select count(*), min(i.code) into v_n, v_code from public.items i
   where i.platz_raum_id = r.id and not public.geo_punkt_im_polygon(r.punkte, i.platz_x, i.platz_y);
  if v_n > 0 then
    return public.grundriss_fehler('kisten_draussen', jsonb_build_object('n', v_n, 'code', v_code));
  end if;
  select count(*), min(i.code) into v_n, v_code
    from public.items i cross join lateral public.kiste_basis(i.id) b
   where i.platz_raum_id = r.id and b.wurzel_art in ('boden', 'objekt')
     and b.unten_cm + (public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id)).hoehe_cm > r.hoehe_cm;
  if v_n > 0 then
    return public.grundriss_fehler('zu_niedrig', jsonb_build_object('n', v_n, 'code', v_code));
  end if;
  for o in select * from public.objekte where raum_id = r.id loop
    v_f := public.objekt_fehler(o, r);
    if v_f is not null then return v_f; end if;
  end loop;
  for e in select * from public.oeffnungen where raum_id = r.id loop
    v_f := public.oeffnung_fehler(e, r);
    if v_f is not null then return v_f; end if;
  end loop;
  return null;
end $fn$;

-- Alle Verstoesse eines Raums (fuer Probelauf, Umrechnung und raum_fehler).
create function public.raum_verstoesse(p_raum uuid)
returns table (kiste_id uuid, kennung text, werte jsonb)
language plpgsql stable set search_path = public as $fn$
declare
  r   public.raeume;
  o   public.objekte;
  e   public.oeffnungen;
  k   public.items;
  v   jsonb;
  v_t text;
begin
  select * into r from public.raeume where id = p_raum;
  if r.id is null then return; end if;
  v_t := public.geo_polygon_fehler(r.punkte);
  if v_t is not null then
    kiste_id := null; kennung := 'raum_' || v_t; werte := '{}'::jsonb; return next;
  end if;
  for o in select * from public.objekte where raum_id = p_raum loop
    v := public.objekt_fehler(o, r);
    if v is not null then kiste_id := null; kennung := v->>'kennung'; werte := v->'werte'; return next; end if;
  end loop;
  for e in select * from public.oeffnungen where raum_id = p_raum loop
    v := public.oeffnung_fehler(e, r);
    if v is not null then kiste_id := null; kennung := v->>'kennung'; werte := v->'werte'; return next; end if;
  end loop;
  for k in select * from public.items where platz_raum_id = p_raum order by id loop
    v := public.platz_fehler(k, false);
    if v is not null then kiste_id := k.id; kennung := v->>'kennung'; werte := v->'werte'; return next; end if;
  end loop;
end $fn$;

create function public.raum_fehler(p_raum uuid) returns jsonb
language sql stable set search_path = public as $fn$
  select public.grundriss_fehler(v.kennung, v.werte) from public.raum_verstoesse(p_raum) v limit 1
$fn$;

-- ================================================ 9. Nachruecken
-- p_alt: die Kiste vorher, p_neu: nachher (null beim Loeschen). Kisten, die
-- auf ihr lagen und nicht mehr darauf liegen, uebernehmen ihre alte
-- Unterlage (START 5.2). Sie behalten ihren Mittelpunkt, wenn er dort
-- gilt, sonst nehmen sie den alten Mittelpunkt der Kiste darunter. Was auf
-- ihnen liegt, faehrt mit. Danach muss alles, was auf p_neu geblieben ist,
-- weiter unter die Grenze passen.
create function public.platz_nachruecken(p_alt public.items, p_neu public.items)
returns void language plpgsql set search_path = public as $fn$
declare
  c        public.items;
  v_try    public.items;
  v_k      public.items;
  d        record;
  v_f      jsonb;
  v_x      int;
  v_y      int;
  v_ml     int;       -- Masse von p_neu (bleiben null, wenn p_neu keinen Platz hat)
  v_mb     int;
  v_bleibt boolean;
begin
  if p_neu.id is not null and p_neu.platz_raum_id is not null then
    select laenge_cm, breite_cm into v_ml, v_mb
      from public.kiste_masse(p_neu.size, p_neu.eigene_hoehe_cm, p_neu.eigene_groesse_id);
  end if;
  for c in select * from public.items
            where unterlage_item_id = p_alt.id and platz_raum_id is not null order by id loop
    v_bleibt := false;
    if p_neu.id is not null and p_neu.platz_raum_id is not null
       and p_neu.platz_raum_id = c.platz_raum_id then
      v_bleibt := public.kiste_traegt(p_neu.platz_x, p_neu.platz_y, p_neu.platz_drehung,
                                      v_ml, v_mb, c.platz_x, c.platz_y);
    end if;
    if v_bleibt then
      continue;   -- liegt weiter darauf
    end if;
    v_try := c;
    v_try.platz_raum_id       := p_alt.platz_raum_id;
    v_try.unterlage_art       := p_alt.unterlage_art;
    v_try.unterlage_item_id   := p_alt.unterlage_item_id;
    v_try.unterlage_objekt_id := p_alt.unterlage_objekt_id;
    v_try.fach_ebene          := p_alt.fach_ebene;
    v_try.fach_spalte         := p_alt.fach_spalte;
    v_f := public.platz_fehler(v_try, false);
    if v_f is not null and (v_f->>'kennung') in ('draussen', 'nicht_darauf', 'nicht_darauf_objekt', 'nicht_im_fach') then
      v_x := p_alt.platz_x; v_y := p_alt.platz_y;
    else
      v_x := c.platz_x; v_y := c.platz_y;
    end if;
    update public.items
       set platz_raum_id = p_alt.platz_raum_id, platz_x = v_x, platz_y = v_y,
           unterlage_art = p_alt.unterlage_art, unterlage_item_id = p_alt.unterlage_item_id,
           unterlage_objekt_id = p_alt.unterlage_objekt_id,
           fach_ebene = p_alt.fach_ebene, fach_spalte = p_alt.fach_spalte
     where id = c.id;
    if v_x <> c.platz_x or v_y <> c.platz_y then
      for d in
        with recursive baum(id, tiefe) as (
          select i.id, 1 from public.items i where i.unterlage_item_id = c.id
          union all
          select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
           where baum.tiefe < 60)
        select baum.id from baum order by baum.tiefe, baum.id
      loop
        update public.items
           set platz_x = platz_x + (v_x - c.platz_x), platz_y = platz_y + (v_y - c.platz_y)
         where id = d.id;
      end loop;
    end if;
  end loop;
  if p_neu.id is not null and p_neu.platz_raum_id is not null then
    select * into v_k from public.items where id = p_neu.id;
    perform public.grundriss_werfen(public.platz_fehler(v_k, true));
  end if;
end $fn$;

-- ================================================ 10. Trigger
-- grundrisse: Version nur ueber grundriss_speichern.
create function public.grundrisse_vorher() returns trigger
language plpgsql set search_path = public as $fn$
begin
  new.updated_at := now();
  new.name := btrim(new.name);
  if tg_op = 'INSERT' then
    new.version := 0;
  else
    new.project_id := old.project_id;
    if not public.grundriss_spaeter() then
      new.version := old.version;
    end if;
  end if;
  return new;
end $fn$;
create trigger grundrisse_vorher before insert or update on public.grundrisse
  for each row execute function public.grundrisse_vorher();

-- raeume: Umzug aus dem Grundriss, Zimmer pruefen, Polygon pruefen, Inhalt pruefen.
create function public.raeume_vorher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_projekt uuid;
  t         public.tags;
  v_t       text;
begin
  if tg_op = 'UPDATE' and not exists (select 1 from public.projects where id = old.project_id) then
    return new;   -- Kaskade beim Loeschen des Umzugs (0008)
  end if;
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.grundriss_id <> old.grundriss_id then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_umhaengen'));
  end if;
  select project_id into v_projekt from public.grundrisse where id = new.grundriss_id;
  if v_projekt is null then
    perform public.grundriss_werfen(public.grundriss_fehler('grundriss_fehlt'));
  end if;
  new.project_id := v_projekt;                       -- immer ueberschreiben (0014)
  perform public.raum_sperre(new.id, true);
  if new.tag_id is not null then
    select * into t from public.tags where id = new.tag_id;
    if t.id is null or t.project_id <> v_projekt or t.kind <> 'room' then
      perform public.grundriss_werfen(public.grundriss_fehler('zimmer_falsch'));
    end if;
    if exists (select 1 from public.raeume x
                where x.grundriss_id = new.grundriss_id and x.tag_id = new.tag_id and x.id <> new.id) then
      perform public.grundriss_werfen(public.grundriss_fehler('zimmer_doppelt', jsonb_build_object('name', t.name)));
    end if;
  end if;
  v_t := public.geo_polygon_fehler(new.punkte);
  if v_t is not null then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_' || v_t));
  end if;
  if new.wandfarben is not null and exists (
       select 1 from unnest(new.wandfarben) f where f is not null and f !~ '^#[0-9A-Fa-f]{6}$') then
    perform public.grundriss_werfen(public.grundriss_fehler('farbe_ungueltig'));
  end if;
  if tg_op = 'UPDATE' and not public.grundriss_spaeter()
     and (new.punkte is distinct from old.punkte or new.hoehe_cm < old.hoehe_cm) then
    perform public.grundriss_werfen(public.raum_inhalt_fehler(new));
  end if;
  return new;
end $fn$;
create trigger raeume_vorher before insert or update on public.raeume
  for each row execute function public.raeume_vorher();

create function public.oeffnungen_vorher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  r public.raeume;
begin
  if tg_op = 'UPDATE' and not exists (select 1 from public.projects where id = old.project_id) then
    return new;
  end if;
  new.updated_at := now();
  select * into r from public.raeume where id = new.raum_id;
  if r.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_fehlt'));
  end if;
  new.project_id := r.project_id;
  if tg_op = 'UPDATE' and old.raum_id <> new.raum_id and old.raum_id::text < new.raum_id::text then
    perform public.raum_sperre(old.raum_id, true);
  end if;
  perform public.raum_sperre(new.raum_id, true);
  if tg_op = 'UPDATE' and old.raum_id <> new.raum_id and old.raum_id::text > new.raum_id::text then
    perform public.raum_sperre(old.raum_id, true);
  end if;
  if not public.grundriss_spaeter() then
    perform public.grundriss_werfen(public.oeffnung_fehler(new, r));
  end if;
  return new;
end $fn$;
create trigger oeffnungen_vorher before insert or update on public.oeffnungen
  for each row execute function public.oeffnungen_vorher();

create function public.objekte_vorher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  r      public.raeume;
  v_alt  uuid;
begin
  if tg_op = 'UPDATE' and not exists (select 1 from public.projects where id = old.project_id) then
    return new;
  end if;
  new.updated_at := now();
  select * into r from public.raeume where id = new.raum_id;
  if r.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('raum_fehlt'));
  end if;
  new.project_id := r.project_id;
  if tg_op = 'UPDATE' and old.raum_id <> new.raum_id then
    select grundriss_id into v_alt from public.raeume where id = old.raum_id;
    if v_alt is distinct from r.grundriss_id then
      perform public.grundriss_werfen(public.grundriss_fehler('objekt_umhaengen'));
    end if;
    if old.raum_id::text < new.raum_id::text then perform public.raum_sperre(old.raum_id, true); end if;
    perform public.raum_sperre(new.raum_id, true);
    if old.raum_id::text > new.raum_id::text then perform public.raum_sperre(old.raum_id, true); end if;
  else
    perform public.raum_sperre(new.raum_id, true);
  end if;
  if new.art <> 'moebel' and not public.faecher_gueltig(new.brett_cm, new.hoehe_cm) then
    perform public.grundriss_werfen(public.grundriss_fehler('faecher_ungueltig', jsonb_build_object('name', new.name)));
  end if;
  if new.item_id is not null and (tg_op = 'INSERT' or new.item_id is distinct from old.item_id) then
    if not exists (select 1 from public.items i
                    where i.id = new.item_id and i.project_id = r.project_id and i.kind = 'furniture') then
      perform public.grundriss_werfen(public.grundriss_fehler('moebel_verknuepfung', jsonb_build_object('name', new.name)));
    end if;
    if exists (select 1 from public.objekte x where x.item_id = new.item_id and x.id <> new.id) then
      perform public.grundriss_werfen(public.grundriss_fehler('moebel_schon_verknuepft', jsonb_build_object('name', new.name)));
    end if;
  end if;
  if not public.grundriss_spaeter()
     and (tg_op = 'INSERT'
          or (new.raum_id, new.x, new.y, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.drehung,
              new.form, new.ausschnitt_breite_cm, new.ausschnitt_tiefe_cm, new.ausschnitt_ecke)
             is distinct from
             (old.raum_id, old.x, old.y, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.drehung,
              old.form, old.ausschnitt_breite_cm, old.ausschnitt_tiefe_cm, old.ausschnitt_ecke)) then
    perform public.grundriss_werfen(public.objekt_fehler(new, r));
  end if;
  return new;
end $fn$;
create trigger objekte_vorher before insert or update on public.objekte
  for each row execute function public.objekte_vorher();

-- Objekt versetzt, gedreht oder in einen anderen Raum: alles, was es traegt
-- (oben drauf, in Faechern, und was darauf liegt), faehrt mit. Bretter
-- geaendert: Kisten bleiben auf ihrer Brett-Hoehe, wenn es sie noch gibt.
create function public.objekte_nachher() returns trigger
language plpgsql set search_path = public as $fn$
declare
  k        public.items;
  l        record;
  g        record;
  v_diff   int;
  v_alt    int[];
begin
  v_alt := old.brett_cm;
  if (new.x, new.y, new.drehung, new.raum_id) is distinct from (old.x, old.y, old.drehung, old.raum_id) then
    v_diff := ((new.drehung - old.drehung) % 360 + 360) % 360;
    for k in
      with recursive traglast(id, tiefe) as (
        select i.id, 0 from public.items i
         where i.unterlage_objekt_id = new.id and i.platz_raum_id is not null
        union all
        select i.id, traglast.tiefe + 1 from public.items i join traglast on i.unterlage_item_id = traglast.id
         where traglast.tiefe < 60)
      select i.* from traglast join public.items i on i.id = traglast.id order by traglast.tiefe, i.id
    loop
      select * into l from public.objekt_lokal(old, k.platz_x, k.platz_y);
      select * into g from public.objekt_global(new, l.lx, l.ly);
      update public.items
         set platz_raum_id = new.raum_id, platz_x = g.x, platz_y = g.y,
             platz_drehung = case when v_diff in (90, 270) then 90 - k.platz_drehung else k.platz_drehung end
       where id = k.id;
    end loop;
  end if;
  if old.brett_cm is distinct from new.brett_cm and new.brett_cm is not null and v_alt is not null then
    update public.items i
       set fach_ebene = array_position(new.brett_cm, v_alt[i.fach_ebene])
     where i.unterlage_objekt_id = new.id and i.unterlage_art = 'fach'
       and array_position(new.brett_cm, v_alt[i.fach_ebene]) is not null
       and array_position(new.brett_cm, v_alt[i.fach_ebene]) <> i.fach_ebene;
  end if;
  if not public.grundriss_spaeter()
     and (new.x, new.y, new.drehung, new.raum_id, new.breite_cm, new.tiefe_cm, new.hoehe_cm, new.art,
          new.form, new.ausschnitt_breite_cm, new.ausschnitt_tiefe_cm, new.ausschnitt_ecke, new.brett_cm, new.spalten)
         is distinct from
         (old.x, old.y, old.drehung, old.raum_id, old.breite_cm, old.tiefe_cm, old.hoehe_cm, old.art,
          old.form, old.ausschnitt_breite_cm, old.ausschnitt_tiefe_cm, old.ausschnitt_ecke, old.brett_cm, old.spalten) then
    for k in
      with recursive traglast(id, tiefe) as (
        select i.id, 0 from public.items i
         where i.unterlage_objekt_id = new.id and i.platz_raum_id is not null
        union all
        select i.id, traglast.tiefe + 1 from public.items i join traglast on i.unterlage_item_id = traglast.id
         where traglast.tiefe < 60)
      select i.* from traglast join public.items i on i.id = traglast.id order by traglast.tiefe, i.id
    loop
      perform public.grundriss_werfen(public.platz_fehler(k, false));
    end loop;
  end if;
  return null;
end $fn$;
create trigger objekte_nachher after update on public.objekte
  for each row execute function public.objekte_nachher();

-- Objekt weg: was darauf oder darin stand, steht jetzt auf dem Boden
-- (Mittelpunkt bleibt; er lag im Objekt und damit im Raum).
create function public.objekte_weg() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if not exists (select 1 from public.projects where id = old.project_id)
     or not exists (select 1 from public.raeume where id = old.raum_id) then
    return old;   -- Kaskade: der Raum oder der Umzug geht ohnehin
  end if;
  perform public.raum_sperre(old.raum_id, true);
  update public.items
     set unterlage_art = 'boden', unterlage_objekt_id = null, fach_ebene = null, fach_spalte = null
   where unterlage_objekt_id = old.id and platz_raum_id is not null;
  return old;
end $fn$;
create trigger objekte_weg before delete on public.objekte
  for each row execute function public.objekte_weg();

-- items: Sperre zuerst ('items_a_platz_sperre' < 'items_a_sperre' < 'items_ab_groesse' < 'items_bi').
create function public.items_a_platz_sperre() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_a uuid;
  v_b uuid;
begin
  if tg_op = 'UPDATE'
     and (new.platz_raum_id, new.platz_x, new.platz_y, new.platz_drehung, new.unterlage_art,
          new.unterlage_item_id, new.unterlage_objekt_id, new.fach_ebene, new.fach_spalte,
          new.size, new.eigene_hoehe_cm, new.eigene_groesse_id, new.kind)
         is not distinct from
         (old.platz_raum_id, old.platz_x, old.platz_y, old.platz_drehung, old.unterlage_art,
          old.unterlage_item_id, old.unterlage_objekt_id, old.fach_ebene, old.fach_spalte,
          old.size, old.eigene_hoehe_cm, old.eigene_groesse_id, old.kind) then
    return new;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then v_a := old.platz_raum_id; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_b := new.platz_raum_id; end if;
  if v_a is not null and v_b is not null and v_a::text > v_b::text then
    perform public.raum_sperre(v_b, true);
    perform public.raum_sperre(v_a, true);
  else
    perform public.raum_sperre(v_a, true);
    perform public.raum_sperre(v_b, true);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $fn$;
create trigger items_a_platz_sperre before insert or update or delete on public.items
  for each row execute function public.items_a_platz_sperre();

-- Normalisieren und pruefen. Laeuft als letzter BEFORE-Trigger
-- ('items_platz' > 'items_plan'), nach Nummer und Stufe.
create function public.items_platz_pruefen() returns trigger
language plpgsql set search_path = public as $fn$
declare
  v_platz_gleich boolean := false;
begin
  if new.platz_raum_id is not null then
    new.unterlage_art := coalesce(new.unterlage_art, 'boden');
    new.platz_drehung := coalesce(new.platz_drehung, 0);
  end if;
  if new.kind = 'furniture' and new.platz_raum_id is not null
     and not (tg_op = 'UPDATE' and old.kind <> 'furniture') then
    perform public.grundriss_werfen(public.grundriss_fehler('moebel_kein_platz', jsonb_build_object('code', new.code)));
  end if;
  if new.kind = 'furniture' or new.platz_raum_id is null
     or (new.unterlage_art = 'kiste' and new.unterlage_item_id is null)
     or (new.unterlage_art in ('objekt', 'fach') and new.unterlage_objekt_id is null) then
    new.platz_raum_id := null; new.platz_x := null; new.platz_y := null; new.platz_drehung := null;
    new.unterlage_art := null; new.unterlage_item_id := null; new.unterlage_objekt_id := null;
    new.fach_ebene := null; new.fach_spalte := null;
    return new;
  end if;
  if new.unterlage_art <> 'kiste' then new.unterlage_item_id := null; end if;
  if new.unterlage_art in ('boden', 'kiste') then new.unterlage_objekt_id := null; end if;
  if new.unterlage_art <> 'fach' then
    new.fach_ebene := null; new.fach_spalte := null;
  else
    new.fach_spalte := coalesce(new.fach_spalte, 1);
  end if;
  if tg_op = 'UPDATE' then
    v_platz_gleich :=
      (new.platz_raum_id, new.platz_x, new.platz_y, new.platz_drehung, new.unterlage_art,
       new.unterlage_item_id, new.unterlage_objekt_id, new.fach_ebene, new.fach_spalte)
      is not distinct from
      (old.platz_raum_id, old.platz_x, old.platz_y, old.platz_drehung, old.unterlage_art,
       old.unterlage_item_id, old.unterlage_objekt_id, old.fach_ebene, old.fach_spalte);
    if v_platz_gleich
       and (new.size, new.eigene_hoehe_cm, new.eigene_groesse_id)
           is not distinct from (old.size, old.eigene_hoehe_cm, old.eigene_groesse_id) then
      return new;   -- nichts am Platz geaendert (Status, Titel, ...)
    end if;
  end if;
  if public.grundriss_spaeter() then
    return new;
  end if;
  -- Nur Groesse geaendert: der ganze Stapel darueber muss mitpassen.
  -- Platz geaendert: nur diese Kiste; was darauf lag, erledigt items_platz_nachher.
  perform public.grundriss_werfen(public.platz_fehler(new, v_platz_gleich));
  return new;
end $fn$;
create trigger items_platz before insert or update on public.items
  for each row execute function public.items_platz_pruefen();

create function public.items_platz_nachher() returns trigger
language plpgsql set search_path = public as $fn$
begin
  -- Nur, was ein Mensch ausloest. Das Nachruecken selbst kaeme sonst hier
  -- wieder an (Waechter wie 0022).
  if pg_trigger_depth() > 1 or public.grundriss_spaeter() then return null; end if;
  if old.platz_raum_id is null then return null; end if;
  if (new.platz_raum_id, new.platz_x, new.platz_y, new.platz_drehung, new.unterlage_art,
      new.unterlage_item_id, new.unterlage_objekt_id, new.fach_ebene, new.fach_spalte)
     is not distinct from
     (old.platz_raum_id, old.platz_x, old.platz_y, old.platz_drehung, old.unterlage_art,
      old.unterlage_item_id, old.unterlage_objekt_id, old.fach_ebene, old.fach_spalte) then
    return null;
  end if;
  perform public.platz_nachruecken(old, new);
  return null;
end $fn$;
create trigger items_platz_nachher after update on public.items
  for each row execute function public.items_platz_nachher();

-- Vor dem Loeschen rutscht nach, was auf der Kiste lag (sonst zeigte
-- unterlage_item_id ins Leere). Beim Loeschen des Umzugs nicht (0008).
create function public.items_platz_weg() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if old.platz_raum_id is null then return old; end if;
  if not exists (select 1 from public.projects where id = old.project_id) then return old; end if;
  perform public.platz_nachruecken(old, null::public.items);
  return old;
end $fn$;
create trigger items_platz_weg before delete on public.items
  for each row execute function public.items_platz_weg();

-- eigene_groessen (ersetzt 0027): neu einstufen UND alle Plaetze pruefen.
create or replace function public.eigene_groessen_nachher()
returns trigger language plpgsql set search_path = public as $fn$
declare
  v_stufe smallint;
  v_raum  uuid;
  k       public.items;
begin
  if (new.laenge_cm, new.breite_cm, new.hoehe_cm)
     is not distinct from (old.laenge_cm, old.breite_cm, old.hoehe_cm) then
    return null;
  end if;
  for v_raum in
    select distinct i.platz_raum_id from public.items i
     where i.eigene_groesse_id = new.id and i.platz_raum_id is not null
     order by 1
  loop
    perform public.raum_sperre(v_raum, true);
  end loop;
  v_stufe := public.groesse_stufe(new.laenge_cm, new.breite_cm, new.hoehe_cm);
  update public.items set size = v_stufe where eigene_groesse_id = new.id and size <> v_stufe;
  for k in select * from public.items
            where eigene_groesse_id = new.id and platz_raum_id is not null order by id loop
    perform public.grundriss_werfen(public.platz_fehler(k, true));
  end loop;
  return null;
end $fn$;

-- ================================================ 11. Zeilen-Sicherheit
alter table public.grundrisse enable row level security;
alter table public.raeume     enable row level security;
alter table public.oeffnungen enable row level security;
alter table public.objekte    enable row level security;

create policy grundrisse_select on public.grundrisse for select to authenticated using (public.is_member(project_id));
create policy grundrisse_insert on public.grundrisse for insert to authenticated with check (public.is_editor(project_id));
create policy grundrisse_update on public.grundrisse for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy grundrisse_delete on public.grundrisse for delete to authenticated using (public.is_editor(project_id));

create policy raeume_select on public.raeume for select to authenticated using (public.is_member(project_id));
create policy raeume_insert on public.raeume for insert to authenticated with check (public.is_editor(project_id));
create policy raeume_update on public.raeume for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy raeume_delete on public.raeume for delete to authenticated using (public.is_editor(project_id));

create policy oeffnungen_select on public.oeffnungen for select to authenticated using (public.is_member(project_id));
create policy oeffnungen_insert on public.oeffnungen for insert to authenticated with check (public.is_editor(project_id));
create policy oeffnungen_update on public.oeffnungen for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy oeffnungen_delete on public.oeffnungen for delete to authenticated using (public.is_editor(project_id));

create policy objekte_select on public.objekte for select to authenticated using (public.is_member(project_id));
create policy objekte_insert on public.objekte for insert to authenticated with check (public.is_editor(project_id));
create policy objekte_update on public.objekte for update to authenticated
  using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy objekte_delete on public.objekte for delete to authenticated using (public.is_editor(project_id));

revoke all on public.grundrisse, public.raeume, public.oeffnungen, public.objekte from anon;
-- items: die vorhandenen Policies (0004) gelten fuer die neuen Spalten.

-- ================================================ 12. Schnittstellen (alle security invoker)

-- Erster Grundriss des Umzugs; gibt es keinen, legt ein Bearbeiter
-- "Neue Wohnung" an (Name kommt aus dem Woerterbuch der App).
create function public.grundriss_sicherstellen(p_project uuid, p_name text default null)
returns uuid language plpgsql set search_path = public as $fn$
declare
  v_id uuid;
begin
  select id into v_id from public.grundrisse where project_id = p_project order by sort, created_at limit 1;
  if v_id is not null or not public.is_editor(p_project) then
    return v_id;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('grundriss-erster:' || p_project::text, 0));
  select id into v_id from public.grundrisse where project_id = p_project order by sort, created_at limit 1;
  if v_id is null then
    insert into public.grundrisse (project_id, name, sort)
    values (p_project, coalesce(nullif(btrim(p_name), ''), 'Neue Wohnung'), 0)
    returning id into v_id;
  end if;
  return v_id;
end $fn$;

-- Alles eines Grundrisses (oder nur eines Raums) mit fertigen Hoehen.
create function public.grundriss_laden(p_grundriss uuid, p_raum uuid default null)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  g public.grundrisse;
begin
  select * into g from public.grundrisse where id = p_grundriss;
  if g.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'grundriss', to_jsonb(g),
    'raeume', coalesce((
      select jsonb_agg(to_jsonb(r) || jsonb_build_object('tag_name', t.name, 'tag_short', t.short, 'tag_color', t.color)
                       order by r.sort, r.created_at)
        from public.raeume r left join public.tags t on t.id = r.tag_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'oeffnungen', coalesce((
      select jsonb_agg(to_jsonb(o) order by o.raum_id, o.kante, o.abstand_cm)
        from public.oeffnungen o join public.raeume r on r.id = o.raum_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'objekte', coalesce((
      select jsonb_agg(to_jsonb(o) || jsonb_build_object('item_code', i.code, 'item_title', i.title)
                       order by o.created_at)
        from public.objekte o join public.raeume r on r.id = o.raum_id
        left join public.items i on i.id = o.item_id
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb),
    'kisten', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'code', i.code, 'prefix', i.prefix, 'size', i.size, 'seq', i.seq,
               'kind', i.kind, 'status', i.status, 'title', i.title, 'room_id', i.room_id,
               'room_color', t.color, 'mark_color', i.mark_color, 'eigene_groesse_name', e.name,
               'platz_raum_id', i.platz_raum_id, 'platz_x', i.platz_x, 'platz_y', i.platz_y,
               'platz_drehung', i.platz_drehung, 'unterlage_art', i.unterlage_art,
               'unterlage_item_id', i.unterlage_item_id, 'unterlage_objekt_id', i.unterlage_objekt_id,
               'fach_ebene', i.fach_ebene, 'fach_spalte', i.fach_spalte,
               'laenge_cm', m.laenge_cm, 'breite_cm', m.breite_cm, 'hoehe_cm', m.hoehe_cm,
               'unten_cm', b.unten_cm, 'oben_cm', b.unten_cm + m.hoehe_cm, 'grenze_cm', b.grenze_cm,
               'wurzel_art', b.wurzel_art, 'nr', b.tiefe + 1)
             order by b.tiefe, i.code)
        from public.items i
        join public.raeume r on r.id = i.platz_raum_id
        left join public.tags t on t.id = i.room_id
        left join public.eigene_groessen e on e.id = i.eigene_groesse_id
        cross join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m
        cross join lateral public.kiste_basis(i.id) b
       where r.grundriss_id = g.id and (p_raum is null or r.id = p_raum)), '[]'::jsonb));
end $fn$;

-- Wo steht eine Kiste (oder ein Moebel ueber sein Objekt)? null = kein Platz.
create function public.kiste_lage(p_item uuid)
returns jsonb language plpgsql stable set search_path = public as $fn$
declare
  i     public.items;
  u     public.items;
  o     public.objekte;
  r     public.raeume;
  g     public.grundrisse;
  v_tag text;
  m     record;
  b     record;
begin
  select * into i from public.items where id = p_item;
  if i.id is null then
    return null;
  end if;
  if i.kind = 'furniture' then
    select * into o from public.objekte where item_id = i.id;
    if o.id is null then return null; end if;
    select * into r from public.raeume where id = o.raum_id;
    select * into g from public.grundrisse where id = r.grundriss_id;
    select name into v_tag from public.tags where id = r.tag_id;
    return jsonb_build_object(
      'art', 'moebel',
      'grundriss', jsonb_build_object('id', g.id, 'name', g.name),
      'raum', jsonb_build_object('id', r.id, 'name', coalesce(nullif(r.name, ''), v_tag), 'tag_id', r.tag_id),
      'objekt', jsonb_build_object('id', o.id, 'name', o.name, 'art', o.art),
      'unten_cm', 0, 'oben_cm', o.hoehe_cm);
  end if;
  if i.platz_raum_id is null then
    return null;
  end if;
  select * into r from public.raeume where id = i.platz_raum_id;
  select * into g from public.grundrisse where id = r.grundriss_id;
  select name into v_tag from public.tags where id = r.tag_id;
  select * into m from public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id);
  select * into b from public.kiste_basis(i.id);
  if i.unterlage_art = 'kiste' then
    select * into u from public.items where id = i.unterlage_item_id;
  elsif i.unterlage_art in ('objekt', 'fach') then
    select * into o from public.objekte where id = i.unterlage_objekt_id;
  end if;
  return jsonb_build_object(
    'art', 'kiste',
    'grundriss', jsonb_build_object('id', g.id, 'name', g.name),
    'raum', jsonb_build_object('id', r.id, 'name', coalesce(nullif(r.name, ''), v_tag), 'tag_id', r.tag_id),
    'platz_x', i.platz_x, 'platz_y', i.platz_y, 'drehung', i.platz_drehung,
    'unterlage_art', i.unterlage_art, 'unterlage_item_id', i.unterlage_item_id, 'unterlage_code', u.code,
    'objekt', case when o.id is null then null
                   else jsonb_build_object('id', o.id, 'name', o.name, 'art', o.art) end,
    'fach_ebene', i.fach_ebene, 'fach_spalte', i.fach_spalte,
    'laenge_cm', m.laenge_cm, 'breite_cm', m.breite_cm, 'hoehe_cm', m.hoehe_cm,
    'unten_cm', b.unten_cm, 'oben_cm', b.unten_cm + m.hoehe_cm, 'grenze_cm', b.grenze_cm,
    'nr', b.tiefe + 1,
    'auf_ihr', coalesce((select jsonb_agg(c.code order by c.code) from public.items c
                          where c.unterlage_item_id = i.id), '[]'::jsonb));
end $fn$;

-- Platz setzen (Handy, Zeichner). Die Datenbank prueft, die Antwort ist die neue Lage.
create function public.platz_setzen(p_item uuid, p_raum uuid, p_x int, p_y int,
  p_drehung int default 0, p_unterlage text default 'boden',
  p_unterlage_item uuid default null, p_unterlage_objekt uuid default null,
  p_ebene int default null, p_spalte int default null)
returns jsonb language plpgsql set search_path = public as $fn$
begin
  update public.items
     set platz_raum_id = p_raum, platz_x = p_x, platz_y = p_y, platz_drehung = p_drehung,
         unterlage_art = p_unterlage, unterlage_item_id = p_unterlage_item,
         unterlage_objekt_id = p_unterlage_objekt, fach_ebene = p_ebene, fach_spalte = p_spalte
   where id = p_item;
  if not found then
    raise exception 'Kiste nicht gefunden oder keine Rechte'
      using errcode = 'insufficient_privilege', hint = 'kistly:grundriss.keine_rechte';
  end if;
  return public.kiste_lage(p_item);
end $fn$;

-- Vom Platz nehmen. Was darauf lag, rutscht nach (items_platz_nachher).
create function public.platz_raeumen(p_item uuid)
returns void language plpgsql set search_path = public as $fn$
begin
  update public.items set platz_raum_id = null where id = p_item;
  if not found then
    raise exception 'Kiste nicht gefunden oder keine Rechte'
      using errcode = 'insufficient_privilege', hint = 'kistly:grundriss.keine_rechte';
  end if;
end $fn$;

create function public.grundriss_kisten_zahl(p_grundriss uuid)
returns int language sql stable set search_path = public as $fn$
  select count(*)::int from public.items i
    join public.raeume r on r.id = i.platz_raum_id
   where r.grundriss_id = p_grundriss
$fn$;

-- Speichern aus dem Zeichner: viele Aenderungen in einem Vorgang, am Ende
-- wird jeder beruehrte Raum vollstaendig geprueft. p_aenderung (alle Teile
-- freiwillig; ids vergibt der Browser mit crypto.randomUUID):
-- { "oeffnungen_loeschen": [uuid], "objekte_loeschen": [uuid], "raeume_loeschen": [uuid],
--   "raeume":     [{id, tag_id, name, art, punkte:[x0,y0,...], hoehe_cm, bodenfarbe, wandfarben:[..], sort}],
--   "verschieben":[{raum_id, dx, dy}],            -- Raum samt Inhalt verschieben
--   "objekte":    [{id, raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, form,
--                   ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke, brett_cm:[..], spalten, farbe, item_id}],
--   "zuordnen":   [{von_raum_id, nach_raum_id}],  -- nach dem Teilen: Inhalt, der im neuen Raum liegt, umhaengen
--   "oeffnungen": [{id, raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm, anschlag, aufschlag}] }
create function public.grundriss_speichern(p_grundriss uuid, p_version int, p_aenderung jsonb)
returns jsonb language plpgsql set search_path = public as $fn$
declare
  g        public.grundrisse;
  e        jsonb;
  v_raum   uuid;
  v_raeume uuid[] := '{}';
  v_ids    uuid[];
  v_neu    int;
  v_dx     int;
  v_dy     int;
  rv       public.raeume;
  rn       public.raeume;
  o        public.objekte;
  v_a      jsonb := coalesce(p_aenderung, '{}'::jsonb);
begin
  select * into g from public.grundrisse where id = p_grundriss;
  if g.id is null then
    perform public.grundriss_werfen(public.grundriss_fehler('grundriss_fehlt'));
  end if;
  if not public.is_editor(g.project_id) then
    perform public.grundriss_werfen(public.grundriss_fehler('keine_rechte'));
  end if;
  select * into g from public.grundrisse where id = p_grundriss for update;
  if g.version <> p_version then
    perform public.grundriss_werfen(public.grundriss_fehler('veraltet', jsonb_build_object('version', g.version)));
  end if;

  perform set_config('kistly.spaeter', 'an', true);
  for v_raum in select id from public.raeume where grundriss_id = p_grundriss order by id::text loop
    perform public.raum_sperre(v_raum, true);
  end loop;

  -- Fremde ids: nichts aus einem anderen Grundriss anfassen.
  if exists (select 1 from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) el
               join public.raeume r on r.id = (el->>'id')::uuid
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) el
               join public.objekte o2 on o2.id = (el->>'id')::uuid
               join public.raeume r on r.id = o2.raum_id
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) el
               join public.oeffnungen o3 on o3.id = (el->>'id')::uuid
               join public.raeume r on r.id = o3.raum_id
              where r.grundriss_id <> p_grundriss)
     or exists (select 1 from jsonb_array_elements(coalesce(v_a->'objekte', '[]') || coalesce(v_a->'oeffnungen', '[]')) el
              where (el->>'raum_id')::uuid not in (select id from public.raeume where grundriss_id = p_grundriss)
                and (el->>'raum_id')::uuid not in (
                      select (y->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) y)) then
    perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
  end if;

  -- 1. Loeschen (Oeffnungen, Objekte: Getragenes faellt auf den Boden, Raeume: Plaetze leer)
  delete from public.oeffnungen o3 using public.raeume r
   where o3.raum_id = r.id and r.grundriss_id = p_grundriss
     and o3.id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'oeffnungen_loeschen', '[]')) el);
  v_ids := array(select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'objekte_loeschen', '[]')) el);
  v_raeume := v_raeume || array(select o2.raum_id from public.objekte o2 where o2.id = any(v_ids));
  delete from public.objekte o2 using public.raeume r
   where o2.raum_id = r.id and r.grundriss_id = p_grundriss and o2.id = any(v_ids);
  delete from public.raeume
   where grundriss_id = p_grundriss
     and id in (select (el #>> '{}')::uuid from jsonb_array_elements(coalesce(v_a->'raeume_loeschen', '[]')) el);

  -- 2. Raeume anlegen oder aendern
  for e in select * from jsonb_array_elements(coalesce(v_a->'raeume', '[]')) loop
    insert into public.raeume as r (id, grundriss_id, tag_id, name, art, punkte, hoehe_cm, bodenfarbe, wandfarben, sort)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), p_grundriss, nullif(e->>'tag_id', '')::uuid,
            coalesce(e->>'name', ''), coalesce(e->>'art', 'innen'),
            array(select v::int from jsonb_array_elements_text(e->'punkte') with ordinality a(v, n) order by n),
            coalesce((e->>'hoehe_cm')::int, 250), nullif(e->>'bodenfarbe', ''),
            case when jsonb_typeof(e->'wandfarben') = 'array' then
              array(select v from jsonb_array_elements_text(e->'wandfarben') with ordinality a(v, n) order by n) end,
            coalesce((e->>'sort')::int, 0))
    on conflict (id) do update set
      tag_id = excluded.tag_id, name = excluded.name, art = excluded.art, punkte = excluded.punkte,
      hoehe_cm = excluded.hoehe_cm, bodenfarbe = excluded.bodenfarbe, wandfarben = excluded.wandfarben,
      sort = excluded.sort
    where r.grundriss_id = p_grundriss
    returning r.id into v_raum;
    v_raeume := v_raeume || v_raum;
  end loop;

  -- 3. Raum samt Inhalt verschieben. Bodenstapel wandern hier, Getragenes
  --    wandert mit seinem Objekt (objekte_nachher).
  for e in select * from jsonb_array_elements(coalesce(v_a->'verschieben', '[]')) loop
    v_raum := (e->>'raum_id')::uuid; v_dx := (e->>'dx')::int; v_dy := (e->>'dy')::int;
    if not exists (select 1 from public.raeume where id = v_raum and grundriss_id = p_grundriss) then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    v_ids := array(select i.id from public.items i cross join lateral public.kiste_basis(i.id) b
                    where i.platz_raum_id = v_raum and b.wurzel_art = 'boden');
    update public.raeume
       set punkte = array(select case when u.n % 2 = 1 then u.v + v_dx else u.v + v_dy end
                            from unnest(punkte) with ordinality u(v, n) order by u.n)
     where id = v_raum;
    update public.objekte set x = x + v_dx, y = y + v_dy where raum_id = v_raum;
    update public.items set platz_x = platz_x + v_dx, platz_y = platz_y + v_dy where id = any(v_ids);
    v_raeume := v_raeume || v_raum;
  end loop;

  -- 4. Objekte anlegen oder aendern
  v_raeume := v_raeume || array(select o2.raum_id from public.objekte o2
     where o2.id in (select (el->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) el));
  for e in select * from jsonb_array_elements(coalesce(v_a->'objekte', '[]')) loop
    insert into public.objekte as ob (id, raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, drehung, form,
                                      ausschnitt_breite_cm, ausschnitt_tiefe_cm, ausschnitt_ecke, brett_cm, spalten,
                                      farbe, item_id)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), (e->>'raum_id')::uuid, e->>'art', coalesce(e->>'name', ''),
            (e->>'x')::int, (e->>'y')::int, (e->>'breite_cm')::int, (e->>'tiefe_cm')::int, (e->>'hoehe_cm')::int,
            coalesce((e->>'drehung')::smallint, 0), coalesce(e->>'form', 'rechteck'),
            (e->>'ausschnitt_breite_cm')::int, (e->>'ausschnitt_tiefe_cm')::int, nullif(e->>'ausschnitt_ecke', ''),
            case when jsonb_typeof(e->'brett_cm') = 'array' then
              array(select v::int from jsonb_array_elements_text(e->'brett_cm') with ordinality a(v, n) order by n) end,
            coalesce((e->>'spalten')::smallint, 1), nullif(e->>'farbe', ''), nullif(e->>'item_id', '')::uuid)
    on conflict (id) do update set
      raum_id = excluded.raum_id, art = excluded.art, name = excluded.name, x = excluded.x, y = excluded.y,
      breite_cm = excluded.breite_cm, tiefe_cm = excluded.tiefe_cm, hoehe_cm = excluded.hoehe_cm,
      drehung = excluded.drehung, form = excluded.form, ausschnitt_breite_cm = excluded.ausschnitt_breite_cm,
      ausschnitt_tiefe_cm = excluded.ausschnitt_tiefe_cm, ausschnitt_ecke = excluded.ausschnitt_ecke,
      brett_cm = excluded.brett_cm, spalten = excluded.spalten, farbe = excluded.farbe, item_id = excluded.item_id;
    v_raeume := v_raeume || (e->>'raum_id')::uuid;
  end loop;

  -- 5. Nach dem Teilen: was ganz im neuen Raum liegt, gehoert ihm
  for e in select * from jsonb_array_elements(coalesce(v_a->'zuordnen', '[]')) loop
    select * into rv from public.raeume where id = (e->>'von_raum_id')::uuid and grundriss_id = p_grundriss;
    select * into rn from public.raeume where id = (e->>'nach_raum_id')::uuid and grundriss_id = p_grundriss;
    if rv.id is null or rn.id is null then
      perform public.grundriss_werfen(public.grundriss_fehler('fremde_id'));
    end if;
    for o in select * from public.objekte where raum_id = rv.id loop
      if not exists (select 1 from public.objekt_rechtecke(o) q
                      where not public.geo_rechteck_im_polygon(rn.punkte, q.x0, q.y0, q.x1, q.y1)) then
        update public.objekte set raum_id = rn.id where id = o.id;   -- Getragenes folgt (objekte_nachher)
      end if;
    end loop;
    with recursive wurzeln as (
      select i.id from public.items i
       where i.platz_raum_id = rv.id and i.unterlage_art = 'boden'
         and public.geo_punkt_im_polygon(rn.punkte, i.platz_x, i.platz_y)
         and not public.geo_punkt_im_polygon(rv.punkte, i.platz_x, i.platz_y)),
    baum(id, tiefe) as (
      select id, 0 from wurzeln
      union all
      select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
       where baum.tiefe < 60)
    update public.items set platz_raum_id = rn.id where id in (select id from baum);
    v_raeume := v_raeume || rv.id || rn.id;
  end loop;

  -- 6. Oeffnungen anlegen oder aendern
  v_raeume := v_raeume || array(select o3.raum_id from public.oeffnungen o3
     where o3.id in (select (el->>'id')::uuid from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) el));
  for e in select * from jsonb_array_elements(coalesce(v_a->'oeffnungen', '[]')) loop
    insert into public.oeffnungen as oe (id, raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm,
                                         anschlag, aufschlag)
    values (coalesce((e->>'id')::uuid, gen_random_uuid()), (e->>'raum_id')::uuid, e->>'art', (e->>'kante')::int,
            (e->>'abstand_cm')::int, (e->>'breite_cm')::int, (e->>'hoehe_cm')::int,
            coalesce((e->>'bruestung_cm')::int, 0), coalesce(e->>'anschlag', 'links'), coalesce(e->>'aufschlag', 'innen'))
    on conflict (id) do update set
      raum_id = excluded.raum_id, art = excluded.art, kante = excluded.kante, abstand_cm = excluded.abstand_cm,
      breite_cm = excluded.breite_cm, hoehe_cm = excluded.hoehe_cm, bruestung_cm = excluded.bruestung_cm,
      anschlag = excluded.anschlag, aufschlag = excluded.aufschlag;
    v_raeume := v_raeume || (e->>'raum_id')::uuid;
  end loop;

  -- 7. Version hochzaehlen, Schalter aus, alles Beruehrte vollstaendig pruefen
  update public.grundrisse set version = version + 1 where id = p_grundriss returning version into v_neu;
  perform set_config('kistly.spaeter', '', true);
  for v_raum in select distinct ru from unnest(v_raeume) ru where ru is not null order by 1 loop
    perform public.grundriss_werfen(public.raum_fehler(v_raum));
  end loop;
  return jsonb_build_object('version', v_neu, 'daten', public.grundriss_laden(p_grundriss));
end $fn$;

-- ================================================ 13. Rechte
revoke execute on function
  public.geo_flaeche2(int[]),
  public.geo_strecken_schneiden(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_polygon_fehler(int[]),
  public.geo_punkt_lage(int[], bigint, bigint, int),
  public.geo_punkt_im_polygon(int[], int, int),
  public.geo_strecke_trifft_offen(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_rechteck_im_polygon(int[], int, int, int, int),
  public.geo_kante_laenge2(int[], int),
  public.kiste_traegt(int, int, smallint, int, int, int, int),
  public.objekt_lokal(public.objekte, int, int),
  public.objekt_global(public.objekte, int, int),
  public.objekt_enthaelt(public.objekte, int, int),
  public.objekt_im_fach(public.objekte, int, int, int),
  public.fach_decke(public.objekte, int),
  public.faecher_gueltig(int[], int),
  public.objekt_rechtecke(public.objekte),
  public.grundriss_fehler(text, jsonb),
  public.grundriss_werfen(jsonb),
  public.grundriss_spaeter(),
  public.kiste_basis(uuid),
  public.platz_fehler(public.items, boolean),
  public.objekt_fehler(public.objekte, public.raeume),
  public.oeffnung_fehler(public.oeffnungen, public.raeume),
  public.raum_inhalt_fehler(public.raeume),
  public.raum_verstoesse(uuid),
  public.raum_fehler(uuid),
  public.platz_nachruecken(public.items, public.items),
  public.grundriss_sicherstellen(uuid, text),
  public.grundriss_laden(uuid, uuid),
  public.kiste_lage(uuid),
  public.platz_setzen(uuid, uuid, int, int, int, text, uuid, uuid, int, int),
  public.platz_raeumen(uuid),
  public.grundriss_kisten_zahl(uuid),
  public.grundriss_speichern(uuid, int, jsonb),
  public.grundrisse_vorher(), public.raeume_vorher(), public.oeffnungen_vorher(),
  public.objekte_vorher(), public.objekte_nachher(), public.objekte_weg(),
  public.items_a_platz_sperre(), public.items_platz_pruefen(), public.items_platz_nachher(),
  public.items_platz_weg()
from public, anon;

grant execute on function
  public.geo_flaeche2(int[]),
  public.geo_strecken_schneiden(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_polygon_fehler(int[]),
  public.geo_punkt_lage(int[], bigint, bigint, int),
  public.geo_punkt_im_polygon(int[], int, int),
  public.geo_strecke_trifft_offen(bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint),
  public.geo_rechteck_im_polygon(int[], int, int, int, int),
  public.geo_kante_laenge2(int[], int),
  public.kiste_traegt(int, int, smallint, int, int, int, int),
  public.objekt_lokal(public.objekte, int, int),
  public.objekt_global(public.objekte, int, int),
  public.objekt_enthaelt(public.objekte, int, int),
  public.objekt_im_fach(public.objekte, int, int, int),
  public.fach_decke(public.objekte, int),
  public.faecher_gueltig(int[], int),
  public.objekt_rechtecke(public.objekte),
  public.grundriss_fehler(text, jsonb),
  public.grundriss_werfen(jsonb),
  public.grundriss_spaeter(),
  public.kiste_basis(uuid),
  public.platz_fehler(public.items, boolean),
  public.objekt_fehler(public.objekte, public.raeume),
  public.oeffnung_fehler(public.oeffnungen, public.raeume),
  public.raum_inhalt_fehler(public.raeume),
  public.raum_verstoesse(uuid),
  public.raum_fehler(uuid),
  public.platz_nachruecken(public.items, public.items),
  public.grundriss_sicherstellen(uuid, text),
  public.grundriss_laden(uuid, uuid),
  public.kiste_lage(uuid),
  public.platz_setzen(uuid, uuid, int, int, int, text, uuid, uuid, int, int),
  public.platz_raeumen(uuid),
  public.grundriss_kisten_zahl(uuid),
  public.grundriss_speichern(uuid, int, jsonb),
  public.raum_sperre(uuid, boolean)
to authenticated;
```

Hinweise zu 0028:

- `raum_sperre` (0025) wird wiederverwendet; 0031 laesst sie stehen.
- Der alte Trigger `items_a_sperre` (0025) laeuft bis 0031 weiter; er sperrt nur
  bei Aenderungen an `plan_*`, `size`, `kind` die Zimmer-Tags und stoert die
  neuen Sperren nicht (andere Schluessel).
- `items_plan` (0022) laeuft bis 0031 weiter, prueft aber nach 0029 nichts
  mehr, weil `plan_x` dann ueberall leer ist.
- Tausch der Zimmer zweier Raeume in EINEM `grundriss_speichern` scheitert am
  eindeutigen Index; der Zeichner macht das in zwei Schritten.

**Probelauf 0028** (0027 ist angewandt; Teil A = Dateitext 0028):

```sql
do $probe$
declare
  v_bericht text := '';
  v_user uuid; v_fremd uuid := gen_random_uuid();
  v_projekt uuid; v_wz uuid; v_kue uuid; v_g uuid; v_raum uuid; v_raum2 uuid;
  v_regal uuid; v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_e uuid; v_eg uuid;
  v_hint text; v_det text; v_j jsonb; v_n int; v_t text; v_ver int; v_x int;
begin
  -- ===== A. Text von 0028_grundriss_modell.sql hier einfuegen =====

  -- ===== B0. Geometrie-Faelle (dieselben stehen in scripts/geometrie-pruefen.mjs) =====
  v_bericht := v_bericht || E'\nGeometrie:'
    || ' lage(rechteck,200,150)=' || public.geo_punkt_lage('{0,0,400,0,400,300,0,300}', 200, 150)
    || ' lage(rand 0,150)=' || public.geo_punkt_lage('{0,0,400,0,400,300,0,300}', 0, 150)
    || ' lage(401,150)=' || public.geo_punkt_lage('{0,0,400,0,400,300,0,300}', 401, 150)
    || ' lage(L,300,300)=' || public.geo_punkt_lage('{0,0,400,0,400,200,200,200,200,400,0,400}', 300, 300)
    || ' lage(L,200,300)=' || public.geo_punkt_lage('{0,0,400,0,400,200,200,200,200,400,0,400}', 200, 300)
    || ' rechteck_in_L(10,10,190,390)=' || public.geo_rechteck_im_polygon('{0,0,400,0,400,200,200,200,200,400,0,400}', 10, 10, 190, 390)
    || ' rechteck_in_L(150,150,250,250)=' || public.geo_rechteck_im_polygon('{0,0,400,0,400,200,200,200,200,400,0,400}', 150, 150, 250, 250)
    || ' fehler(gegen Uhrzeiger)=' || coalesce(public.geo_polygon_fehler('{0,0,0,300,400,300,400,0}'), 'null')
    || ' fehler(Schleife)=' || coalesce(public.geo_polygon_fehler('{0,0,400,300,400,0,0,300}'), 'null')
    || ' fehler(zurueck)=' || coalesce(public.geo_polygon_fehler('{0,0,400,0,300,0,300,300,0,300}'), 'null')
    || ' kante2(Dreieck,2)=' || public.geo_kante_laenge2('{0,0,300,0,300,400}', 2);
  -- erwartet: 1, 0, -1, -1, 0, true, false, umlauf, kreuzt, kreuzt, 250000

  -- ===== B. Testumzug =====
  select id into v_user from auth.users order by created_at limit 1;
  insert into public.projects (name, owner_id) values ('Probelauf 0028', v_user) returning id into v_projekt;
  insert into public.project_members (project_id, user_id, role) values (v_projekt, v_user, 'owner');
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.tags (project_id, kind, name, short) values (v_projekt, 'room', 'Wohnzimmer', 'PW') returning id into v_wz;
  insert into public.tags (project_id, kind, name, short) values (v_projekt, 'room', 'Kueche', 'PK') returning id into v_kue;
  v_g := public.grundriss_sicherstellen(v_projekt, 'Neue Wohnung');
  v_bericht := v_bericht || E'\nGrundriss angelegt, zweiter Aufruf gleich: '
    || (public.grundriss_sicherstellen(v_projekt, 'X') = v_g)::text;

  -- Raum 400 x 300, Hoehe 250
  insert into public.raeume (grundriss_id, tag_id, punkte) values (v_g, v_wz, '{0,0,400,0,400,300,0,300}')
    returning id into v_raum;

  -- Ablehnungen am Raum
  begin
    insert into public.raeume (grundriss_id, punkte) values (v_g, '{0,0,0,300,400,300,400,0}');
    v_bericht := v_bericht || E'\nFEHLER: Raum gegen den Uhrzeigersinn ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nRaum gegen Uhrzeigersinn: ' || coalesce(v_hint, '?');
  end;
  begin
    insert into public.raeume (grundriss_id, tag_id, punkte) values (v_g, v_wz, '{500,0,900,0,900,300,500,300}');
    v_bericht := v_bericht || E'\nFEHLER: Zimmer doppelt ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nZimmer doppelt: ' || coalesce(v_hint, '?');
  end;

  -- Tuer auf Kante 0 (oben), 80 breit bei 50 cm; zu breite Tuer
  insert into public.oeffnungen (raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm)
    values (v_raum, 'tuer', 0, 50, 80, 200);
  begin
    insert into public.oeffnungen (raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm, bruestung_cm)
      values (v_raum, 'fenster', 1, 250, 100, 120, 90);
    v_bericht := v_bericht || E'\nFEHLER: zu breites Fenster ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nFenster 250+100 auf 300er Kante: ' || coalesce(v_hint, '?');
  end;

  -- Regal 80 x 30 x 180 bei (10,10), Bretter 0/40/80/120
  insert into public.objekte (raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, brett_cm)
    values (v_raum, 'regal', 'Billy', 10, 10, 80, 30, 180, '{0,40,80,120}') returning id into v_regal;
  begin
    insert into public.objekte (raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm)
      values (v_raum, 'moebel', 'Sofa', 350, 100, 200, 90, 80);
    v_bericht := v_bericht || E'\nFEHLER: Moebel durch die Wand ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nMoebel durch die Wand: ' || coalesce(v_hint, '?');
  end;

  -- Kisten: A auf dem Boden, B auf A, C in Regal Ebene 2
  insert into public.items (project_id, room_id, size) values (v_projekt, v_wz, 5) returning id into v_a;   -- 44x33x31
  insert into public.items (project_id, room_id, size) values (v_projekt, v_wz, 5) returning id into v_b;
  insert into public.items (project_id, room_id, size) values (v_projekt, v_wz, 9) returning id into v_c;   -- 66x36x40
  insert into public.items (project_id, room_id, size) values (v_projekt, v_wz, 5) returning id into v_d;
  v_j := public.platz_setzen(v_a, v_raum, 200, 150);
  v_j := public.platz_setzen(v_b, v_raum, 205, 150, 0, 'kiste', v_a);
  v_bericht := v_bericht || E'\nB auf A: ' || (v_j->>'unten_cm') || ' bis ' || (v_j->>'oben_cm') || ' (erwartet 31 bis 62)';
  v_j := public.platz_setzen(v_d, v_raum, 30, 25, 0, 'fach', null, v_regal, 2, 1);
  v_bericht := v_bericht || E'\nD im Regal Ebene 2: ' || (v_j->>'unten_cm') || ' bis ' || (v_j->>'oben_cm')
    || ' Grenze ' || (v_j->>'grenze_cm') || ' (erwartet 40 bis 71, Grenze 78)';

  begin
    perform public.platz_setzen(v_c, v_raum, 500, 100);
    v_bericht := v_bericht || E'\nFEHLER: Kiste draussen ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nKiste draussen: ' || coalesce(v_hint, '?');
  end;
  begin
    perform public.platz_setzen(v_c, v_raum, 260, 150, 0, 'kiste', v_a);
    v_bericht := v_bericht || E'\nFEHLER: Kiste neben A ging als "darauf" durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_det = pg_exception_detail;
    v_bericht := v_bericht || E'\nnicht darauf: ' || coalesce(v_hint, '?') || ' ' || coalesce(v_det, '');
  end;
  begin
    perform public.platz_setzen(v_c, v_raum, 30, 25, 0, 'kiste', v_d);
    v_bericht := v_bericht || E'\nFEHLER: zu hoch im Fach ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_det = pg_exception_detail;
    v_bericht := v_bericht || E'\nzu hoch im Fach: ' || coalesce(v_hint, '?') || ' ' || coalesce(v_det, '');
  end;
  begin
    perform public.platz_setzen(v_a, v_raum, 205, 150, 0, 'kiste', v_b);
    v_bericht := v_bericht || E'\nFEHLER: Kreis ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nKreis A auf B: ' || coalesce(v_hint, '?');
  end;

  -- Groesse aendern: B wird zu hoch? (Boden-Stapel, Decke 250: 31+40 passt), eigene Groesse 240 hoch auf A
  insert into public.eigene_groessen (project_id, name, laenge_cm, breite_cm, hoehe_cm)
    values (v_projekt, 'Hoher Karton', 40, 30, 200) returning id into v_eg;
  update public.items set eigene_groesse_id = v_eg where id = v_b;   -- 31 + 200 = 231, passt
  begin
    update public.eigene_groessen set hoehe_cm = 240 where id = v_eg;   -- 31 + 240 > 250
    v_bericht := v_bericht || E'\nFEHLER: eigene Groesse zu hoch ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_det = pg_exception_detail;
    v_bericht := v_bericht || E'\neigene Groesse macht Stapel zu hoch: ' || coalesce(v_hint, '?') || ' ' || coalesce(v_det, '');
  end;

  -- Raum verkleinern, bis A draussen laege; Decke senken
  begin
    update public.raeume set punkte = '{0,0,150,0,150,300,0,300}' where id = v_raum;
    v_bericht := v_bericht || E'\nFEHLER: Raum verkleinert trotz Kisten';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_det = pg_exception_detail;
    v_bericht := v_bericht || E'\nRaum zu klein: ' || coalesce(v_hint, '?') || ' ' || coalesce(v_det, '');
  end;
  begin
    update public.raeume set hoehe_cm = 200 where id = v_raum;
    v_bericht := v_bericht || E'\nFEHLER: Decke gesenkt trotz hohem Stapel';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_det = pg_exception_detail;
    v_bericht := v_bericht || E'\nDecke zu niedrig: ' || coalesce(v_hint, '?') || ' ' || coalesce(v_det, '');
  end;

  -- Regal verschieben: D faehrt mit
  update public.objekte set x = 110 where id = v_regal;
  select platz_x into v_x from public.items where id = v_d;
  v_bericht := v_bericht || E'\nRegal um 100 verschoben, D jetzt bei x=' || v_x || ' (erwartet 130)';
  -- Regal drehen um seine Ecke (110,10) auf 90: Flaeche x 80..110, y 10..90
  update public.objekte set drehung = 90 where id = v_regal;
  select platz_x || ',' || platz_y || ' Drehung ' || platz_drehung into v_t from public.items where id = v_d;
  v_bericht := v_bericht || E'\nRegal gedreht, D jetzt ' || v_t || ' (erwartet 95,30 Drehung 90)';

  -- Nachruecken: A loeschen, B faellt auf den Boden
  delete from public.items where id = v_a;
  select unterlage_art || ' ' || platz_x || ',' || platz_y into v_t from public.items where id = v_b;
  v_bericht := v_bericht || E'\nA geloescht, B liegt jetzt: ' || v_t || ' (erwartet boden 205,150)';

  -- Batch: Raum verschieben, alte Version abgelehnt
  select version into v_ver from public.grundrisse where id = v_g;
  v_j := public.grundriss_speichern(v_g, v_ver, jsonb_build_object('verschieben',
           jsonb_build_array(jsonb_build_object('raum_id', v_raum, 'dx', 1000, 'dy', 0))));
  select platz_x into v_x from public.items where id = v_b;
  v_bericht := v_bericht || E'\nRaum um 1000 verschoben: Version ' || (v_j->>'version') || ', B bei x=' || v_x || ' (erwartet 1205)';
  begin
    perform public.grundriss_speichern(v_g, v_ver, '{}'::jsonb);
    v_bericht := v_bericht || E'\nFEHLER: alte Version ging durch';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nalte Version: ' || coalesce(v_hint, '?');
  end;

  -- Batch: teilen. Raum wird 1000..1200, neuer Raum 1200..1400 bekommt B (x 1205)
  v_raum2 := gen_random_uuid();
  select version into v_ver from public.grundrisse where id = v_g;
  v_j := public.grundriss_speichern(v_g, v_ver, jsonb_build_object(
    'raeume', jsonb_build_array(
      jsonb_build_object('id', v_raum, 'tag_id', v_wz, 'punkte', jsonb_build_array(1000,0,1200,0,1200,300,1000,300)),
      jsonb_build_object('id', v_raum2, 'tag_id', v_kue, 'punkte', jsonb_build_array(1200,0,1400,0,1400,300,1200,300))),
    'zuordnen', jsonb_build_array(jsonb_build_object('von_raum_id', v_raum, 'nach_raum_id', v_raum2))));
  select case when platz_raum_id = v_raum2 then 'neuer Raum' else 'alter Raum' end into v_t from public.items where id = v_b;
  v_bericht := v_bericht || E'\nnach dem Teilen steht B im ' || v_t || ' (erwartet neuer Raum)';

  -- Betrachter: fremder Nutzer ohne Mitgliedschaft
  perform set_config('request.jwt.claims', json_build_object('sub', v_fremd, 'role', 'authenticated')::text, true);
  begin
    perform public.platz_setzen(v_b, v_raum2, 1300, 100);
    v_bericht := v_bericht || E'\nFEHLER: Fremder konnte setzen';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    v_bericht := v_bericht || E'\nFremder setzt: ' || coalesce(v_hint, '?');
  end;
  v_n := jsonb_array_length(coalesce(public.grundriss_laden(v_g)->'kisten', '[]'::jsonb));
  v_bericht := v_bericht || E'\nFremder sieht Kisten: ' || v_n || ' (erwartet 0)';
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

  -- Verstoesse im ganzen Grundriss: keine
  select count(*) into v_n from public.raeume r cross join lateral public.raum_verstoesse(r.id) v where r.grundriss_id = v_g;
  v_bericht := v_bericht || E'\nVerstoesse am Ende: ' || v_n || ' (erwartet 0)';

  -- ===== E. Umzug loeschen: alle Kaskaden muessen durchlaufen =====
  execute 'reset role';
  delete from public.projects where id = v_projekt;
  v_bericht := v_bericht || E'\nUmzug mit Grundriss, Regal und Kisten geloescht: ok';

  raise exception 'PROBELAUF 0028%', v_bericht;
end $probe$;
```

Erwartete Hinweise im Bericht: `kistly:grundriss.raum_umlauf`,
`zimmer_doppelt`, `oeffnung_zu_breit`, `objekt_draussen`, `draussen`,
`nicht_darauf`, `zu_hoch` (Fach, `{"oben":111,"grenze":78}`), `kreis`, `zu_hoch`
(eigene Groesse), `kisten_draussen`, `zu_niedrig`, `veraltet`, `keine_rechte`.
Zum Regal-Drehen: lokale Lage von D ist (20,15) (nach dem Verschieben x=130,
y=25, Ursprung 110,10); bei 90 Grad wird daraus global (110-15, 10+20) =
(95, 30). Wer eine Zeile `FEHLER:` sieht oder eine andere Zahl als erwartet:
nicht anwenden, Ursache suchen, Datei anpassen, Probelauf wiederholen.

### 2.5 Migration 0029_grundriss_umrechnung.sql (Etappe 1)

Regeln aus START 5.3 und den Bewertungen: jede Kiste mit altem Platz ist danach
**genau einmal** gesetzt ODER steht mit Grund im Bericht; die Unterkante jeder
uebernommenen Kiste ist gleich der alten (sonst Abbruch); am Ende gibt es im
neuen Modell keinen Verstoss (sonst Abbruch); was sich nicht abbilden laesst
(Regal auf gekappter Randzelle, Bretter enger als 3 cm, Stapel, der mit 2 cm
Brettdicke nicht mehr unter das naechste Brett passt), kommt sichtbar in den
Bericht statt die Migration abzubrechen. Die alten Werte stehen im Bericht
(Sicherung), bevor `plan_*` geleert und eingefroren werden. Der Waechter lehnt
nur das Setzen von Werten ab, nicht das Leeren, damit Zimmer- und
Umzug-Loeschen weiter kaskadieren.

**Vorher in derselben Etappe ausliefern:** Woerterbuch-Schluessel
`fehler.db.raumplan.eingefroren` und `RaumPlan.tsx` nur lesend mit Hinweis
(Abschnitt 5.1). `public/sw.js` VERSION auf `kistly-v3`.

```sql
-- =====================================================================
-- Kistly 0029_grundriss_umrechnung
--
-- Der alte Raumplan (Raster, 0017 bis 0025) wird ins neue Modell (0028)
-- uebertragen und danach eingefroren (START 5.3):
--  - jeder room_plan ein Rechteck-Raum im ersten Grundriss des Umzugs
--    ("Neue Wohnung"), nebeneinander mit 100 cm Abstand; gesperrte Zellen
--    werden nicht nachgebildet, ihre Zahl steht im Bericht
--  - die Tuer eine Oeffnung auf der Kante ihrer Seite, mittig auf ihrer
--    Zelle, 80 cm breit (bei kurzer Kante so breit wie die Kante)
--  - jedes Regal ein Objekt "regal", brett_cm = boeden_cm
--  - jede Kiste auf die Mitte ihrer Zelle; Stapel werden Ketten "liegt
--    auf", Regalplaetze Faecher (Ebene = Brett, Spalte 1)
-- Bericht und Sicherung stehen in grundriss_umrechnung. Die alten
-- Tabellen bleiben bis 0031 stehen (nur lesbar), items.plan_* werden
-- geleert. Selbstpruefung: jede alte Kiste genau einmal gesetzt oder im
-- Bericht, gleiche Unterkante, keine Verstoesse. Sonst Abbruch.
-- =====================================================================

create table public.grundriss_umrechnung (
  id         bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  art        text not null check (art in ('raum', 'tuer', 'regal', 'kiste')),
  alt_id     uuid,          -- Zimmer-Tag, Regal oder Kiste
  neu_id     uuid,          -- Raum, Objekt, bei Kisten der Raum
  ergebnis   text not null check (ergebnis in ('uebernommen', 'nicht_uebernommen', 'hinweis')),
  grund      text,
  alt        jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index grundriss_umrechnung_project_idx on public.grundriss_umrechnung (project_id, art);
alter table public.grundriss_umrechnung enable row level security;
create policy grundriss_umrechnung_select on public.grundriss_umrechnung for select to authenticated
  using (public.is_member(project_id));
revoke all on public.grundriss_umrechnung from anon;
revoke insert, update, delete on public.grundriss_umrechnung from authenticated;

create function public.grundriss_umrechnen() returns void
language plpgsql set search_path = public as $fn$
declare
  v_projekt   uuid;
  v_grundriss uuid;
  v_raum      uuid;
  v_objekt    uuid;
  v_unter     uuid;
  v_item      uuid;
  rp          record;
  g           record;
  k           record;
  d           record;
  v_ox int; v_oy int; v_zeile int;
  v_b int; v_t int; v_ras int; v_spalten int; v_reihen int;
  v_cx int; v_cy int; v_kante int; v_breite int; v_abstand int;
  v_bw int; v_bd int; v_runde int := 0; v_zahl int;
  v_kennung text; v_code text;
begin
  lock table public.items, public.room_plans, public.regale in share row exclusive mode;
  perform set_config('kistly.spaeter', 'an', true);

  create temporary table umr_raum (tag_id uuid primary key, raum_id uuid not null,
    ox int not null, oy int not null, raster int not null, breite int not null, tiefe int not null) on commit drop;
  create temporary table umr_regal (regal_id uuid primary key, objekt_id uuid not null) on commit drop;
  create temporary table umr_kiste (item_id uuid primary key, alt jsonb not null,
    alt_unten int, grund text) on commit drop;

  -- 1. Jede Kiste mit altem Platz, mit alter Unterkante (Formel aus 0026;
  --    Hoehe ueber kiste_masse, damit eine schon vergebene eigene Groesse
  --    keinen Scheinfehler ausloest).
  insert into umr_kiste (item_id, alt, alt_unten)
  select i.id,
         jsonb_build_object('code', i.code, 'room_id', i.room_id, 'plan_x', i.plan_x, 'plan_y', i.plan_y,
                            'plan_z', i.plan_z, 'regal_id', i.regal_id, 'regal_boden', i.regal_boden),
         coalesce(rg.boeden_cm[i.regal_boden], 0) + coalesce((
           select sum(m.hoehe_cm)::int
             from public.items u
             cross join lateral public.kiste_masse(u.size, u.eigene_hoehe_cm, u.eigene_groesse_id) m
            where u.room_id = i.room_id and u.plan_x = i.plan_x and u.plan_y = i.plan_y
              and coalesce(u.regal_boden, 0) = coalesce(i.regal_boden, 0) and u.plan_z < i.plan_z), 0)
    from public.items i
    left join public.regale rg on rg.id = i.regal_id
   where i.plan_x is not null;

  -- 2. Raeume und Tueren
  for v_projekt in select distinct p.project_id from public.room_plans p order by 1 loop
    select id into v_grundriss from public.grundrisse
     where project_id = v_projekt order by sort, created_at limit 1;
    if v_grundriss is null then
      insert into public.grundrisse (project_id, name) values (v_projekt, 'Neue Wohnung')
      returning id into v_grundriss;
    end if;
    select coalesce(max(u.v) + 100, 0) into v_ox
      from public.raeume r cross join lateral unnest(r.punkte) with ordinality u(v, n)
     where r.grundriss_id = v_grundriss and u.n % 2 = 1;
    v_oy := 0; v_zeile := 0;

    for rp in select p.* from public.room_plans p join public.tags t on t.id = p.tag_id
               where p.project_id = v_projekt order by t.sort, t.name loop
      if exists (select 1 from public.raeume where grundriss_id = v_grundriss and tag_id = rp.tag_id) then
        insert into public.grundriss_umrechnung (project_id, art, alt_id, ergebnis, grund, alt)
        values (v_projekt, 'raum', rp.tag_id, 'nicht_uebernommen', 'zimmer_schon_gezeichnet', to_jsonb(rp));
        continue;
      end if;
      v_b := rp.breite_cm; v_t := rp.tiefe_cm; v_ras := rp.raster_cm;
      if v_ox > 0 and v_ox + v_b > 20000 then          -- neue Reihe
        v_ox := 0; v_oy := v_oy + v_zeile + 100; v_zeile := 0;
      end if;
      insert into public.raeume (grundriss_id, tag_id, punkte, hoehe_cm)
      values (v_grundriss, rp.tag_id,
              array[v_ox, v_oy, v_ox + v_b, v_oy, v_ox + v_b, v_oy + v_t, v_ox, v_oy + v_t], rp.hoehe_cm)
      returning id into v_raum;
      insert into umr_raum values (rp.tag_id, v_raum, v_ox, v_oy, v_ras, v_b, v_t);
      insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, grund, alt)
      values (v_projekt, 'raum', rp.tag_id, v_raum, 'uebernommen',
              case when jsonb_array_length(rp.gesperrt) > 0 then 'gesperrte_zellen_nicht_nachgebildet' end,
              jsonb_build_object('breite_cm', v_b, 'tiefe_cm', v_t, 'hoehe_cm', rp.hoehe_cm, 'raster_cm', v_ras,
                                 'gesperrt', jsonb_array_length(rp.gesperrt), 'tuer_x', rp.tuer_x,
                                 'tuer_y', rp.tuer_y, 'tuer_seite', rp.tuer_seite));

      if rp.tuer_x is not null then
        v_spalten := ceil(v_b::numeric / v_ras);
        v_reihen  := ceil(v_t::numeric / v_ras);
        v_cx := (rp.tuer_x * v_ras + least((rp.tuer_x + 1) * v_ras, v_b)) / 2;   -- Zellmitte im Raum
        v_cy := (rp.tuer_y * v_ras + least((rp.tuer_y + 1) * v_ras, v_t)) / 2;
        -- Kanten des Rechtecks: 0 oben (nord), 1 rechts (ost), 2 unten (sued, laeuft nach links),
        -- 3 links (west, laeuft nach oben)
        case rp.tuer_seite
          when 'nord' then v_kante := 0; v_breite := least(80, v_b);
                           v_abstand := greatest(0, least(v_cx - v_breite / 2, v_b - v_breite));
          when 'ost'  then v_kante := 1; v_breite := least(80, v_t);
                           v_abstand := greatest(0, least(v_cy - v_breite / 2, v_t - v_breite));
          when 'sued' then v_kante := 2; v_breite := least(80, v_b);
                           v_abstand := greatest(0, least((v_b - v_cx) - v_breite / 2, v_b - v_breite));
          else             v_kante := 3; v_breite := least(80, v_t);
                           v_abstand := greatest(0, least((v_t - v_cy) - v_breite / 2, v_t - v_breite));
        end case;
        insert into public.oeffnungen (raum_id, art, kante, abstand_cm, breite_cm, hoehe_cm)
        values (v_raum, 'tuer', v_kante, v_abstand, v_breite, least(200, rp.hoehe_cm));
        -- Sass die Tuer an einer inneren Zellkante (neben gesperrten Zellen), steht sie jetzt auf der
        -- Aussenkante derselben Seite. Das meldet der Bericht (Bewertung "Korrektheit").
        if not ((rp.tuer_seite = 'nord' and rp.tuer_y = 0) or (rp.tuer_seite = 'sued' and rp.tuer_y = v_reihen - 1)
             or (rp.tuer_seite = 'west' and rp.tuer_x = 0) or (rp.tuer_seite = 'ost' and rp.tuer_x = v_spalten - 1)) then
          insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, grund, alt)
          values (v_projekt, 'tuer', rp.tag_id, v_raum, 'hinweis', 'tuer_war_innen',
                  jsonb_build_object('tuer_x', rp.tuer_x, 'tuer_y', rp.tuer_y, 'tuer_seite', rp.tuer_seite));
        end if;
      end if;
      v_zeile := greatest(v_zeile, v_t);
      v_ox := v_ox + v_b + 100;
    end loop;
  end loop;

  -- 3. Regale
  for g in select rg.*, u.raum_id as n_raum, u.ox as n_ox, u.oy as n_oy, u.raster as n_raster,
                  u.breite as n_breite, u.tiefe as n_tiefe
             from public.regale rg join umr_raum u on u.tag_id = rg.tag_id loop
    v_bw := least((g.x + g.breite) * g.n_raster, g.n_breite) - g.x * g.n_raster;
    v_bd := least((g.y + g.tiefe) * g.n_raster, g.n_tiefe) - g.y * g.n_raster;
    if v_bw < 5 or v_bd < 5 or not public.faecher_gueltig(g.boeden_cm, g.hoehe_cm) then
      insert into public.grundriss_umrechnung (project_id, art, alt_id, ergebnis, grund, alt)
      values (g.project_id, 'regal', g.id, 'nicht_uebernommen',
              case when v_bw < 5 or v_bd < 5 then 'regal_zu_schmal' else 'bretter_passen_nicht' end,
              jsonb_build_object('name', g.name, 'x', g.x, 'y', g.y, 'breite', g.breite, 'tiefe', g.tiefe,
                                 'hoehe_cm', g.hoehe_cm, 'boeden_cm', g.boeden_cm));
      continue;
    end if;
    insert into public.objekte (raum_id, art, name, x, y, breite_cm, tiefe_cm, hoehe_cm, brett_cm, spalten)
    values (g.n_raum, 'regal', g.name, g.n_ox + g.x * g.n_raster, g.n_oy + g.y * g.n_raster,
            v_bw, v_bd, g.hoehe_cm, g.boeden_cm, 1)
    returning id into v_objekt;
    insert into umr_regal values (g.id, v_objekt);
    insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, alt)
    values (g.project_id, 'regal', g.id, v_objekt, 'uebernommen',
            jsonb_build_object('name', g.name, 'x', g.x, 'y', g.y, 'breite', g.breite, 'tiefe', g.tiefe,
                               'hoehe_cm', g.hoehe_cm, 'boeden_cm', g.boeden_cm));
  end loop;

  -- 4. Kisten, Stapel von unten nach oben
  for k in
    select i.id, i.room_id, i.plan_x, i.plan_y, i.plan_z, i.regal_id, i.regal_boden,
           u.raum_id as n_raum, u.ox as n_ox, u.oy as n_oy, u.raster as n_raster,
           u.breite as n_breite, u.tiefe as n_tiefe, ur.objekt_id as n_objekt
      from umr_kiste uk
      join public.items i on i.id = uk.item_id
      left join umr_raum u on u.tag_id = i.room_id
      left join umr_regal ur on ur.regal_id = i.regal_id
     order by i.room_id, i.plan_x, i.plan_y, coalesce(i.regal_boden, 0), i.plan_z
  loop
    if k.n_raum is null then
      update umr_kiste set grund = 'zimmer_nicht_uebernommen' where item_id = k.id;
      continue;
    end if;
    if k.regal_id is not null and k.n_objekt is null then
      update umr_kiste set grund = 'regal_nicht_uebernommen' where item_id = k.id;
      continue;
    end if;
    v_cx := k.n_ox + (k.plan_x * k.n_raster + least((k.plan_x + 1) * k.n_raster, k.n_breite)) / 2;
    v_cy := k.n_oy + (k.plan_y * k.n_raster + least((k.plan_y + 1) * k.n_raster, k.n_tiefe)) / 2;
    if k.plan_z > 0 then
      select i2.id into v_unter from public.items i2
       where i2.room_id = k.room_id and i2.plan_x = k.plan_x and i2.plan_y = k.plan_y
         and coalesce(i2.regal_boden, 0) = coalesce(k.regal_boden, 0) and i2.plan_z = k.plan_z - 1;
      if v_unter is null or not exists (select 1 from public.items where id = v_unter and platz_raum_id is not null) then
        update umr_kiste set grund = 'darunter_nicht_uebernommen' where item_id = k.id;
        continue;
      end if;
      update public.items
         set platz_raum_id = k.n_raum, platz_x = v_cx, platz_y = v_cy, platz_drehung = 0,
             unterlage_art = 'kiste', unterlage_item_id = v_unter
       where id = k.id;
    elsif k.regal_id is not null then
      update public.items
         set platz_raum_id = k.n_raum, platz_x = v_cx, platz_y = v_cy, platz_drehung = 0,
             unterlage_art = 'fach', unterlage_objekt_id = k.n_objekt,
             fach_ebene = k.regal_boden, fach_spalte = 1
       where id = k.id;
    else
      update public.items
         set platz_raum_id = k.n_raum, platz_x = v_cx, platz_y = v_cy, platz_drehung = 0,
             unterlage_art = 'boden'
       where id = k.id;
    end if;
  end loop;

  -- 5. Aufraeumen: eine Kiste, die gegen eine Regel verstoesst, kommt mit
  --    allem, was darauf liegt, in den Bericht (von oben nach unten leeren).
  loop
    v_runde := v_runde + 1;
    if v_runde > 1000 then
      raise exception 'Umrechnung: Aufraeumen endet nicht';
    end if;
    v_item := null;
    select v.kiste_id, v.kennung into v_item, v_kennung
      from umr_raum u cross join lateral public.raum_verstoesse(u.raum_id) v
     where v.kiste_id is not null
     limit 1;
    exit when v_item is null;
    for d in
      with recursive baum(id, tiefe) as (
        select v_item, 0
        union all
        select i.id, baum.tiefe + 1 from public.items i join baum on i.unterlage_item_id = baum.id
         where baum.tiefe < 60)
      select baum.id from baum order by baum.tiefe desc
    loop
      update public.items set platz_raum_id = null where id = d.id;
      update umr_kiste
         set grund = case when d.id = v_item then v_kennung else 'darunter_' || v_kennung end
       where item_id = d.id;
    end loop;
  end loop;

  -- 6. Selbstpruefung
  select count(*) into v_zahl
    from umr_raum u cross join lateral public.raum_verstoesse(u.raum_id) v
   where v.kiste_id is null;
  if v_zahl > 0 then
    raise exception 'Umrechnung: % Verstoesse an Raeumen, Tueren oder Regalen', v_zahl;
  end if;
  select count(*) into v_zahl
    from umr_kiste uk join public.items i on i.id = uk.item_id
   where (i.platz_raum_id is not null) = (uk.grund is not null);
  if v_zahl > 0 then
    raise exception 'Umrechnung: % Kisten ohne eindeutiges Ergebnis', v_zahl;
  end if;
  select count(*), min(i.code) into v_zahl, v_code
    from umr_kiste uk join public.items i on i.id = uk.item_id
    cross join lateral public.kiste_basis(i.id) b
   where i.platz_raum_id is not null and b.unten_cm is distinct from uk.alt_unten;
  if v_zahl > 0 then
    raise exception 'Umrechnung: % Kisten mit anderer Unterkante, zuerst %', v_zahl, v_code;
  end if;
  if (select count(*) from umr_raum)
     <> (select count(*) from public.room_plans)
      - (select count(*) from public.grundriss_umrechnung where art = 'raum' and ergebnis = 'nicht_uebernommen') then
    raise exception 'Umrechnung: Zahl der Raeume passt nicht zur Zahl der Plaene';
  end if;

  -- 7. Bericht je Kiste (mit den alten Werten als Sicherung)
  insert into public.grundriss_umrechnung (project_id, art, alt_id, neu_id, ergebnis, grund, alt)
  select i.project_id, 'kiste', i.id, i.platz_raum_id,
         case when uk.grund is null then 'uebernommen' else 'nicht_uebernommen' end,
         uk.grund, uk.alt || jsonb_build_object('alt_unten', uk.alt_unten)
    from umr_kiste uk join public.items i on i.id = uk.item_id;

  perform set_config('kistly.spaeter', '', true);
end $fn$;

-- Aufruf. Im Probelauf steht hier: perform public.grundriss_umrechnen();
select public.grundriss_umrechnen();

drop function public.grundriss_umrechnen();

-- ------------------------------------------------ Altes Raster einfrieren
drop trigger if exists items_stapel_nachruecken on public.items;

update public.items
   set plan_x = null, plan_y = null, plan_z = null, regal_id = null, regal_boden = null
 where plan_x is not null or regal_id is not null;

-- Setzen lehnt der Waechter ab, Leeren nicht (Kaskaden beim Loeschen von
-- Zimmer oder Umzug laufen weiter). Alte, noch zwischengespeicherte Apps
-- bekommen einen zweisprachigen Satz ueber fehler.db.raumplan.eingefroren.
create function public.items_plan_eingefroren() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if (tg_op = 'INSERT' and num_nonnulls(new.plan_x, new.plan_y, new.plan_z, new.regal_id, new.regal_boden) > 0)
     or (tg_op = 'UPDATE' and (
          (new.plan_x is not null and new.plan_x is distinct from old.plan_x)
       or (new.plan_y is not null and new.plan_y is distinct from old.plan_y)
       or (new.plan_z is not null and new.plan_z is distinct from old.plan_z)
       or (new.regal_id is not null and new.regal_id is distinct from old.regal_id)
       or (new.regal_boden is not null and new.regal_boden is distinct from old.regal_boden))) then
    raise exception 'Der alte Raumplan ist abgeloest. Bitte die App neu laden.'
      using errcode = 'check_violation', hint = 'kistly:raumplan.eingefroren';
  end if;
  return new;
end $fn$;
create trigger items_plan_eingefroren before insert or update on public.items
  for each row execute function public.items_plan_eingefroren();

create function public.raumplan_eingefroren() returns trigger
language plpgsql set search_path = public as $fn$
begin
  raise exception 'Der alte Raumplan ist abgeloest. Bitte die App neu laden.'
    using errcode = 'check_violation', hint = 'kistly:raumplan.eingefroren';
end $fn$;
create trigger room_plans_eingefroren before insert or update on public.room_plans
  for each row execute function public.raumplan_eingefroren();
create trigger regale_eingefroren before insert or update on public.regale
  for each row execute function public.raumplan_eingefroren();

revoke execute on function public.items_plan_eingefroren(), public.raumplan_eingefroren() from public, anon;

-- --------------------------- Suche uebergangsweise auf das neue Modell
-- Gleiche Signatur und Spalten wie 0026, damit die App bis Etappe 3
-- unveraendert weiter sucht: plan_x/plan_y tragen den Mittelpunkt in cm,
-- plan_z die Zahl der Kisten darunter, regal_name/regal_boden das Objekt
-- und die Ebene eines Fachs. 0030 ersetzt das durch die endgueltige Fassung.
create or replace function public.inhalt_suchen(p_q text, p_max int default 60)
returns table (
  content_id uuid, inhalt text, menge int, schicht smallint, photo_id uuid, foto_pfad text,
  box_x0 numeric, box_y0 numeric, box_x1 numeric, box_y1 numeric, punkt_x numeric, punkt_y numeric,
  ausschnitt_pfad text, bestaetigt boolean,
  item_id uuid, item_code text, item_kind text, item_title text, item_status text,
  project_id uuid, project_name text,
  room_id uuid, room_name text, room_color text,
  plan_x int, plan_y int, plan_z int, regal_name text, regal_boden smallint,
  hoehe_von int, hoehe_bis int, treffer real)
language sql stable security invoker set search_path = public, extensions as $fn$
  with q as (select public.such_normal(p_q) as n)
  select
    c.id, c.text, c.qty, c.schicht, c.photo_id, f.path,
    c.box_x0, c.box_y0, c.box_x1, c.box_y1, c.punkt_x, c.punkt_y,
    c.ausschnitt_pfad, c.bestaetigt,
    i.id, i.code, i.kind::text, i.title, i.status::text,
    p.id, p.name,
    t.id, t.name, t.color,
    i.platz_x, i.platz_y, case when i.platz_raum_id is null then null else b.tiefe end,
    case when i.unterlage_art = 'fach' then o.name end,
    case when i.unterlage_art = 'fach' then i.fach_ebene end,
    b.unten_cm, b.unten_cm + m.hoehe_cm,
    (case
      when c.such_text = q.n then 1.0
      when strpos(' ' || c.such_text || ' ', ' ' || q.n || ' ') > 0 then 0.95
      when strpos(' ' || c.such_text, ' ' || q.n) > 0 then 0.9
      when strpos(c.such_text, q.n) > 0 then 0.8
      else least(extensions.word_similarity(q.n, c.such_text), 0.79)
    end)::real
  from q
  join public.item_contents c
    on strpos(c.such_text, q.n) > 0
    or extensions.word_similarity(q.n, c.such_text) >= 0.45
  join public.items i on i.id = c.item_id
  join public.projects p on p.id = i.project_id
  left join public.item_photos f on f.id = c.photo_id
  left join public.tags t on t.id = i.room_id
  left join public.objekte o on o.id = i.unterlage_objekt_id
  left join lateral public.kiste_basis(i.id) b on true
  left join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m on true
  where length(q.n) >= 2
  order by 32 desc, length(c.text), c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;
```

**Probelauf 0029** (auf den echten Daten; 0027 und 0028 sind angewandt). Teil A
ist der Dateitext mit `perform` statt `select` beim Aufruf. Danach nur lesen:

```sql
do $probe$
declare
  v_bericht text := '';
  z record;
  v_n int;
begin
  -- ===== A. Text von 0029_grundriss_umrechnung.sql (select -> perform) =====

  -- ===== B. Bericht =====
  for z in
    select p.name as umzug,
           count(*) filter (where u.art = 'raum' and u.ergebnis = 'uebernommen') as raeume,
           count(*) filter (where u.art = 'raum' and u.ergebnis <> 'uebernommen') as raeume_nicht,
           count(*) filter (where u.art = 'tuer') as tueren_innen,
           count(*) filter (where u.art = 'regal' and u.ergebnis = 'uebernommen') as regale,
           count(*) filter (where u.art = 'regal' and u.ergebnis <> 'uebernommen') as regale_nicht,
           count(*) filter (where u.art = 'kiste' and u.ergebnis = 'uebernommen') as kisten,
           count(*) filter (where u.art = 'kiste' and u.ergebnis <> 'uebernommen') as kisten_nicht,
           coalesce(sum((u.alt->>'gesperrt')::int) filter (where u.art = 'raum'), 0) as gesperrt
      from public.grundriss_umrechnung u join public.projects p on p.id = u.project_id
     group by p.name order by p.name
  loop
    v_bericht := v_bericht || format(E'\n%s: Raeume %s (nicht %s, gesperrte Zellen %s), Tueren innen %s, Regale %s (nicht %s), Kisten %s (nicht %s)',
      z.umzug, z.raeume, z.raeume_nicht, z.gesperrt, z.tueren_innen, z.regale, z.regale_nicht, z.kisten, z.kisten_nicht);
  end loop;
  for z in
    select u.alt->>'code' as code, u.alt->>'plan_x' as x, u.alt->>'plan_y' as y, u.alt->>'plan_z' as z,
           u.alt->>'regal_boden' as brett, u.alt->>'alt_unten' as alt_unten,
           i.unterlage_art, b.unten_cm, u.ergebnis, u.grund
      from public.grundriss_umrechnung u
      join public.items i on i.id = u.alt_id
      left join lateral public.kiste_basis(i.id) b on true
     where u.art = 'kiste' order by 1
  loop
    v_bericht := v_bericht || format(E'\n  %s alt Zelle %s/%s Lage %s Brett %s ab %s cm -> %s',
      z.code, z.x, z.y, z.z, coalesce(z.brett, '-'), z.alt_unten,
      case when z.ergebnis = 'uebernommen' then z.unterlage_art || ' ab ' || z.unten_cm || ' cm'
           else 'NICHT uebernommen: ' || z.grund end);
  end loop;
  select count(*) into v_n from public.items where plan_x is not null;
  v_bericht := v_bericht || E'\nalte Plaetze danach: ' || v_n || ' (erwartet 0)';
  select count(*) into v_n from public.raeume r cross join lateral public.raum_verstoesse(r.id) v;
  v_bericht := v_bericht || E'\nVerstoesse im neuen Modell: ' || v_n || ' (erwartet 0)';

  raise exception 'PROBELAUF 0029%', v_bericht;
end $probe$;
```

Karam sieht je Umzug die Zahlen und je Kiste "alt -> neu". Jede Zeile
"NICHT uebernommen" nennt den Grund; die alten Werte bleiben in
`grundriss_umrechnung.alt`. Bricht der Probelauf mit "Umrechnung: ..." ab,
nicht anwenden: die Selbstpruefung hat etwas gefunden.

### 2.6 Migration 0030_suche_mit_platz.sql (Etappe 3)

`inhalt_suchen` wird neu geschrieben (START 5.8). Weil sich die Spalten
aendern, geht das nur mit `drop` und `create`. Die Oberflaeche von Etappe 3
wird **unmittelbar danach** ausgeliefert (sw.js VERSION `kistly-v4`); in den
ein bis zwei Minuten dazwischen zeigt eine alte Suchseite "auf dem Boden" statt
des Platzes (kein Absturz, `plan_x` ist dann `undefined`).

```sql
-- =====================================================================
-- Kistly 0030_suche_mit_platz
--
-- inhalt_suchen liefert jetzt Grundriss, Raum, Unterlage, Objekt, Fach und
-- Hoehe von und bis, auch fuer Dinge in Moebeln (Platz des verknuepften
-- Objekts, Hoehe 0 bis Objekthoehe). Treffer, Punkte und Sortierung wie
-- 0026. room_* bleibt das Zimmer der Kiste (Kuerzel), raum_* ist, wo sie
-- wirklich steht.
-- =====================================================================

drop function public.inhalt_suchen(text, int);

create function public.inhalt_suchen(p_q text, p_max int default 60)
returns table (
  content_id uuid, inhalt text, menge int, schicht smallint, photo_id uuid, foto_pfad text,
  box_x0 numeric, box_y0 numeric, box_x1 numeric, box_y1 numeric, punkt_x numeric, punkt_y numeric,
  ausschnitt_pfad text, bestaetigt boolean,
  item_id uuid, item_code text, item_kind text, item_title text, item_status text,
  project_id uuid, project_name text,
  room_id uuid, room_name text, room_color text,
  grundriss_id uuid, grundriss_name text,
  raum_id uuid, raum_name text,
  unterlage_art text,          -- boden | kiste | objekt | fach | moebel (Ding in einem Moebel)
  unterlage_code text,         -- bei kiste: Nummer der Kiste darunter
  objekt_id uuid, objekt_name text, objekt_art text,
  fach_ebene smallint, fach_spalte smallint,
  platz_x int, platz_y int,
  stapel_nr int,               -- 1 = unten
  hoehe_von int, hoehe_bis int,
  treffer real)
language sql stable security invoker set search_path = public, extensions as $fn$
  with q as (select public.such_normal(p_q) as n)
  select
    c.id, c.text, c.qty, c.schicht, c.photo_id, f.path,
    c.box_x0, c.box_y0, c.box_x1, c.box_y1, c.punkt_x, c.punkt_y,
    c.ausschnitt_pfad, c.bestaetigt,
    i.id, i.code, i.kind::text, i.title, i.status::text,
    p.id, p.name,
    t.id, t.name, t.color,
    gr.id, gr.name,
    r.id, coalesce(nullif(r.name, ''), rt.name),
    case when mo.id is not null then 'moebel' else i.unterlage_art end,
    ui.code,
    coalesce(uo.id, mo.id), coalesce(uo.name, mo.name), coalesce(uo.art, mo.art),
    i.fach_ebene, i.fach_spalte,
    i.platz_x, i.platz_y,
    case when i.platz_raum_id is not null then b.tiefe + 1 end,
    case when mo.id is not null then 0 else b.unten_cm end,
    case when mo.id is not null then mo.hoehe_cm else b.unten_cm + m.hoehe_cm end,
    (case
      when c.such_text = q.n then 1.0
      when strpos(' ' || c.such_text || ' ', ' ' || q.n || ' ') > 0 then 0.95
      when strpos(' ' || c.such_text, ' ' || q.n) > 0 then 0.9
      when strpos(c.such_text, q.n) > 0 then 0.8
      else least(extensions.word_similarity(q.n, c.such_text), 0.79)
    end)::real
  from q
  join public.item_contents c
    on strpos(c.such_text, q.n) > 0
    or extensions.word_similarity(q.n, c.such_text) >= 0.45
  join public.items i on i.id = c.item_id
  join public.projects p on p.id = i.project_id
  left join public.item_photos f on f.id = c.photo_id
  left join public.tags t on t.id = i.room_id
  left join public.objekte mo on mo.item_id = i.id and i.kind = 'furniture'
  left join public.raeume r on r.id = coalesce(i.platz_raum_id, mo.raum_id)
  left join public.tags rt on rt.id = r.tag_id
  left join public.grundrisse gr on gr.id = r.grundriss_id
  left join public.objekte uo on uo.id = i.unterlage_objekt_id
  left join public.items ui on ui.id = i.unterlage_item_id
  left join lateral public.kiste_basis(i.id) b on true
  left join lateral public.kiste_masse(i.size, i.eigene_hoehe_cm, i.eigene_groesse_id) m on true
  where length(q.n) >= 2
  order by 41 desc, length(c.text), c.text
  limit least(greatest(coalesce(p_max, 60), 1), 200)
$fn$;

revoke execute on function public.inhalt_suchen(text, int) from public, anon;
grant  execute on function public.inhalt_suchen(text, int) to authenticated;
```

**Probelauf 0030:**

```sql
do $probe$
declare
  v_bericht text := '';
  z record;
begin
  -- ===== A. Text von 0030_suche_mit_platz.sql =====
  -- ===== B. Als Karam suchen =====
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select id from auth.users order by created_at limit 1), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  for z in select * from public.inhalt_suchen('ka', 10) loop
    v_bericht := v_bericht || format(E'\n%s | %s | %s | %s | %s %s | Ebene %s | %s bis %s cm',
      z.inhalt, z.item_code, z.grundriss_name, z.raum_name, z.unterlage_art,
      coalesce(z.unterlage_code, z.objekt_name, ''), coalesce(z.fach_ebene::text, '-'), z.hoehe_von, z.hoehe_bis);
  end loop;
  raise exception 'PROBELAUF 0030%', v_bericht;
end $probe$;
```

Das Suchwort (`'ka'`) waehlt Claude so, dass echte Treffer mit und ohne Platz
dabei sind. Erwartet: jede Kiste mit Platz hat Grundriss, Raum und Hoehe; ohne
Platz sind diese Spalten leer; Dinge in einem verknuepften Moebel haben
`moebel` und die Objekthoehe.

### 2.7 Migration 0032_raster_entfernen.sql (Etappe 4)

Erst, wenn kein Code mehr das Raster liest (Etappe 2 hat `RaumPlan.tsx`,
`components/raumplan/*`, `lib/raumplan.ts` und die alten api-Funktionen
entfernt; `inhalt_suchen` liest seit 0029 nur das neue Modell).

```sql
-- =====================================================================
-- Kistly 0032_raster_entfernen
--
-- Das alte 50-cm-Raster verschwindet (START 5.3, Etappe 4). Die alten
-- Werte jeder Kiste stehen seit 0029 in grundriss_umrechnung.alt; diese
-- Tabelle bleibt. raum_sperre bleibt (das neue Modell sperrt damit),
-- ebenso kisten_groessen und item_hoehe_cm (liest niemand mehr, schadet
-- nicht; eine spaetere Migration darf sie entfernen).
-- =====================================================================

drop trigger if exists items_plan on public.items;
drop trigger if exists items_plan_eingefroren on public.items;
drop trigger if exists items_a_sperre on public.items;
drop trigger if exists items_stapel_nachruecken on public.items;

drop index if exists public.items_plan_platz2;
alter table public.items drop constraint if exists items_regal_check;
alter table public.items drop constraint if exists items_plan_check;
alter table public.items drop column if exists regal_id;
alter table public.items drop column if exists regal_boden;
alter table public.items drop column if exists plan_x;
alter table public.items drop column if exists plan_y;
alter table public.items drop column if exists plan_z;

drop table if exists public.regale;       -- samt Triggern und Policies
drop table if exists public.room_plans;   -- samt Triggern und Policies

drop function if exists public.items_plan_pruefen();
drop function if exists public.items_plan_eingefroren();
drop function if exists public.items_a_sperre();
drop function if exists public.items_stapel_nachruecken();
drop function if exists public.raumplan_eingefroren();
drop function if exists public.regale_pruefen();
drop function if exists public.regale_plaetze_leeren();
drop function if exists public.regale_a_sperre();
drop function if exists public.room_plans_pruefen();
drop function if exists public.room_plans_plaetze_leeren();
drop function if exists public.room_plans_a_sperre();
drop function if exists public.zelle_sperre(uuid, int, int);
drop function if exists public.zelle_gesperrt(jsonb, int, int);
```

**Probelauf 0032:**

```sql
do $probe$
declare
  v_bericht text := '';
  z record;
  v_n int;
begin
  -- ===== A. Text von 0032_raster_entfernen.sql =====
  for z in
    select p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
     where s.nspname = 'public'
       and (p.prosrc ~ 'plan_x|plan_z|regal_boden|regal_id|room_plans|boeden_cm'
            or p.prosrc ~ 'public\.regale\M')
  loop
    v_bericht := v_bericht || E'\nFEHLER: Funktion liest noch das Raster: ' || z.proname;
  end loop;
  select count(*) into v_n from information_schema.columns
   where table_schema = 'public' and table_name = 'items' and column_name in ('plan_x', 'regal_id');
  v_bericht := v_bericht || E'\nalte Spalten an items: ' || v_n || ' (erwartet 0)';
  select count(*) into v_n from public.items where platz_raum_id is not null;
  v_bericht := v_bericht || E'\nKisten mit Platz im neuen Modell: ' || v_n;
  select count(*) into v_n from public.raeume r cross join lateral public.raum_verstoesse(r.id) v;
  v_bericht := v_bericht || E'\nVerstoesse: ' || v_n || ' (erwartet 0)';
  raise exception 'PROBELAUF 0031%', v_bericht;
end $probe$;
```

Hinweis: `grundriss_umrechnung.alt` enthaelt die Woerter `plan_x` usw. nur als
JSON-Schluessel in Daten, nicht in Funktionen; die Suche oben prueft nur
Funktionskoerper.

---

## 3. Geometrie: `src/lib/geometrie.ts`

Eine Datei, reine Funktionen, keine Importe (auch kein React, kein Supabase),
nur loeschbare TypeScript-Syntax (kein `enum`, kein `namespace`), damit Node 24
sie direkt ausfuehren kann. Kopfkommentar: "Spiegel von
supabase/migrations/0028_grundriss_modell.sql, Abschnitte 3 bis 8. Jede
Aenderung an einer Regel in beiden Dateien und im Testfall." Der Kopf von 0028
verweist umgekehrt hierher (steht schon im SQL).

**Die Datenbank entscheidet.** Der Browser rechnet nur vor (Vorschau, Warnung,
Auswahl). Lehnt die Datenbank ab, zeigt die Oberflaeche ihren uebersetzten Satz
und laedt neu.

### 3.1 Typen

```ts
export type Punkt = [number, number]            // ganze cm
export type Umriss = number[]                    // flach [x0,y0,x1,y1,...] wie in der DB
export interface Rechteck { x0: number; y0: number; x1: number; y1: number }
export type Drehung = 0 | 90 | 180 | 270
export type Ecke = 'lo' | 'ro' | 'ru' | 'lu'
export type PolygonFehler = 'punkte' | 'bereich' | 'doppelt' | 'kreuzt' | 'umlauf'
export interface ObjektForm {                    // Teilmenge von Objekt (types.ts)
  x: number; y: number; breite_cm: number; tiefe_cm: number; hoehe_cm: number
  drehung: Drehung; form: 'rechteck' | 'l'
  ausschnitt_breite_cm: number | null; ausschnitt_tiefe_cm: number | null; ausschnitt_ecke: Ecke | null
  brett_cm: number[] | null; spalten: number
}
```

`api.ts` wandelt `Umriss` in `Punkt[]` fuer die Oberflaeche (`zuPunkten`,
`zuUmriss` stehen in geometrie.ts).

### 3.2 Spiegel der SQL-Funktionen (gleiche Namen in camelCase, gleiche Schritte)

| TS | SQL (0028) | Regel |
|---|---|---|
| `flaeche2(u)` | `geo_flaeche2` | Summe `x_i*y_j - x_j*y_i`, j = (i+1) % n; > 0 = Uhrzeigersinn am Bildschirm |
| `streckenSchneiden(p1,p2,q1,q2)` | `geo_strecken_schneiden` | Orientierungen d1..d4, Beruehren zaehlt |
| `polygonFehler(u)` | `geo_polygon_fehler` | Reihenfolge: punkte (3..200), bereich (0..50000), doppelt, kreuzt (zuruecklaufende Nachbarkante, dann nicht benachbarte Kanten), umlauf |
| `punktLage(u, x, y, f = 1)` | `geo_punkt_lage` | 1 innen, 0 Rand, -1 aussen; Strahl +x, halboffen, `k = (xj-xi)*(y-yi) - (x-xi)*(yj-yi)`, kippen wenn `(k > 0) === (yj > yi)` |
| `punktImPolygon(u, x, y)` | `geo_punkt_im_polygon` | `punktLage >= 0` |
| `streckeTrifftOffen(a, b, r)` | `geo_strecke_trifft_offen` | Trennung ueber x, y oder alle vier Ecken auf einer Seite |
| `rechteckImPolygon(u, r)` | `geo_rechteck_im_polygon` | Mitte echt innen (`punktLage(u, x0+x1, y0+y1, 2) === 1`) und keine Kante im offenen Rechteck |
| `kanteLaenge2(u, k)` | `geo_kante_laenge2` | dx*dx + dy*dy |
| `kisteTraegt(u, x, y)` | `kiste_traegt` | `abs(2*(x-ux)) <= ex` und `abs(2*(y-uy)) <= ey`, ex/ey nach Drehung |
| `objektLokal(o, x, y)` | `objekt_lokal` | 0: (dx,dy), 90: (dy,-dx), 180: (-dx,-dy), 270: (-dy,dx) |
| `objektGlobal(o, lx, ly)` | `objekt_global` | 0: (x+lx,y+ly), 90: (x-ly,y+lx), 180: (x-lx,y-ly), 270: (x+ly,y-lx) |
| `objektEnthaelt(o, x, y)` | `objekt_enthaelt` | lokal in [0,B]x[0,T], nicht echt im Ausschnitt |
| `objektImFach(o, spalte, x, y)` | `objekt_im_fach` | `S*lx >= (s-1)*(B+2)` und `S*lx <= s*(B+2) - 2*S`, `0 <= ly <= T` |
| `fachDecke(o, ebene)` | `fach_decke` | naechstes Brett - 2, oben `hoehe - 2` |
| `faecherGueltig(brett, hoehe)` | `faecher_gueltig` | 1..30, erster >= 0, Abstand >= 3, `hoehe - letzter >= 3` |
| `objektRechtecke(o)` | `objekt_rechtecke` | 1 bzw. 2 Rechtecke, Ecken ueber `objektGlobal`, dann min/max |
| `kisteBasis(k, daten)` | `kiste_basis` | Kette abwaerts: Summe der Hoehen, Wurzel Boden 0/Raumdecke, Objekt Objekthoehe/Raumdecke, Fach `brett_cm[e]`/Fachdecke |
| `platzFehler(k, daten)` | `platz_fehler` (ohne Baum) | gleiche Kennungen, gleiche Reihenfolge |

Alle Rechnungen ganzzahlig; die groessten Produkte (50000 * 100000) liegen weit
unter 2^53, JS rechnet also exakt. `Math.abs`, `Math.sign` wie SQL. Kein
`Math.sqrt` in einer Entscheidung.

### 3.3 Nur im Browser

- `zuPunkten(u: Umriss): Punkt[]`, `zuUmriss(p: Punkt[]): Umriss`.
- `umlaufRichten(p: Punkt[]): { punkte: Punkt[]; kante: (alt: number) => number; abstand: (alt: number, laenge: number, abstand: number, breite: number) => number }`
  Kehrt gegen den Uhrzeigersinn gezeichnete Punkte um (`[p0, p(n-1), ..., p1]`).
  Alte Kante i wird neue Kante `n-1-i`, der Abstand einer Oeffnung wird
  `laenge - abstand - breite` (laenge gerundet). Der Zeichner ruft das vor jedem
  Speichern.
- `kanteLaenge(u, k): number` (Kommazahl, nur Anzeige und Umrechnung von
  Abstaenden), `kanteRichtung(u, k): [dx, dy]` (Einheitsvektor).
- `oeffnungStrecke(u, oeff): [Punkt, Punkt]`: Anfang `P_k + abstand * r`, Ende
  `+ breite * r` (Kommazahl, nur Zeichnung).
- `wandStuecke(raeume, oeffnungen): { a: Punkt; b: Punkt; raumId: string; kante: number; farbe: string | null }[]`
  Jede Kante wird ein Strich (12 cm, mittig). Von jeder Kante werden die
  Oeffnungen dieser Kante abgezogen UND die Oeffnungen jeder anderen Kante, die
  auf derselben Linie liegt und sich ueberdeckt (gemeinsame Wand zweier Raeume).
  Gleiche Strecken aus zwei Raeumen werden nur einmal gezeichnet.
- `laengeLesen(text: string): number | null` (Eingabe, START 5.4):
  - arabisch-indische (U+0660..U+0669) und persische (U+06F0..U+06F9) Ziffern
    zu 0..9, arabisches Komma (U+066B, U+060C) zu Komma, Leerraum zusammenziehen
  - `"3,45"` und `"3.45"` sind Meter -> 345; `"0,8"` -> 80; `"3,456"` -> 346
    (auf cm gerundet)
  - ganze Zahl ohne Trenner ist Zentimeter: `"345"` -> 345
  - Einheiten: `"3 m 45"`, `"3m45"` -> 345; `"345 cm"`, `"345cm"` -> 345;
    `"3 m"` -> 300
  - leer, negativ, keine Zahl -> null; Ergebnis groesser 50000 -> null
- `zahlLesen` und `brettListeLesen` (aus `lib/raumplan.ts` hierher gezogen,
  unveraendert; `raumplan.ts` exportiert sie bis Etappe 2 weiter).
- `cmText(cm, lang)`: unter 100 `"85 cm"`, sonst `"3,45 m"` (de) bzw.
  `"3.45 م"` (ar), Zahl als LTR-Stueck (Klasse `t-serial` beim Einsetzen).
- Einrasten: `einrasten(v, raster)` = `Math.round(v / raster) * raster`
  (Raster 1, 5 oder 10 cm, Standard 5); `winkelEinrasten(start, p, frei)`:
  ohne Umschalt die Achse mit der groesseren Bewegung (90-Grad-Schritte), mit
  Umschalt frei, danach auf ganze cm runden.
- Faecher-Eingabe:
  - `faecherAusAbstaenden(abstaende: number[]): { brett_cm: number[]; hoehe_cm: number }`
    Abstaende = lichte Hoehen von unten nach oben, erstes Fach auf dem
    Objektboden: `brett[0] = 0`, `brett[i+1] = brett[i] + a[i] + 2`,
    `hoehe = brett[n-1] + a[n-1] + 2`. Beispiel `"30, 35, 35, 40"` ->
    `[0, 32, 69, 106]`, Hoehe 148.
  - `faecherGleichmaessig(n, hoehe)`: `a = floor((hoehe - 2*n) / n)`,
    `brett[i] = i * (a + 2)`; der Rest geht ins oberste Fach.
  - `abstaendeAusFaechern(brett, hoehe)`: Umkehrung fuer die Anzeige.
- Unterlagen an einer Stelle (Handy und Zeichner):
  `unterlagenAn(daten: GrundrissDaten, raumId, x, y, kiste: {laenge_cm, breite_cm, hoehe_cm, drehung}): Unterlage[]`
  mit `Unterlage = { art: 'boden' | 'kiste' | 'objekt' | 'fach'; itemId?; objektId?; ebene?; spalte?; unten_cm: number; oben_cm: number; grenze_cm: number; passt: boolean; text: string }`.
  Liste in dieser Reihenfolge: Faecher des Regals/Schranks an der Stelle (von
  unten nach oben), Kisten an der Stelle, deren Grundflaeche den Punkt enthaelt
  (nur die jeweils oberste eines Stapels zuerst, darunter die anderen), Objekt
  oben drauf, Boden (nur wenn kein Objekt an der Stelle steht). Hoehen aus den
  fertigen Zahlen von `grundriss_laden` (`oben_cm`, `grenze_cm` der Kisten)
  plus `kisteBasis` fuer Objekt und Fach. `passt = oben <= grenze`.
- Ueberlappung (nur Warnung, START 5.2): `kistenUeberlappen(daten, raumId, x, y, masse, drehung): string[]`
  (Codes der Kisten derselben Hoehe, deren Grundflaechen sich echt
  ueberdecken) und `raeumeUeberlappen(daten): [string, string][]`.

### 3.4 Gemeinsame Testfaelle

`scripts/geometrie-pruefen.mjs` importiert `../src/lib/geometrie.ts` (Node 24
entfernt die Typen selbst) und prueft diese Faelle; derselbe Satz steht als
Teil B0 im Probelauf 0028. Aufruf `node scripts/geometrie-pruefen.mjs`, Ausgabe
"ok" oder die abweichenden Faelle, Exit 1 bei Fehlern. Kommt in die
Pruefliste vor jedem Commit ab Etappe 1.

| Fall | Erwartet |
|---|---|
| `punktLage(R, 200, 150)`, R = `[0,0,400,0,400,300,0,300]` | 1 |
| `punktLage(R, 0, 150)`, `(R, 400, 300)` | 0, 0 |
| `punktLage(R, 401, 150)`, `(R, -1, 0)` | -1, -1 |
| L = `[0,0,400,0,400,200,200,200,200,400,0,400]`: `punktLage(L,300,300)`, `(L,100,300)`, `(L,200,300)`, `(L,300,200)` | -1, 1, 0, 0 |
| `rechteckImPolygon(L, {10,10,190,390})`, `{0,0,400,200}`, `{150,150,250,250}`, `{250,250,350,350}` | true, true, false, false |
| `polygonFehler([0,0,0,300,400,300,400,0])` | 'umlauf' |
| `polygonFehler([0,0,400,300,400,0,0,300])` | 'kreuzt' |
| `polygonFehler([0,0,400,0,300,0,300,300,0,300])` | 'kreuzt' |
| `polygonFehler([0,0,0,0,400,0,400,300])` | 'doppelt' |
| `polygonFehler([0,0,400,0])` | 'punkte' |
| `flaeche2(L)` | 240000 |
| `kanteLaenge2([0,0,300,0,300,400], 2)` | 250000 |
| Objekt B=80, T=30, x=100, y=50, Drehung 0: `objektLokal(o,150,60)` | (50, 10) |
| dasselbe mit Drehung 90: `objektRechtecke(o)` | [{70,50,100,130}] |
| Drehung 90: `objektLokal(o, 90, 60)` | (10, 10) |
| L-Couch B=250, T=160, Ausschnitt 90x70 'ro', x=0,y=0: `objektEnthaelt(o,200,30)`, `(o,200,100)`, `(o,160,30)` | false, true, true |
| dieselbe: `objektRechtecke(o)` | [{0,0,160,70}, {0,70,250,160}] |
| Regal B=80, T=30, spalten=2 bei (0,0): `objektImFach(o,1,39,10)`, `(o,1,40,10)`, `(o,2,40,10)`, `(o,2,41,10)` | true, false, false, true |
| `fachDecke({brett_cm:[0,40,80,120], hoehe_cm:180}, 2)`, `(..., 4)` | 78, 178 |
| `faecherGueltig([0,40,80,120],180)`, `([0,2],100)`, `([0,40],42)` | true, false, false |
| `kisteTraegt({x:200,y:150,drehung:0,laenge:44,breite:33}, 222, 150)`, `(..., 223, 150)`, Drehung 90 `(..., 200, 172)` | true, false, true |
| `faecherAusAbstaenden([30,35,35,40])` | brett [0,32,69,106], hoehe 148 |
| `laengeLesen("3,45")`, `"3.45"`, `"345"`, `"0,8"`, `"3 m 45"`, `"٣٫٤٥"`, `"3,456"`, `""`, `"-3"` | 345, 345, 345, 80, 345, 345, 346, null, null |

### 3.5 Wo welche Regel wirkt

| Regel | Datenbank | Browser |
|---|---|---|
| Mittelpunkt der Kiste im Raum | hart | Vorschau |
| Unterlage da, gleicher Raum, Mittelpunkt darueber, kein Kreis | hart | Vorschau, Auswahlliste |
| Oberkante unter Decke bzw. Fachdecke, Fach existiert | hart | Vorschau (`passt`) |
| Kisten ueberlappen am Boden | nein | Warnung (gelb) |
| Raeume ueberlappen | nein | Warnung, Zeichner speichert trotzdem |
| Objekt ganz im Raum, nicht hoeher als der Raum | hart | Vorschau (roter Geist) |
| Objekte ueberlappen | nein | Warnung |
| Oeffnung passt auf die Kante, keine Ueberlappung, Hoehe | hart | Vorschau |
| Polygon einfach, im Uhrzeigersinn | hart | `umlaufRichten` vor dem Speichern |
| Raum-Aenderung laesst Kisten draussen / zu hoch | hart (Zahl) | Vorab-Dialog mit Codes |
| Stufe einer eigenen Groesse | hart (setzt die DB) | nie gerechnet |

---

## 4. `src/lib/api.ts`: Typen und Funktionen

Alle Datenbankzugriffe hier (Hausregel). Jede Funktion wirft bei Fehler
`new Error(tg('fehler.<schluessel>', { grund: errText(e) }))`; "nicht
vorhanden" ist `null` bzw. leere Liste, nie ein Fehler. Zahlen aus PostgREST
(`numeric` als Text) werden hier in `number` umgerechnet.

### 4.1 Typen (`src/lib/types.ts`)

```ts
// Etappe 1
export interface EigeneGroesse {
  id: string; project_id: string; name: string; art: 'kiste' | 'moebel'
  laenge_cm: number; breite_cm: number; hoehe_cm: number
  ausschnitt_breite_cm: number | null; ausschnitt_tiefe_cm: number | null
  created_at: string; updated_at: string
}
export interface GroessenFolgen { kisten: number; moebel: number; stufe_neu: number; neue_nummer: number }

export interface Grundriss { id: string; project_id: string; name: string; sort: number; version: number; created_at: string; updated_at: string }
export interface Raum {
  id: string; grundriss_id: string; project_id: string; tag_id: string | null; name: string
  art: 'innen' | 'draussen'; punkte: Punkt[]; hoehe_cm: number
  bodenfarbe: string | null; wandfarben: (string | null)[] | null; sort: number
  tag_name: string | null; tag_short: string | null; tag_color: string | null   // aus grundriss_laden
}
export interface Oeffnung {
  id: string; raum_id: string; art: 'tuer' | 'fenster'; kante: number; abstand_cm: number
  breite_cm: number; hoehe_cm: number; bruestung_cm: number
  anschlag: 'links' | 'rechts'; aufschlag: 'innen' | 'aussen'
}
export type ObjektArt = 'moebel' | 'regal' | 'schrank'
export interface Objekt extends ObjektForm {            // ObjektForm aus geometrie.ts
  id: string; raum_id: string; art: ObjektArt; name: string; farbe: string | null
  item_id: string | null; item_code: string | null; item_title: string | null
}
export type UnterlageArt = 'boden' | 'kiste' | 'objekt' | 'fach'
export interface Platz {
  raum_id: string; x: number; y: number; drehung: 0 | 90; unterlage: UnterlageArt
  unterlage_item_id: string | null; unterlage_objekt_id: string | null
  ebene: number | null; spalte: number | null
}
export interface PlanKiste {                              // eine Kiste in grundriss_laden
  id: string; code: string; prefix: string; size: number; seq: number; kind: ItemKind
  status: ItemStatus; title: string | null; room_id: string | null; room_color: string | null
  mark_color: string | null; eigene_groesse_name: string | null
  platz_raum_id: string; platz_x: number; platz_y: number; platz_drehung: 0 | 90
  unterlage_art: UnterlageArt; unterlage_item_id: string | null; unterlage_objekt_id: string | null
  fach_ebene: number | null; fach_spalte: number | null
  laenge_cm: number; breite_cm: number; hoehe_cm: number
  unten_cm: number; oben_cm: number; grenze_cm: number
  wurzel_art: 'boden' | 'objekt' | 'fach'; nr: number
}
export interface GrundrissDaten { grundriss: Grundriss; raeume: Raum[]; oeffnungen: Oeffnung[]; objekte: Objekt[]; kisten: PlanKiste[] }
export type KisteLage =
  | { art: 'kiste'; grundriss: { id: string; name: string }; raum: { id: string; name: string | null; tag_id: string | null }
      platz_x: number; platz_y: number; drehung: 0 | 90; unterlage_art: UnterlageArt
      unterlage_item_id: string | null; unterlage_code: string | null
      objekt: { id: string; name: string; art: ObjektArt } | null
      fach_ebene: number | null; fach_spalte: number | null
      laenge_cm: number; breite_cm: number; hoehe_cm: number
      unten_cm: number; oben_cm: number; grenze_cm: number; nr: number; auf_ihr: string[] }
  | { art: 'moebel'; grundriss: { id: string; name: string }; raum: { id: string; name: string | null; tag_id: string | null }
      objekt: { id: string; name: string; art: ObjektArt }; unten_cm: 0; oben_cm: number }
export interface GrundrissAenderung {
  oeffnungen_loeschen?: string[]; objekte_loeschen?: string[]; raeume_loeschen?: string[]
  raeume?: Omit<Raum, 'project_id' | 'grundriss_id' | 'tag_name' | 'tag_short' | 'tag_color'>[]
  verschieben?: { raum_id: string; dx: number; dy: number }[]
  objekte?: Omit<Objekt, 'item_code' | 'item_title'>[]
  zuordnen?: { von_raum_id: string; nach_raum_id: string }[]
  oeffnungen?: Oeffnung[]
}
export interface RaumEintrag { id: string; grundriss_id: string; grundriss_name: string; tag_id: string | null; name: string }

// Item bekommt (Etappe 1): eigene_groesse_id, platz_raum_id, platz_x, platz_y, platz_drehung,
// unterlage_art, unterlage_item_id, unterlage_objekt_id, fach_ebene, fach_spalte (alle | null).
// Etappe 2: plan_x, plan_y, plan_z, regal_id, regal_boden fallen weg; Raumplan, Regal, TuerSeite weg.

// Etappe 3: SuchTreffer = die 41 Spalten von inhalt_suchen (0030): plan_*, regal_name,
// regal_boden weg; neu grundriss_id, grundriss_name, raum_id, raum_name, unterlage_art
// ('boden'|'kiste'|'objekt'|'fach'|'moebel'|null), unterlage_code, objekt_id, objekt_name,
// objekt_art, fach_ebene, fach_spalte, platz_x, platz_y, stapel_nr, hoehe_von, hoehe_bis.
```

### 4.2 Neue Funktionen

| Funktion | Weg | Etappe |
|---|---|---|
| `listEigeneGroessen(projectId): Promise<EigeneGroesse[]>` | `from('eigene_groessen').select('*').eq('project_id').order('art').order('name')` | 1 |
| `legeEigeneGroesseAn(projectId, w: EigeneGroesseWerte): Promise<EigeneGroesse>` | insert, `.select().single()` | 1 |
| `aendereEigeneGroesse(id, w: Partial<EigeneGroesseWerte>): Promise<EigeneGroesse>` | update, `.select().single()`; Ablehnung `kistly:grundriss.zu_hoch` u. a. kommt ueber errText | 1 |
| `loescheEigeneGroesse(id): Promise<void>` | delete; `kistly:groesse.benutzt` mit `{kisten, moebel}` | 1 |
| `eigeneGroesseFolgen(id, l, b, h): Promise<GroessenFolgen>` | `rpc('eigene_groesse_folgen')` | 1 |
| `ladeGrundrisse(projectId): Promise<Grundriss[]>` | select, order sort, created_at | 1 |
| `grundrissSicherstellen(projectId, name): Promise<string \| null>` | `rpc('grundriss_sicherstellen', {p_project, p_name})`; null bei Betrachtern ohne Grundriss | 1 |
| `legeGrundrissAn(projectId, name): Promise<Grundriss>` | insert | 2 |
| `aendereGrundriss(id, w: {name?, sort?}): Promise<Grundriss>` | update (Version setzt nur die RPC) | 2 |
| `loescheGrundriss(id): Promise<void>` | delete (Kaskade leert Plaetze) | 2 |
| `grundrissKistenZahl(id): Promise<number>` | `rpc('grundriss_kisten_zahl')` fuer die Loeschfrage | 2 |
| `ladeGrundriss(id, raumId?): Promise<GrundrissDaten \| null>` | `rpc('grundriss_laden', {p_grundriss, p_raum})`, `punkte` flach -> `Punkt[]` | 1 |
| `speichereGrundriss(id, version, a: GrundrissAenderung): Promise<{version: number; daten: GrundrissDaten}>` | `rpc('grundriss_speichern')`, `Punkt[]` -> flach | 2 |
| `ladeRaeumeDesUmzugs(projectId): Promise<RaumEintrag[]>` | `from('raeume').select('id, grundriss_id, tag_id, name, grundrisse(name)')` | 1 |
| `platzSetzen(itemId, p: Platz): Promise<KisteLage>` | `rpc('platz_setzen', {p_item, p_raum, p_x, p_y, p_drehung, p_unterlage, p_unterlage_item, p_unterlage_objekt, p_ebene, p_spalte})` | 1 |
| `platzRaeumen(itemId): Promise<void>` | `rpc('platz_raeumen')` | 1 |
| `ladeKisteLage(itemId): Promise<KisteLage \| null>` | `rpc('kiste_lage')` | 1 |

Namen `platzSetzen`/`platzRaeumen` bewusst anders als die alten
`setzePlatz`/`raeumePlatz` (die bis Etappe 2 leben).

### 4.3 Geaendert

- `createItem` (Z. 396): Eingabetyp bekommt `eigene_groesse_id?: string | null`.
  Platz wird nie beim Anlegen mitgeschickt (ein abgelehnter Platz darf das
  Anlegen nicht verhindern; Hinstellen ist ein zweiter Schritt).
- `updateItem`/`Item`: neue Felder (4.1). Aenderung von `size`,
  `eigene_hoehe_cm`, `eigene_groesse_id` kann mit `kistly:grundriss.zu_hoch`
  bzw. `nicht_darauf` abgelehnt werden; die Seiten zeigen errText und setzen
  das Feld zurueck (wie heute bei der eigenen Hoehe).
- `listItems` `ItemFilter`: `ohnePlatz?: boolean` (`platz_raum_id is null`),
  `platzRaumId?: string` (Zeichner-Leiste "Kisten ohne Platz", Zimmerseite).
- `ladeSchnellansicht` (Etappe 3): im vorhandenen Select zusaetzlich
  `platz_raum_id, raeume!items_platz_raum_id_fkey(name, tags(name))`; ergibt
  `SchnellDaten.platz: { raum: string } | null`. Keine zweite Abfrage.
- `inhaltSuchen` (Etappe 3): neue Spalten abbilden; numeric wie bisher
  umrechnen.
- `errText` (`src/lib/supabase.ts`, Etappe 1):
  - `hint 'kistly:<bereich>.<kennung>'` -> `tg('fehler.db.<bereich>.<kennung>', werte)`;
    `werte` = `JSON.parse(e.details)` in try/catch (fehlt es, ohne Platzhalter).
  - Indexnamen: `eigene_groessen_name_key` -> `fehler.db.groesse.name_doppelt`,
    `raeume_tag_je_grundriss` -> `fehler.db.grundriss.zimmer_doppelt`,
    `objekte_item_key` -> `fehler.db.grundriss.moebel_schon_verknuepft`.
  - Code `42501` oder "row-level security" -> `fehler.keine_berechtigung`
    (gibt es), `40P01` -> `fehler.bitte_nochmal` (neu).
  - Die Zeile `items_plan_platz2` faellt in Etappe 2 weg.
- `api.ts` Z. 565 bis 716 (Raumplan-Block ausser `ladeKistenGroessen` und
  `inhaltSuchen`): in Etappe 2 loeschen.

---

## 5. Oberflaeche je Etappe

Fuer jede Komponente gilt: drei getrennte Zustaende (laedt: Skelett oder
`Loading`; Fehler: `ErrorBox` mit Nochmal; leer: `Empty` mit Satz, was zu tun
ist), Dialoge setzen sich beim Oeffnen zurueck (Muster `Furniture.tsx`
Z. 111 bis 118), jeder neue Text in `de` und `ar` mit gleichen Platzhaltern,
Plaene/Zeichnungen/3D in `dir="ltr"` und nie gespiegelt, Nummern und Masse in
`t-serial`, Farben nur ueber CSS-Variablen, keine Logik in `src/design`.

### 5.1 Etappe 1: Modell, eigene Groessen, Geometrie, Rahmen

**Neu**

- `src/lib/geometrie.ts` (Abschnitt 3), `scripts/geometrie-pruefen.mjs`.
- `src/components/SizePicker.tsx`: aus `Items.tsx` Z. 51 bis 107 hierher
  (ItemDetail, Furniture, FurnitureDetail, Items importieren von hier; `ARTEN`
  zieht mit nach `src/lib/arten.ts` oder bleibt als Export in Items, aber keine
  Seite importiert mehr aus einer Seite). Neue Props:
  `eigene?: EigeneGroesse[] | null` (null = laedt), `eigeneFehler?: string | null`,
  `eigeneId?: string | null`, `onEigene?: (id: string | null) => void`.
  Unter den Stufen 1 bis 10 stehen die eigenen Groessen der passenden Art
  (`kiste` fuer box/bag/other, `moebel` fuer furniture) als Knoepfe mit Name
  und `L x B x H cm`; ein Tipp waehlt sie (Stufen-Knoepfe dann nicht aktiv),
  noch ein Tipp oder eine Stufe waehlt sie ab. Laedt: drei Skelett-Knoepfe;
  Fehler: kleine Zeile mit Nochmal; leer: Link "Eigene Groesse anlegen" zur
  Seite Groessen. Bei gewaehlter eigener Groesse zeigt die Nummernvorschau
  `W-?-###` und den Satz `groessen.stufe_setzt_db`.
- `src/components/EigeneGroesseDialog.tsx`: Anlegen/Aendern. Felder Name, Art
  (Kiste/Moebel), Laenge, Breite, Hoehe (`laengeLesen`, Anzeige in cm), bei
  Moebel Schalter "L-Form" mit Ausschnitt Breite/Tiefe. Beim Aendern vorher
  `eigeneGroesseFolgen`: "Betrifft 3 Kisten und 1 Moebel; 2 bekommen eine neue
  Nummer (Stufe 7). Alte Etiketten bleiben scannbar." Speichern-Knopf; die
  Datenbank-Ablehnung (`zu_hoch`, `nicht_darauf` mit Code) erscheint im Dialog.
- `src/lib/groessen.ts`: `useEigeneGroessen(projectId)` ->
  `{ liste: EigeneGroesse[] | null; fehler: string | null; nochmal(); neuLaden() }`,
  `eigeneGroesseText(g)` -> `"Grosse Box (60 x 40 x 35 cm)"`.

**Geaendert**

- `Groessen.tsx`: Abschnitt "Meine Groessen" vor der Tabelle der zehn Groessen:
  Liste (Name, Art, Masse, Liter und Stufe laut DB nach dem Speichern aus
  `kisten_groessen` nur angezeigt, nicht gerechnet: die Stufe steht an den
  Kisten), Knoepfe Anlegen, Aendern, Loeschen (ConfirmDialog; Ablehnung
  `groesse.benutzt` nennt Zahlen). Betrachter sehen die Liste ohne Knoepfe.
- `Items.tsx`: SizePicker-Import; Anlege-Dialog setzt sich beim Oeffnen zurueck
  (draft, formError), `'none'` aus `?room`/`?person` nie in den Draft, kein
  stilles `rooms[0]` (ohne `?room` ist Zimmer Pflichtwahl mit Hinweis),
  Abbrechen entfernt `?neu`, `eigene_groesse_id` im Draft und in `createItem`.
- `Furniture.tsx` (Anlegen) und `FurnitureDetail.tsx` (AngabenDialog): eigene
  Groessen der Art `moebel`.
- `ItemDetail.tsx`: Bearbeiten-Dialog Z. 1170 mit eigenen Groessen; bei gesetzter
  eigener Groesse ist das Feld "eigene Hoehe" ausgegraut mit Satz
  `kisten.eigene_hoehe_durch_groesse`.
- `Labels.tsx` Z. 399 bis 404: bei `eigene_groesse_id` den Namen statt der Liter
  (`etiketten.groesse_eigene` `{name}`); Daten ueber `listEigeneGroessen` einmal
  je Umzug.
- `lib/raumplan.ts`: `zahlLesen`, `brettListeLesen` nach `geometrie.ts`,
  hier nur noch Re-Export. `Groessen.tsx`, `ItemDetail.tsx` importieren aus
  `geometrie.ts`.
- `supabase.ts` `errText` (4.3).
- `RaumPlan.tsx`: vor dem Anwenden von 0029 nur lesend (Modus-Chips und
  Schreibknoepfe weg) mit Karte `raumplan.zieht_um` ("Der Raumplan zieht in den
  neuen Grundriss um. Plaetze setzt du bald dort."); nach 0029 sind die alten
  Plaetze leer.
- `public/sw.js`: `VERSION = 'kistly-v3'`.
- Desktop-Rahmen: steht (`5f129b1`). Nachziehen: `aria-current="page"` an
  aktiven Eintraegen von Seitenleiste und unterer Leiste; Eintrag "Grundriss"
  kommt in Etappe 2.

**Woerterbuch (Gruppen)**

- `groessen.ts`: `groessen.eigene_titel`, `groessen.eigene_leer`,
  `groessen.eigene_anlegen`, `groessen.eigene_aendern`, `groessen.eigene_loeschen`,
  `groessen.eigene_name`, `groessen.eigene_art_kiste`, `groessen.eigene_art_moebel`,
  `groessen.eigene_l_form`, `groessen.eigene_ausschnitt`, `groessen.eigene_masse` `{l}{b}{h}`,
  `groessen.eigene_folgen` `{kisten}{moebel}{neu}{stufe}`, `groessen.stufe_setzt_db`.
- `kisten.ts`: `kisten.eigene_groesse`, `kisten.eigene_hoehe_durch_groesse`,
  `kisten.zimmer_waehlen_pflicht`.
- `etiketten.ts`: `etiketten.groesse_eigene` `{name}`.
- `fehler.ts`: `fehler.eigene_groessen_laden`, `fehler.eigene_groesse_speichern`,
  `fehler.eigene_groesse_loeschen`, `fehler.bitte_nochmal`,
  `fehler.db.groesse.benutzt` `{kisten}{moebel}`, `fehler.db.groesse.anderer_umzug`,
  `fehler.db.groesse.name_doppelt`, `fehler.db.raumplan.eingefroren`, und
  **alle** `fehler.db.grundriss.<kennung>` aus 0028 (Liste 5.5), damit
  Ablehnungen ab dem ersten Tag zweisprachig sind.
- `raumplan.ts`: `raumplan.zieht_um`.

Beispiele: `'groessen.eigene_titel': { de: 'Meine Größen', ar: 'أحجامي' }`,
`'fehler.db.groesse.benutzt': { de: 'Diese Größe benutzen noch {kisten} Kisten und {moebel} Möbel.', ar: 'ما زال {kisten} صناديق و{moebel} قطع أثاث تستخدم هذا الحجم.' }`.

### 5.2 Etappe 2: Zeichner (Desktop) und Draufsicht

**Routen** (`App.tsx`, unter `p/:pid`):

- `grundriss` -> `Grundriss.tsx` ohne `gid`: ruft `grundrissSicherstellen`
  (Name `t('grundriss.neue_wohnung')`) und leitet auf `grundriss/:gid` um.
- `grundriss/:gid` -> `Grundriss.tsx`. Parameter `?raum=<raumId>` (Raum
  waehlen und hinzoomen), `?kiste=<itemId>` (nur zeigen und hervorheben, nie
  in die Hand nehmen).
- `zimmer/:tagId/plan` -> `AlterPlanLink` (in `Grundriss.tsx`): sucht den Raum
  des Zimmers (`ladeRaeumeDesUmzugs`, erster Grundriss zuerst) und leitet auf
  `grundriss/:gid?raum=...&kiste=...` um, sonst auf `grundriss`. Alte Links im
  Chat funktionieren weiter.

**Seite `src/pages/Grundriss.tsx`**

- Kopf: Reiter der Grundrisse (`ladeGrundrisse`), Reiter "+" (Name im Dialog,
  Vorschlaege "Neue Wohnung", "Alte Wohnung", "Keller", "Lager"), Umbenennen,
  Loeschen (ConfirmDialog mit `grundrissKistenZahl`).
- `useZeichnen()` (`lib/desktop.ts`: min 1024 px und `(any-pointer: fine)`) und
  `canEdit`: dann `const Zeichner = lazy(() => import('../zeichner/Zeichner'))`
  mit Suspense-Skelett. Sonst `PlanBild` des ganzen Grundrisses (antippbar:
  Raum -> `?raum=`) und der Satz `grundriss.nur_computer` ("Zeichnen geht am
  Computer"). Das Handy laedt keinen Zeichner-Code.
- Zustaende: laedt (Skelett), Fehler (ErrorBox), leer (Grundriss ohne Raum:
  Zeichner zeigt den Assistenten; Nur-Lese-Ansicht zeigt Empty "Noch nichts
  gezeichnet").

**Gemeinsame Bausteine `src/components/plan/`** (auch Handy, Kistenseite, Suche)

- `PlanBild.tsx`: SVG, `viewBox` in cm, Props `daten: GrundrissDaten`,
  `ausschnitt?: { raumId: string } | 'alles'`, `hervor?: string` (Item-Id,
  rot `--plan-hervor`), `auswahl?: {art, id}`, `ebenen?`, `onTipp?(p: Punkt, treffer)`.
  Ebenen: Boden (`--plan-boden`, Balkon `--plan-boden-draussen`), Waende
  (`wandStuecke`, 12 cm, `--plan-wand`, Wandfarbe als 4-cm-Streifen innen),
  Tueren (`--plan-tuer`, Blatt und Viertelbogen), Fenster (`--plan-fenster`,
  Doppellinie), Objekte (Name und `B x T`), Kisten (Grundflaeche, Farbe
  `mark_color` oder Zimmerfarbe, Code ab genuegend Zoom), Beschriftung (Name,
  m², Hoehe). Striche mit `vector-effect: non-scaling-stroke`, Schrift aus dem
  Zoom gerechnet. `React.memo` je Ebene.
- `FachAnsicht.tsx`: Vorderansicht eines Regals/Schranks (SVG, cm-Skala),
  Faecher (Ebene, Spalte) als antippbare Kacheln mit "44 bis 78 cm",
  darin die Kisten; Props `objekt`, `kisten`, `hervor?`, `onFach?(ebene, spalte)`.
- `StapelSeite.tsx`: Seitenansicht eines Stapels mit Decke gestrichelt.
- `Lageplan.tsx`: kleine Nur-Lese-Karte fuer eine Kiste: `ladeKisteLage` +
  `ladeGrundriss(g, raum)`, dann `PlanBild` (Raum, Kiste rot) und je nach
  Unterlage `FachAnsicht` oder `StapelSeite`, Legende Tuer/Fenster/Kiste,
  Satz aus `lageSatz()` (5.3). Zustaende laedt/Fehler/kein Platz/da. Ersetzt
  `Fundort` in der Suche schon in dieser Etappe.

**Zeichner `src/zeichner/`** (eigener Code-Teil, Ziel hoechstens 100 KB gzip,
Hauptbuendel waechst hoechstens 15 KB; nach `vite build` pruefen)

- `Zeichner.tsx`: Bildschirm in voller Breite: links Werkzeugleiste (Symbol,
  Name, Taste), Mitte Zeichenflaeche (`dir="ltr"`), rechts Eigenschaften,
  unten Statusleiste (Zeiger in m/cm, Raster 1/5/10 cm, Standard 5, Winkel an,
  Zoom, "Gespeichert"/"Speichert ..."/"Nicht gespeichert, nochmal"), oben
  Rueckgaengig/Wiederholen. Leiste "Noch nicht gezeichnet": Zimmer des Umzugs
  ohne Raum in diesem Grundriss als Chips (ziehen auf einen Raum = zuordnen).
  Assistent (rechte Spalte, solange leer): 1 Umriss oder Raeume zeichnen,
  2 Teilen, 3 Zimmer zuordnen, 4 Tueren und Fenster, 5 Hoehen pruefen; Haken
  aus dem Dokument berechnet.
- `zustand.ts`: Reducer `{ dok: GrundrissDaten; version; auswahl; werkzeug;
  verlauf: { zurueck: Dok[]; vor: Dok[] } (max 200); ansicht; raster; speichern }`.
  Jede abgeschlossene Aktion: neuer `dok`, Vorher-Stand auf `zurueck`, dann
  sofort `speichereGrundriss` mit dem Unterschied (`diff.ts`). Rueckgaengig =
  Vorher-Stand wird Ziel, Unterschied speichern (neue Version). Konflikt
  (`veraltet`): Dialog "Jemand hat den Grundriss geaendert: neu laden".
  Ablehnung: Leiste mit uebersetztem Satz und Knopf "Zeigen" (hinzoomen auf
  den Raum/die Kiste aus `detail`), der Stand wird aus der Antwort bzw. neu
  geladen. Vor dem Speichern einer Raum-Aenderung prueft der Browser mit
  `punktImPolygon`, welche Kisten draussen laegen, und zeigt sie mit Code
  ("Diese Kisten stuenden ausserhalb: ..."); die DB lehnt ohnehin ab.
- `diff.ts`: `unterschied(alt, neu): GrundrissAenderung` (geloeschte ids,
  geaenderte Zeilen, erkannte Verschiebung eines ganzen Raums -> `verschieben`,
  Teilen -> `zuordnen`), `umlaufRichten` vor dem Senden.
- `werkzeuge/*.ts`: jedes Werkzeug ein reines Objekt
  `{ taste; runter(z, s); bewegen(z, s); hoch(z, s); eingabe(werte, s); taste(code, s); abbrechen(s) }`
  das Aktionen zurueckgibt (ohne JSX, ohne Browser pruefbar). Tasten ueber
  `event.code` (arabische Tastatur). Werkzeuge nach START 5.4:
  - Auswahl (V): Klick waehlt Raum, Kante, Oeffnung, Objekt, Kiste; Ziehen
    verschiebt (Raum samt Inhalt -> `verschieben`); Kante ziehen schiebt sie
    parallel; Doppelklick auf Kante fuegt Ecke ein, auf Ecke entfernt sie
    (Oeffnungen werden umnummeriert); Pfeile 1 cm, Umschalt 10 cm; Entf loescht
    (Raum mit Kisten: ConfirmDialog mit Zahl).
  - Raum (R): Punkt fuer Punkt, Laenge tippen und Enter (wie SketchUp: Richtung
    zeigen, `3,45` tippen, Enter, ohne in ein Feld zu klicken), Klick auf den
    Startpunkt schliesst; Umschalt+R Rechteck: Ecke, dann `4,20` Tab `3,85`
    Enter.
  - Teilen (T): Linie quer durch einen Raum (90 Grad gefangen, Umschalt frei),
    ergibt zwei Raeume; der alte behaelt Id und Zimmer, Inhalt wird per
    `zuordnen` verteilt.
  - Tuer (D) und Fenster (F): auf einer Kante, Abstand zur naechsten Ecke
    tippbar, Standard Tuer 80 x 200, Fenster 100 x 120, Bruestung 90; Farbe fest.
  - Moebel (M), Regal (K), Schrank (J): Geist folgt dem Zeiger, rastet an
    Waenden und Objekten ein, Q/E dreht um 90 Grad (um die Mitte, x/y wird
    angepasst), rot wenn ausserhalb; Katalog (Sofa, L-Sofa, Bett 90/140/180,
    Tisch, Kommode, Fernseher, Kuehlschrank, Waschmaschine, Regal, Kleiderschrank)
    und "Aus meiner Groesse" (eigene Groessen der Art `moebel`, Masse werden
    kopiert). Regal/Schrank mit Faecher-Editor.
  - Kiste setzen (B): Liste "Kisten ohne Platz" (`listItems` mit `ohnePlatz`),
    Klick auf die Stelle oeffnet die Unterlagen-Auswahl (`unterlagenAn`), dann
    `platzSetzen` sofort (nicht Teil des Zeichnungs-Verlaufs; Rueckgaengig
    dafuer ueber `platzRaeumen` bzw. den alten Platz).
  - Messen (A): zwei gefangene Punkte, nur Anzeige.
  - Allgemein: Strg+Z, Strg+Y, Esc, 0 = alles zeigen, Mausrad zoomt am Zeiger,
    Leertaste oder mittlere Taste verschiebt.
- `Eigenschaften.tsx`: Raum (Zimmer waehlen aus freien Zimmern oder "Neues
  Zimmer anlegen" ueber den aus `Areas.tsx` gezogenen `BereichDialog`; Name ohne
  Zimmer; innen/draussen; Hoehe in m/cm; Bodenfarbe; Wandfarbe je Kante aus 8
  Farben mit Kontrasthinweis unter 3:1), Kante (Laenge editierbar), Oeffnung
  (Abstand, Breite, Hoehe, Bruestung, Anschlag, Aufschlag), Objekt (Name,
  Masse, Drehung, Form, Farbe, Verknuepfung mit Moebel-Eintrag), Kiste (Code,
  Platz, Hoehe, "Vom Platz nehmen").
- `FaecherEditor.tsx`: Eingabe "Abstaende von unten nach oben" (`30, 35, 35, 40`
  ueber `brettListeLesen` + `faecherAusAbstaenden`) oder "n Faecher
  gleichmaessig", Spalten 1 bis 20, Vorderansicht live (`FachAnsicht`).
- Masse an jeder Wand in cm (`kanteLaenge`, gerundet), Objekte zeigen Name und
  Masse, Masseketten anklickbar (Wert tippen, Element rueckt).

**Geaendert / geloescht in Etappe 2**

- `AppLayout.tsx`: Seitenleisten-Eintrag Grundriss (`leiste.grundriss`,
  Symbol `LayoutDashboard`/`Ruler`) nach "Zimmer".
- `AreaDetail.tsx` Z. 190: Knopf "Grundriss" -> `grundriss?raum=` (Raum des
  Zimmers) bzw. `grundriss`.
- `ItemDetail.tsx` Z. 489 bis 498: "Im Raumplan zeigen" wird "Im Grundriss
  zeigen" (`grundriss/:gid?raum=&kiste=`), nur wenn `platz_raum_id` gesetzt.
- `ProjectHome.tsx`: Kachel "Grundriss".
- `Suche.tsx`: `Fundort` -> `Lageplan`; `zumPlan` -> Grundriss-Link.
- Geloescht: `pages/RaumPlan.tsx`, `components/raumplan/*`,
  `lib/raumplan.ts`, api Z. 565 bis 716 ausser `ladeKistenGroessen`/
  `inhaltSuchen`, Typen `Raumplan`, `Regal`, `TuerSeite`, `Item.plan_*`,
  `regal_*`, errText-Zeile `items_plan_platz2`. `raumplan.*`-Schluessel bleiben
  bis Etappe 4 (woerter-pruefen stoert sich nicht an unbenutzten).
- `index.css`: Plan-Tokens (5.4) schon jetzt, weil `PlanBild` sie braucht.

**Woerterbuch:** neuer Baustein `grundriss.ts` (in `woerter.ts` eintragen):
`grundriss.*` (Titel, Reiter, neue_wohnung, alte_wohnung, keller, lager,
anlegen, umbenennen, loeschen_frage `{n}`, nur_computer, leer, gespeichert,
speichert, nicht_gespeichert, veraltet, zeigen, kisten_draussen_vorab `{codes}`),
`zeichner.*` (je Werkzeug Name und Hilfesatz, Tasten, Assistent-Schritte,
Eigenschaften-Felder, Faecher-Editor, Katalog-Namen), `plan.*` (tuer, fenster,
regal, schrank, moebel, boden, fach `{ebene}{spalte}`, legende_hier,
legende_ziel, m2 `{n}`, hoehe `{m}`), `gemeinsam.ts`: `leiste.grundriss`.

### 5.3 Etappe 3: Handy platzieren, Kistenseite, Suche, Moebel

**Neu**

- Route `kisten/:iid/platz` -> `src/pages/PlatzWahl.tsx` (lazy), Vollbild-Ablauf
  mit grossen Knoepfen (START 5.7). `location.state`:
  `{ zurueck?: string; reihe?: string[] }` (`zurueck` nur Pfade ab `/app/`).
  1. Laden: `getItem`, `ladeRaeumeDesUmzugs`, `ladeKisteLage`. Moebel: Satz
     "Moebel bekommen ihren Platz im Grundriss" + Link. Betrachter: nur
     ansehen. Kein Raum gezeichnet: Empty `platz.nicht_gezeichnet`
     ("Zeichnen geht am Computer") mit "Spaeter".
  2. Zimmer waehlen: vorgewaehlt der Raum des jetzigen Platzes, sonst der Raum,
     dem das Zimmer der Kiste zugeordnet ist (erster Grundriss zuerst). Gibt es
     genau einen passenden, wird der Schritt uebersprungen ("das Zimmer geht
     auf"). Sonst Chips nach Grundriss gruppiert. Steht die Kiste in einem Raum
     eines anderen Zimmers: Hinweis `lage.gehoert_in` `{zimmer}` (die Nummer
     bleibt).
  3. Draufsicht (`PlanBild`, Ausschnitt Raum, nur lesen, Zwei-Finger-Zoom mit
     `touch-action: none` nur auf der Flaeche). Tippen setzt den Mittelpunkt,
     auf 5 cm gerundet; Geist in echter Groesse (`laenge x breite`), Knopf
     "Drehen". Feineinstellung aufklappbar: `von links` / `von oben` (ab der
     linken oberen Ecke des Raum-Rahmens) als Zahlenfelder mit `laengeLesen`,
     Knoepfe -10, -1, +1, +10 cm (48 px). Ueberlappung mit Kisten am Boden:
     gelbe Warnung mit Codes.
  4. Unterlage (`UnterlageWahl.tsx`): Liste aus `unterlagenAn`, vorgewaehlt die
     erste passende; "Boden 0 bis 31 cm", "auf W-3-004, 31 bis 62 cm",
     "auf Kommode, 80 bis 111 cm", "Regal Billy" -> `FachAnsicht` mit Faechern
     (Tipp = Fach). Was nicht passt, ist ausgegraut mit Grund.
  5. Speichern (feste Leiste ueber der unteren Leiste, `bottom: var(--nav-h)`):
     `platzSetzen`; Erfolg: Toast "W-3-007 steht jetzt: ...", zurueck bzw.
     "Naechste Kiste" bei `reihe`. Ablehnung: Satz aus errText, Plan neu laden,
     Stelle bleibt.
  Tipps im Normalfall: "Platz waehlen" (1), Stelle (2), [Unterlage, falls
  nicht vorgewaehlt] (3), Speichern (4). Zuletzt benutzte Stellen je Raum in
  `sessionStorage 'kistly.platz.<raumId>'` (try/catch) als Chips.
- `src/components/plan/KistenLage.tsx`: Abschnitt "Wo steht die Kiste" ganz
  unten auf der Kistenseite (vor dem Abstand Z. 1098), `id="lage"`, laedt erst,
  wenn er auf 600 px herankommt (IntersectionObserver), damit Fotos zuerst
  kommen. Inhalt: Satz aus `lageSatz(lage, t)`:
  - Fach: "Regal Billy, Fach 2 (Ebene 2), 44 bis 78 cm ueber dem Boden"
  - auf Kiste: "auf Kiste K-6-003, 34 bis 68 cm"
  - auf Objekt: "auf Kommode, 80 bis 111 cm"
  - Boden: "auf dem Boden, 0 bis 31 cm"
  davor "Neue Wohnung, Wohnzimmer"; nicht angekommen: `lage.noch_nicht_da`
  ("Noch nicht angekommen: hier kommt sie hin"). Darunter `PlanBild`
  (Raum, Tuer orange, Fenster blau, Kiste rot) und `FachAnsicht` bzw.
  `StapelSeite`. Knoepfe: "Platz waehlen/aendern" (-> PlatzWahl,
  `zurueck` = Kistenseite), "Vom Platz nehmen" (ConfirmDialog; `platzRaeumen`;
  nennt `auf_ihr`: "W-3-004 rutscht nach"), "Im Grundriss oeffnen"; am Desktop
  ab Etappe 4 "3D". Zustaende: laedt, Fehler, kein Platz (Empty mit "Platz
  waehlen"), da.

**Geaendert**

- `ItemDetail.tsx`: Abschnitt `KistenLage`; Knopf in der Kopfkarte wird
  Sprunglink "Wo steht sie?" (`scrollIntoView` auf `#lage`); `?inhalt=`:
  oben ein Such-Band "Gesucht: Akkuschrauber, Schicht 2" mit Ausschnitt
  (Tipp oeffnet `PunktBild`), "Zum Lageplan" und X; ist der Eintrag weg, sagt
  das Band `suche.eintrag_weg`.
- `FurnitureDetail.tsx`: `?inhalt=` wie auf der Kistenseite (Zeile rahmen und
  hinrollen), Abschnitt "Wo steht das Moebel" (`kiste_lage` Art `moebel`,
  `PlanBild` mit hervorgehobenem Objekt), ohne Objekt: Satz "Im Grundriss als
  Moebel zeichnen und verknuepfen".
- `Items.tsx`: nach dem Anlegen einer einzelnen Kiste (nicht Moebel) mit
  Zimmer, das einen Raum hat: Erfolgsblatt "W-3-007 angelegt" mit
  "Im Zimmer platzieren" (-> PlatzWahl, `zurueck` = Liste) und "Fertig"; bei
  Anzahl > 1 "Nacheinander hinstellen" (`reihe` = alle neuen ids).
- `Schnellansicht.tsx`: zwischen Zimmer-Chips (Z. 373) und Angekommen (Z. 375)
  Zeile "Platz: Wohnzimmer" bzw. "noch kein Platz" und Knopf "Im Zimmer
  platzieren"/"Platz aendern" (nur `darfAendern`, nicht Moebel) ->
  `/app/p/<pid>/kisten/<id>/platz` mit `zurueck` = aktueller Pfad. Daten aus
  `ladeSchnellansicht` (4.3), keine zweite Abfrage.
- `ScanHub.tsx` Z. 492: "Zum Zimmer" -> Zimmerseite statt gefilterter Liste.
  Neue Zustaende in ScanHub/ScanPage nur ueber Refs (Kamera!).
- `AreaDetail.tsx` (Zimmer): Abschnitt "Ohne Platz" mit Chips; Tipp oeffnet
  PlatzWahl mit `reihe` = alle ohne Platz.
- `Suche.tsx` + `SuchTreffer` + `inhaltSuchen`: neue Spalten (0030).
  Trefferzeile: Ding (Ausschnitt, `2x` in t-serial, Name), Kiste (CodeChip),
  Schicht, Zimmer (Badge), Platz und Hoehe in einer Zeile ("Neue Wohnung,
  Wohnzimmer, Regal Billy, Fach 2, 44 bis 78 cm" bzw. "noch ohne Platz"),
  StatusPill wenn nicht angekommen, "Stimmt nicht". Handy: Tipp fuehrt direkt
  zur Kiste bzw. zum Moebel mit `?inhalt=<content_id>` (Band mit Foto, Zeile
  gerahmt, Lageplan unten). Desktop: Liste links, rechts Detail (Foto mit
  Rahmen, Fakten, `Lageplan`, Knoepfe Zur Kiste, Foto gross, Im Grundriss),
  Auswahl in der Adresse `?t=<content_id>`. Zustaende unveraendert getrennt.
  `'#888888'` -> Variable, `rahmenAus` -> `rahmenVon`.
- `public/sw.js`: `VERSION = 'kistly-v4'` (mit 0030).

**Woerterbuch:** `platz.*` (titel, zimmer_waehlen, nicht_gezeichnet, spaeter,
von_links, von_oben, drehen, boden `{von}{bis}`, auf_kiste `{code}{von}{bis}`,
auf_objekt `{name}{von}{bis}`, fach `{name}{ebene}{spalte}{von}{bis}`,
passt_nicht `{grenze}`, ueberlappt `{codes}`, speichern, gespeichert `{code}`,
naechste), `lage.*` (titel, satz_fach, satz_kiste, satz_objekt, satz_boden,
hoehe `{von}{bis}`, noch_nicht_da, gehoert_in `{zimmer}`, kein_platz,
platz_waehlen, platz_aendern, vom_platz, rutscht_nach `{codes}`, im_grundriss,
moebel_ohne_objekt), `suche.*` erweitert (ort_zeile, eintrag_weg, zum_lageplan,
im_grundriss, in_moebel `{name}`), `schnell.*` (platz, kein_platz, platzieren),
`kisten.*` (angelegt_blatt `{code}`, im_zimmer_platzieren, nacheinander).

### 5.4 Etappe 4: 3D, Redesign, altes Raster weg

**3D** (`src/components/plan3d/`, START 5.5)

- `szene.ts`: reine Funktion `baueSzene(daten: GrundrissDaten, farben, optionen: {raumId?, hervor?})`
  -> Liste von Koerpern (ohne three), pruefbar in Node.
- `Raum3D.tsx` (default export): three.js (`three`, feste Nebenversion, ohne
  react-three-fiber), OrbitControls aus `three/examples/jsm/controls/OrbitControls.js`.
  Geladen nur ueber `lazy(() => import('../plan3d/Raum3D'))`, nur wenn
  `useZeichnen()` wahr ist und jemand "3D" oeffnet (Zeichner-Umschalter,
  Kistenseite `KistenLage`, Suche-Detail). Ziel: 3D-Teil hoechstens 180 KB gzip.
- Massstab 1 = 1 m; Plan-x = x, Plan-y = z, Hoehe = y. Boden (ShapeGeometry),
  Waende aus `wandStuecke` in Raumhoehe (Wandfarbe oder `--plan-wand-3d`),
  Tueren orange (Luecke bis Tuerhoehe, Sturz, Blatt 25 Grad offen), Fenster blau
  (Scheibe 35 %), Moebel als Quader (L = zwei), Regale mit Seiten und Brett je
  Ebene, Kisten in echter Groesse ab `unten_cm`; gesuchte Kiste rot
  (`--plan-hervor`) mit Kante, die anderen gedaempft. Kamera drehen, zoomen,
  verschieben; Waende, deren Innenseite zur Kamera zeigt, halbdurchsichtig.
  Keine Texturen, keine Schatten (Schatten hoechstens bei `data-motion="voll"`
  ueber die Designschicht). Gerendert nur bei Aenderung, `dispose` beim
  Verlassen, ohne WebGL eigener Hinweis `plan3d.geht_nicht`, 2D bleibt.
- Farben per `getComputedStyle(document.documentElement)` aus den Tokens,
  neu bei Hell/Dunkel (MutationObserver auf `html.class`).

**Tokens** (in `src/index.css`, hell / dunkel; schon ab Etappe 2 fuer 2D):

| Token | hell | dunkel | Zweck |
|---|---|---|---|
| `--plan-boden` | `#e6dccb` | `#3a342b` | Boden, warm mittelhell |
| `--plan-boden-draussen` | `#d9e2cf` | `#2f372b` | Balkon, Terrasse |
| `--plan-wand` | `#3f3931` | `#cbbfa9` | Wand in 2D, Wandkopf in 3D (Kontrast etwa 9:1 bzw. 6:1) |
| `--plan-wand-3d` | `#b9ad98` | `#8f8472` | Wandflaeche ohne eigene Farbe |
| `--plan-tuer` | `#e0700f` | `#f28c2e` | IMMER orange, nicht waehlbar |
| `--plan-fenster` | `#2b78c9` | `#5ea4ee` | IMMER blau, nicht waehlbar |
| `--plan-objekt` | `#cbbfa9` | `#5a5243` | Moebel |
| `--plan-objekt-rand` | `#6b6253` | `#a89f8c` | Umriss |
| `--plan-fach` | `#b8ab93` | `#6d6452` | Bretter |
| `--plan-kiste-rand` | `var(--ink)` | `var(--ink)` | Kistenrand |
| `--plan-hervor` | `var(--danger)` | `var(--danger)` | "hier ist es" (rot) |
| `--plan-auswahl` | `#7a3fb0` | `#b98be0` | Auswahl im Zeichner (violett) |
| `--plan-warnung` | `var(--warn)` | `var(--warn)` | Ueberlappung |
| `--plan-linie` | `#8a8171` | `#6f6858` | Raster, Masslinien |

Datenfarben (gespeichertes Hex, keine Tokens): `WANDFARBEN` in
`src/lib/farben.ts`, acht Farben mit mindestens 3:1 gegen `--plan-boden` hell:
Anthrazit `#3f3931`, Schiefer `#4a5560`, Taubenblau `#3e5f7a`, Salbei `#4f6b4a`,
Terrakotta `#8a4a32`, Ocker `#7a5a1e`, Aubergine `#5b3f5e`, Petrol `#1f5f63`;
`BODENFARBEN` (Eiche hell, Eiche dunkel, Fliese grau, Beton). 2D zeichnet die
Wand immer in `--plan-wand` und die Wandfarbe als Streifen innen, damit der
Kontrast im Dunkelmodus haelt. Tuer und Fenster kommen sonst nirgends als
Schmuck vor.

**Redesign nach START 5.9a** (nur Designschicht und Layout, keine Logik)

- Grundlagen in `index.css`: Abstands- und Radius-Tokens (`--abstand-*` im
  4-px-Raster, `--radius-karte` 14 px, `--radius-knopf` 12 px), Schatten nur an
  Karten und Dialogen, Hauptaktion orange (`--accent` wird Orange, eigenes Token
  `--accent-ink` fuer Text darauf; Tuer-Orange bleibt ein eigener Wert),
  Kontrast Text/Grund >= 4,5:1.
- `src/design/oberflaeche.css` (Hover, Uebergaenge, Glas nur bei `voll`),
  `src/design/plan.css` (weiche Auswahl, pulsierender Ring um `--plan-hervor`
  bei `normal`/`voll`), alles hinter `html[data-motion]` und
  `prefers-reduced-motion`. Einbindung ohne harten Import:
  `import.meta.glob('./design/*.css', { eager: true })` in `main.tsx`;
  Bewegungslogik aus `design/motion.tsx` nach `src/lib/bewegung.ts` (Settings
  importiert dann nichts mehr aus `src/design`). README der Designschicht:
  Rueckweg "Ordner loeschen, fertig".
- Desktop: Kistenliste als Tabelle mit sortierbaren Spalten (Nummer, Zimmer,
  Groesse, Status, Platz) links, gewaehlte Kiste rechts; Kistenseite
  dreispaltig (Inhalt und Fotos | Lageplan | Eigenschaften). Handy: Karten
  volle Breite, Status als Pille, Kistenseite: Nummer und Status, Fotos als
  waagrechte Reihe, Inhalt, ganz unten Lageplan. Leere Zustaende mit Zeichnung
  aus `src/design/Kisten.tsx`, Laden als Skelett-Karten.
- Laden und Fehler behalten den Kopf mit Zurueck (ProjectLayout, ItemDetail,
  FurnitureDetail).

**Altes Raster weg:** 0031 anwenden; `raumplan.ts`-Baustein und
`fehler.db.raumplan.*` (samt verwaister `raumplan.kein_platz_mehr`,
`raumplan.zu_hoch`, `raumplan.stapel`, `fehler.raumplan_nachruecken`)
loeschen; was noch gebraucht wird, liegt dann schon in `plan.*`/`lage.*`.

**Woerterbuch:** `plan3d.*` (oeffnen, laedt, geht_nicht, ansicht_oben,
ansicht_schraeg, zur_kiste, waende_halb).

### 5.5 Kennungen `fehler.db.grundriss.*` (alle aus 0028, Etappe 1 anlegen)

| Kennung | Platzhalter | Satz (de) |
|---|---|---|
| `raum_punkte` | | Ein Raum braucht 3 bis 200 Ecken. |
| `raum_bereich` | | Der Raum liegt ausserhalb der Zeichenflaeche. |
| `raum_doppelt` | | Zwei Ecken liegen aufeinander. |
| `raum_kreuzt` | | Die Waende dieses Raums kreuzen sich. |
| `raum_umlauf` | | Der Raum ist falsch herum gezeichnet. Bitte neu laden. |
| `raum_umhaengen` | | Ein Raum bleibt in seinem Grundriss. |
| `grundriss_fehlt` | | Diesen Grundriss gibt es nicht mehr. |
| `zimmer_falsch` | | Das ist kein Zimmer dieses Umzugs. |
| `zimmer_doppelt` | `{name}` | {name} ist in diesem Grundriss schon gezeichnet. |
| `farbe_ungueltig` | | Diese Farbe geht nicht. |
| `kisten_draussen` | `{n}{code}` | Danach stuenden {n} Kisten ausserhalb, zum Beispiel {code}. |
| `zu_niedrig` | `{n}{code}` | So niedrig passen {n} Kisten nicht mehr, zum Beispiel {code}. |
| `raum_fehlt` | | Diesen Raum gibt es nicht mehr. |
| `oeffnung_kante` | `{art}` | Diese Wand gibt es nicht mehr. |
| `oeffnung_zu_breit` | `{art}` | Tuer oder Fenster ist breiter als die Wand. |
| `oeffnung_zu_hoch` | `{art}` | Tuer oder Fenster ist hoeher als der Raum. |
| `oeffnungen_ueberlappen` | `{art}` | Hier ist schon eine Tuer oder ein Fenster. |
| `objekt_draussen` | `{name}{art}` | {name} ragt aus dem Raum. |
| `objekt_zu_hoch` | `{name}{art}` | {name} ist hoeher als der Raum. |
| `objekt_umhaengen` | | Moebel bleiben im selben Grundriss. |
| `faecher_ungueltig` | `{name}` | Die Faecher von {name} passen nicht (mindestens 1 cm Platz je Fach). |
| `moebel_verknuepfung` | `{name}` | Nur ein Moebel-Eintrag dieses Umzugs laesst sich verknuepfen. |
| `moebel_schon_verknuepft` | `{name}` | Dieser Moebel-Eintrag gehoert schon zu einem anderen Moebel. |
| `moebel_kein_platz` | `{code}` | Moebel stehen im Grundriss, nicht als Kiste. |
| `draussen` | `{code}` | {code} stuende ausserhalb des Raums. |
| `unterlage_fehlt` | `{code}` | Darunter steht nichts mehr. Bitte neu laden. |
| `unterlage_anderer_raum` | `{code}` | Die Unterlage steht in einem anderen Raum. |
| `kreis` | `{code}{unter}` | {code} kann nicht auf {unter} liegen, das liegt schon auf {code}. |
| `nicht_darauf` | `{code}{unter}` | {code} liegt nicht auf {unter}: die Mitte muss ueber der Kiste darunter sein. |
| `nicht_darauf_objekt` | `{code}{name}{art}` | {code} steht nicht auf {name}. |
| `kein_regal` | `{code}{name}` | {name} hat keine Faecher. |
| `fach_fehlt` | `{code}{name}{ebene}{spalte}` | Dieses Fach gibt es in {name} nicht. |
| `nicht_im_fach` | `{code}{name}{ebene}{spalte}` | {code} steht nicht in diesem Fach. |
| `zu_hoch` | `{code}{oben}{grenze}` | {code} ginge bis {oben} cm, Platz ist bis {grenze} cm. |
| `veraltet` | `{version}` | Jemand hat den Grundriss inzwischen geaendert. Bitte neu laden. |
| `keine_rechte` | | Das duerfen nur Bearbeiter. |
| `fremde_id` | | Das gehoert zu einem anderen Grundriss. Bitte neu laden. |

`{name}` kann leer sein (Objekt ohne Namen): errText setzt dann das Wort der
Art ein (`plan.regal` usw.), bevor es uebersetzt. Jede Zeile bekommt einen
arabischen Satz mit denselben Platzhaltern, den Karam gegenliest. Die
Kennungen der eigenen Groessen stehen unter `fehler.db.groesse.*` (5.1).

---

## 6. Reihenfolge und Pruefkriterien je Etappe

Vor jedem Commit (CLAUDE.md): `npx tsc -b` still, `npx oxlint` nur Warnungen,
`npm run build`, `node scripts/woerter-pruefen.mjs` (bekannt 9 Meldungen
`*.eins`), ab Etappe 1 zusaetzlich `node scripts/geometrie-pruefen.mjs`. Kein
Schluessel im Diff, kein U+2014 (`grep -rn "$(printf '\342\200\224')" src supabase scripts docs`
muss leer sein), keine Wegwerf-Testseite im Commit. Commit-Nachricht deutsch
mit Co-Authored-By-Zeile. Push auf `main` geht sofort live, darum jede Etappe
so, dass sie allein laeuft.

Datenbank: jede Migration Probelauf -> Bericht zeigen -> anwenden (Karams
stehende Freigabe fuer diesen Umbau) -> kurz nachpruefen (Tabellen, Trigger,
Rechte). Nur Projekt `vqpirkgvclfsduklnnzv`. Ohne Datenbank-Werkzeug: Dateien
und Anleitung an Karam (START 1.3), an der Oberflaeche weiterarbeiten.

### Etappe 1 (Datenmodell, eigene Groessen, Geometrie, Rahmen)

Reihenfolge:

1. `src/lib/geometrie.ts` + `scripts/geometrie-pruefen.mjs` (alle Faelle 3.4
   gruen), `zahlLesen`/`brettListeLesen` umziehen.
2. 0027 schreiben, Probelauf, anwenden.
3. 0028 schreiben, Probelauf (mehrere Pruefer, Stapel-Logik und Kaskaden
   gegenlesen lassen), anwenden.
4. `types.ts`, `api.ts` (4.2 Etappe 1), `errText`, Woerterbuecher (alle
   `fehler.db.grundriss.*`, `fehler.db.groesse.*`, `fehler.db.raumplan.eingefroren`,
   `raumplan.zieht_um`).
5. SizePicker ausgelagert, eigene Groessen in Groessen.tsx, Items, Furniture,
   FurnitureDetail, ItemDetail, Labels; Items-Dialog-Fixes; RaumPlan nur lesend;
   sw.js `kistly-v3`. Commit, push (App laeuft, alter Plan nur lesend).
6. 0029 Probelauf auf echten Daten, Bericht an Karam in der Etappen-Meldung,
   anwenden, danach Suche pruefen (Platz und Hoehe erscheinen wieder).
7. STAND.md, ENTSCHEIDUNGEN.md, Commit, push.

Fertig, wenn:

- Probelaeufe 0027, 0028, 0029 ohne `FEHLER:`-Zeile, alle erwarteten Hinweise
  da; angewandt; Probelauf-Berichte in der Meldung an Karam.
- `grundriss_umrechnung`: jede alte Kiste genau einmal (uebernommen oder mit
  Grund), Zahl der Raeume = Zahl der alten Plaene, keine Verstoesse.
- Eigene Groesse anlegen, beim Anlegen einer Kiste waehlen: Nummer bekommt die
  Stufe aus der DB; Masse aendern zeigt vorher die Folgen; benutzte Groesse
  loeschen wird mit Zahlen abgelehnt (de und ar).
- Etikett zeigt den Namen der eigenen Groesse.
- App laeuft wie vorher (Anlegen, Scannen, Suche mit Platz und Hoehe aus dem
  neuen Modell), Desktop nutzt die Breite (Seitenleiste steht seit `5f129b1`).
- Sichtpruefung: eine Wegwerfseite mit erfundenen Daten (SizePicker mit
  eigenen Groessen, Meine Groessen), Desktop 1440 px und 375 px, hell/dunkel,
  de/ar; Wegwerfseite vor dem Commit loeschen.

### Etappe 2 (Zeichner)

Reihenfolge:

1. Plan-Tokens in `index.css`, `components/plan/PlanBild.tsx`, `FachAnsicht.tsx`,
   `StapelSeite.tsx`, `Lageplan.tsx`.
2. `pages/Grundriss.tsx` mit Nur-Lese-Ansicht, Routen, `AlterPlanLink`,
   Seitenleiste, AreaDetail/ItemDetail/ProjectHome-Links, Suche mit `Lageplan`.
3. `zeichner/` Grundgeruest (Leinwand, Zoom, Auswahl, Speichern, Verlauf),
   dann Werkzeuge in dieser Reihenfolge: Raum (Punkte, Rechteck), Teilen,
   Tuer/Fenster, Messen, Eigenschaften und Zimmer zuordnen, Moebel,
   Regal/Schrank mit Faecher-Editor, Kiste setzen.
4. Altes loeschen (5.2), Commit, push.

Fertig, wenn:

- Am Desktop: eine Wohnung mit Nische und Balkon auf den cm zeichnen (Laengen
  per Tastatur `3,45`/`345`), teilen, Zimmer zuordnen, Hoehen, Tueren orange,
  Fenster blau, Wandfarben; Speichern und Neuladen ergibt dasselbe; 20 Schritte
  Rueckgaengig stimmen; zwei Tabs: der zweite bekommt "veraltet" und verliert
  nichts ohne Frage.
- Regal mit Faechern "30, 35, 35, 40" und 2 Spalten, L-Couch, Kommode gesetzt;
  Kisten auf den Boden, aufeinander, auf die Kommode und in Fach 2 gestellt;
  die Datenbank lehnt ab: Kiste ausserhalb, zu hoch im Fach, Raum so verkleinern,
  dass Kisten draussen laegen (mit Zahl), Moebel durch die Wand.
- Regal verschieben und drehen: Kisten darin fahren mit.
- Handy (375 px): `grundriss` zeigt die Draufsicht und "Zeichnen geht am
  Computer"; im Netzwerk kein Zeichner-Teil.
- Alter Link `/zimmer/:id/plan` fuehrt in den Grundriss.
- Zeichner-Teil hoechstens 100 KB gzip, Hauptbuendel hoechstens 15 KB mehr.

### Etappe 3 (Handy platzieren, Kistenseite, Suche, Moebel)

Reihenfolge:

1. `UnterlageWahl`, `PlatzWahl`, Route; Einstiege Kistenseite, Items
   (Erfolgsblatt), Schnellansicht, AreaDetail.
2. `KistenLage` auf der Kistenseite, Such-Band, FurnitureDetail.
3. 0030 Probelauf; Suche-Code fertig machen; 0030 anwenden und SOFORT die
   Oberflaeche pushen (sw.js `kistly-v4`).

Fertig, wenn:

- Am Handy: Kiste in 4 Tipps gesetzt (Platz waehlen, Stelle, Unterlage wenn
  noetig, Speichern), auch im Scan-Ablauf ueber die Schnellansicht; Ablehnungen
  erscheinen als einfacher Satz.
- Kistenseite zeigt unten Raum mit oranger Tuer, blauen Fenstern, roter Kiste
  und den Satz "Regal Billy, Fach 2 (Ebene 2), 44 bis 78 cm ueber dem Boden"
  bzw. "auf Kiste K-6-003, 34 bis 68 cm"; gleiche Zahlen wie die Suche.
- Suche: Treffer zeigen Ding, Kiste, Schicht, Zimmer, Platz und Hoehe; ein Tipp
  oeffnet Kiste bzw. Moebel mit gerahmter Zeile, Foto und Lageplan; Dinge in
  einem verknuepften Moebel zeigen dessen Platz.

### Etappe 4 (3D, Redesign, Raster weg)

Reihenfolge: 3D (`plan3d/`), Redesign nach 5.9a, dann 0031 Probelauf und
anwenden, alte Woerterbuch-Schluessel loeschen, Abschlussbericht.

Fertig, wenn:

- 3D laeuft am Desktop (Waende in Raumhoehe mit Farben, Tuer orange, Fenster
  blau, Moebel, Regale mit Brettern, Kisten in echter Groesse, gesuchte rot,
  Kamera drehen/zoomen/verschieben, Waende zur Kamera durchsichtig); am Handy
  laedt kein three-Teil (Netzwerk geprueft); ohne WebGL Hinweis und 2D.
- Probelauf 0031: keine Funktion liest noch das Raster; angewandt;
  `grep -rn "plan_x\|regal_boden\|room_plans\|raumplan\." src` leer.
- Redesign: Bilder 1440 px und 375 px, hell/dunkel, de/ar; Designschicht
  loeschbar (Probe: Ordner weg, Build laeuft, App schlicht).

---

## 7. Entscheidungen und offene Punkte (fuer `docs/grundriss/ENTSCHEIDUNGEN.md`)

### 7.1 Entscheidungen, die START.md offen liess

- **E1 Platz an `items`, keine eigene Tabelle.** Grund: START 5.1 beschreibt
  den Platz als Eigenschaft der Kiste, 0017 hat genau das begruendet (eine
  Fassung, keine zweite Tabelle), die Oberflaeche liest ihn mit der Kiste. Die
  Bewertungen empfahlen `kisten_plaetze`; ihr Hauptargument (weniger Trigger an
  `items`) ist durch klare Trigger-Namen und -Reihenfolge abgefangen.
- **E2 Kein `grundriss_id` an `items`.** Der Grundriss folgt aus dem Raum. Eine
  zweite Spalte waere eine zweite Wahrheit und machte die Loesch-Kaskaden
  reihenfolgeabhaengig.
- **E3 Objektlage.** `x, y` ist die Ecke, die ungedreht links oben liegt;
  gedreht wird um diese Ecke (START: "linke obere Ecke vor dem Drehen"). Damit
  bleibt jede Ecke ganzzahlig, Mitnehmen von Kisten ist exakt. Der Zeichner
  dreht "auf der Stelle", indem er x/y passend mitschiebt.
- **E4 L-Form** nur fuer Moebel, mit zusaetzlicher Spalte `ausschnitt_ecke`
  (lo, ro, ru, lu); ohne sie liesse sich eine linke und eine rechte L-Couch
  nicht unterscheiden.
- **E5 Faecher.** `brett_cm` sind Oberkanten der Fachboeden; Ebene e reicht bis
  `brett[e+1] - 2` bzw. `hoehe - 2`; oben auf dem Regal ist Unterlage "objekt"
  bis zur Decke. Spalten gleich breit mit 2 cm Teilern. Fach = (Ebene, Spalte).
  Aendern sich die Bretter, bleibt eine Kiste auf ihrer Brett-Hoehe (Ebene wird
  umgerechnet), damit "Fach 3" nicht still wandert (Fund der Bewertung).
- **E6 Nachruecken.** Entfernt oder versetzt man eine Kiste, bleiben Kisten,
  deren Mitte weiter ueber ihr liegt, liegen (feines Nachstellen wirft nichts
  herunter). Die anderen uebernehmen ihre alte Unterlage (START 5.2); sie
  behalten ihre Mitte, wenn sie dort gilt, sonst nehmen sie die alte Mitte der
  entfernten Kiste; was auf ihnen liegt, faehrt mit. Aendert sich nur die
  Groesse, wird nichts verschoben, sondern abgelehnt, wenn etwas nicht mehr
  passt (START 5.1a).
- **E7 Moebel, Regale und Schraenke nehmen mit.** Wird ein Objekt versetzt oder
  gedreht, fahren die Kisten darauf und darin mit (rigide Bewegung); wird es
  geloescht, stehen sie auf dem Boden. "Nachruecken" gilt fuer Kisten auf
  Kisten. Grund: einen Schrank im Zeichner verschieben darf seinen Inhalt nicht
  auf den Boden kippen.
- **E8 Platz unabhaengig vom Zimmer-Kuerzel.** Eine Kiste darf in einem Raum
  stehen, der nicht ihr Zimmer ist (Lager, Keller); ihre Nummer aendert sich
  beim Hinstellen nie. Die Oberflaeche sagt "gehoert in ...".
- **E9 Moebel-Platz ueber das Objekt.** Ein Moebel-Eintrag (`kind furniture`)
  bekommt keinen Kistenplatz (DB lehnt ab); sein Platz ist das verknuepfte
  Objekt (`objekte.item_id`, eindeutig). Dinge im Moebel findet die Suche mit
  diesem Platz, Hoehe 0 bis Objekthoehe.
- **E10 Pruefmodus fuer den Zeichner.** Direkte Schreibvorgaenge pruefen sofort;
  `grundriss_speichern` schaltet transaktionslokal `kistly.spaeter` ein und
  prueft am Ende jeden beruehrten Raum vollstaendig. Einfacher als aufgeschobene
  Constraint-Trigger, und kein Client kann den Schalter setzen. Kein
  `security definer` irgendwo.
- **E11 Sperren:** eine exklusive Advisory-Sperre je Raum (`raum_sperre` aus
  0025 wiederverwendet), mehrere immer aufsteigend.
- **E12 Nur die Oberflaeche prueft:** Ueberlappung von Kisten, Objekten und
  Raeumen (START 5.2 fuer den Boden; fuer Raeume und Objekte gleich gehalten,
  weil die Kistenregeln nur den eigenen Raum brauchen).
- **E13 Die Datenbank prueft zusaetzlich:** Objekt ganz im Raum und nicht hoeher
  als der Raum; Oeffnung passt auf ihre Kante (ganzzahlig im Quadrat), nicht
  hoeher als der Raum, keine zwei Oeffnungen uebereinander.
- **E14 Eigene Groesse aendern:** alle Kisten mit dieser Groesse werden neu
  eingestuft; aendert sich die Stufe, bekommen sie eine neue Nummer (alte bleibt
  scannbar). Die Oberflaeche zeigt vorher die Folgen (`eigene_groesse_folgen`).
  Die Art (Kiste/Moebel) filtert nur die Auswahl, die DB erzwingt sie nicht.
  Ein Moebel "aus meiner Groesse" im Zeichner kopiert die Masse (keine
  Verknuepfung). Liter = Aussenmasse L x B x H / 1000 (wie START 5.1a).
- **E15 Umrechnung schon in Etappe 1** (START), danach friert 0029 das Raster
  ein (Setzen abgelehnt, Leeren erlaubt), leert `plan_*` nach der Sicherung und
  stellt `inhalt_suchen` uebergangsweise auf das neue Modell um, damit die
  Suche bis Etappe 3 Platz und Hoehe zeigt. `RaumPlan.tsx` ist bis Etappe 2 nur
  lesend.
- **E16 Umrechnung verliert nichts still:** Raeume nebeneinander (100 cm
  Abstand, neue Reihe ab 200 m), gesperrte Zellen nur gezaehlt, Tuer an
  innerer Zellkante auf die Aussenkante derselben Seite mit Hinweis, Regal auf
  zu schmaler Randzelle oder mit zu engen Brettern und Stapel, die mit 2 cm
  Brettdicke nicht mehr passen, in den Bericht; Unterkanten muessen exakt
  gleich bleiben, sonst Abbruch.
- **E17 `inhalt_suchen` behaelt den Namen** (START 5.8) und wird in 0030 per
  drop/create neu gebaut; die Oberflaeche geht sofort danach live.
- **E18 Grundriss-Name** ist ein Datenwert; der erste heisst in der Sprache
  dessen, der ihn anlegt ("Neue Wohnung"/"الشقة الجديدة"); die Umrechnung legt
  "Neue Wohnung" an.
- **E19 Koordinaten 0 bis 50000 cm**, Polygone 3 bis 200 Punkte, schraege
  Waende erlaubt (Zeichner rastet auf 90 Grad, Umschalt frei).
- **E20 Kiste in Kistenmitte**, Drehung 0/90; beim Drehen eines Objekts um 90
  oder 270 Grad wechselt die Drehung der Kisten darin mit.
- **E21 Anlegen und Hinstellen getrennt:** `createItem` schickt nie einen Platz
  mit; ein abgelehnter Platz darf das Anlegen nicht verhindern.
- **E22 Etappe 2 ersetzt Fundort schon** durch `Lageplan`, weil der alte
  Mini-Plan nach 0029 nichts mehr zeigt.
- **E23 Rueckgaengig** gilt fuer die Sitzung; jede Aktion ist sofort
  gespeichert, Rueckgaengig speichert den Vorher-Stand als neue Version.

### 7.2 Offene Punkte

- Ganzen Stapel versetzen (alles auf einmal) gibt es nicht; man versetzt von
  oben nach unten oder nutzt "Raum verschieben". Spaeter eine RPC
  `stapel_versetzen`.
- Zwei Zimmer in einem Speichervorgang tauschen scheitert am eindeutigen
  Index (Zeichner macht zwei Schritte).
- Loescht man ein Zimmer (Tag), verliert der Raum sein Zimmer und zeigt den
  leeren Namen; der Zeichner bietet "Name vergeben" an. Der bekannte Fehler
  beim Bereich loeschen (`items_bu`, Kiste nur mit Zimmer) bleibt ausserhalb
  dieses Umbaus.
- Suche liest weiter alle sichtbaren Inhaltszeilen (kein Index nutzbar); bei
  vielen tausend Eintraegen spaeter pruefen.
- Auto-Status "angekommen" beim Scannen waehrend des Packens bleibt eine Falle;
  der Platz-Ablauf aendert den Status nie.
- `item_hoehe_cm` bleibt nach 0031 ungenutzt stehen.
- Arabische Saetze aller neuen Schluessel liest Karam gegen.
- Umzug loeschen: die Probelaeufe 0027 und 0028 loeschen einen Testumzug mit
  allen neuen Daten; die Reihenfolge der Kaskaden ist so gebaut, dass kein
  Waechter sie blockiert (0008-Muster in allen neuen BEFORE-Triggern).

### 7.3 Eingearbeitete Funde der Bewertungen

- Sperre in jedem schreibenden Trigger (auch Oeffnungen, Objekte), nicht nur
  an Kisten.
- Fachkisten sind gegen ihr Fach geprueft (Spalte, Tiefe, Fachdecke); ein
  Objekt kann nicht "in" einem oben offenen Fach stehen, weil es keine offenen
  Faecher gibt (oben drauf = Unterlage Objekt mit Raumdecke).
- Gekappte Randzellen und enge Bretter brechen die Umrechnung nicht ab, sie
  landen im Bericht.
- Die Sicherung der alten Werte steht in `grundriss_umrechnung.alt`, bevor
  `plan_*` geleert werden; ein alter Client kann sie nicht mehr loeschen.
- Fachnummern wandern nicht (E5).
- `assert_tag` wird nicht mit vertauschten Argumenten gerufen; `raeume_vorher`
  prueft Zimmer, Umzug und Art selbst mit eigener Kennung.
- Der Einfrier-Waechter lehnt nur Setzen ab, nicht Leeren (Zimmer- und
  Umzug-Loeschen kaskadieren weiter).
- `zimmer` je Grundriss eindeutig (`unique(grundriss_id, tag_id)`), nicht global.
- Keine zwei Wahrheiten je Objekt (keine gespeicherte Grundflaeche); die DB
  rechnet die Flaeche aus x, y, Masse, Drehung und Ausschnitt.
- Hoehen nur in SQL (`kiste_basis`), die Oberflaeche bekommt fertige Zahlen
  (`grundriss_laden`, `kiste_lage`, Suche); der TS-Spiegel dient nur der
  Vorschau neuer Plaetze.
- Kiste gegen Kiste nur Warnung (Grundflaechen sind Naeherungen der Stufe).
- Raummodell: Polygon mit Kanten (Wandfarbe je Kante), Oeffnungen an
  (Raum, Kante, Abstand); keine getrennten Wandlinien.
- Kein `security definer`, kein Umgehungsschalter fuer Clients.
- Umzug-Loeschen im Probelauf geprueft.
