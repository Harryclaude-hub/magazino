# Grundriss-Umbau: Entscheidungen

Was START.md offen liess und wie es entschieden wurde. Die Liste E1 bis E19
stammt aus dem Bauplan (Abschnitt 7.1), danach folgen Entscheidungen beim Bauen.

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


## Beim Bauen entschieden (Etappe 1)

- **E20 Gegenpruefung der Datenbank:** drei Pruefer-Funde zur Stapel-Logik
  und fuenf zu Rechten und Sperren wurden vor dem Anwenden in 0028
  eingearbeitet: Fach ohne Ebene wird abgelehnt, ein belegtes Brett kann nicht
  verschwinden (neuer Hinweis `brett_belegt`), eine leere Unterlage raeumt den
  Platz nicht still, `platz_setzen` sperrt erst die Raeume und dann die Zeile,
  eine gleichzeitig geaenderte eigene Groesse wird abgewartet, falsche
  Drehung (`drehung`) und fremde ids (`fremde_id`) bekommen einen Hinweis.
- **E21 Laengen-Eingabe** versteht auch die arabischen Einheiten "م" und "سم".
- **E22 Meine Groessen** zeigt Liter (L x B x H / 1000), aber keine Stufe;
  die Stufe steht erst nach dem Speichern an der Kiste, gerechnet von der
  Datenbank.
- **E23 Masse einer benutzten Groesse aendern** zeigt zuerst die Folgen und
  speichert erst beim zweiten Tipp auf "Ja, so speichern".
- **E24 Der alte Raumplan** blieb bis Etappe 2 als Nur-Lese-Seite stehen
  (`const schreiben = false`), statt Code zu loeschen.

## Beim Bauen entschieden (Etappe 2 bis 4)

- **E25 Zeichner-Woerter laden mit dem Zeichner** (eigener Code-Teil), damit
  das Handy sie nicht mitlaedt; ebenso `platz.*` mit dem Platz-Ablauf.
- **E26 Links auf den Grundriss** brauchen keine Grundriss-Nummer:
  `grundriss?kiste=`, `?raum=` oder `?zimmer=` findet den richtigen selbst.
- **E27 Gerade Wand laenger oder kuerzer:** alles hinter ihrem Ende rueckt mit,
  ein Rechteck bleibt ein Rechteck. Moebel ruecken dabei nicht mit; ragen sie
  danach heraus, lehnt die Datenbank ab.
- **E28 Rueckgaengig nach dem Teilen** legt die Raeume wieder zusammen
  (Migration 0031, neuer Teil `umhaengen` in `grundriss_speichern`); keine
  Kiste verliert dabei ihren Platz. Das Entfernen des alten Rasters wurde
  deshalb 0032 statt 0031.
- **E29 Datenbankfehler ohne Kennung** (SQLSTATE 22xxx, 23xxx) gelten im
  Zeichner als Ablehnung: zurueck auf den letzten gespeicherten Stand.
- **E30 Satz zum Platz:** "Fach 2 (Ebene 2)"; die Spalte steht nur dabei, wenn
  das Regal mehr als eine hat. Suche und Kistenseite sagen denselben Satz
  (0030 liefert dafuer `objekt_spalten`).
- **E31 3D:** durchsichtig werden die Waende, deren Aussenseite zur Kamera
  zeigt (die im Weg stehen); START sagte "Innenseite", das haette die
  falschen Waende durchsichtig gemacht. Der 3D-Knopf sitzt im Lageplan und
  gilt damit fuer Kistenseite und Suche; im Zeichner gibt es 2D/3D.
- **E32 Farben:** Hauptaktion orange mit eigenem Token `--accent-ink`,
  `--accent` bleibt dunkle Tinte (war an drei Stellen so benutzt). Status
  "Alte Wohnung" ist ruhiges Warmgrau statt Rot, weil Rot nur Fehlern und
  "hier ist es" gehoert. Status-Pillen: Schrift in Tinte, Farbe an Punkt und
  Rand (Gelb und Gruen als Schrift erreichten 4,5:1 nicht).
- **E33 Kistenliste am Computer:** sortiert wird im Browser ueber die schon
  geladenen Kisten; ein Hinweis sagt es, wenn noch nicht alle geladen sind.

## Nachtrag 26.09.2026 (Karams Wuensche nach dem Umbau)

- **E34 Ueberstand im Regal:** Eine Kiste im Fach darf in der Tiefe
  hoechstens 40 cm ueber das Regal oder den Schrank hinausragen (je Seite,
  der groessere Wert zaehlt), ihr Mittelpunkt bleibt ueber dem Fach. Der
  Ueberstand wird abgeleitet, nie gespeichert, und steht im Lagesatz
  ("ragt 25 cm heraus"), in der Vorderansicht (gestrichelter Rand) und in
  Draufsicht und 3D in echter Groesse. Mehr als 40 cm lehnt die Datenbank
  ab (`ueberstand_zu_gross`). Gilt nur fuer Kisten direkt im Fach
  (Migration 0033).
- **E35 Fuellstand:** `items.fuellstand` 0 bis 100 % oder leer (nicht
  angegeben), fuer Kisten, Taschen und Moebel. Eingabe auf Kisten- und
  Moebelseite (Knoepfe 0/25/50/75/100, Regler in 5er-Schritten, speichert
  beim Loslassen). Anzeige als Balken von Gruen bis Rot, die Zahl steht in
  Tinte daneben; im Plan nur ein kleiner Balken, damit "voll" nicht mit der
  roten Markierung "hier ist es" verwechselt wird.
- **E36 Grundriss frei bewegen:** Das Raster fuellt immer die ganze
  Flaeche; Verschieben mit Ziehen auf leerer Flaeche, Trackpad, Pfeiltasten,
  Leertaste oder mittlerer Taste, ohne Grenzen; beim Oeffnen und mit Taste 0
  eingepasst. Am Handy ein Finger verschiebt, zwei zoomen, ein Tipp bleibt
  ein Tipp (Schwelle 6 px).

## Nachtrag 26.09.2026 abends (Bedienen am Laptop, Gegenstaende)

- **E37 Mausrad zoomt:** Rad hoch und runter zoomt immer am Zeiger, im
  Zeichner und in der Grundriss-Ansicht (auch feine Schritte, wie Windows
  sie mit Skalierung meldet). Verschieben: Ziehen, Umschalt+Rad, seitliches
  Wischen am Trackpad.
- **E38 Ziehen beim Zeichnen verschiebt:** Bei allen Werkzeugen ausser
  Auswahl setzt ein Klick seinen Punkt erst beim Loslassen. Bewegt sich die
  Maus mit gedrueckter Taste mehr als 4 px, wird daraus Verschieben der
  Ansicht, auch mitten in einer Linie; der Punkt wird dann nicht gesetzt.
- **E39 Einzelne Gegenstaende:** Eintraege mit `kind = 'other'`, im
  Woerterbuch jetzt "Gegenstand" statt "Sonstiges". Eigenes Fenster mit
  Foto (Kamera), Name, Zimmer und ungefaehrer Groesse (Vorschlaege klein,
  mittel, gross, lang oder drei Zahlen). Die Groesse wird eine eigene
  Groesse (Art Kiste) mit genau diesen Massen; gleiche Masse benutzen
  dieselbe Groesse wieder, der Name ist "L x B x H cm". Keine Migration:
  Gegenstaende werden im Grundriss wie Kisten gesetzt und geprueft.
- **E40 Zimmerzahlen:** Auf der Zimmerseite stehen Moebel (gezeichnete
  Objekte plus Moebel-Eintraege, die mit keinem Objekt verknuepft sind;
  Regale und Schraenke zaehlen mit), Regale und Schraenke, Kisten (Kisten
  und Taschen) und Gegenstaende. Darunter jedes Regal und jeder Schrank mit
  der Zahl der Kisten und Gegenstaende darin und darauf (auch gestapelt).
- **E41 3D fluessiger:** Materialien gleicher Farbe werden geteilt, der
  Renderer rechnet im Stand mit hoechstens 1,5 und in Bewegung mit 1
  Bildpunkt je Pixel, die Kamera laeuft nach dem Loslassen weich aus
  (Daempfung), Zoom zum Zeiger. Die Unschaerfe hinter dem 3D-Fenster ist
  weg (kostete bei jedem Bild Rechenzeit).
- **E42 Moebel in 3D ziehen:** Nur im Zeichner. Linke Maustaste auf einem
  Moebel, Regal oder Schrank zieht es am Boden entlang, Kisten darauf und
  darin gehen mit; beim Loslassen wird es wie in 2D verschoben (Raster,
  Pruefung beim Speichern). Druck auf leere Flaeche dreht wie bisher.
- **E43 3D am Handy:** Der Knopf "In 3D ansehen" steht jetzt auf jedem
  Geraet (Lageplan, Grundriss-Ansicht). Am Handy fuellt das Fenster den
  Bildschirm; ein Finger dreht, zwei Finger verschieben und zoomen.
- **E44 Fuehrung ("Erklaerung"):** Ein Knopf "Erklaerung" steht in jeder
  Kopfzeile links neben dem Profil (am Handy nur das Fragezeichen). Er
  erklaert die jetzige Seite Schritt fuer Schritt, danach Kopfzeile und
  Navigation. Schritte zeigen auf Elemente mit `data-tour="..."`; ist ein
  Ziel nicht sichtbar (Seitenleiste am Handy, untere Leiste am Computer),
  faellt der Schritt still weg. Darum gibt es eine Liste fuer beide
  Geraete (`src/lib/fuehrung.ts`). Der Zeichner am Computer hat eine
  eigene, lange Erklaerung (jedes Werkzeug mit Taste, Maus, 3D). Texte
  Deutsch und Arabisch in `bausteine/fuehrung.ts`; auf Arabisch laeuft
  die Karte von rechts nach links, Pfeile und Pfeiltasten tauschen die
  Seiten. Esc beendet, Enter geht weiter.
