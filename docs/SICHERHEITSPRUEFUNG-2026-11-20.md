# Sicherheits- und Fehlerpruefung vom 20.11.2026 (E108)

Zwei Pruefungen: (1) Messungen an der echten Datenbank, (2) eine unabhaengige Lesepruefung des gesamten neuen Codes durch einen
Pruefer, der den Code nicht geschrieben hat. Dieses Blatt sagt, was gefunden, was behoben und was offen ist.

## 1. Messungen an der Datenbank (live)

| Pruefung | Ergebnis |
|---|---|
| Tabellen ohne Zeilenregeln (RLS) | keine |
| Nicht angemeldeter Besucher liest Lagerdaten | nein (einzige Ausnahme war die Liste der Kistengroessen, seit 0060 ebenfalls zu) |
| Angemeldeter Fremder ohne Lager sieht fremde Zeilen | nein, nur eigene Zeilen (Konto, Einstellungen, Profil) |
| Funktionen fuer Besucher aufrufbar | nur Trigger-Funktionen (nicht direkt aufrufbar), keine Schnittstellen-Funktion |
| Funktionen mit hoeheren Rechten ohne festen `search_path` | keine |
| Policies, die fuer jeden gelten (Rolle public) | keine |
| Speicher-Ordner oeffentlich | nein, alle privat; Speicherregeln fuer Chat und Avatare entfernt |
| Alte Tabellen und Funktionen des Umzugsprogramms | entfernt (0060, 0061), Siedlung vorher als Datei gesichert |
| Schluessel im Repo oder im Git-Verlauf (207 Staende) | keine |
| `npm audit` (Laufzeit-Abhaengigkeiten) | 0 Funde |
| Gefaehrliche Muster im Code (`innerHTML`, `eval`, offene Links) | keine |

## 2. Unabhaengige Lesepruefung: Funde und Stand

Kritisch: keiner. Ein Fremder ohne Konto kommt an nichts.

| Nr. | Fund | Stand |
|---|---|---|
| H1 | Entzogener Admin behielt Besitzerrechte in allen Lagern | **behoben** (0062): beim Entziehen werden Besitzer zu Bearbeitern |
| H2 | Startpasswort-Zwang hing an einem zweiten Aufruf des Browsers | **behoben** (0062 und Server-Funktionen): die Server-Funktion merkt den Hash sofort; schlaegt das fehl, wird das neue Konto wieder entfernt |
| M1 | Bestand direkt loeschbar, umging die Sperre "noch ausgeliehen" | **behoben** (0062): Loeschrecht entzogen, nur ueber `bestand_entfernen` |
| M2 | Menge NaN speicherbar | **behoben** (0062): Pruefungen auf Tabellen und in der Buchung |
| M3 | Push-Adresse frei waehlbar (blinde Serveranfrage) | **behoben** (0062 plus Pruefung vor dem Senden): nur https und bekannte Push-Dienste |
| M4 | Jedes Mitglied konnte Pushes an alle schicken | **teilweise behoben**: nur Bearbeiter und Besitzer, Text begrenzt, keine Bildfelder; der Text selbst bleibt frei |
| M5 | "knapp" wurde beim Aendern der Mindestmenge nicht gesetzt | **behoben** (0062, Trigger) |
| M6 | Tuer-Pflicht ist keine echte Sperre | **ehrlich benannt** und gemildert: Eintrag laeuft nach 12 Stunden ab, endet beim Zugang-Entziehen. Es ist ein Ablaufhelfer, kein Schloss |
| M7 | Mengen ohne Rundung | **behoben** (0062): auf zwei Stellen gerundet |
| M8 | Listen schnitten bei 1000 Zeilen still ab, "Erledigt" zeigte die aeltesten | **behoben**: seitenweise Laden, neueste zuerst |
| M9 | Sperre faellt, wenn Supabase den Hash beim Anmelden neu schreibt (unsicher) | **offen, Test noetig**: Konto mit Startpasswort anlegen, einmal anmelden, `meine_freigabe` muss weiter `passwort` liefern |
| M10 | Freie Anmeldung in Supabase evtl. an (steht nicht im Repo) | **offen, Handgriff von Karam**; Test: Aufruf `/auth/v1/signup` muss "signup_disabled" liefern |
| M11 | Bearbeiter konnten Lager und Dinge umhaengen | **behoben** (0062, Trigger) |
| N1 | Klick auf eine Erinnerung oeffnete nur die Startseite | **behoben** (Ziel im Push) |
| N2 | Erinnerungen an Leute, die nicht mehr Mitglied sind | offen, gering |
| N3 | Interne Fehlertexte aus der Datenbank gehen an die Seite (bild-analyse) | offen, gering (push-send behoben) |
| N4 | Seite blieb nach Passwortwechsel auf "Passwort setzen" | **behoben** (neu pruefen bei Seitenwechsel) |
| N5 | Doppeltes "Ich bin im Lager" gab einen Fehler | **behoben** (0062) |
| N6 | Tolerante Suche kennt nur lateinische Buchstaben | offen, gering (Arabisch ist entfernt) |
| N7 | Konto mit Startpasswort konnte Admin werden | **behoben** (0062) |
| N8 | Schon ausgestellte Zugangstoken gelten bis zu einer Stunde | Hinweis; die Datenbank sperrt Startpasswort und Sperre sofort |
| N9 | Workflow gibt dem Bau-Job das Recht zum Veroeffentlichen | offen, gering |
| N10 | Zwei private Adressen in `docs/UEBERGABE.md` | Hinweis: das Repo ist privat; vor einer Veroeffentlichung entfernen |
| N11 | Kleine Reste (Name einer App-Verknuepfung) | Verknuepfung behoben, Rest offen |

Gepruefte Bereiche ohne Befund laut Pruefer: Rechte in allen Funktionen der Migrationen 0050 bis 0061, Wettlaeufe in
`bestand_buchen` und `ausleihe_zurueck` (Zeilensperre), Umgehung der Mengen-Sperre ueber die Schnittstelle (nicht moeglich),
Edge Functions `konto-anlegen`, `passwort-setzen`, `erinnern`, `bild-analyse`, Frontend (kein HTML-Einschleusen, keine
offene Weiterleitung, keine Passwoerter in Speicher oder Adresszeile), Kalenderdatei, Service Worker, Speicher-Ordner.

## 3. Was Karam tun muss (kann der Code nicht erzwingen)

1. Supabase, Authentication: freie Anmeldung ("Allow new users to sign up") **aus**.
2. Supabase, Authentication, Passwort: Mindestlaenge 10, Buchstaben und Ziffern verlangen.
3. Einen Probelauf mit echten Konten (Admin plus Test-Kollege) im Browser, besonders die Startpasswort-Sperre nach dem zweiten
   Anmelden (M9).
4. GitHub: Abrechnung pruefen, Actions starten derzeit nicht (neuer Stand nicht online).

## 4. Das Repo ist oeffentlich: getroffene Schutzmassnahmen (20.11.2026)

Gedacht fuer ein oeffentliches Repo, das nur Code und keine Geheimnisse enthaelt. Die Sicherheit der Daten haengt an den Zugriffsregeln
der Datenbank, nicht an der Geheimhaltung des Codes.

| Massnahme | Stand |
|---|---|
| Schluessel im Repo oder Verlauf | keine (Mustersuche); Datenbank-Schluessel im Programm ist der oeffentliche, fuer Besucher gedachte |
| Schluessel-Schutz von GitHub (Secret Scanning plus Push-Schutz) | eingeschaltet: ein versehentlich eingecheckter Schluessel wird blockiert |
| Sicherheitswarnungen fuer Abhaengigkeiten | eingeschaltet |
| Zweig `main` | gegen Loeschen und Ueberschreiben (Force-Push) geschuetzt |
| Actions | nur GitHub-eigene Bausteine erlaubt, Standardrechte nur Lesen, Fremde (Forks) brauchen eine Freigabe, Pull-Requests duerfen keine Auftraege freigeben |
| Ablauf `pages.yml` | feste Pruefsummen statt Versions-Etiketten, kleinste Rechte je Auftrag, kein `pull_request`-Ausloeser, laeuft nur in diesem Repo, aktuell nur von Hand (Konto fuer Actions gesperrt) |
| Registrierung | in Supabase abgeschaltet; Konten nur durch den Admin |
| Private Adressen | aus dem aktuellen Stand entfernt (in alten Staenden des Verlaufs noch) |
| Bekannte Kennungen im Code | die Admin-Konto-Kennung steht in den Probelaeufen unter `supabase/probelauf`: eine Kennung, kein Zugang |

Was Fremde mit dem Code anfangen koennen: Sie sehen Aufbau und Datenbank-Regeln. Ohne Konto kommen sie an keine Zeile (geprueft:
Besucher und angemeldete Fremde sehen nichts Fremdes). Konten gibt es nur vom Admin.

Veroeffentlichen: nach jedem Hochladen von Code `node scripts/veroeffentlichen.mjs` (Zweig `gh-pages`, kostenlos).
