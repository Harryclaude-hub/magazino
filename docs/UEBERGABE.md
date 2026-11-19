# Magazino (frueher Kistly): Uebergabe fuer eine neue (lokale) Claude-Sitzung

> **18.11.2026: Umbau zum Lagerprogramm (E103).** Lies zuerst `docs/ARCHITEKTUR.md` und `rework/01-lager-umbau/`. Stand: Startseite nur Anmeldung, Konten nur vom Admin (Funktion konto-anlegen), Bestand/Ausleihen/Tuer-QR/Erinnerungen gebaut, Migrationen bis 0053 eingespielt, zwei Demo-Lager. Offen: freie Anmeldung in Supabase abschalten (Karam), Auth-URL auf /magazino/, echter Durchlauf mit zwei Konten, Rework entscheidet was aus Siedlung/Anrufen bleibt. **19.11.2026 (E105):** Arabisch entfernt (nur Deutsch), Profil ohne Figur, Siedlung und Sprache, neuer Startbildschirm mit toleranter Suche. **Kistli** ist wieder ein eigenes Programm im Repo `Harryclaude-hub/kistly` (Stand be8cd6d, Name Kistly); es fehlt noch eine eigene Supabase-Datenbank (neues Projekt anlegen, Migrationen 0001 bis 0049 einspielen, Funktionen push-send, bild-analyse, produkt-lesen deployen, Repo-Variablen VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY setzen, Pages aktivieren). Der Rest dieser Datei beschreibt den Stand vom 15.10. (Umzugsprogramm).

Stand: 15.10.2026. Diese Datei zuerst lesen, dann `CLAUDE.md` (Regeln).

## Wo alles ist

- Live: https://harryclaude-hub.github.io/kistly/ (jeder Push auf `main`
  geht sofort live, GitHub Pages).
- Repo: https://github.com/Harryclaude-hub/kistly, Zweig `main` ist aktuell
  (der Cloud-Arbeitszweig `claude/vibrant-planck-jlsatf` ist identisch).
- Datenbank: Supabase `vqpirkgvclfsduklnnzv` (nur dieses Projekt!).
  Migrationen 0001 bis 0048 sind angewandt. 0049 liegt in `main`,
  geprueft, aber NICHT eingespielt (erst nach Karams "stell live");
  naechste: 0050.

## Was fertig ist

- Grundriss-Umbau komplett (Etappen 0 bis 4): eigene Groessen, Grundriss in
  cm mit Raeumen, Tueren (orange), Fenstern (blau), Moebeln, Regalen und
  Schraenken mit Faechern, Kisten setzen und stapeln (Datenbank prueft alle
  Regeln), Zeichner am Computer, Platz waehlen am Handy, Lageplan auf der
  Kistenseite, Suche mit Platz und Hoehe, 3D am Computer, neues Design,
  altes Raster entfernt.
- Nachtrag: Kisten duerfen bis 40 cm aus dem Regal ragen (angezeigt),
  Fuellstand 0 bis 100 % (Gruen bis Rot), Grundriss frei verschiebbar.
- Nachtrag 26.09. abends (E37 bis E44): Mausrad zoomt, Ziehen verschiebt
  die Ansicht auch beim Zeichnen, einzelne Gegenstaende mit Foto und
  ungefaehrer Groesse, Zimmerzahlen (Moebel, Regale, Kisten, Gegenstaende,
  Inhalt je Regal), 3D fluessiger mit Moebel-Ziehen, 3D auch am Handy,
  Fuehrung "Erklaerung" auf jeder Seite (Deutsch und Arabisch).
- Nachtrag nachts (E45, E46, Migration 0034): Werkzeug Nische / Ecke (N)
  fuer Nischen, weggeschnittene Ecken und Vorspruenge; gestrichelte
  Hilfslinien (L), gespeichert in grundrisse.linien.
- Nachtrag 27.09. (E47, E48, Migration 0035): Admin-Portal /app/admin nur
  fuer Konten in app_admins (von Hand gesetzt, nicht im Repo); Zeichner
  mit einer duennen Leiste oben, Werkzeuge schmal schaltbar, rechte Spalte
  ausblendbar.
- Nachtrag 27.09. (E49, Migration 0036): neue Konten warten auf
  Freischaltung durch den Admin (Warte-Seite), Admin kann sperren,
  entsperren und Konten loeschen; die Datenbank erzwingt das.
- Nachtrag (E73): Elektro aus Plan E10 (39 Symbole), Moebelart "Mauer"
  fuer Schaechte und Pfeiler, Sitzbank als L; Ess-Eck um den Schacht in
  der Wohnkueche; Eltern im grossen, Kind im mittleren Zimmer.
- Nachtrag (E74): Steckdosen und Schalter immer an der Wand, Licht je
  Zimmer in 3D (Liste oder Klick auf den Schalter), Spiegel, Teppiche
  (ausblendbar), mehr Kontrast, Fenster laut Plan, Abstellraum und
  Flurende neu.
- Nachtrag 01.10. (E75 bis E77): Bilderkennung mit 20-Sekunden-Grenze
  (Version 6, Liste gleich uebernommen), fuenf weitere Designs, Handy-
  Kopfzeile mit Menue, 3D-Vollbild, Moebel per IKEA-Link (Funktion
  produkt-lesen), Begehen im Massstab 1,75 m.
- Siedlung (E83 bis E87): eigener Bereich mit der Siedlung des Besitzers
  in 3D, alle Haeuser innen, gemeinsam mit eingeladenen Leuten (Figuren,
  Sprechen, Minikarte; 0046), dazu die Umgebung aus OpenStreetMap mit
  Gelaende (0047, siedlungen.stadt), jedes Haus innen erfunden und
  begehbar, Treppen, Springen, Autos fahren, Dinge hinstellen wie bei
  Minecraft (gespeichert in siedlung_dinge). Echte Daten nur in der
  Datenbank und in der Datei des Besitzers (_privat.local, nie im Repo).
  Umgebung neu erzeugen: scripts/stadt-aus-osm.mjs (siehe Kopf der Datei).
- 09.10. und 10.10. (E88 bis E92): Tueren nach Karams Plan-Foto, Preise
  gleich dem Link; Moebel beim Begehen tragen; Messpunkte an Ecken, Tueren
  und Fenstern; BESTA-Eckbank und viel Deko fuer Bad und WC; Rechtsklick-
  Menue beim Begehen (Details, Verschieben, Hinsetzen). Karams Plan "Neue
  Wohnung" steht auf Version 110 (Bett 180 x 220, Ess-Eck, Bad-Deko).
  Wanddinge immer an die Innenseite der Wand setzen: Raumkante plus 6 cm
  (Wand 12 cm, mittig auf der Kante).
- E93: Messpunkte, Einrasten beim Messen und Schnellmasse liegen an der
  Innenseite der Wand (Kante plus 6 cm), die Wanddicke zaehlt nicht mit.
  Nacharbeit nach der Pruefung (6 Funde behoben, siehe ENTSCHEIDUNGEN.md).
- E94: Am Handy "Gross ansehen" ueber dem Plan: der Grundriss ueber den
  ganzen Bildschirm, mit Ansehen (Moebel, Regal, Kiste, Tuer, Raum
  antippen: Karte als Blatt unten) und Messen (Messpunkte aus E93, Tipp 1
  A, Tipp 2 B, Abstand und Namen gross in der Leiste, Schnellmasse an
  Tuerenden, Neu). Zurueck am Handy schliesst (&ansicht=gross). Unter dem
  Plan zeigt ein Moebel jetzt die Moebelkarte. Kein Zeichner-Code am
  Handy. Mit echtem Handy noch nicht geprueft. Nacharbeit nach der
  Pruefung (siehe ENTSCHEIDUNGEN.md): Tueren zeigen "Frei fuer Moebel" und
  Maueroeffnung statt Lichte, links und rechts drueben aus dem
  Nachbarraum, Blatt quer neben dem Plan, Verlauf und Fokus berichtigt.
- Passwort sicher (E96, am 15.10. aus dem Zweig `passwort-sicher-2026-10-09`
  in `main`): Auge im Passwortfeld, Passwort vergessen mit neutralem Satz,
  Passwort neu nur nach einem in diesem Tab eingeloesten Link
  (src/lib/linkstand.ts), mit Konto im Formular und Hinweis bei fremdem
  Konto, Aendern in den Einstellungen nur mit dem aktuellen Passwort.
  Neue Passwoerter: mindestens 10 Zeichen mit Buchstaben und Ziffern (wie
  die Supabase-Einstellung, die Karam im Dashboard setzt). Migration 0049
  (geprueft, NOCH NICHT EINGESPIELT, erst nach Karams "stell live"):
  Mitgliedschaft fest, Einladungscodes nur fuer Bearbeiter und Besitzer,
  owner_id nur durch Besitzer oder Admin. Probelauf:
  supabase/probelauf/0049_mitglieder_und_einladungen_absichern.sql.

## Wichtige Dokumente

- `docs/grundriss/STAND.md`: Stand und offene Punkte.
- `docs/grundriss/ENTSCHEIDUNGEN.md`: alle Entscheidungen E1 bis E96.
- `docs/grundriss/BAUPLAN.md`: Datenmodell, Regeln, Code-Karten (nur bei
  Bedarf abschnittsweise lesen, er ist lang).
- `supabase/migrations/`: SQL; angewandte Dateien nie aendern, Fehler
  bekommen eine neue Nummer. 0049 ist seit 15.10.2026 LIVE (nach Karams
  "stell live": Probelauf 18 von 18 ok, dann begin/commit, nachgemessen:
  2 Trigger, einladung_erlaubt, invites_select neu); der Satz "NOCH NICHT
  EINGESPIELT" in ihrem Kopf ist damit ueberholt. Naechste: 0050.
- Regel-Spiegel: SQL-Geometrie und `src/lib/geometrie.ts` immer zusammen
  aendern (`scripts/geometrie-pruefen.mjs`).

## Offen (naechste Schritte)

1. Mit echtem Handy testen: Platz waehlen, Zoomen mit zwei Fingern, 3D mit
   echten Daten am Computer und am Handy, Moebel in 3D ziehen, die
   Fuehrung auf jeder Seite (Deutsch und Arabisch), Gegenstand mit Foto
   anlegen. Die Fuehrung und das Gegenstand-Fenster sind nur auf einer
   lokalen Testseite geprueft, nicht mit Anmeldung.
2. Fuellstand auch beim Anlegen einer Kiste und im CSV-Export.
3. Moebel mit ihrer Inhaltsliste nur im Zeichner verknuepfbar; evtl. auch
   auf der Moebelseite.
4. Kleinigkeiten: Regale in 3D ohne Rueckwand; einige Seiten haben noch
   mehrere orange Knoepfe; in sehr schmalen Raeumen ueberdecken sich Masse.
5. Supabase-Sicherheitshinweise (alt, nicht aus dem Umbau): "Leaked password
   protection" in Auth einschalten; einige security-definer-Funktionen.
6. Bilderkennung: einziger Versuch (24.09.) brach mit Zeitueberschreitung
   ab; nicht Teil des Umbaus.
7. Passwort sicher (seit 15.10.2026 in `main`, E96). 0049 ist fertig
   vorbereitet: Der Probelauf
   `supabase/probelauf/0049_mitglieder_und_einladungen_absichern.sql` ist
   eine Datei zum direkten Ausfuehren (begin; Migration; Pruefblock;
   rollback;) und lief am 15.10. in PGlite gegen 0001 bis 0048: 18 von 18
   Zeilen ok, nichts blieb stehen, 0049 zweimal hintereinander ohne
   Fehler, ohne 0049 meldet er 9 FEHLER. Gegen das echte Projekt ist er
   noch NICHT gelaufen. Erst nach Karams "stell live" im Chat:
   `npx.cmd --yes supabase@2.120.0 db query --linked --project-ref vqpirkgvclfsduklnnzv -f <datei>`,
   zuerst mit dem Probelauf, nur wenn alles ok ist mit der Migration.
   Im Dashboard die Schritte aus dem README, Abschnitt "Passwort
   zuruecksetzen" (Redirect URL, Mail-Vorlage mit token_hash, "Secure
   password change", Passwortregel 10 Zeichen mit Buchstaben und Ziffern),
   danach einmal den Weg ueber die Mail echt durchspielen. Mit echtem
   Supabase ist der Weg noch nicht getestet. Die Seite geht erst online,
   wenn GitHub Actions wieder laeuft (Abrechnung, Stand 15.10.2026).

## Arbeitsweise

- Pruefen vor jedem Commit: `npx tsc -b`, `npx oxlint`, `npm run build`,
  `node scripts/woerter-pruefen.mjs` (8 bekannte Meldungen bei `*.eins`),
  und alle `node scripts/*-pruefen.mjs` aus `CLAUDE.md`; kein U+2014.
  stadt-, innen- und physik-pruefen messen Zeit und schlagen unter Last
  fehl: allein wiederholen und mit dem unveraenderten Stand vergleichen.
- Testseiten zz-* (von .gitignore erfasst) nach der Pruefung loeschen;
  hoechstens ein Vite und ein Headless-Chrome gleichzeitig (am 10.10. ist
  der Laptop unter Last abgestuerzt).
- Datenbank: jede Migration erst als Probelauf (`do $probe$ ... raise
  exception` mit Bericht), dann anwenden. Vorlagen fuer Probelaeufe stehen
  im Bauplan (Abschnitt 2).
- Karam will nicht nach Erlaubnis gefragt werden; Entscheidungen selbst
  treffen und in `ENTSCHEIDUNGEN.md` notieren.
