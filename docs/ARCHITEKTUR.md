# Magazino: Architektur zum Erklaeren (Stand 19.11.2026, E103 und E104)

Ein Lagerprogramm fuer eine kleine Gemeinschaft. Ebenen: **Bundeslandprojekt**
(z.B. Oberoesterreich) enthaelt mehrere **Lager**; der Admin entscheidet, wer welches
Bundeslandprojekt sieht. Dazu: Leute mit Zugang, Bestand mit Mengen, Ausleihen mit Rueckgabetermin, Ein- und
Austragen per QR an der Tuer, Erinnerungen per Push. Konten legt nur ein
Admin an. Dieses Dokument erklaert, wie es gebaut ist und warum.

## 1. Die Schichten in einem Bild

```
Browser (Handy / Computer)
  React 19 + TypeScript + Tailwind, als statische Seite auf GitHub Pages
  nur src/lib/api.ts spricht mit dem Server
        |  HTTPS, Token des angemeldeten Nutzers (JWT)
        v
Supabase (ein Projekt)
  Auth        Konten, Passwoerter, Token
  PostgREST   Tabellen als Schnittstelle, gefiltert von Zeilenregeln (RLS)
  Postgres    die eigentlichen Regeln: Tabellen, Pruefungen, Funktionen
  Edge Functions (Deno)  konto-anlegen, erinnern, push-send, bild-analyse
  pg_cron + pg_net       ruft alle 30 Minuten "erinnern" auf
  Web Push    Benachrichtigungen aufs Handy (VAPID)
```

Leitgedanke: **Die Oberflaeche ist nur Bedienung, die Regeln stehen in der
Datenbank.** Wer die Seite umgeht und die Schnittstelle direkt aufruft,
stoesst auf dieselben Regeln. Darum ist nichts "nur versteckt".

## 2. Frontend

- `src/App.tsx`: Routen. `/login` ist die einzige offene Seite. Alles unter
  `/app` liegt hinter `Gate` (angemeldet) und `FreigabeTor` (Konto frei).
- Startseite `src/pages/Login.tsx`: Logo und Anmeldung, sonst nichts, kein
  Registrieren. Konten kommen nur vom Admin.
- Lager-Seiten unter `/app/p/:pid/...`: Start (`LagerHome`), Tuer (`Tuer`),
  Bestand (`Bestand`), Ausleihen (`Ausleihen`), Kisten, Grundriss und 3D, Chat,
  Team. Admin-Portal unter `/app/admin`.
- Design ist eine eigene Schicht (`src/index.css` Farbrollen, `src/design/`):
  blau und weiss, Hell und Dunkel, weitere Designs. Funktion und Optik sind
  getrennt, Farben nur ueber Variablen.
- Nur Deutsch (Arabisch ist seit E105 entfernt). Jeder Text steht in
  `src/lib/i18n/bausteine/`, eine Pruefung (`scripts/woerter-pruefen.mjs`)
  meldet fehlende Texte.
- Startbildschirm (`Dashboard.tsx`): Suchleiste mit Bereichsfiltern, tolerante Suche
  gegen Tippfehler (`src/lib/fuzzy.ts`, Damerau-Levenshtein plus lockere Schluessel,
  getestet mit `scripts/fuzzy-pruefen.mjs`), Treffer mit Nehmen und Ausleihen, Scanner
  fuer Kisten und Lagertuer.
- Datenbankzugriff nur in `src/lib/api.ts` (Hausregel). Jede Seite ruft nur
  diese Funktionen. Dadurch gibt es eine Stelle, an der man Aufrufe prueft.

## 3. Daten (Migrationen `supabase/migrations/`)

| Tabelle | Zweck |
|---|---|
| `bl_projekte`, `bl_mitglieder` | Bundeslandprojekte und wer dazugehoert (die Wahrheit fuer den Zugang, nur der Admin aendert sie) |
| `projects` | ein Lager, gehoert zu genau einem Bundeslandprojekt (`bl_projekt_id`). `project_members` ist die abgeleitete Folge: wer ein Bundeslandprojekt hat, ist Mitglied aller Lager darin (so bleiben alle bisherigen Zeilenregeln unveraendert) |
| `lager_kategorien` | Bereiche eines Lagers (Basteln, Essen ...), je Bereich ein Zustaendiger; jeder Bereich hat automatisch ein Kuerzel (`tag_id`), damit Kisten ihre Nummer behalten. Zimmer und Personen gibt es nicht mehr |
| `bestand` | Dinge mit Menge, Einheit, Mindestmenge; Art Verbrauch oder Ausleihe |
| `bestand_buchungen` | jede Mengenaenderung: wer, wann, wie viel, Rest danach |
| `ausleihen` | wer hat wie viel bis wann, wann zurueck, wann erinnert |
| `lager_zugang` | Eintragen am Tuer-QR, Austragen beim Gehen (hoechstens ein offener Eintrag je Person) |
| `aktivitaet` | Protokoll fuer das Admin-Portal |
| `items`, `grundrisse`, `raeume`, `objekte` | Kisten mit Nummer und QR, Plan in Zentimetern, Regale mit Faechern (aus dem frueheren Kistly) |
| `app_admins`, `konto_freigaben` | wer Admin ist, ob ein Konto frei, wartend oder gesperrt ist |

Migrationen 0001 bis 0055. Eine eingespielte Migration wird nie geaendert, ein
Fehler bekommt eine neue Nummer. Vor jedem Einspielen laeuft ein Probelauf
(`supabase/probelauf/`), der am Ende immer mit einer Fehlermeldung abbricht
und damit alles zurueckrollt; der Bericht steht in der Meldung.

## 4. Sicherheit in Schichten

1. **Anmelden**: Supabase Auth. Freie Anmeldung ist abgeschaltet, die Seite
   hat keinen Registrieren-Knopf. Passwort mindestens 10 Zeichen mit
   Buchstaben und Ziffern.
2. **Zeilenregeln (RLS)** auf jeder Tabelle: lesen darf, wer Mitglied des
   Lagers ist (`is_member`); Stammdaten schreiben nur Bearbeiter
   (`is_editor`). Fremde Lager sind unsichtbar.
3. **Mengen nur ueber Funktionen**: `bestand_buchen` und `ausleihe_zurueck`
   (security definer). Ein Trigger lehnt jede direkte Mengenaenderung ab.
   Die Funktion prueft Rolle, Eintragung an der Tuer, genug Menge, Termin bei
   Ausleihe. Das ist der Kern: die Regel gilt fuer jeden Zugang.
4. **Tuer-Pflicht**: Buchen geht nur, wenn die Person am Tuer-QR eingetragen
   ist (`lager_eingetragen`). Admins und Besitzer sind ausgenommen, damit sie
   jederzeit eingreifen koennen.
4a. **Grundriss nur vom Admin** (0055): ein Trigger lehnt jede Aenderung an Grundriss, Raeumen, Tueren, Fenstern, Regalen und Schraenken ab, wenn das Konto kein Admin ist, auf jedem Weg. Kisten in ein Regal stellen bleibt allen Bearbeitern erlaubt.
4b. **Verlauf fuer alle Mitglieder** (0054): wer kam, ging, nahm, brachte; sichtbar fuer jedes Mitglied des Lagers, nicht nur fuer Admins.
5. **Admin-Rechte** stehen in `app_admins`; jede Admin-Funktion beginnt mit
   `ist_admin()`. Nur Admins legen Lager an (Migration 0052), ernennen
   Admins (der letzte bleibt immer) und teilen Leute zu.
6. **Hauptschluessel nur an einer Stelle**: `konto-anlegen` braucht den
   Dienstschluessel von Supabase, um ein Konto zu erzeugen. Der Schluessel
   liegt beim Hoster, nie im Code, nie im Browser. Die Funktion prueft zuerst
   mit dem Token des Aufrufers, ob er Admin ist, und erzeugt nur das Konto.
   Freischalten und Zuteilen macht danach der Browser mit dem Token des
   Admins ueber Funktionen, die selbst pruefen.
7. **Zeitplan-Aufruf geschuetzt**: `erinnern` hat kein Nutzer-Token, darum
   prueft sie ein Zufallszeichen aus `private.config` (nicht ueber die
   Schnittstelle lesbar), verglichen in gleicher Zeit.
8. **Kein Schluessel im Repo**, CORS der Funktionen nur fuer die eigene
   Adresse, Fehlertexte ohne Innenleben.

## 4b. Passwoerter und Benutzernamen (E107)

- **Passwoerter kann niemand lesen.** Supabase speichert nur einen Hash (bcrypt). Kein Admin, kein Entwickler und keine Funktion
  kann ein bestehendes Passwort anzeigen; es gibt keine Stelle im Programm, die eines ausgibt. Man kann nur ein NEUES setzen.
- **Eigenes Passwort aendern** geht nur eingeloggt und verlangt das aktuelle Passwort (wird gegen einen Probe-Login geprueft);
  danach werden alle anderen Geraete abgemeldet.
- **Admin setzt ein Startpasswort** (Konto anlegen oder "Neues Startpasswort setzen", Funktion `passwort-setzen`): nur fuer Konten,
  die kein Admin sind; das Startpasswort steht einmal im Dialog zum Weitergeben und danach nirgends; die offenen Sitzungen der Person
  werden beendet (`admin_sitzungen_beenden`, 0057).
- **Zwang zum eigenen Passwort, von der Datenbank erzwungen (0058):** Beim Setzen eines Startpassworts merkt sich `konto_freigaben` nur
  dessen Hash (`start_hash`). Solange der aktuelle Hash des Kontos gleich diesem ist, gilt das Konto als nicht freigegeben
  (`ist_freigegeben()` ist falsch, `meine_freigabe()` meldet `passwort`): es sieht und aendert nichts, nur das eigene Passwort geht.
  Setzt die Person ein neues, aendert sich der Hash (bcrypt nimmt jedes Mal ein neues Salz) und die Sperre faellt von selbst. Der
  Merker im Profil (`user_metadata`) ist nur Bedienkomfort, weil die Person ihn selbst aendern koennte; die Sperre haengt nicht daran.
- **Regeln fuer jedes neue Passwort** (Browser UND Server-Funktionen): mindestens 10 Zeichen, Buchstaben und Ziffern, kein bekanntes
  Allerwelts-Passwort, nicht der Name oder die Adresse. Dazu empfohlen in Supabase (Authentication, Passwort): Mindestlaenge 10,
  Buchstaben und Ziffern; "Leaked password protection" gibt es erst im Pro-Plan.
- **Benutzername statt E-Mail:** Supabase kennt Konten nur mit E-Mail. Wer nur einen Namen hat, bekommt intern `<name>@magazino.invalid`
  (die Endung `.invalid` ist weltweit reserviert und kann nie Post empfangen, es geht also nie eine Mail an Fremde). Die Seite setzt sie
  beim Anmelden selbst ein und blendet sie ueberall aus (`src/lib/konto.ts`). Solche Konten haben keinen Passwort-per-Mail-Weg;
  vergessene Passwoerter setzt der Admin neu.
- **Anmeldefehler** sagen nie, ob ein Name existiert. Supabase begrenzt Anmeldeversuche je Adresse und IP selbst.

## 4a. Wie ein Konto entsteht (Ablauf)

```
Admin-Portal (Browser)                 Edge Function konto-anlegen        Datenbank
 E-Mail, Name, Startpasswort  --JWT-->  1. getUser(): wer ruft an?
                                        2. rpc ist_admin() mit dem Token  --> ja/nein
                                        3. Eingaben pruefen
                                        4. auth.admin.createUser (Dienstschluessel)
 <-- user_id ----------------------------
 rpc admin_freigabe_setzen(frei)  ------------------------------------------>  konto_freigaben
 rpc admin_mitglied_setzen(Lager, Rolle) ------------------------------------>  project_members
 Zugangsdaten anzeigen und kopieren (einmalig)
Neues Konto meldet sich an, sieht ein Band "Bitte eigenes Passwort setzen",
setzt es in den Einstellungen; das Band verschwindet.
```

Warum diese Teilung: Der maechtige Schluessel macht nur das Eine, was nicht
anders geht. Alles andere laeuft mit den Rechten des Admins, so prueft die
Datenbank bei jedem Schritt, dass wirklich ein Admin handelt, und ein Fehler
in der Mitte laesst kein halbes Konto ohne Hinweis zurueck (die Oberflaeche
sagt dann, was fehlt).

## 5. Erinnerungen

`pg_cron` startet alle 30 Minuten `net.http_post` auf die Funktion `erinnern`:
1. an Ausleiher: Rueckgabe in den naechsten 2 Stunden oder ueberfaellig
   ("Schon zurueckgebracht?"), hoechstens alle 12 Stunden;
2. an den Zustaendigen des Bereichs (sonst die Besitzer): seit 12 Stunden
   ueberfaellig, einmal;
3. an dieselben: Menge unter der Mindestmenge, einmal je Unterschreitung.
Zugestellt wird per Web Push (VAPID, Verschluesselung nach RFC 8291) an die
Geraete, die die Person freigegeben hat. Wer "Dinge" abgeschaltet hat, bekommt
nichts. Kalender: jede Ausleihe laesst sich als `.ics`-Datei in den Apple- oder
Google-Kalender uebernehmen, mit Erinnerung 3 Stunden und 30 Minuten vorher.
Das ist ein Einmal-Import, keine laufende Synchronisation.

## 6. Veroeffentlichen und Pruefen

- Jeder Push auf `main` baut und veroeffentlicht die Seite (GitHub Pages).
- Vor jedem Commit: `npx tsc -b`, `npx oxlint`, `npm run build`,
  `node scripts/woerter-pruefen.mjs`, dazu die Szene-Pruefungen.
- Datenbank: Probelauf, dann einspielen; Server-Funktionen mit der Supabase-CLI.

## 7. Bewusste Grenzen (ehrlich)

- Der Ablauf "Admin legt Konto an" ist per Hand in der Oberflaeche geprueft,
  nicht durch einen automatischen Test (der legt echte Konten an).
- Push-Erinnerungen brauchen, dass die Person Benachrichtigungen auf dem Handy
  erlaubt hat; auf iPhones nur bei zur Startseite hinzugefuegter App.
- Kalender: Einmal-Import, keine Live-Verbindung (dafuer waere ein
  Google-Zugang noetig).
- Schloss: noch nicht angebunden, das Eintragen ist Pflicht im Programm, aber
  die Tuer geht davon nicht auf. Eine Anbindung haengt von der Schlossmarke ab.
- Masse der Demo-Lager sind erfunden.
- Das fruehere Umzugsprogramm (Zimmer, Personen, Moebel, Chat, Siedlung, Anrufe) ist aus Menues und Routen genommen, der Code liegt noch im Repo (Marke `kistly-umzugsprogramm` im Git zeigt den vollen alten Stand); es ist aufzuraeumen, wenn Karam es will. Seine Wohnung ist gesichert (Datei in Super Claude, Ordner _Sicherungen) und nicht mehr in der Datenbank. Rest-Hinweis: sind aber
  nicht Teil dieses Umbaus; ein spaeterer Rework entscheidet, was bleibt.

## 8. Wie weit traegt das? (Skalierung, Stand 19.11.2026)

Zahlen: Supabase-Preisseite und GitHub-Pages-Grenzen vom 19.11.2026 (aendern sich, vor
Entscheidungen neu nachsehen). Annahmen sind als Annahme gekennzeichnet.

**Heute: Hosting kostenlos plus GitHub Pro, Datenbank Free-Plan.** Das reicht fuer eine
Gemeinschaft mit einigen Dutzend Leuten und einigen Tausend Produkten und Kisten.

| Baustein | Grenze (Free / Pages) | Wann spuerbar (Annahme) | Was dann |
|---|---|---|---|
| Datenbank Supabase Free | 500 MB, kein Backup, Pause nach 1 Woche ohne Nutzung, max. 2 aktive Projekte | Buchungen und Verlauf: eine Zeile ca. 150 bis 200 Byte. 20 Leute mit je 10 Aktionen am Tag sind ca. 15 MB im Jahr; 100 Leute mit 50 Aktionen am Tag ca. 270 MB im Jahr | **Backup ist die erste Grenze, nicht die Groesse:** sobald echte Daten drin sind, die nicht verloren gehen duerfen, Pro-Plan (25 US-Dollar im Monat: 8 GB, taegliche Backups 7 Tage, nie pausiert) |
| Bilder von Kisten (Supabase Storage) | 1 GB Free, 100 GB Pro | ca. 10.000 verkleinerte Fotos (100 KB) | Pro, oder Fotos staerker verkleinern |
| Datenverkehr (Egress) | 5 GB im Monat Free, 250 GB Pro | Der Start laedt heute den ganzen Bestand eines Lagers und sucht im Browser. Bei 5.000 Produkten je Lager sind das ca. 1,5 MB je Aufruf: viele Leute ueber Tage sprengen 5 GB | **Das ist die erste echte Software-Grenze:** ab ca. 1.000 bis 2.000 Produkten je Lager Suche in die Datenbank verlegen (Postgres pg_trgm plus Seitenweise Laden) statt alles zu laden |
| Rechenleistung | Free: geteilte CPU, 500 MB RAM. Pro: Micro 1 GB | ab einigen hundert Leuten gleichzeitig | kleine Rechenstufe dazubuchen (rund 10 bis 15 US-Dollar im Monat), Abfragen und Indizes pruefen |
| Anmeldungen | 50.000 aktive Nutzer im Monat Free | nie fuer diese Gemeinschaft | nichts |
| Server-Funktionen | 500.000 Aufrufe im Monat Free | erinnern laeuft alle 30 Minuten, also ca. 1.440 im Monat | nichts |
| Mails (Passwort zuruecksetzen) | der eingebaute Versand ist sehr knapp (Annahme: wenige Mails je Stunde) | wenn viele Leute ihr Passwort vergessen | eigener Mail-Dienst (SMTP) eintragen; da Konten der Admin anlegt, kaum noetig |
| Hosting GitHub Pages | Seite 1 GB, ca. 100 GB Datenverkehr im Monat (weich), 10 Builds je Stunde | Die Seite wiegt ca. 280 KB (gzip) im Hauptteil: das sind rund 250.000 Aufrufe im Monat | siehe unten |

**GitHub Pages: wie lange begleitet es uns?** Technisch sehr lange, die Seite ist klein und
statisch. Gruende, irgendwann zu wechseln (zu Cloudflare Pages, Netlify oder Vercel, jeweils
kostenlos beginnend, Umzug ca. ein Tag, nur der Bau-Workflow und die Adresse aendern sich):
1. **Kommerzielle Nutzung:** GitHub verbietet Pages fuer Seiten, die hauptsaechlich Geschaefte abwickeln. Solange es ein Werkzeug fuer die Gemeinschaft ist, passt es; wird daraus ein bezahltes Angebot fuer Kunden, wechseln.
2. **Eigene Domain mit Sicherheits-Kopfzeilen** (CSP, HSTS, strenge Berechtigungen): Pages kann keine eigenen Kopfzeilen setzen.
3. **Mehrere Umgebungen** (Test und Echt, Vorschau je Aenderung): Pages hat nur eine Seite je Repo.
4. **Datenverkehr ueber ca. 100 GB im Monat**: bei dieser Seitengroesse erst bei Hunderttausenden Aufrufen.
Die Datenbank hat mit dem Hosting nichts zu tun: ein Wechsel des Hosters aendert nur die Adresse
(und die erlaubte Adresse in Supabase und in den Server-Funktionen).

**Stufen**
1. **Jetzt bis ca. 50 Leute und 2.000 Produkte je Lager:** Free-Plan, GitHub Pages. Pflicht
   davor: regelmaessige Sicherung (die Super-Claude-Wiederherstellung kopiert Schema und Funktionen;
   Daten per `supabase db dump` oder Pro-Backup).
2. **Echte Daten, die nicht verloren gehen duerfen, oder mehr als ein Verein:** Supabase Pro (25 US-Dollar im Monat).
3. **Ueber ca. 2.000 Produkte je Lager oder ueber ca. 200 Leute gleichzeitig:** Suche und Listen in die Datenbank (Seitenweise, Index), eventuell groessere Rechenstufe, Bilder staerker verkleinern oder ueber einen Bild-Dienst ausliefern.
4. **Mehrere Organisationen, Bezahlmodell, ueber 10.000 Nutzer:** Hosting wechseln (Punkt 1 oben), Mandanten-Trennung in der Datenbank pruefen, Lastprobe, Ueberwachung (Fehlerprotokoll, Alarm).
