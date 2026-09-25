# Kistly: Auftrag fuer die Cloud-Sitzung (Grundriss-Umbau)

Stand: 25.09.2026. Diese eine Datei enthaelt alles: wie Karam startet, die
Regeln, den Stand, den ganzen Auftrag, alle Entscheidungen vorab und die
Etappen. Zusaetzlich liegen im Repo `CLAUDE.md` (Regeln) und
`docs/grundriss/entwurf-teile.json` (Entwurfsmaterial).

---

## 0. Fuer Karam: so startest du

1. Oeffne https://claude.ai/code und melde dich an (mit dem Konto, auf dem
   das Guthaben liegt).
2. Neue Sitzung starten und das Repo **Harryclaude-hub/kistly** waehlen.
   Fragt es nach GitHub, einmal verbinden und dem Repo Zugriff geben.
3. Als Modell **Opus 5.5** waehlen, Denkstufe **Hoch** (nicht Mittel,
   nicht Extra hoch). **Ultracode aus lassen**, falls es angeboten wird:
   es startet fuer fast alles viele Agenten und sprengt das Guthaben.
   Gibt es keine Auswahl fuer die Denkstufe, bleibt es beim Standard.
4. Den **ganzen Inhalt dieser Datei** als erste Nachricht einfuegen und
   abschicken.
5. Laptop zuklappen ist erlaubt. Schau ein- bis zweimal am Tag in der
   Claude-App am Handy nach: Claude meldet sich nur in den Ausnahmen aus
   Abschnitt 1.3 und nach jeder fertigen Etappe.
6. **Sparen (empfohlen):** Nach jeder fertigen Etappe bietet Claude dir
   einen Satz fuer eine neue Sitzung an. Starte dann eine neue Sitzung
   (wieder Opus 5.5, gleiches Repo) und fuege nur diesen Satz ein:
   "Lies docs/cloud/START.md und docs/grundriss/STAND.md und mach die
   naechste Etappe." Das sind fuenf Mal eine Minute fuer dich und spart
   etwa ein Drittel der Kosten.

---

## 1. Fuer Claude: dein Auftrag und wie du arbeitest

### 1.1 Auftrag in einem Satz

Baue den Grundriss-Umbau aus Abschnitt 4 vollstaendig, in den vier Etappen
aus Abschnitt 6, und liefere am Ende den Abschlussbericht aus Abschnitt 9.

### 1.2 Arbeitsmodus

- Karam will, dass du **durcharbeitest und am Ende alles lieferst**. Alle
  Entscheidungen, die du brauchst, stehen in Abschnitt 5. Wo dort nichts
  steht: nimm die einfachste robuste Loesung, die zu Abschnitt 5 passt,
  schreib sie in `docs/grundriss/ENTSCHEIDUNGEN.md` und mach weiter.
- Modell Opus 5.5. **Ziel: etwa 100 US-Dollar** fuer den ganzen Umbau,
  **harte Grenze 150 $**. Halte dich an die Sparregeln in 1.5. Bei 100 $
  kurz melden, wie weit du bist. Vor 150 $ an einer sauberen Stelle
  (fertige, gepruefte Etappe) aufhoeren.
- Sparsam: grosse Pruefrunden mit mehreren Agenten nur fuer
  Datenbank-Migrationen und Stapel-Logik. Sonst ein Pruefer je Etappe.
- Nach jeder Etappe eine kurze Meldung an Karam (drei Saetze: was fertig
  ist, was er ausprobieren kann, Kostenstand).

### 1.3 Nur in diesen Faellen fragst du Karam

1. **Kein Datenbank-Zugang** in der Sitzung (keine Supabase-Werkzeuge):
   einmal je Etappe die fertigen, sorgfaeltig geprueften Migrationen als Datei
   liefern, mit Schritt-fuer-Schritt-Anleitung fuer den SQL-Editor
   (https://supabase.com/dashboard/project/vqpirkgvclfsduklnnzv/sql/new).
   Bis Karam sie eingespielt hat, an der Oberflaeche weiterarbeiten.
2. **Kostengrenze** erreicht (siehe 1.2).
3. Eine Aenderung wuerde **echte Daten loeschen**, die nicht aus der
   geplanten Umrechnung stammen.
4. Etwas geht **nur mit Karams Anmeldung oder Handy** (Fotos, Durchgang
   hinter der Anmeldung). Das sammelst du fuer den Abschlussbericht, statt
   darauf zu warten.

### 1.4 Regeln, die immer gelten (Kurzfassung von CLAUDE.md)

- Jede Antwort an Karam beginnt mit "Passt, Karam." Kein langer
  Gedankenstrich (U+2014), nirgends, auch nicht im Code. Einfache Sprache.
- Braucht es etwas von Karam: nummerierte Schritte mit direkten Links.
- Keine Schluessel, Tokens, Passwoerter in Dateien oder Commits; nie im
  Chat danach fragen. Kein `service_role`.
- Nur das Supabase-Projekt `vqpirkgvclfsduklnnzv`. Jedes andere Projekt im
  Konto gehoert zu anderen Programmen: tabu, auch lesend.
- Migrationen: erst Probelauf in einem `do $$`-Block, der mit
  `raise exception` den Bericht ausgibt und alles zurueckrollt, dann
  anwenden (Karams stehende Freigabe fuer diesen Umbau). Angewandte
  Migrationen nie aendern, Fehler bekommen eine neue Nummer.
- Datenbankzugriffe nur in `src/lib/api.ts`. Codes vergibt nur die
  Datenbank. Woerterbuecher: jeder Eintrag `de` und `ar`, gleiche
  Platzhalter. Laden, Fehler, leer getrennt. Kein stiller Fehler. Plaene
  nie spiegeln im Arabischen. Design bleibt eine loeschbare Schicht in
  `src/design`.
- Vor jedem Commit: `npx tsc -b`, `npx oxlint`, `npm run build`,
  `node scripts/woerter-pruefen.mjs` (bekannt: 9 Meldungen bei `*.eins`).

### 1.5 Sparregeln (gleiche Qualitaet, weniger Kosten)

Das meiste Geld kostet nicht das Schreiben, sondern das staendige
Wiederlesen eines langen Gespraechsverlaufs. Darum:

1. **Hauptfaden schlank halten.** Grosse Dateien nie ganz im Hauptfaden
   lesen: erst mit `grep` die Stelle finden, dann nur diese Zeilen lesen.
   Befehlsausgaben kuerzen (`| tail -20`), Build-Protokolle nicht ganz
   ausgeben.
2. **Eine Etappe, eine Sitzung.** Am Ende jeder Etappe den Stand in
   `docs/grundriss/STAND.md` schreiben (was fertig ist, was als Naechstes
   kommt, wichtige Dateien und Entscheidungen, hoechstens eine Seite),
   committen, und Karam diesen Satz fuer eine neue Sitzung anbieten:
   "Lies docs/cloud/START.md und docs/grundriss/STAND.md und mach die
   naechste Etappe." Eine frische Sitzung liest nicht den ganzen alten
   Verlauf mit und ist deutlich billiger. Laesst Karam die alte Sitzung
   weiterlaufen, arbeitest du dort weiter.
3. **Das Entwurfsmaterial nur einmal lesen.** `entwurf-teile.json` ist
   gross (etwa 540 KB). In Etappe 0 liest es ein einziger Unteragent und
   schreibt daraus `BAUPLAN.md`. Danach wird nur noch `BAUPLAN.md`
   benutzt, das JSON nie wieder.
4. **Nicht neu erkunden, was beschrieben ist.** Die Code-Karten im Bauplan
   und dieses Dokument reichen. Suchen nach Dateien und Stellen darf ein
   guenstiger Unteragent (Modell Haiku oder Sonnet) machen; bauen und
   entscheiden macht Opus.
5. **Vorhandenes wiederverwenden** statt neu schreiben: Stapel- und
   Nachrueck-Trigger aus 0022, Sperren aus 0025, `kisten_groessen`,
   `SizePicker`, `Ausschnitt`, `PunktBild`, `Fundort`, die Designschicht.
6. **Pruefen mit Mass:** eine Gegenpruefung mit mehreren Agenten nur fuer
   die Migrationen und die Stapel-Logik; sonst ein Pruefer je Etappe mit
   klarer Dateiliste. Jeder Befund wird einmal gegengeprueft, nicht
   mehrfach.
7. **Sichtpruefung knapp:** je Etappe eine Wegwerfseite, ein Bild am
   Desktop und eins bei 375 px Breite; Texte lieber als Seitentext pruefen
   statt als Bild.
8. **In einem Rutsch aendern:** mehrere Stellen einer Datei in einem
   Schritt aendern, nicht viele kleine Schritte (jeder Schritt liest den
   Verlauf erneut).
9. **Kurz antworten:** Meldungen an Karam hoechstens fuenf Saetze, der
   ausfuehrliche Teil kommt einmal im Abschlussbericht.
10. **3D einfach halten:** Koerper, Farben, Kamera, Hervorhebung. Keine
    Texturen, Schatten oder Spiegelungen.

---

## 2. Was Kistly ist und wo es laeuft

Umzugsprogramm als Web-App (PWA), Deutsch und Arabisch. Zimmer und
Personen haben Kuerzel, Kisten Nummern mit QR-Code, Fotos je Schicht,
Bilderkennung schlaegt Inhalte vor, Suche ueber alle Umzuege.

| Was | Wo |
|---|---|
| Live | https://harryclaude-hub.github.io/kistly/ |
| Repo | https://github.com/Harryclaude-hub/kistly, Zweig `main` |
| Datenbank | Supabase `vqpirkgvclfsduklnnzv` (nur dieses) |
| Edge Functions | `bild-analyse` (Version 5), `push-send` (Version 1) |
| Veroeffentlichen | jeder Push auf `main` (`.github/workflows/pages.yml`) |

---

## 3. Stand heute

- Auf `main` und live, zuletzt `2707fd8`. Migrationen 0001 bis 0026 sind
  angewandt.
- Vorhanden: Umzuege, Zimmer, Personen, Kisten, Moebel (Eintraege der Art
  `furniture` mit eigener Inhaltsliste), Etiketten, Scannen, Chat,
  Export, Schnellansicht, Kistengroessen 1 bis 10 in Litern mit Massen
  (Tabelle `kisten_groessen`, 0021), Fotos je Schicht mit Rahmen und
  Ausschnitten (0023), Suche ueber alle Umzuege (`inhalt_suchen`, 0024,
  0026, Seite `src/pages/Suche.tsx` mit Fundort-Dialog).
- **Alter Raumplan (wird ersetzt):** Raster mit 50-cm-Zellen je Zimmer
  (`room_plans`, 0017), Hoehen, Stapel und Regale mit Brettern (0022,
  `regale`, `items.plan_x/plan_y/plan_z/regal_id/regal_boden`), Sperren
  (0025), Oberflaeche `src/pages/RaumPlan.tsx` und
  `src/components/raumplan/*`.
- **Bilderkennung:** Qwen3.5-9B bei OVHcloud, mit Abschaltung des
  Nachdenkens und Ersatzmodell Qwen3.8-27B. Mit echten Fotos noch nicht
  ueberprueft. Hat Karam inzwischen Fotos gelesen, lies `photo_analyses`
  und die Protokollzeilen `[bild-analyse] tempo` und nimm das Ergebnis in
  den Abschlussbericht. Sonst ueberspringen, das ist nicht Teil dieses
  Auftrags.

---

## 4. Der Auftrag im Detail (Karams Wuensche)

### 4.1 Wohnung zeichnen (nur Desktop)

- Die Wohnung zeichnen wie in ArchiCAD, **auf den Zentimeter**: Waende mit
  Meter- und Zentimeter-Eingabe, Nischen, Ecken, Balkon, die ganze
  Wohnung. In Zimmer teilen, jedem Zimmer ein Kistly-Zimmer zuordnen,
  Raumhoehe eingeben.
- **Tueren immer orange, Fenster immer blau.**
- **Mehrere Grundrisse je Umzug** (neue Wohnung, alte Wohnung, Keller,
  Lager).
- Der Desktop nutzt die ganze Bildschirmbreite (links Navigation, rechts
  Details), nicht mehr wie eine Handy-App auf grossem Bildschirm.
- **3D-Ansicht** am Desktop. Kraeftiger Kontrast zwischen Wand und Boden,
  weder zu hell noch zu dunkel; Waende duerfen verschiedene Farben haben.

### 4.2 Regale, Schraenke, Moebel (neu dazugekommen, wichtig)

- **Regale und Schraenke** anlegen und an jede Stelle im Raum setzen.
- Bei jedem Regal und Schrank **die Abstaende zwischen den Brettern
  selbst festlegen** (jedes Fach kann anders hoch sein).
- Eine Kiste oder ein Ding in ein **bestimmtes Fach** legen.
- **Moebel** mit ihren Massen zeichnen und setzen (L-Couch, Fernseher,
  Kommode, Bett), mehrere je Raum, **wie Bloecke in Minecraft**.
- In ein Moebel **kann etwas hinein**: eine Couch mit Bettkasten, eine
  Kommode mit Schubladen. Was darin liegt, beschreibt Karam als Inhalt,
  und die Suche findet es.

### 4.3 Stapeln (neu dazugekommen, wichtig)

- Steht kein Regal da, **stapeln sich Kisten uebereinander wie in
  Minecraft**. Eine Kiste liegt auf dem Boden, auf einer anderen Kiste,
  auf einem Moebel oder in einem Regalfach.
- Die Logik muss stimmen: keine Kiste schwebt, kein Stapel geht durch die
  Decke oder das naechste Brett, und die Hoehe jeder Kiste ueber dem Boden
  ist auf den Zentimeter bekannt.

### 4.4 Handy

- **Nichts zeichnen** (zu schwierig am Handy).
- Beim Anlegen einer Kiste (auch beim Scannen) und auf der Kistenseite:
  Zimmer waehlen, das Zimmer oeffnet sich als Draufsicht, Karam tippt, wo
  die Kiste steht (links, rechts, vorne, hinten, in cm), waehlt dann die
  Unterlage (Boden, andere Kiste, Moebel) oder das Regal- bzw. Schrankfach.

### 4.5 Eigene Groessen (neu dazugekommen)

- Die Groessen 1 bis 10 sind fuer normale Kisten gedacht. Karam hat aber
  auch Kisten und Moebel, die da nicht hineinpassen.
- Er kann **eigene Groessen speichern**: mit Namen (zum Beispiel "Grosse
  Plastikbox IKEA" oder "Kallax 2x4") und Laenge, Breite, Hoehe in cm.
- Beim Anlegen einer Kiste oder eines Moebels waehlt er so eine
  gespeicherte Groesse **mit einem Tipp** aus, statt die Masse jedes Mal
  neu einzugeben.

### 4.6 Kistenseite und Suche

- Kistenseite: die Fotos, und **ganz unten der Lageplan**: das Zimmer mit
  Tuer (orange) und Fenstern (blau), die Kiste hervorgehoben, die Hoehe;
  am Desktop zusaetzlich 3D.
- Suche: Treffer zeigen **Ding, Kiste, Schicht, Zimmer, Platz und Hoehe**;
  ein Tipp fuehrt zum Foto und zur Kiste mit dem Lageplan. Auch Dinge in
  Moebeln werden gefunden, mit dem Platz des Moebels.
- Beide Fassungen (Handy und Desktop) sollen schoener werden.

---

## 5. Entscheidungen vorab (Antworten auf alle absehbaren Fragen)

### 5.1 Datenmodell

- **Einheit: ganze Zentimeter** (int) ueberall. Koordinaten je Grundriss:
  Ursprung links oben, x nach rechts, y nach unten (Draufsicht), z nach
  oben ab Fussboden.
- **Grundriss** (`grundrisse`): gehoert zu einem Umzug, hat Name und
  Reihenfolge. Beim ersten Oeffnen wird "Neue Wohnung" angelegt.
- **Raum** (`raeume`): Polygon als Liste von Eckpunkten in cm (im
  Uhrzeigersinn gespeichert, mindestens 3 Punkte, einfach, nicht
  ueberschlagen), Raumhoehe in cm (Standard 250), Art `innen` oder
  `draussen` (Balkon, Terrasse), Bodenfarbe, Wandfarbe je Kante optional.
  Ein Kistly-Zimmer (Tag der Art room) gehoert je Grundriss hoechstens zu
  einem Raum. Raeume ohne Zimmer sind erlaubt (Flur, Balkon).
- **Waende** sind die Kanten der Raumpolygone. Wanddicke nur zur
  Darstellung (12 cm), sie zaehlt nicht beim Rechnen. Gemeinsame Kanten
  zweier Raeume sind eine Wand.
- **Oeffnungen** (`oeffnungen`): Art `tuer` oder `fenster`, Raum,
  Kantennummer, Abstand vom Kantenanfang in cm, Breite, Hoehe, Bruestung
  (nur Fenster). Standard: Tuer 80 breit, 200 hoch; Fenster 100 breit,
  120 hoch, Bruestung 90. Tuer immer orange, Fenster immer blau, fest.
- **Objekte** (`objekte`): Art `moebel`, `regal`, `schrank`. Raum,
  x und y (linke obere Ecke vor dem Drehen), Breite, Tiefe, Hoehe in cm,
  Drehung in 90-Grad-Schritten, Form `rechteck` oder `l` (L als Rechteck
  mit rechteckigem Ausschnitt, Ausschnitt-Breite und -Tiefe in cm), Name,
  Farbe. Optional verknuepft mit einem Moebel-Eintrag (`items` der Art
  `furniture`): dann gehoeren dessen Inhaltsliste und Fotos dazu, und die
  Suche kennt den Platz.
- **Faecher** von Regal und Schrank: Liste der Brett-Hoehen in cm ueber
  dem Boden des Objekts, von unten nach oben (das unterste Fach beginnt
  bei 0 oder beim ersten Brett), Brettdicke 2 cm; dazu die Anzahl Spalten
  (senkrechte Teiler, Standard 1). Ein Fach ist (Ebene, Spalte), Ebene 1
  ist unten. Eingabe fuer Karam: entweder Abstaende von unten nach oben
  ("30, 35, 35, 40") oder "n Faecher gleichmaessig".
- **Platz einer Kiste**: Grundriss, Raum, Mittelpunkt x und y in cm,
  Drehung 0 oder 90, und genau eine **Unterlage**: `boden`, `kiste`
  (liegt auf Kiste X), `objekt` (liegt oben auf einem Moebel) oder `fach`
  (Objekt, Ebene, Spalte). Die Hoehe ueber dem Boden wird **abgeleitet,
  nie gespeichert**: Boden 0; auf Kiste = Oberkante der Kiste darunter;
  auf Objekt = Objekthoehe; im Fach = Fachboden. Kistenhoehe aus
  `kisten_groessen` bzw. `eigene_hoehe_cm`, Grundflaeche aus Laenge und
  Breite der Groesse.
- **Moebel-Eintraege** koennen genauso einen Platz haben (sie sind der
  Moebel-Eintrag zum Objekt). Dinge in Moebeln stehen in der Inhaltsliste
  des Moebel-Eintrags, wie heute.

### 5.1a Eigene Groessen

- Neue Tabelle `eigene_groessen`: gehoert zu einem Umzug (alle Mitglieder
  sehen sie, Bearbeiter legen an, aendern, loeschen), Name (Pflicht,
  eindeutig je Umzug), Art `kiste` oder `moebel`, Laenge, Breite, Hoehe in
  ganzen cm (je 1 bis 1000), bei Moebeln optional L-Form mit
  Ausschnitt-Breite und -Tiefe. Zeilen-Sicherheit ueber die Mitgliedschaft.
- `items` bekommt `eigene_groesse_id` (optional). Ist sie gesetzt, gelten
  deren Masse fuer Hoehe, Grundflaeche, Stapeln und 3D, vor
  `kisten_groessen` und `eigene_hoehe_cm`.
- **Die Nummer der Kiste bleibt gueltig:** die Stufe 1 bis 10 in der
  Nummer (Prefix-Stufe-Laufnummer) setzt bei einer eigenen Groesse die
  Datenbank selbst, aus dem Volumen (Laenge mal Breite mal Hoehe durch
  1000 ergibt Liter, eingeordnet nach `kisten_groessen.bis_liter`). Die
  Oberflaeche rechnet das nie selbst nach.
- Loeschen einer eigenen Groesse, die noch benutzt wird, lehnt die
  Datenbank ab und nennt die Zahl der Kisten und Moebel. Aendern der Masse
  wirkt auf alle, die sie benutzen; liegt dadurch eine Kiste nicht mehr
  gueltig (Stapel zu hoch), lehnt die Datenbank ab und sagt, welche.
- Oberflaeche: auf der Seite Groessen ein Bereich "Meine Groessen"
  (anlegen, umbenennen, aendern, loeschen). Beim Anlegen und Bearbeiten
  von Kisten und Moebeln stehen unter den Stufen 1 bis 10 die eigenen
  Groessen als Knoepfe mit Name und Massen, ein Tipp waehlt sie. Im
  Zeichner kann ein Moebel direkt aus einer eigenen Groesse gesetzt
  werden. Etiketten zeigen bei eigener Groesse den Namen statt der Liter.

### 5.2 Regeln, die die Datenbank prueft (Trigger, wie bisher im Raumplan)

- Mittelpunkt einer Kiste liegt im Raum-Polygon (Punkt-in-Polygon in SQL,
  dieselbe Regel in `src/lib/geometrie.ts`; beide Dateien verweisen
  aufeinander, Aenderungen immer an beiden).
- Unterlage existiert, liegt im selben Raum, und die Kiste liegt
  ueberwiegend darauf (Mittelpunkt ueber der Unterlage). Kein Kreis in
  "liegt auf".
- Oberkante bleibt unter der Raumhoehe; im Fach unter dem naechsten Brett
  bzw. der Objekthoehe. Fach (Ebene, Spalte) existiert.
- Wird eine Unterlage entfernt oder versetzt, **rutschen die Kisten darauf
  nach**: sie uebernehmen die Unterlage der entfernten Kiste (wie heute
  das Nachruecken im Stapel). Waechter gegen Selbstaufruf:
  `pg_trigger_depth()`.
- Aendert sich ein Raum so, dass Kisten draussen laegen, lehnt die
  Datenbank ab und nennt die Zahl der betroffenen Kisten.
- Ueberlappungen am Boden prueft nur die Oberflaeche (Warnung), die
  Datenbank sperrt nicht.
- Sperren gegen gleichzeitiges Setzen wie in 0025 (Advisory Locks je Raum).
- Fehlermeldungen als Hinweis `kistly:grundriss.*`, uebersetzt ueber die
  Woerterbuecher (wie heute `kistly:raumplan.*`).

### 5.3 Umrechnung der alten Daten

- Jeder alte `room_plan` wird ein Raum-Rechteck (Breite x Tiefe) im
  Grundriss "Neue Wohnung", Hoehe uebernommen. Gesperrte Zellen werden
  nicht nachgebildet; ihre Zahl je Raum steht im Probelauf-Bericht.
- Alte Tuer: Oeffnung auf der Kante, an der sie sass, mittig auf ihrer
  Zelle, 80 cm breit.
- Alte Regale: Objekte der Art `regal` mit Brett-Hoehen aus `boeden_cm`.
- Kisten mit Platz: Mittelpunkt ihrer Zelle in cm; Stapel werden zu
  Ketten "liegt auf"; Regalplaetze zu Faechern.
- Die alten Tabellen und Spalten bleiben bis Etappe 4 stehen und werden
  erst dann in einer eigenen Migration entfernt, wenn nichts mehr sie
  liest. Die alte Seite `RaumPlan.tsx` verschwindet in Etappe 2.

### 5.4 Zeichner (Desktop ab 1024 px Breite)

- Unter 1024 px ist der Zeichner nicht da; stattdessen ein Hinweis
  "Zeichnen geht am Computer" und die reine Draufsicht.
- 2D in SVG. Einrasten auf 1, 5 oder 10 cm (Standard 5 cm), Winkel in
  90-Grad-Schritten, mit gedrueckter Umschalttaste frei. Laengen per
  Tastatur: "3,45" und "3.45" sind Meter, "345" ist Zentimeter.
- Werkzeuge: Auswahl, Raum (Punkt fuer Punkt oder Rechteck), Raum teilen,
  Tuer, Fenster, Moebel, Regal, Schrank, Kiste setzen, Messen.
- Rueckgaengig und Wiederholen (Strg+Z, Strg+Y) fuer die Sitzung. Jede
  abgeschlossene Aktion wird sofort gespeichert, sichtbar als
  "Gespeichert".
- Masse stehen an jeder Wand in cm. Objekte zeigen Name und Masse.
- Mehrere Grundrisse als Reiter oben.

### 5.5 3D (nur Desktop)

- three.js, nur am Desktop und erst beim Oeffnen geladen (eigener
  Code-Teil, damit das Handy nichts davon laedt).
- Waende hochgezogen in Raumhoehe, Boden, Tueren orange, Fenster blau,
  Moebel als Koerper, Regale mit Brettern, Kisten in echter Groesse. Die
  gesuchte oder gewaehlte Kiste leuchtet rot. Kamera drehen, zoomen,
  verschieben; Waende zur Kamera hin werden durchsichtig.

### 5.6 Farben und Design

- Boden: warmes, mittelhelles Grau oder Holzton. Waende: deutlich dunkler
  oder farbig, Kontrast Wand zu Boden mindestens 3:1. Kein reines Weiss,
  kein Schwarz. Acht Wandfarben zur Auswahl.
- Alle Farben als CSS-Variablen in der Designschicht, 3D liest dieselben
  Werte. Tuer orange und Fenster blau sind feste Werte, nicht waehlbar.
- Desktop: linke Navigationsleiste statt unterer Leiste, Inhalt in bis zu
  drei Spalten (Liste, Plan, Details). Handy bleibt bei der unteren
  Leiste. Bewegung nur hinter den Stufen ruhig, normal, voll.

### 5.7 Handy: Kiste platzieren

- Einstieg: auf der Kistenseite "Platz waehlen", und im Scan-Ablauf nach
  dem Anlegen einer Kiste "Im Zimmer platzieren".
- Ablauf: Zimmer waehlen, Draufsicht nur zum Lesen, tippen setzt den
  Mittelpunkt (auf 5 cm gerundet), Feineinstellung mit Knoepfen +/-1 und
  +/-10 cm und Zahlenfeldern, dann Unterlage waehlen: Boden, eine der
  Kisten an dieser Stelle, das Moebel an dieser Stelle, oder Regal bzw.
  Schrank und dann das Fach. Speichern. Die Datenbank prueft, die
  Oberflaeche zeigt ihren Grund in einfachen Worten.

### 5.8 Kistenseite und Suche

- Kistenseite unten: "Wo steht die Kiste": Draufsicht des Raums mit Tuer
  und Fenstern, Kiste hervorgehoben, Satz wie "Regal A, Fach 2 (Ebene 2),
  44 bis 78 cm ueber dem Boden" oder "auf Kiste K-6-003, 34 bis 68 cm";
  am Desktop ein Knopf "3D".
- `inhalt_suchen` wird neu geschrieben (neue Migration) und liefert
  Grundriss, Raum, Unterlage, Fach und Hoehe von und bis; auch fuer Dinge
  in Moebeln. Die Suchseite zeigt das; ein Tipp oeffnet die Kiste bzw. das
  Moebel mit hervorgehobener Zeile, Foto und Lageplan.

### 5.9 Veroeffentlichen und Pruefen

- Nach jeder fertigen Etappe: Pruefschritte aus 1.4, eine Gegenpruefung
  (siehe 1.2), dann **auf `main` pushen** (geht sofort live; Karams
  Entscheidung: in Etappen live). Jede Etappe muss allein laufen und darf
  die Live-App nicht brechen.
- Sichtpruefung ohne Anmeldung: Wegwerfseite mit erfundenen Daten, am
  Desktop und bei 375 px Breite, Deutsch und Arabisch; Wegwerfseite vor
  dem Commit loeschen.

---

## 6. Etappen

| Etappe | Inhalt | Fertig, wenn |
|---|---|---|
| 0 | `docs/grundriss/BAUPLAN.md` aus `entwurf-teile.json` und diesem Dokument schreiben (Abschnitt 5 hat Vorrang vor den Entwuerfen; ein einziger Unteragent liest das JSON) | Bauplan mit SQL ab Migration 0027 und Dateiliste liegt im Repo, `STAND.md` angelegt |
| 1 | Datenmodell in cm mit Pruefungen und Umrechnung (Migrationen), eigene Groessen (Tabelle, Seite "Meine Groessen", Auswahl beim Anlegen), `src/lib/geometrie.ts`, api.ts-Funktionen, Desktop-Rahmen mit Seitenleiste | Probelauf gruen, angewandt, alte Daten umgerechnet, eigene Groesse anlegen und beim Anlegen einer Kiste waehlen geht, App laeuft wie vorher, Desktop nutzt die Breite |
| 2 | Zeichner (Raeume, Waende, Tueren, Fenster, Moebel, Regale und Schraenke mit Faechern, Kisten setzen und stapeln), alte Raumplan-Seite ersetzt | Wohnung zeichnen und Kisten stapeln geht am Desktop, Datenbank lehnt Unmoegliches ab |
| 3 | Handy platzieren, Kistenseite mit Lageplan, neue Suche, Moebel mit Inhalt und Platz | Kiste am Handy in 4 Tipps gesetzt; Suche zeigt Platz und Hoehe |
| 4 | 3D, schoeneres Design fuer beide Fassungen, alte Raster-Tabellen entfernen | 3D laeuft am Desktop, Handy laedt es nicht; alte Objekte weg |

---

## 7. Bekannte Fallen

- `jsonb @>` ist eine Mengenfrage, nie fuer Koordinatenpaare benutzen.
- Speicher: Anlegen und Loeschen ja, Ueberschreiben nein (neuer Pfad).
- Probelauf: `next_seq` braucht `set_config('request.jwt.claims', ...)`
  und eine Mitgliedschaft; fuer Zeilen-Sicherheit `set local role
  authenticated`.
- `inherit_project_from_item`: `project_id` immer ueberschreiben (0014).
- Arabisch und Latein in einer Zeile: "2x" als eigenes LTR-Stueck, das
  Leerzeichen dahinter.
- Supabase beendet eine Edge Function nach 150 s.
- Drucken braucht `print-color-adjust: exact`.
- Auf diesem Windows-Rechner brechen Bash-Heredocs; in der Cloud egal.

---

## 8. Nicht Teil dieses Auftrags

- `push-send` ohne `service_role` (VAPID-Schluessel als Secrets).
- Etiketten neu drucken nach dem Neueinstufen der Groessen.
- Offene Fragen: Admin-Sicht auf alle Umzuege; Verhalten beim Umbenennen
  eines Kuerzels.

---

## 9. Abschlussbericht an Karam

Am Ende eine Nachricht, die mit "Passt, Karam." beginnt:

1. Was fertig und live ist, je Etappe in einem Satz.
2. **So probierst du es aus**: nummerierte Schritte mit Links (eigene Groesse anlegen; Desktop:
   Wohnung zeichnen, Regal mit Faechern, Kisten stapeln, 3D; Handy: Kiste
   platzieren; Suche).
3. Welche Entscheidungen du selbst getroffen hast (aus
   `docs/grundriss/ENTSCHEIDUNGEN.md`).
4. Was noch offen ist oder nur mit Karam geht.
5. Kostenstand.
