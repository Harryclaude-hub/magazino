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

## Nachtrag 26.09.2026 nachts (Umriss genauer zeichnen)

- **E45 Gestrichelte Hilfslinien (Werkzeug Linie, Taste L):** reine Anzeige
  (Treppe, Stufe, Teppich, Bereich), gespeichert als `grundrisse.linien`
  (jsonb, Migration 0034, Pruefung `hilfslinien_gueltig`, hoechstens 500).
  Sie haengen am Grundriss, nicht an einem Raum, und pruefen nichts. Der
  Zeichner speichert sie getrennt von den Raeumen mit einem normalen
  update; die Version des Grundrisses bleibt dabei stehen. Waehlen, ziehen,
  Laenge setzen und loeschen mit der Auswahl; Rueckgaengig gilt auch fuer
  sie. Angezeigt im Zeichner und in jedem Plan (PlanEbenen), nicht in 3D.
- **E46 Nische / Ecke (Werkzeug N):** zwei Punkte auf derselben Wand, dann
  zeigt die Maus die Tiefe (nach innen: Nische, an einer Ecke eine
  weggeschnittene Ecke als L-Form; nach aussen: Vorsprung). Dritter Klick
  oder getippte Tiefe mit Enter. Punkte rasten auf das Raster und auf die
  Ecken. Umriss wird bereinigt (gerade und umkehrende Ecken fallen weg),
  Tueren, Fenster und Wandfarben ziehen mit. Die bisherigen Wege bleiben:
  Ecke ziehen, Wand parallel ziehen, Doppelklick setzt oder entfernt eine
  Ecke. Empfehlung in der Fuehrung: erst die ganze Wohnung als Umriss,
  dann mit "Raum teilen" in Zimmer.

## Nachtrag 27.09.2026 (mehr Platz im Zeichner, Admin-Portal)

- **E47 Admin-Portal:** Seite `/app/admin`, nur fuer Konten in
  `public.app_admins` (Migration 0035). Die Tabelle hat Zeilensicherheit
  ohne Regeln; nur `ist_admin()` und `admin_uebersicht()` (security
  definer) lesen sie. Welche Konten Admin sind, steht nicht im
  oeffentlichen Repo; die Zeile wurde von Hand gesetzt. Das Portal zeigt
  alle Nutzer (Name, E-Mail, seit, zuletzt angemeldet) mit ihren Umzuegen
  und Zahlen (Kisten, angekommen, Grundrisse, Raeume, Mitglieder), nur zum
  Ansehen. Menuepunkt in der Seitenleiste und Knopf im Profil nur fuer
  Admins.
- **E48 Mehr Platz im Zeichner:** Im Zeichner gibt es oben nur noch eine
  duenne Leiste: Zurueck, Grundriss-Reiter, Knoepfe des Zeichners
  (Rueckgaengig und Wiederholen nur als Zeichen), Erklaerung und Profil.
  Die grosse Kopfzeile und die Suchleiste fallen dort weg. Werkzeuge links
  lassen sich schmal schalten (nur Zeichen), die rechte Spalte ganz
  ausblenden; das Geraet merkt sich beides.
- **E49 Freischalten, sperren, loeschen:** Neue Konten warten
  (`konto_freigaben`, Migration 0036), bis ein Admin sie freischaltet;
  gesperrte Konten kommen an nichts heran. Erzwungen in der Datenbank:
  `is_member`, `is_editor`, `is_owner`, `shares_project`,
  `create_project`, `join_project` und die Regel `projects_insert` fragen
  `ist_freigegeben()`. Admins sind immer frei. Die App zeigt nach der
  Anmeldung eine Warte-Seite (Sprache waehlbar, prueft alle 20 Sekunden
  selbst nach); gesperrte Konten sehen einen eigenen Satz. Die vier Konten
  von vor der Einfuehrung gelten als frei. Loeschen: Umzuege mit weiteren
  Mitgliedern gehen an das dienstaelteste (Bearbeiter vor Lesern),
  allein gehoerende Umzuege verschwinden mit allem Inhalt; Fotos im
  Speicher bleiben liegen. Admins koennen sich selbst und andere Admins
  weder sperren noch loeschen. Der Admin-Menuepunkt zeigt die Zahl der
  Wartenden.
- **E50 Masse wie auf dem Wohnungsplan:** Die Flaeche eines Raums zeigt
  Kistly jetzt als Nutzflaeche innen bis an die gezeichneten 12-cm-Waende
  (Umriss um 6 cm nach innen versetzt), mit zwei Nachkommastellen
  (3,97 m2), nicht mehr bis zur Wandmitte. Echte Plaene haben dickere
  Waende: jeder Raum darf darum seine eigene Kante 6 cm in der Wand
  haben. Tueren und Fenster schneiden dann auch die parallele Kante des
  Nachbarraums, wenn sie hoechstens 40 cm entfernt ist
  (`WAND_DURCH_CM`), und Luecken bis 40 cm zwischen zwei Wandstuecken auf
  derselben Linie (dicke Wand trifft Fassade) werden geschlossen.
  Schmale Flaechen unter 60 cm (Schacht, Vorwand) bekommen keine Schrift.
- **E51 Dicke Waende gefuellt, Raeume leichter verschieben, natuerliche
  Waende:** Liegen sich zwei Kanten verschiedener Raeume bis 40 cm
  gegenueber, fuellt Kistly den Streifen dazwischen als Wand (2D und 3D),
  samt Eckstuecken; Tueren schneiden die Fuellung, Fenster nicht. Ein Raum
  wird beim Ziehen frei in beide Richtungen bewegt (Raster), nur mit
  Umschalt in einer Achse, und rastet an parallelen Waenden anderer Raeume
  in der Naehe buendig ein (12 Bildschirmpixel). Waende in 3D sind
  hell (#f1eee8), in 2D anthrazit (#3a3a3a).
- **E52 Steckdosen, Lichter, Schalter:** Werkzeug "Steckdose / Licht"
  (Taste S), rechts die Wahl Steckdose, Licht oder Lichtschalter; ein
  Klick setzt das Symbol (Raster). Reine Anzeige, gespeichert als
  `grundrisse.symbole` (jsonb, Migration 0037, `symbole_gueltig`) und
  zusammen mit den Hilfslinien geschrieben. Waehlen, ziehen, Art wechseln
  und loeschen mit der Auswahl. 2D: kleine Zeichen in eigener Farbe
  (`--plan-strom`), 3D: Platten an der Decke (Licht), auf 30 cm
  (Steckdose) und 105 cm (Schalter).
- **E53 Katalog Bad und Kueche, Hand in 3D:** Der Moebelkatalog hat eigene
  Abschnitte "Bad und WC" (WC, Waschbecken, Handwaschbecken, Badewanne,
  Dusche, Waschmaschine, Trockner) und "Kueche" (Kuechenzeile,
  Unterschrank und Hochschrank mit Faechern, Spuele, Herd,
  Geschirrspueler, Kuehlschrank). In 3D waehlt ein Umschalter, was die
  linke Maustaste (und ein Finger) tut: Hand (verschieben, Standard) oder
  Drehen; die rechte Taste tut das andere. Das Geraet merkt es sich.
- **E54 Durchgang:** dritte Art einer Oeffnung (`durchgang`, Migration
  0038): offene Wand ohne Tuerblatt, in 2D nur die Luecke, in 3D nur der
  Sturz. Eine Tuer laesst sich in den Eigenschaften zum Durchgang machen
  und zurueck.
- **E55 Moebel-Symbole:** Jedes Moebel mit bekanntem Namen (WC,
  Waschbecken, Badewanne, Dusche, Waschmaschine, Trockner, Spuele, Herd,
  Geschirrspueler, Kuehlschrank, Kuechenzeile, Bett, Sofa, Fernseher,
  Kommode, Tisch; Deutsch und Arabisch) bekommt im Plan ein eigenes
  Zeichen, gedreht mit dem Moebel (`components/plan/moebelSymbol.tsx`).
  Erkannt am Namen, keine neue Spalte.
- **E56 Nichts rutscht aus Versehen:** In der Auswahl waehlt ein
  Linksklick nur; Ziehen verschiebt die Ansicht. Verschieben, Groesse
  aendern (Ecken, Waende, Doppelklick fuer Ecken) nur fuer das Element,
  das per Rechtsklick > "Verschieben / Groesse aendern" freigegeben ist;
  ein Band zeigt das, "Fertig", Esc oder eine andere Auswahl sperrt
  wieder. Das Rechtsklick-Menue hat ausserdem Umbenennen (ein Raum mit
  Zimmer benennt das Zimmer um), Drehen, Eigenschaften und Loeschen.
  Pfeiltasten bleiben wie bisher.
- **E57 L-Moebel in verstaendlichen Massen:** Statt "Ausschnitt Breite /
  Tiefe" zeigen die Eigenschaften "Schenkel ragt heraus um", "Breite des
  Schenkels" und "Tiefe des langen Teils". Gespeichert wird weiter der
  Ausschnitt (keine Migration). Aendert man beim L die Breite oder Tiefe,
  bleiben Schenkelbreite und Tiefe des langen Teils gleich. Das L-Sofa
  zeichnet Lehne an den Aussenseiten und Armlehnen an den freien Enden.
- **E58 3D im Zeichner fangen keine Zeiger mehr ab:** OrbitControls hoert
  Bewegen und Loslassen am Dokument. Das stopPropagation der Ueberlagerung
  liess die Kamera nur ausserhalb der Flaeche folgen. Jetzt laufen die
  Ereignisse durch, und der Zeichner ignoriert Zeiger, solange 3D offen ist.
- **E59 3D dreht standardmaessig:** Linke Maustaste gedrueckt und ziehen
  dreht die Wohnung (Schluessel `kistly.3d.hand`, neu, damit alle mit
  Drehen anfangen). Moebel greifen nur im Modus "Hand", damit ein Dreh-
  Versuch nichts verschiebt. Nachlauf kuerzer (Daempfung 0.28), Verschieben
  auf Bodenhoehe (screenSpacePanning aus), damit die Wohnung um einen Punkt
  am Boden dreht und nicht wegschwebt.
- **E60 Steckdosen rot:** Eigenes Token `--plan-steckdose` (hell #dc2626,
  dunkel #f87171) fuer Steckdosen in 2D und 3D. Licht und Schalter
  bleiben in `--plan-strom`.
- **E61 Groesserer Moebelkatalog mit Vorschau:** 18 neue Moebel (Sessel,
  Couchtisch, Sideboard, runder Esstisch, Stuhl, Teppich, Stehlampe,
  Pflanze, Klavier, Nachttisch, Kinderbett, Schreibtisch, Buerostuhl,
  Schuhschrank, Garderobe, Gefrierschrank, Fahrrad), neu gegliedert in
  Wohnen, Schlafen und Arbeiten, Bad, Kueche, Flur und mehr. Jeder
  Eintrag zeigt links ein kleines Bild aus Umriss und Planzeichen
  (`MoebelVorschau`), dasselbe Zeichen steht im Plan am Moebel.
- **E62 Haengende Moebel (0039):** Neue Spalte `objekte.boden_cm`
  (Unterkante ueber dem Boden, 0 bis 1000, Standard 0). Die Datenbank
  rechnet sie ueberall mit, wo Hoehen bisher bei 0 anfingen
  (objekt_fehler, kiste_basis, platz_fehler, kiste_lage, inhalt_suchen,
  Ausloeser in objekte_vorher und objekte_nachher, grundriss_speichern);
  geometrie.ts ebenso (objektBoden). Die Migration schreibt die Funktionen
  nicht neu ab, sondern ersetzt genau die Stellen in der jetzigen Fassung
  und bricht ab, wenn eine Stelle nicht genau einmal vorkommt. In den
  Eigenschaften "Hoehe ueber dem Boden" fuer jedes Objekt; im Katalog
  Haengeschrank (Kueche), Wandregal und Wandschrank. Im Plan gestrichelt
  und etwas blasser, in 3D in ihrer Hoehe. Kisten auf oder in einem
  haengenden Objekt stehen nach dem naechsten Laden richtig hoch.
- **E63 Begehen:** Knopf "Begehen" in der 3D-Leiste. Kamera in 1,60 m
  Augenhoehe im groessten Innenraum (oder im gezeigten Raum), Blick wie
  vorher. W A S D oder Pfeiltasten gehen (1,4 m/s, Umschalt 2,8 m/s),
  ziehen schaut umher, Pfeilknoepfe unten links fuer Handy und Maus.
  Ein Strahl in Kniehoehe haelt an Waenden, Bruestungen, Fenstern und
  Zargen 25 cm Abstand und laesst an der Wand entlang gleiten; Tueren
  und Durchgaenge sind offen, Moebel halten nicht auf. Beim Begehen sind
  alle Waende voll sichtbar. Esc oder "Begehen beenden" bringt die Kamera
  zurueck, wo sie vorher war.
- **E64 3D echter:** Eigene 3D-Tokens (`--plan3d-*`): Wandoberkante
  hellgrau statt fast schwarz, Wandkanten zart, Tueren weiss mit etwas
  dunklerer Zarge, Fensterrahmen weiss, Boden Eiche, Loggia Stein, Waende
  warmweiss. 2D bleibt bei orange Tueren und blauen Fenstern. Licht:
  weniger Umgebung, mehr schraege Sonne (leicht warm), damit jede
  Wandseite ihren Ton hat. Moebel mit Form (`plan3d/moebel3d.ts`): Couch
  und Sessel mit Sockel, Fuessen, Sitz- und Rueckenpolstern und
  Armlehnen, L-Couch ebenso; Bett mit Rahmen, Kopfteil, Matratze,
  Kissen und Decke; Tische mit Beinen; Stuehle; Kueche mit Sockel,
  Eichenfronten (Fugen alle 60 cm), anthrazit Arbeitsplatte und
  Rueckwand, Oberschraenke bis unter die Decke, schwarzes Kochfeld und
  Spuele (nach Karams IKEA-Planung); Bad in Keramik; Geraete weiss mit
  dunklen Tueren. Jeder Teil hat eine Kante im dunkleren Ton seiner
  Farbe. Eigene Moebelfarbe = Stoff- bzw. Korpusfarbe; zehn neue Farben
  (Anthrazit bis Schwarz). Neu im Katalog: Fernseher an der Wand (haengt
  auf 105 cm), TV-Board, Essgruppe (Tisch und 4 Stuehle als ein Moebel),
  Hochschrank mit Backofen. Die Moebelerkennung am Namen liegt jetzt in
  `plan/moebelArt.ts` (ohne React, fuer szene.ts unter node).
- **E65 Tueren in 3D auf und zu:** Ein kurzer Klick (ohne Ziehen) auf ein
  Tuerblatt schaltet: offen -> zu, zu -> ganz offen (90 Grad), mit einer
  kurzen, weichen Drehung um die Angel (350 ms). szene.ts gibt dem Blatt
  Angel, Laenge und die Winkel fuer zu und auf mit (TuerDreh). Der Stand
  bleibt, solange 3D offen ist, auch wenn die Szene neu gebaut wird; er
  wird nicht gespeichert. Eine geschlossene Tuer haelt beim Begehen auf.
- **E66 Hinstellen in 3D:** Ist 3D im Zeichner offen, zaehlt ein kurzer
  Klick in die Szene wie ein Klick an derselben Stelle im Plan (auf
  Moebeln die Stelle auf ihnen), fuer die Werkzeuge Kiste, Moebel, Regal
  und Schrank; auch beim Begehen. Rechts oben in 3D: Kisten / Moebel /
  Auswaehlen. Kistenliste: Suche findet auch Kisten, die schon im Plan
  stehen ("Umstellen"), und "Neue Kiste" legt mit Zimmer und Groesse
  eine an und nimmt sie gleich in die Hand. Moebelkatalog: das gewaehlte
  Moebel als kleines 3D-Modell (eigener Code-Teil) mit Breite, Tiefe,
  Hoehe und Hoehe ueber dem Boden vor dem Hinstellen.
