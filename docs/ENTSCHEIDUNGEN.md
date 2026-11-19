# Entscheidungen: was ist wie gebaut und warum

Für Reviewer. Je Entscheidung: **Was**, **Warum**, **Herkunft** (aus Kistly übernommen, umgebaut oder neu) und **Preis**
(was man dafür in Kauf nimmt). Die lange Chronik mit allen Einzelentscheidungen (E1 bis E109) steht in
[grundriss/ENTSCHEIDUNGEN.md](grundriss/ENTSCHEIDUNGEN.md). Kistly war ein Umzugsprogramm (Kisten, Zimmer, Personen, Möbel,
Chat, Anrufe, 3D-Wohnung, Siedlung, zweisprachig). Magazino hat daraus ein Lagerprogramm gemacht; der volle alte Stand
bleibt im Git-Marker `kistly-umzugsprogramm` und im Repo `Harryclaude-hub/kistly`.

## A. Grundlagen

| # | Was | Warum | Herkunft | Preis |
|---|---|---|---|---|
| 1 | Eine Seite im Browser (SPA): React 19, TypeScript, Vite, Tailwind, Router; nur Hooks und Context | läuft statisch auf jedem Hoster, kein eigener Server, wenig Angriffsfläche, Fehler fängt der Typprüfer | Kistly, unverändert | Hauptteil 277 kB (gzip), kein serverseitiges Rendern |
| 2 | Supabase als Backend (Postgres, Auth, Speicher, Edge Functions, pg_cron) | alles ohne eigenen Server: Konten, Datenbank mit Regeln, Funktionen, Zeitplan, ein Anbieter | Kistly | an einen Anbieter gebunden (Postgres selbst ist frei, Umzug möglich) |
| 3 | **Die Datenbank ist die Sicherheitsgrenze**: Zeilenregeln (RLS) auf jeder Tabelle, Änderungen nur über geprüfte Funktionen, Trigger lehnen Verbotenes ab | die Regel gilt für jeden Zugang, auch für den, der die Oberfläche umgeht; Geheimhaltung des Codes ist nicht nötig | Kistly (Prinzip), in Magazino auf alle neuen Tabellen ausgeweitet | Logik liegt in SQL, schwerer zu testen als in Code |
| 4 | Genau **eine** Datei spricht mit der Datenbank (`src/lib/api.ts`) | eine Stelle zum Prüfen und Abdichten, keine verstreuten Abfragen, Fehler werden dort übersetzt | Kistly, Regel beibehalten | Datei ist groß (ca. 1.700 Zeilen); Aufteilung nach Bereichen wäre ein nächster Schritt |
| 5 | Migrationen nummeriert, eingespielte werden **nie geändert**, jeder Fehler bekommt eine neue Nummer; vor jedem Einspielen ein **Probelauf**, der alles zurückrollt und je Regel eine Berichtszeile liefert | nachvollziehbare Geschichte, kein Raten, sicher gegen Echtdaten | Kistly (Nummerierung), Probelauf neu seit Migration 0049 | Probelauf-Dateien duplizieren die Migration |
| 6 | Nur Deutsch (Oberfläche, Code, Kommentare, Commits); Texte in eigenen Wörterbüchern, eine Prüfung meldet fehlende Schlüssel | Zielgruppe und Team sprechen Deutsch; die Arabisch-Fassung wurde bewusst entfernt (-2.900 Übersetzungen) | Kistly war zweisprachig; Arabisch am 19.11. entfernt | Typ `Lang` kennt noch `ar` als Rest; neue Sprache wäre Aufwand |
| 7 | Prüfung durch Skripte (`scripts/*-pruefen.mjs`) statt Test-Framework | die kritischen Teile sind Rechnung (Geometrie, Kollision, Platzregeln) und Datenbankregeln; Skripte prüfen genau das mit eigenen Fällen und Zeitgrenzen | Kistly | keine Komponenten-Tests, keine Abdeckungszahl; Lücke steht in den bekannten Schulden |

## B. Datenmodell und Rechte

| # | Was | Warum | Herkunft | Preis |
|---|---|---|---|---|
| 8 | **Lager = Projekt** (`projects`), neue Ebene **Bundeslandprojekt** darüber; der Zugang wird je Bundeslandprojekt vergeben (`bl_mitglieder`) und in die Lager hinein **abgeleitet** (`project_members`) | alle bestehenden Zeilenregeln hängen an `project_members` und bleiben unverändert; eine Wahrheit (`bl_mitglieder`), eine abgeleitete Folge | Kistly kannte nur "Umzug"; Ebene neu (0054) | zwei Tabellen halten dasselbe Wissen, bei Änderung müssen beide stimmen (Funktionen übernehmen das) |
| 9 | Rollen owner, editor, viewer je Lager plus **Admin** global (`app_admins`); Admins sind Besitzer überall; ein entzogener Admin verliert diese Rechte wieder (0062) | einfache Aufgabenteilung; Prüfung sagte: Rechte müssen zurückgenommen werden, nicht nur Eintrag gelöscht | Kistly (Rollen, Admin), 0062 Härtung | Admin ist ein einzelnes Konto mit sehr viel Macht (zweite Anmeldestufe offen) |
| 10 | **Bestand** (`bestand`) getrennt von **Kisten** (`items`); Mengen ändert nur `bestand_buchen` (Trigger verbietet alles andere), jede Buchung steht in `bestand_buchungen` (anhängend) | Kisten waren Einzelstücke mit Inhaltstext; ein Lager braucht Mengen, Mindestmenge und einen Verlauf | neu | zwei Konzepte nebeneinander (Kiste mit Inhalt, Ding mit Menge) |
| 11 | **Mitnehmen** statt Entnehmen und Ausleihen: eine Aktion, Wahl "Bleibt weg" oder "Bringe ich zurück" (mit Termin); Seite "Unterwegs" | beides ist dasselbe Muster mit oder ohne Rückkehr; weniger Knöpfe, klarer Ablauf | neu (Wunsch des Besitzers) | Datenbank behält die Namen `entnahme` und `ausleihe` (Übersetzung in der Oberfläche) |
| 12 | **Tür-QR**: Eintragen und Austragen je Lager, Buchen verlangt "eingetragen" (Admin und Besitzer ausgenommen), Eintrag läuft nach 12 Stunden ab | Nachweis, wer wann im Lager war, Verlauf für alle | neu | ehrlich: ein Ablaufhelfer, kein Schloss; jedes Mitglied kann sich per Knopf eintragen |
| 13 | Zimmer und Personen durch **Bereiche** ersetzt (`lager_kategorien`, jeder Bereich bekommt automatisch ein Kürzel in `tags`) | Kisten-Nummern (z. B. `BA-3-007`) hängen am Kürzel einer Gruppe; so bleibt die Nummernlogik von Kistly unverändert | Kistly (Nummern), Bereiche neu | zwei Tabellen (Bereich und Kürzel) werden gemeinsam gepflegt |
| 14 | Mengen als `numeric(12,2)`, kein NaN, auf zwei Stellen gerundet | Zählware und Gewicht in einer Spalte; Prüfbefund (0062) | neu | |

## C. Konten und Anmeldung

| # | Was | Warum | Herkunft | Preis |
|---|---|---|---|---|
| 15 | **Kein Registrieren**: Konten legt nur der Admin an (Edge Function `konto-anlegen`); freie Anmeldung in Supabase aus | geschlossene Gemeinschaft; kein Weg für Fremde | Kistly erlaubte Registrierung mit Freigabe (0036), jetzt abgeschaltet | Admin ist Engpass |
| 16 | Der mächtige Dienstschlüssel wird nur für **das Erzeugen eines Kontos** benutzt, alles Weitere (freischalten, zuteilen) macht der Browser mit dem **Token des Admins** über Funktionen, die selbst prüfen | kleinste Rechte: der Schlüssel liegt nur beim Hoster und tut nur das Eine, was nicht anders geht | neu | zwei Schritte statt einem; bei Fehler räumt die Funktion das neue Konto wieder auf |
| 17 | **Benutzername statt E-Mail** möglich: intern `name@magazino.invalid` (reservierte Endung, kann nie Post empfangen) | Leute ohne E-Mail; es geht nie eine Mail an Fremde | neu | für diese Konten kein Passwort-per-Mail, der Admin setzt ein neues Startpasswort; ob Supabase die Adresse akzeptiert, ist nur im Betrieb belegt |
| 18 | **Startpasswort-Zwang von der Datenbank erzwungen**: der Hash des Startpassworts wird gemerkt, bis er sich ändert, ist das Konto gesperrt (nur Passwortwechsel möglich) | ein Merker im Profil kann vom Nutzer selbst geändert werden; der Admin kennt das Startpasswort | neu (0058, Härtung 0062) | hängt am Hash-Vergleich; Test nach dem zweiten Anmelden steht offen |
| 19 | Passwörter niemals lesbar (Hash), kein "Anzeigen"-Knopf an eigenen Feldern; Passwortregeln gleich in Browser und Server; Admin setzt nur **neue** Startpasswörter, nie für Admins; danach werden Sitzungen beendet | Passwörter können nicht abgegriffen werden | neu | |
| 20 | Konto **pausieren** statt löschen: das Konto bleibt, sieht nur eine leere Startseite | Admin will nichts verlieren, nur sperren | neu (Kistly kannte "sperren") | |
| 21 | **Geräteliste** im Profil mit Abmelden einzelner oder aller anderen Geräte (0063) | Diebstahl und Fremdgeräte bemerken und beenden | neu | schon ausgestellte Zugangstoken laufen bis zu einer Stunde weiter |

## D. Oberfläche

| # | Was | Warum | Herkunft | Preis |
|---|---|---|---|---|
| 22 | **Design als eigene Schicht** (`src/design`, `index.css`), Farben und Größen nur über Variablen; Apple-Stil (iOS-Schrift, Glas-Leisten, Sheets, Federbewegung), Hell und Dunkel | Funktion und Optik getrennt, Schicht ersetzbar; Anspruch "wie eine native Apple-App" | Kistly (Schicht), Apple-Stil neu | Systemschrift, keine eigene Schriftdatei |
| 23 | **Start**: Karte "Im Lager" (eintragen, austragen), Suche mit Bereichsfilter, Rest hinter Menüs; Header mit Logo, Scan, Glocke (Hinweise), Profil | wichtigste Handgriffe vorn, am Handy wenig Fläche | neu | |
| 24 | **Tolerante Suche im Browser** (Damerau-Levenshtein plus lockere Schlüssel), Nehmen und Ausleihen direkt am Treffer | Tippfehler sind normal; der Bestand ist klein, der Browser filtert schnell | neu | lädt den ganzen Bestand; ab ca. 2.000 Produkten je Lager muss die Suche in die Datenbank (siehe Schulden) |
| 25 | **Kompakte Listen**: am Handy dichte Zeilen mit Aktionsblatt, am Computer sortierbare Tabelle; erst 50 Zeilen, Rest beim Scrollen | viele Daten, wenig Platz | neu | eigene Fenstertechnik statt Bibliothek |
| 26 | **Etiketten neu**: A4 bis A7 hoch/quer, Raster 2x4, 3x7, 4x10, Inhalt passt sich dem Format an (reine Rechnung in `src/lib/etikett.ts`) | Druck in vielen Größen; 989 Zeilen Altcode auf rund 200 geschrumpft | Kistly (Etikett mit Zimmerfarben), neu geschrieben | echter Druckdialog nur nachgestellt geprüft |
| 27 | **Grundriss und 3D bewusst klein**: nur der Admin zeichnet, nur Regale, 3D mit Ansicht (oben/schräg), Licht an/aus, Begehen; kein Tag/Abend, keine Deko | der Besitzer sagt Claude, wo Regale hinkommen, Leute pflegen nur Inhalt; "sachlich" | Kistly (volles Zeichnen, Möbel, Elektro, Tageszeiten, Siedlung) | Funktionen **versteckt, nicht gelöscht**: Schalter `ZEICHNER_VOLL` und `SACHLICH` |
| 28 | Produktfotos aus Wikimedia Commons (frei lizenziert) im Repo (`public/produkte`), Nachweis in `CREDITS.md`; Bild hängt am Ding (`bild_pfad`, nur Pfad innerhalb der App) | kein fremder Link, kein Nachladen von Fremdseiten | neu | 15 Demo-Fotos, kein Upload |
| 29 | Kalender als **.ics-Datei** (Erinnerung 3 Stunden und 30 Minuten vorher) | funktioniert in Apple und Google ohne Konten-Verbindung | neu | Einmal-Import, keine Live-Synchronisation |

## E. Betrieb

| # | Was | Warum | Herkunft | Preis |
|---|---|---|---|---|
| 30 | **Erinnerungen**: pg_cron ruft alle 30 Minuten die Edge Function `erinnern` (Ausleiher, Zuständige, knapper Bestand), Web Push; Schutz durch Zufallszeichen aus `private.config` | läuft ohne eigenen Server und ohne Nutzer-Token | Push von Kistly (`push-send`), Erinnern neu | Verschlüsselungscode steht doppelt (push-send und erinnern), bewusst, um das laufende push-send nicht anzufassen |
| 31 | **Hosting auf GitHub Pages, Veröffentlichen lokal** (`npm run veroeffentlichen` baut den letzten Commit und legt ihn auf `gh-pages`) | Bauen über GitHub Actions kostete Rechenzeit (Konto gesperrt); lokal baut es kostenlos | Kistly baute per Actions bei jedem Push | ein Handgriff nach jedem Push; Abläufe bleiben als gehärteter Notweg |
| 32 | Repo **öffentlich**, gehärtet: Secret Scanning mit Push-Schutz, `main` gegen Löschen und Überschreiben geschützt, nur GitHub-eigene Bausteine, Standardrechte nur Lesen, keine Schlüssel im Verlauf | private Repos kosten bei Pages und Actions; Sicherheit hängt an der Datenbank | neu | Code sichtbar, ältere Verlaufsstände enthalten zwei private Adressen |
| 33 | Altlasten entfernt: Chat, Anrufe, Siedlung, Möbel-Katalog, Figur, Einladungscodes, Zimmerseiten (rund **52.600 Zeilen**, 63 Dateien) und in der Datenbank 11 Tabellen und 30 Funktionen (0060, 0061) | nur Code behalten, den Magazino braucht; der alte Stand bleibt im Marker und im Kistly-Repo | neu | die Begehen-Engine (`motor.ts`, rund 7.000 Zeilen) blieb, weil verflochten |
| 34 | Sicherheitsprüfung durch einen **unabhängigen Prüfer** nach eigenen Messungen; Funde in 0062 behoben, Bericht im Repo | Autoren sehen ihre Fehler schlecht | neu | |

## Was bewusst nicht gemacht wurde

- Kein Test-Framework und keine automatische Pipeline mit Pflicht-Prüfungen (Konto für Actions gesperrt; `npm run pruefen` läuft lokal).
- Keine zweite Anmeldestufe (MFA) im Programm, kein Alarm bei Fehlversuchen, keine Datensicherung außer der Supabase-eigenen
  (Free-Plan hat keine): offen für die nächste Stufe, siehe [BEKANNTE-SCHULDEN.md](BEKANNTE-SCHULDEN.md).
- Keine eigene Domain und keine Sicherheits-Kopfzeilen (GitHub Pages kann sie nicht setzen).
