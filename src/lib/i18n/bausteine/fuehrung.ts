import type { Woerterbuch } from '../woerter'

/* Die Fuehrung ("Erklaerung"): jeder Schritt hat .titel und .text. Welche
 * Schritte wo gezeigt werden, steht in lib/fuehrung.ts. Einfache Saetze,
 * die man beim Umzug im Stehen lesen kann. Arabische Saetze liest Karam
 * gegen. */
export const fuehrung: Woerterbuch = {
  'fuehrung.knopf': { de: 'Erklärung' },
  'fuehrung.weiter': { de: 'Weiter' },
  'fuehrung.zurueck': { de: 'Zurück' },
  'fuehrung.fertig': { de: 'Fertig' },
  'fuehrung.beenden': { de: 'Erklärung beenden' },
  'fuehrung.schritt': { de: 'Schritt {a} von {b}' },

  // Kopfzeile
  'fuehrung.kopf.zurueck.titel': { de: 'Zurück' },
  'fuehrung.kopf.zurueck.text': {
    de: 'Bringt dich eine Seite zurück, zum Beispiel vom Zimmer zur Zimmerliste.',
  },
  'fuehrung.kopf.erklaerung.titel': { de: 'Erklärung' },
  'fuehrung.kopf.erklaerung.text': {
    de: 'Dieser Knopf steht auf jeder Seite. Er erklärt immer die Seite, auf der du gerade bist.',
  },
  'fuehrung.kopf.profil.titel': { de: 'Dein Profil' },
  'fuehrung.kopf.profil.text': {
    de: 'Dein Name, die Sprache (Deutsch oder Arabisch), hell oder dunkel, Benachrichtigungen und Abmelden.',
  },

  // Navigation (Seitenleiste am Computer, Leiste unten am Handy)
  'fuehrung.nav.leiste.titel': { de: 'Die Seitenleiste' },
  'fuehrung.nav.leiste.text': {
    de: 'Am Computer steht hier links alles, was du oft brauchst. Ein Klick bringt dich überall hin.',
  },
  'fuehrung.nav.umzug.titel': { de: 'Umzug wählen' },
  'fuehrung.nav.umzug.text': {
    de: 'Hast du mehrere Umzüge, wechselst du hier zwischen ihnen.',
  },
  'fuehrung.nav.klappen.titel': { de: 'Leiste einklappen' },
  'fuehrung.nav.klappen.text': {
    de: 'Macht die Leiste schmal, damit mehr Platz für Listen und den Grundriss bleibt. Noch ein Klick klappt sie wieder auf.',
  },
  'fuehrung.nav.suchkopf.titel': { de: 'Schnell suchen' },
  'fuehrung.nav.suchkopf.text': {
    de: 'Tippe hier, was du suchst, zum Beispiel "Bohrmaschine". Die Taste / springt direkt in dieses Feld.',
  },
  'fuehrung.nav.umzuege.titel': { de: 'Umzüge' },
  'fuehrung.nav.umzuege.text': {
    de: 'Alle deine Umzüge. Hier legst du einen neuen an oder trittst einem bei.',
  },
  'fuehrung.nav.kisten.titel': { de: 'Kisten' },
  'fuehrung.nav.kisten.text': {
    de: 'Die Liste aller Kisten, Taschen, Möbel und Gegenstände des Umzugs.',
  },
  'fuehrung.nav.zimmer.titel': { de: 'Zimmer' },
  'fuehrung.nav.zimmer.text': {
    de: 'Alle Zimmer und Personen. Jedes Zimmer hat eine Farbe und ein Kürzel, das auf jedem Etikett steht.',
  },
  'fuehrung.nav.grundriss.titel': { de: 'Grundriss' },
  'fuehrung.nav.grundriss.text': {
    de: 'Die Wohnung von oben: Räume, Türen, Fenster, Möbel und wo jede Kiste steht. Am Computer kannst du ihn zeichnen.',
  },
  'fuehrung.nav.suchen.titel': { de: 'Suchen' },
  'fuehrung.nav.suchen.text': {
    de: 'Finde jedes Ding: Kiste, Zimmer, Platz und Höhe über dem Boden.',
  },
  'fuehrung.nav.scannen.titel': { de: 'Scannen' },
  'fuehrung.nav.scannen.text': {
    de: 'Halte die Kamera auf den QR-Code einer Kiste, und die Kiste öffnet sich sofort.',
  },
  'fuehrung.nav.chat.titel': { de: 'Chat' },
  'fuehrung.nav.chat.text': {
    de: 'Nachrichten, Fotos, Sprachnachrichten und Anrufe mit allen, die beim Umzug helfen. Die rote Zahl zeigt Ungelesenes.',
  },
  'fuehrung.nav.profil_nav.titel': { de: 'Profil' },
  'fuehrung.nav.profil_nav.text': {
    de: 'Deine Einstellungen: Name, Sprache, Aussehen und Abmelden.',
  },

  // Umzuege (Startseite)
  'fuehrung.umzuege.start.titel': { de: 'Deine Umzüge' },
  'fuehrung.umzuege.start.text': {
    de: 'Hier beginnt alles. Ein Umzug sammelt alle Kisten, Zimmer, den Grundriss und den Chat für eine Wohnung.',
  },
  'fuehrung.umzuege.neu.titel': { de: 'Neuer Umzug' },
  'fuehrung.umzuege.neu.text': {
    de: 'Legt einen neuen Umzug an. Du gibst ihm nur einen Namen, zum Beispiel "Wohnung Berlin".',
  },
  'fuehrung.umzuege.beitreten.titel': { de: 'Code einlösen' },
  'fuehrung.umzuege.beitreten.text': {
    de: 'Hat dir jemand einen Einladungscode geschickt? Hier eingeben, dann hilfst du bei seinem Umzug mit.',
  },
  'fuehrung.umzuege.karte.titel': { de: 'Einen Umzug öffnen' },
  'fuehrung.umzuege.karte.text': {
    de: 'Tippe auf eine Karte, um den Umzug zu öffnen. Die Zahlen zeigen, wie viele Kisten schon angekommen sind.',
  },

  // Ein Umzug
  'fuehrung.umzug.start.titel': { de: 'Übersicht des Umzugs' },
  'fuehrung.umzug.start.text': {
    de: 'Alles zu diesem Umzug auf einen Blick: wie weit ihr seid, die Zimmer, die Personen und die wichtigsten Wege.',
  },
  'fuehrung.umzug.einstellen.titel': { de: 'Umzug einstellen' },
  'fuehrung.umzug.einstellen.text': {
    de: 'Name und Adressen (alt und neu) ändern, oder den Umzug löschen.',
  },
  'fuehrung.umzug.zahlen.titel': { de: 'Wo sind die Kisten?' },
  'fuehrung.umzug.zahlen.text': {
    de: 'Drei Zahlen: noch in der alten Wohnung, unterwegs, angekommen. Tippe auf eine Zahl, um genau diese Kisten zu sehen.',
  },
  'fuehrung.umzug.schnell.titel': { de: 'Schnellzugriff' },
  'fuehrung.umzug.schnell.text': {
    de: 'Kiste anlegen, Scannen, Bereiche, Grundriss, Möbel, Etiketten und Drucken. Ein Tipp, und du bist da.',
  },
  'fuehrung.umzug.zimmer.titel': { de: 'Zimmer verwalten' },
  'fuehrung.umzug.zimmer.text': {
    de: 'Zimmer anlegen, umbenennen, Farbe und Kürzel ändern. Darunter jedes Zimmer mit seiner Zahl an Kisten.',
  },
  'fuehrung.umzug.personen.titel': { de: 'Personen' },
  'fuehrung.umzug.personen.text': {
    de: 'Kisten können auch einer Person gehören, zum Beispiel "Lina". Hier verwaltest du die Personen.',
  },
  'fuehrung.umzug.fuss.titel': { de: 'Weitere Wege' },
  'fuehrung.umzug.fuss.text': {
    de: 'Alle Kisten, Etiketten und Liste zum Drucken, das Team (wer mithilft) und deine anderen Umzüge.',
  },

  // Kistenliste
  'fuehrung.kisten.start.titel': { de: 'Die Kistenliste' },
  'fuehrung.kisten.start.text': {
    de: 'Hier stehen alle Kisten, Taschen, Möbel und Gegenstände. Jede hat eine Nummer, zum Beispiel "KÜ-3-007": Zimmer, Größe, laufende Nummer.',
  },
  'fuehrung.kisten.neu.titel': { de: 'Neue Kiste' },
  'fuehrung.kisten.neu.text': {
    de: 'Legt eine oder mehrere Kisten an. Du wählst Zimmer, Größe und Art; die Nummer vergibt Magazino selbst.',
  },
  'fuehrung.kisten.gegenstand.titel': { de: 'Gegenstand anlegen' },
  'fuehrung.kisten.gegenstand.text': {
    de: 'Für Dinge ohne Kiste, zum Beispiel eine Lampe: Foto machen, Namen tippen, ungefähre Größe wählen, fertig.',
  },
  'fuehrung.kisten.auswahl.titel': { de: 'Mehrere auswählen' },
  'fuehrung.kisten.auswahl.text': {
    de: 'Schaltet Häkchen an jeder Zeile ein. Dann kannst du viele Kisten auf einmal umziehen, markieren oder den Status ändern.',
  },
  'fuehrung.kisten.export.titel': { de: 'Als Tabelle speichern' },
  'fuehrung.kisten.export.text': {
    de: 'Lädt alle Kisten als CSV-Datei herunter. Die lässt sich in Excel öffnen.',
  },
  'fuehrung.kisten.groessen.titel': { de: 'Größen prüfen' },
  'fuehrung.kisten.groessen.text': {
    de: 'Die Kistengrößen 1 bis 10 und deine eigenen Größen. Hier legst du auch eigene Maße an.',
  },
  'fuehrung.kisten.suche.titel': { de: 'In der Liste suchen' },
  'fuehrung.kisten.suche.text': {
    de: 'Tippe eine Nummer, einen Titel oder ein Wort aus der Notiz. Die Liste filtert sofort.',
  },
  'fuehrung.kisten.filter.titel': { de: 'Filter' },
  'fuehrung.kisten.filter.text': {
    de: 'Nur ein Zimmer, nur eine Person, oder anders sortiert. Die Zahl am Knopf zeigt, wie viele Filter gesetzt sind.',
  },
  'fuehrung.kisten.status.titel': { de: 'Nach Status zeigen' },
  'fuehrung.kisten.status.text': {
    de: 'Alle, alte Wohnung, unterwegs oder angekommen. So siehst du schnell, was noch fehlt.',
  },
  'fuehrung.kisten.liste.titel': { de: 'Die Kisten' },
  'fuehrung.kisten.liste.text': {
    de: 'Tippe auf eine Zeile, um die Kiste zu öffnen. Der farbige Status in der Zeile wechselt mit einem Tipp: alte Wohnung, unterwegs, angekommen.',
  },

  // Eine Kiste
  'fuehrung.kiste.start.titel': { de: 'Eine Kiste' },
  'fuehrung.kiste.start.text': {
    de: 'Alles über diese Kiste: was drin ist, Fotos, wo sie steht, wie voll sie ist und ihr Etikett.',
  },
  'fuehrung.kiste.markieren.titel': { de: 'Markieren' },
  'fuehrung.kiste.markieren.text': {
    de: 'Gibt der Kiste eine eigene Farbe oder ein Zeichen, zum Beispiel für "zuerst auspacken".',
  },
  'fuehrung.kiste.bearbeiten.titel': { de: 'Bearbeiten' },
  'fuehrung.kiste.bearbeiten.text': {
    de: 'Titel, Zimmer, Person, Größe, Notiz und "zerbrechlich" ändern.',
  },
  'fuehrung.kiste.loeschen.titel': { de: 'Löschen' },
  'fuehrung.kiste.loeschen.text': {
    de: 'Löscht die Kiste mit Inhalt und Fotos. Magazino fragt vorher noch einmal nach.',
  },
  'fuehrung.kiste.status.titel': { de: 'Status' },
  'fuehrung.kiste.status.text': {
    de: 'Alte Wohnung, unterwegs oder angekommen. Ein Tipp genügt.',
  },
  'fuehrung.kiste.fuellstand.titel': { de: 'Füllstand' },
  'fuehrung.kiste.fuellstand.text': {
    de: 'Wie voll ist die Kiste? Von 0 % (leer, grün) bis 100 % (voll, rot).',
  },
  'fuehrung.kiste.wo.titel': { de: 'Wo steht sie?' },
  'fuehrung.kiste.wo.text': {
    de: 'Springt nach unten zum Lageplan der Kiste.',
  },
  'fuehrung.kiste.eintrag.titel': { de: 'Was ist drin?' },
  'fuehrung.kiste.eintrag.text': {
    de: 'Tippe ein Ding und drücke Enter. So findest du es später über die Suche. Mit dem Haken hakst du ab, was schon ausgepackt ist.',
  },
  'fuehrung.kiste.foto_lesen.titel': { de: 'Foto lesen' },
  'fuehrung.kiste.foto_lesen.text': {
    de: 'Magazino schaut sich die Fotos an und schlägt vor, was darauf zu sehen ist. Du bestätigst, was stimmt.',
  },
  'fuehrung.kiste.foto.titel': { de: 'Foto' },
  'fuehrung.kiste.foto.text': {
    de: 'Fotografiere den Inhalt, bevor du die Kiste schließt. Ein Foto kann das Deckbild werden, das beim Scannen sofort erscheint.',
  },
  'fuehrung.kiste.schicht.titel': { de: 'Schichten' },
  'fuehrung.kiste.schicht.text': {
    de: 'Packst du in Lagen? Wähle die Schicht, bevor du fotografierst. Dann weißt du später, wie tief ein Ding liegt.',
  },
  'fuehrung.kiste.lage.titel': { de: 'Wo steht die Kiste' },
  'fuehrung.kiste.lage.text': {
    de: 'Der Raum von oben, die Kiste rot. Dazu steht, worauf sie steht und in welcher Höhe. Von hier kannst du ihr einen Platz geben.',
  },
  'fuehrung.kiste.drei_d.titel': { de: 'In 3D ansehen' },
  'fuehrung.kiste.drei_d.text': {
    de: 'Zeigt den Raum dreidimensional. Am Computer: ziehen dreht, Mausrad zoomt. Am Handy: ein Finger dreht, zwei Finger verschieben und zoomen.',
  },
  'fuehrung.kiste.link.titel': { de: 'Link kopieren' },
  'fuehrung.kiste.link.text': {
    de: 'Kopiert den Link zu dieser Kiste, zum Beispiel für den Chat. Der QR-Code darüber führt zur selben Seite.',
  },
  'fuehrung.kiste.druck.titel': { de: 'Etikett drucken' },
  'fuehrung.kiste.druck.text': {
    de: 'Öffnet das Etikett dieser Kiste zum Drucken, mit Nummer, Zimmerfarbe und QR-Code.',
  },

  // Platz waehlen (Handy)
  'fuehrung.platz.start.titel': { de: 'Platz wählen' },
  'fuehrung.platz.start.text': {
    de: 'In vier Tipps: Zimmer wählen, auf die Stelle im Plan tippen, wählen worauf die Kiste steht, speichern. Mit zwei Fingern zoomst du im Plan.',
  },
  'fuehrung.platz.drehen.titel': { de: 'Drehen' },
  'fuehrung.platz.drehen.text': {
    de: 'Dreht die Kiste um 90 Grad.',
  },
  'fuehrung.platz.fein.titel': { de: 'Feineinstellung' },
  'fuehrung.platz.fein.text': {
    de: 'Schiebt die Kiste zentimetergenau, oder du tippst den Abstand von links und von oben ein.',
  },
  'fuehrung.platz.speichern.titel': { de: 'Hier hinstellen' },
  'fuehrung.platz.speichern.text': {
    de: 'Speichert den Platz. Passt die Kiste dort nicht, sagt Magazino warum.',
  },

  // Bereiche (Zimmer und Personen)
  'fuehrung.bereiche.start.titel': { de: 'Zimmer und Personen' },
  'fuehrung.bereiche.start.text': {
    de: 'Jedes Zimmer hat einen Namen, eine Farbe und ein Kürzel. Das Kürzel steht vorne in jeder Kistennummer.',
  },
  'fuehrung.bereiche.neu.titel': { de: 'Neues Zimmer' },
  'fuehrung.bereiche.neu.text': {
    de: 'Legt ein neues Zimmer an. Bei den Personen gibt es denselben Knopf für eine neue Person.',
  },
  'fuehrung.bereiche.zeile.titel': { de: 'Zimmer öffnen' },
  'fuehrung.bereiche.zeile.text': {
    de: 'Tippe auf ein Zimmer: dann siehst du alles, was darin steht.',
  },
  'fuehrung.bereiche.bearbeiten.titel': { de: 'Bearbeiten' },
  'fuehrung.bereiche.bearbeiten.text': {
    de: 'Name, Farbe, Kürzel und Zeichen ändern.',
  },
  'fuehrung.bereiche.loeschen.titel': { de: 'Löschen' },
  'fuehrung.bereiche.loeschen.text': {
    de: 'Löscht das Zimmer. Die Kisten bleiben, sie haben dann nur kein Zimmer mehr.',
  },

  // Ein Zimmer
  'fuehrung.zimmer.start.titel': { de: 'Ein Zimmer' },
  'fuehrung.zimmer.start.text': {
    de: 'Alles, was zu diesem Zimmer gehört: Kisten, Gegenstände, Möbel, Regale und wo sie stehen.',
  },
  'fuehrung.zimmer.grundriss.titel': { de: 'Im Grundriss zeigen' },
  'fuehrung.zimmer.grundriss.text': {
    de: 'Öffnet den Grundriss mit diesem Zimmer.',
  },
  'fuehrung.zimmer.auswahl.titel': { de: 'Mehrere auswählen' },
  'fuehrung.zimmer.auswahl.text': {
    de: 'Häkchen an jeder Zeile: viele Kisten auf einmal in ein anderes Zimmer, markieren oder Status ändern.',
  },
  'fuehrung.zimmer.bearbeiten.titel': { de: 'Bearbeiten' },
  'fuehrung.zimmer.bearbeiten.text': {
    de: 'Name, Farbe und Kürzel ändern.',
  },
  'fuehrung.zimmer.zahlen.titel': { de: 'Wie weit?' },
  'fuehrung.zimmer.zahlen.text': {
    de: 'Wie viele Kisten noch in der alten Wohnung sind, unterwegs oder schon angekommen.',
  },
  'fuehrung.zimmer.inhalt.titel': { de: 'Im Zimmer' },
  'fuehrung.zimmer.inhalt.text': {
    de: 'Möbel (Regale und Schränke zählen mit), Regale und Schränke, Kisten und Gegenstände. Darunter jedes Regal mit dem, was darin steht.',
  },
  'fuehrung.zimmer.knoepfe.titel': { de: 'Weitere Knöpfe' },
  'fuehrung.zimmer.knoepfe.text': {
    de: 'Alle Kisten dieses Zimmers in der Liste, Etiketten nur für dieses Zimmer drucken, oder zwei Zimmer zusammenführen.',
  },
  'fuehrung.zimmer.ohne_platz.titel': { de: 'Ohne Platz' },
  'fuehrung.zimmer.ohne_platz.text': {
    de: 'Diese Kisten stehen noch nirgends im Grundriss. Tippe eine an, stell sie hin, dann kommt die nächste.',
  },
  'fuehrung.zimmer.kiste_neu.titel': { de: 'Kiste hier anlegen' },
  'fuehrung.zimmer.kiste_neu.text': {
    de: 'Neue Kiste, das Zimmer ist schon gewählt.',
  },
  'fuehrung.zimmer.gegenstand_neu.titel': { de: 'Gegenstand anlegen' },
  'fuehrung.zimmer.gegenstand_neu.text': {
    de: 'Ein einzelnes Ding ohne Kiste: Foto, Name, ungefähre Größe. Danach kannst du ihm einen Platz im Grundriss geben.',
  },
  'fuehrung.zimmer.moebel_neu.titel': { de: 'Möbel anlegen' },
  'fuehrung.zimmer.moebel_neu.text': {
    de: 'Ein Möbelstück für dieses Zimmer, mit Hersteller, Maßen und ob es zerlegt ist.',
  },
  'fuehrung.person.start.titel': { de: 'Eine Person' },
  'fuehrung.person.start.text': {
    de: 'Alle Kisten dieser Person, in welchem Zimmer sie auch stehen.',
  },

  // Grundriss ansehen (Handy und ohne Bearbeiten)
  'fuehrung.grundriss.start.titel': { de: 'Der Grundriss' },
  'fuehrung.grundriss.start.text': {
    de: 'Die Wohnung von oben. Türen sind orange, Fenster blau. Zeichnen geht am Computer, ansehen überall.',
  },
  'fuehrung.grundriss.raeume.titel': { de: 'Raum wählen' },
  'fuehrung.grundriss.raeume.text': {
    de: '"Alles" zeigt die ganze Wohnung, ein Raum zeigt nur diesen Raum groß.',
  },
  'fuehrung.grundriss.plan.titel': { de: 'Der Plan' },
  'fuehrung.grundriss.plan.text': {
    de: 'Tippe auf eine Kiste oder ein Regal, um zu sehen, was es ist. Zoomen: am Handy mit zwei Fingern, am Computer mit dem Mausrad. Verschieben: ziehen.',
  },
  'fuehrung.grundriss.drei_d.titel': { de: 'In 3D ansehen' },
  'fuehrung.grundriss.drei_d.text': {
    de: 'Die Wohnung dreidimensional. Am Handy: ein Finger dreht, zwei Finger verschieben und zoomen.',
  },

  // Zeichner (Computer)
  'fuehrung.zeichner.start.titel': { de: 'Grundriss zeichnen' },
  'fuehrung.zeichner.start.text': {
    de: 'Hier zeichnest du die Wohnung auf den Zentimeter genau: Räume, Türen, Fenster, Möbel, Regale, und stellst Kisten hin. Alles wird von selbst gespeichert.',
  },
  'fuehrung.zeichner.flaeche.titel': { de: 'Die Zeichenfläche' },
  'fuehrung.zeichner.flaeche.text': {
    de: 'Das Raster zeigt Zentimeter. Klicke, um einen Punkt zu setzen; die Linie folgt der Maus.',
  },
  'fuehrung.zeichner.maus.titel': { de: 'Bewegen mit der Maus' },
  'fuehrung.zeichner.maus.text': {
    de: 'Mausrad hoch: näher. Mausrad runter: weiter weg.\nMaustaste gedrückt halten und ziehen: die Ansicht verschieben, auch mitten beim Zeichnen einer Linie.\nKurz klicken: Punkt setzen.',
  },
  'fuehrung.zeichner.werkzeuge.titel': { de: 'Die Werkzeuge' },
  'fuehrung.zeichner.werkzeuge.text': {
    de: 'Links stehen alle Werkzeuge. Jedes hat eine Taste (steht daneben), damit es schneller geht.',
  },
  'fuehrung.zeichner.links.titel': { de: 'Werkzeuge schmal' },
  'fuehrung.zeichner.links.text': {
    de: 'Macht die Werkzeugleiste links schmal, nur mit Zeichen. So hast du mehr Platz zum Zeichnen. Noch ein Klick zeigt die Namen wieder.',
  },
  'fuehrung.zeichner.rechts.titel': { de: 'Rechte Spalte ein und aus' },
  'fuehrung.zeichner.rechts.text': {
    de: 'Blendet die rechte Spalte mit Erklärung, Maßen und Einstellungen aus oder wieder ein.',
  },
  'fuehrung.zeichner.w_auswahl.titel': { de: 'Auswahl (V)' },
  'fuehrung.zeichner.w_auswahl.text': {
    de: 'Ein Klick wählt nur aus, nichts rutscht aus Versehen. Zum Ändern: Rechtsklick auf Raum, Möbel, Tür oder Symbol. Im Menü stehen Verschieben / Größe ändern, Umbenennen, Drehen, Eigenschaften und Löschen. Nach "Verschieben" ziehst du mit der Maus; "Fertig" oder Esc sperrt wieder.',
  },
  'fuehrung.zeichner.w_raum.titel': { de: 'Raum (R)' },
  'fuehrung.zeichner.w_raum.text': {
    de: 'Punkt für Punkt: klicken, Richtung mit der Maus zeigen, Länge tippen (zum Beispiel 3,45) und Enter. Klick auf den ersten Punkt schließt den Raum.',
  },
  'fuehrung.zeichner.w_rechteck.titel': { de: 'Raum als Rechteck' },
  'fuehrung.zeichner.w_rechteck.text': {
    de: 'Der schnellste Weg: eine Ecke klicken, Breite tippen, Tab, Tiefe tippen, Enter.',
  },
  'fuehrung.zeichner.w_teilen.titel': { de: 'Raum teilen (T)' },
  'fuehrung.zeichner.w_teilen.text': {
    de: 'Zeichnet eine Wand quer durch einen Raum und macht zwei Räume daraus.',
  },
  'fuehrung.zeichner.w_nische.titel': { de: 'Nische / Ecke (N)' },
  'fuehrung.zeichner.w_nische.text': {
    de: 'Für Räume, die nicht ganz eckig sind: zwei Punkte auf eine Wand klicken, dann das Stück dazwischen mit der Maus rein oder raus ziehen und klicken. Rein gibt eine Nische, an einer Ecke schneidet es die Ecke weg (L-Form), raus gibt einen Vorsprung. Du kannst die Tiefe auch tippen und Enter drücken.',
  },
  'fuehrung.zeichner.formen.titel': { de: 'Umriss genau anpassen' },
  'fuehrung.zeichner.formen.text': {
    de: 'Mit der Auswahl: eine Ecke ziehen verschiebt sie, eine Wand ziehen schiebt sie parallel rein oder raus. Doppelklick auf eine Wand setzt eine neue Ecke, Doppelklick auf eine Ecke entfernt sie. Tipp: erst den Umriss der ganzen Wohnung zeichnen, dann mit "Raum teilen" in Zimmer aufteilen.',
  },
  'fuehrung.zeichner.w_linie.titel': { de: 'Linie gestrichelt (L)' },
  'fuehrung.zeichner.w_linie.text': {
    de: 'Zeichnet eine gestrichelte Linie, nur zum Anzeigen, zum Beispiel für eine Treppe, eine Stufe oder einen Teppich. Mit der Auswahl kannst du sie anklicken, verschieben, ihre Länge ändern oder löschen.',
  },
  'fuehrung.zeichner.w_strom.titel': { de: 'Steckdose / Licht (S)' },
  'fuehrung.zeichner.w_strom.text': {
    de: 'Rechts Steckdose, Licht oder Lichtschalter wählen und an die Stelle klicken. So weißt du beim Einräumen, wo Strom ist. Mit der Auswahl verschieben oder löschen.',
  },
  'fuehrung.zeichner.w_tuer.titel': { de: 'Tür (D)' },
  'fuehrung.zeichner.w_tuer.text': {
    de: 'Klicke auf eine Wand: dort sitzt die Tür (orange). Rechts stellst du Breite und Aufschlag ein.',
  },
  'fuehrung.zeichner.w_fenster.titel': { de: 'Fenster (F)' },
  'fuehrung.zeichner.w_fenster.text': {
    de: 'Wie die Tür, nur blau, mit Brüstungshöhe.',
  },
  'fuehrung.zeichner.w_moebel.titel': { de: 'Möbel (M)' },
  'fuehrung.zeichner.w_moebel.text': {
    de: 'Rechts ein Möbel aus dem Katalog wählen (Bett, Sofa, Tisch ...) oder eine eigene Größe, dann in den Raum klicken.',
  },
  'fuehrung.zeichner.w_regal.titel': { de: 'Regal (K)' },
  'fuehrung.zeichner.w_regal.text': {
    de: 'Ein Regal mit Fächern. Rechts stellst du Breite, Tiefe und die Bretter ein. In die Fächer kannst du Kisten stellen.',
  },
  'fuehrung.zeichner.w_schrank.titel': { de: 'Schrank (J)' },
  'fuehrung.zeichner.w_schrank.text': {
    de: 'Wie das Regal, als Schrank. Regale und Schränke zählen auf der Zimmerseite bei den Möbeln mit.',
  },
  'fuehrung.zeichner.w_kiste.titel': { de: 'Kiste setzen (B)' },
  'fuehrung.zeichner.w_kiste.text': {
    de: 'Rechts eine Kiste ohne Platz wählen, dann auf den Boden, auf eine andere Kiste oder in ein Fach klicken. Magazino prüft, ob sie passt.',
  },
  'fuehrung.zeichner.w_messen.titel': { de: 'Messen (A)' },
  'fuehrung.zeichner.w_messen.text': {
    de: 'Zwei Punkte klicken: Magazino zeigt den Abstand in Zentimetern. Ecken, Türen und Fenster haben feste Messpunkte an der Innenseite der Wand, die Wanddicke zählt nicht mit. Es wird nichts verändert.',
  },
  'fuehrung.zeichner.zimmer.titel': { de: 'Noch nicht gezeichnet' },
  'fuehrung.zeichner.zimmer.text': {
    de: 'Zimmer aus deiner Liste, die noch keinen Raum haben. Zieh eines auf einen gezeichneten Raum, dann gehören sie zusammen.',
  },
  'fuehrung.zeichner.rueck.titel': { de: 'Rückgängig (Strg+Z)' },
  'fuehrung.zeichner.rueck.text': {
    de: 'Nimmt den letzten Schritt zurück.',
  },
  'fuehrung.zeichner.vor.titel': { de: 'Wiederholen (Strg+Y)' },
  'fuehrung.zeichner.vor.text': {
    de: 'Holt einen zurückgenommenen Schritt wieder.',
  },
  'fuehrung.zeichner.hilfe.titel': { de: 'Hilfezeile' },
  'fuehrung.zeichner.hilfe.text': {
    de: 'Sagt in einem Satz, wie das gerade gewählte Werkzeug funktioniert.',
  },
  'fuehrung.zeichner.ansicht.titel': { de: '2D oder 3D' },
  'fuehrung.zeichner.ansicht.text': {
    de: 'Schaltet zwischen dem Plan von oben und der 3D-Ansicht um.',
  },
  'fuehrung.zeichner.drei_d.titel': { de: 'So bewegst du 3D' },
  'fuehrung.zeichner.drei_d.text': {
    de: 'Maustaste gedrückt halten und ziehen dreht die Wohnung wie ein schwebendes Modell. Die rechte Maustaste verschiebt, das Mausrad zoomt. Ohne Drücken passiert nichts, die Maus bewegt sich frei.\nMöbel verschieben: oben "Hand" wählen, dann Möbel, Regal oder Schrank greifen und ziehen, mit allen Kisten darauf.',
  },
  'fuehrung.zeichner.speichern.titel': { de: 'Speichern' },
  'fuehrung.zeichner.speichern.text': {
    de: 'Magazino speichert jede Änderung von selbst. Hier steht, ob alles gespeichert ist. Klappt es nicht, tippst du hier auf "nochmal".',
  },
  'fuehrung.zeichner.zoom.titel': { de: 'Zoom' },
  'fuehrung.zeichner.zoom.text': {
    de: 'Näher, weiter weg und "Alles zeigen" (Taste 0) holt die ganze Wohnung ins Bild.',
  },
  'fuehrung.zeichner.seite.titel': { de: 'Die rechte Spalte' },
  'fuehrung.zeichner.seite.text': {
    de: 'Zeigt, was zum Werkzeug oder zur Auswahl passt: Maße, Farbe, Katalog, Fächer, Kisten ohne Platz. Ohne Auswahl steht hier "So geht es"; das X blendet es aus, der Knopf "So geht es anzeigen" holt es zurück.',
  },
  'fuehrung.zeichner.raster.titel': { de: 'Raster' },
  'fuehrung.zeichner.raster.text': {
    de: 'Punkte rasten auf 1, 5 oder 10 cm ein. 5 cm passt fast immer.',
  },
  'fuehrung.zeichner.winkel.titel': { de: 'Winkel 90°' },
  'fuehrung.zeichner.winkel.text': {
    de: 'Wände werden gerade, im rechten Winkel. Mit gedrückter Umschalttaste zeichnest du schräg.',
  },
  'fuehrung.zeichner.tasten.titel': { de: 'Tasten' },
  'fuehrung.zeichner.tasten.text': {
    de: 'Die wichtigsten Tasten stehen hier unten. Esc bricht ab, Entf löscht, Pfeiltasten schieben das Gewählte.',
  },

  // Moebel
  'fuehrung.moebel.start.titel': { de: 'Möbel' },
  'fuehrung.moebel.start.text': {
    de: 'Alle Möbelstücke des Umzugs, mit Maßen, Hersteller und ob sie zerlegt sind.',
  },
  'fuehrung.moebel.neu.titel': { de: 'Neues Möbel' },
  'fuehrung.moebel.neu.text': {
    de: 'Legt ein Möbelstück an. Es bekommt eine Nummer und ein Etikett wie eine Kiste.',
  },
  'fuehrung.moebel.filter.titel': { de: 'Nach Zimmer' },
  'fuehrung.moebel.filter.text': {
    de: 'Zeigt nur die Möbel eines Zimmers.',
  },

  // Suche
  'fuehrung.suche.start.titel': { de: 'Suchen' },
  'fuehrung.suche.start.text': {
    de: 'Sucht in allen Umzügen, in allen Kisten und in allem, was du als Inhalt eingetragen hast.',
  },
  'fuehrung.suche.feld.titel': { de: 'Was suchst du?' },
  'fuehrung.suche.feld.text': {
    de: 'Tippe ein Wort, zum Beispiel "Ladekabel". Deutsch und Arabisch gehen beide.',
  },
  'fuehrung.suche.treffer.titel': { de: 'Die Treffer' },
  'fuehrung.suche.treffer.text': {
    de: 'Jeder Treffer sagt: welche Kiste, welches Zimmer, wo sie steht und in welcher Höhe. "Im Grundriss zeigen" markiert sie rot im Plan.',
  },

  // Scannen
  'fuehrung.scan.start.titel': { de: 'Scannen' },
  'fuehrung.scan.start.text': {
    de: 'Scanne die QR-Codes auf den Etiketten. Beim Ausladen kannst du jede Kiste gleich auf "angekommen" setzen.',
  },
  'fuehrung.scan.kamera.titel': { de: 'Kamera' },
  'fuehrung.scan.kamera.text': {
    de: 'Halte das Etikett in das Bild. Sobald der Code erkannt ist, erscheint die Kiste.',
  },
  'fuehrung.scan.nummer.titel': { de: 'Nummer von Hand' },
  'fuehrung.scan.nummer.text': {
    de: 'Ist das Etikett kaputt? Tippe die Nummer ein, zum Beispiel W-3-007.',
  },

  // Chat
  'fuehrung.chat.start.titel': { de: 'Chat' },
  'fuehrung.chat.start.text': {
    de: 'Schreibe allen, die beim Umzug helfen. Du kannst Fotos, Sprachnachrichten und Kisten schicken.',
  },
  'fuehrung.chat.anruf.titel': { de: 'Anrufen' },
  'fuehrung.chat.anruf.text': {
    de: 'Ruft die anderen im Umzug an.',
  },
  'fuehrung.chat.video.titel': { de: 'Videoanruf' },
  'fuehrung.chat.video.text': {
    de: 'Ein Anruf mit Bild, zum Beispiel um zu zeigen, wo etwas hin soll.',
  },

  // Profil
  'fuehrung.profil.start.titel': { de: 'Dein Profil' },
  'fuehrung.profil.start.text': {
    de: 'Hier stellst du Magazino so ein, wie es dir gefällt.',
  },
  'fuehrung.profil.sprache.titel': { de: 'Sprache' },
  'fuehrung.profil.sprache.text': {
    de: 'Deutsch oder Arabisch. Auf Arabisch läuft alles von rechts nach links, Pläne bleiben wie sie sind.',
  },
  'fuehrung.profil.aussehen.titel': { de: 'Hell oder dunkel' },
  'fuehrung.profil.aussehen.text': {
    de: 'Wie das Handy eingestellt ist, immer hell oder immer dunkel.',
  },
  'fuehrung.profil.bewegung.titel': { de: 'Bewegung' },
  'fuehrung.profil.bewegung.text': {
    de: 'Ruhig, normal oder voll: wie viel sich auf dem Bildschirm bewegt.',
  },
  'fuehrung.profil.abmelden.titel': { de: 'Abmelden' },
  'fuehrung.profil.abmelden.text': {
    de: 'Meldet dich auf diesem Gerät ab.',
  },

  'fuehrung.allgemein.start.titel': { de: 'Magazino' },
  'fuehrung.allgemein.start.text': {
    de: 'Magazino hilft beim Umzug: jede Kiste hat eine Nummer und ein Etikett, du weißt immer, was drin ist und wo sie steht.',
  },

  'fuehrung.ende.titel': { de: 'Das war alles' },
  'fuehrung.ende.text': {
    de: 'Auf jeder Seite erklärt der Knopf "Erklärung" oben genau diese Seite. Viel Erfolg beim Umzug!',
  },
}
