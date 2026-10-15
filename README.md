# Kistly

**Live: https://harryclaude-hub.github.io/kistly/**

Umzugsverwaltung fuer Kisten, Zimmer und Personen. Jede Kiste bekommt eine
Nummer, einen QR-Code und ein druckfertiges Etikett. Beim Einzug wird
gescannt, und jeder im Umzug sieht sofort, was schon da ist und was fehlt.
Dazu ein Gruppenchat mit Sprachnachrichten, Bildern, Reaktionen und Anrufen.

Installierbare Web-App (PWA): laeuft im Browser, legt sich mit Logo auf den
Startbildschirm, bleibt angemeldet und kann Benachrichtigungen schicken.

---

## Das Nummernsystem

```
W - 3 - 007
│   │    └── Laufnummer, fortlaufend je Kuerzel, wird automatisch vergeben
│   └─────── Groesse von 1 bis 10, wird ueberall rot dargestellt
└─────────── Kuerzel des Zimmers oder der Person
```

- Jedes **Zimmer** und jede **Person** bekommt Namen, Kuerzel (1 bis 4 Zeichen)
  und Farbe.
- Ein Kuerzel gibt es pro Umzug nur einmal, egal ob Zimmer oder Person.
- Eine Kiste gehoert zu **einem** Zimmer und/oder **einer** Person. Zwei Zimmer
  oder zwei Personen an derselben Kiste sind ausgeschlossen, das Datenmodell
  laesst es gar nicht erst zu.
- Gehoert eine Kiste zu beidem, waehlt man, welches Kuerzel vorne steht.
- Die Vergabe passiert in der Datenbank (`items_before_insert`), nicht im
  Browser. Dieselbe Nummer kann nicht zweimal entstehen, auch wenn zwei Leute
  gleichzeitig anlegen.
- Aendert sich Groesse oder Kuerzel, wird ein neuer Code vergeben und der alte
  in `item_code_history` aufbewahrt. Ein bereits geklebtes Etikett wird beim
  Scannen weiterhin gefunden, mit Hinweis, dass es veraltet ist.

`scripts/smoketest.mjs` prueft genau das gegen die echte Datenbank.

## Was drin ist

| Bereich | Funktionen |
|---|---|
| Umzuege | mehrere Projekte, Mitglieder mit Rollen (Besitzer, Bearbeiter, Nur lesen), Einladungscodes |
| Bereiche | Zimmer und Personen, Kuerzel, Farbe, Notiz, Zaehler je Bereich |
| Kisten | Code, Groesse 1 bis 10, Art, Titel, Ziel, zerbrechlich, Notiz, Status, Mehrfachanlage bis 50 auf einmal |
| Inhalt | Liste je Kiste, abhakbar, landet auf Wunsch aufs Etikett |
| Fotos | aus der Kamera, per Drag and Drop oder aus der Zwischenablage, werden vor dem Upload verkleinert |
| Status | rot (alte Wohnung), gelb (unterwegs), gruen (angekommen), mit Verlauf wer wann was gesetzt hat |
| Etiketten | A5, A4 und A3, 1 bis 12 pro Seite, drei Inhaltsstufen: nur Nummer, Nummer mit QR-Code, oder zusaetzlich die Inhaltstabelle |
| Scannen | eigener Bereich ueber alle Umzuege hinweg: scannen, Uebersicht sehen, direkt zur Kiste, ins Zimmer oder in den Umzug springen |
| Chat | Text, Antworten, Reaktionen, Sprachnachrichten, Bilder per Drag and Drop und Einfuegen, klickbare Verweise auf Kisten und Zimmer |
| Anrufe | Sprach- und Videoanruf ueber WebRTC, Klingelton, wiederholte Benachrichtigung solange es klingelt |
| App | installierbar, Offline-Huelle, Push, hell und dunkel, untere Leiste mit den fuenf wichtigsten Bereichen |
| Export | CSV aller Kisten |
| Sprache | Deutsch und Arabisch, mit vollstaendiger Rechts-nach-links-Ansicht |

## Sprachen

Deutsch und Arabisch. Umgeschaltet wird in der Kopfzeile der Startseite oder
in den Einstellungen, die Wahl bleibt gespeichert. Ohne gespeicherte Wahl
entscheidet die Sprache des Geraets.

Bei Arabisch bekommt das Dokument `dir="rtl"`, damit dreht der Browser die
gesamte Oberflaeche um, auf dem Handy wie am Laptop. Damit das aufgeht,
benutzt die Oberflaeche keine richtungsabhaengigen Klassen (kein `ml-`,
`pl-`, `left-`, `text-left`), sondern Flexbox mit Abstaenden und die
logischen Formen `ms-`, `me-`, `ps-`, `pe-`, `text-start`. Pfeile, die eine
Richtung meinen, tragen die Klasse `spiegeln`.

**Seriennummern bleiben in jeder Sprache gleich** und immer von links nach
rechts. Die Klasse `t-serial` setzt dafuer `direction: ltr` und
`unicode-bidi: isolate`. Ohne das Isolieren wuerde `W-3-007` im arabischen
Satz auseinanderfallen, weil der Bindestrich ein richtungsneutrales Zeichen
ist und die Bloecke umsortiert wuerden.

Uebersetzt wird nur, was zum Programm gehoert: Knoepfe, Beschriftungen,
Hinweise, Fehlermeldungen. Was der Nutzer eingetippt hat, bleibt unveraendert
stehen: Zimmernamen, Kistentitel, Notizen, Nachrichten.

Das Woerterbuch liegt in [`src/lib/i18n`](src/lib/i18n). Jeder Eintrag
traegt beide Sprachen nebeneinander, damit man beim Aendern keine vergisst:

```ts
'kisten.neu': { de: 'Neue Kiste', ar: 'صندوق جديد' },
```

Die Teile liegen nach Seiten getrennt in `bausteine/`. Fehlt ein Schluessel
oder eine Sprache, nimmt die App den deutschen Text und meldet es einmal in
der Konsole. Es erscheint nie ein nackter Schluessel und nie eine Luecke.

In Komponenten `useT()`, ausserhalb von React (etwa in `api.ts`) `tg()`.

## Technik

- React 19, TypeScript, Vite, Tailwind CSS 4
- Supabase: Postgres, Auth, Storage, Realtime, Edge Functions
- WebRTC fuer Anrufe, Signalisierung ueber Supabase Realtime
- Web Push nach RFC 8291 und 8292, in der Edge Function selbst umgesetzt
- Service Worker von Hand geschrieben, kein Build-Schritt dahinter

Alle Datenbankzugriffe liegen in [`src/lib/api.ts`](src/lib/api.ts). Die Seiten
rufen nur diese Funktionen auf, damit dieselbe Abfrage nicht in zwei Fassungen
auseinanderlaeuft.

---

## Einrichtung

### 1. Repo holen und Pakete installieren

```bash
git clone https://github.com/Harryclaude-hub/kistly.git
cd kistly
npm install
```

### 2. Supabase-Projekt anlegen

Neues Projekt bei [supabase.com](https://supabase.com), Region Europa. Dann die
Migrationen der Reihe nach im SQL-Editor ausfuehren:

```
supabase/migrations/0001_core.sql
supabase/migrations/0002_functions.sql
supabase/migrations/0003_chat_calls_push.sql
supabase/migrations/0004_rls.sql
supabase/migrations/0005_storage.sql
supabase/migrations/0006_hardening.sql
supabase/migrations/0007_config_access.sql
supabase/migrations/0008_fix_project_delete.sql
supabase/migrations/0009_keine_email_bestaetigung.sql
```

Mit der Supabase CLI geht es in einem Rutsch:

```bash
supabase link --project-ref <ref>
supabase db push
```

### 3. E-Mail-Bestaetigung abschalten

**Das ist der einzige Schritt, der von Hand im Dashboard passieren muss.**

**Authentication → Sign In / Providers → Email → "Confirm email" ausschalten.**

Dieser Schalter liegt in der Projektverwaltung, nicht in der Datenbank. Er
laesst sich weder per SQL noch per Migration umlegen.

Bleibt er an, versucht Supabase bei jeder Registrierung eine Mail zu
verschicken. Der eingebaute Mailversand ist auf wenige Mails pro Stunde
begrenzt, und dann kommt:

```
email rate limit exceeded
```

Die Absage kommt mit Status 429, bevor ueberhaupt eine Zeile in
`auth.users` entsteht. Kein Trigger und kein Kniff in der Datenbank hilft
dagegen, nur der Schalter.

`0009_keine_email_bestaetigung.sql` setzt die Vorgabe zusaetzlich auf
Datenbankebene um: jedes neue Konto wird per Trigger sofort selbst
bestaetigt. Damit haengt nie ein Konto im Zustand "angelegt, aber nicht
bestaetigt", auch wenn der Schalter spaeter wieder angeht oder das Projekt
neu aufgesetzt wird. Bewusste Folge: eine Adresse wird nicht geprueft.

### 4. Umgebung setzen

```bash
cp .env.example .env.local
```

`VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` stehen unter
**Project Settings → API**.

### 5. Push einrichten

```bash
node scripts/vapid.mjs
```

Der oeffentliche Schluessel kommt als `VITE_VAPID_PUBLIC_KEY` in die
`.env.local`. Beide Schluessel braucht die Edge Function. Es gibt zwei Wege,
die Funktion versucht sie in dieser Reihenfolge:

1. Als Function Secrets:

```bash
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:deine@adresse.de
```

2. Oder in der Tabelle `private.config`, falls die CLI nicht zur Hand ist:

```sql
insert into private.config (key, value) values
  ('VAPID_PUBLIC_KEY',  '...'),
  ('VAPID_PRIVATE_KEY', '...'),
  ('VAPID_SUBJECT',     'mailto:deine@adresse.de')
on conflict (key) do update set value = excluded.value;
```

Das Schema `private` haengt nicht an der REST-Schnittstelle. Nur der
Dienstschluessel der Edge Function kommt ueber `public.app_config()` dort hin,
angemeldete Nutzer und Fremde nicht.

Dann ausrollen:

```bash
supabase functions deploy push-send
```

Ohne Schluessel laeuft die App normal weiter und meldet in den Einstellungen,
dass kein Schluessel hinterlegt ist.

### 6. Bilderkennung einschalten (freiwillig)

Kistly kann Fotos lesen und vorschlagen, was in einer Kiste liegt oder aus
welchen Teilen ein Moebelstueck besteht. Dafuer braucht es einen Schluessel
fuer den Erkennungsdienst. **Ohne Schluessel laeuft alles andere normal
weiter**, und der Knopf sagt genau, was fehlt.

Schluessel setzen, entweder als Function Secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

oder als Zeile in `private.config`, wenn kein CLI zur Hand ist:

```sql
insert into private.config (key, value)
values ('ANTHROPIC_API_KEY', 'sk-ant-...')
on conflict (key) do update set value = excluded.value;
```

Dann ausrollen:

```bash
supabase functions deploy bild-analyse
```

Freiwillig dazu: `ANTHROPIC_MODELL` setzt ein anderes Modell, ohne dass die
Funktion neu ausgerollt werden muss. `APP_ORIGINS` (mit Komma getrennt)
schraenkt ein, von welchen Adressen aus die Funktion aufgerufen werden darf.

**Was das kostet und wer zahlt.** Jedes neue Bild kostet einen Bruchteil
eines Cent, und zwar den Besitzer des Schluessels, nicht den, der tippt. Ein
Bild, das schon gelesen wurde, kostet nichts mehr. Zwei Bremsen sind fest
eingebaut und stehen in `supabase/migrations/0015_bilderkennung_bremse.sql`:
200 bezahlte Bilder je Umzug und Tag, 60 je Person und Stunde. Jeder Aufruf
steht in `bild_lesen_log`, mit Modell, damit man nachrechnen kann.

**Was mit dem Bild passiert.** Es verlaesst zum Lesen das eigene
Supabase-Projekt und geht an den Erkennungsdienst. Das sagt die Oberflaeche
an der Stelle auch. Wer das nicht will, laesst den Schluessel weg.

### 7. Starten und pruefen

```bash
npm run dev
node scripts/smoketest.mjs
```

Der Smoketest legt einen Umzug an, prueft die komplette Codevergabe, die
Code-Historie, Rechte und Abschottung, und raeumt danach wieder auf. Er
braucht einmalig einen Testzugang. `<DEIN-TESTPASSWORT>` durch ein eigenes,
nirgends sonst benutztes Passwort ersetzen; es gehoert in keine Datei im
Repo:

```sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'smoketest@kistly.app',
  crypt('<DEIN-TESTPASSWORT>', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '', '', '', ''
);
```

Die leeren Zeichenketten am Ende sind kein Zierrat: GoTrue liest diese Spalten
in nicht-nullbare Felder und meldet sonst beim Anmelden
"Database error querying schema".

Das Passwort bekommt der Smoketest nur aus der Umgebung, ohne
`SMOKE_PASSWORD` bricht er sofort mit einem Hinweis ab. So gesetzt steht es
weder in der Befehlszeile noch im Verlauf:

```powershell
$env:SMOKE_PASSWORD = Read-Host 'Passwort des Testzugangs'
node scripts/smoketest.mjs
```

`SMOKE_EMAIL` setzt bei Bedarf eine andere Adresse fuer den Testzugang.

### 7. Symbole neu erzeugen (nur wenn das Logo geaendert wird)

```bash
node scripts/make-icons.mjs
```

---

## Veroeffentlichen

Bei jedem Push auf `main` baut
[.github/workflows/pages.yml](.github/workflows/pages.yml) die App und legt
sie auf GitHub Pages: **https://harryclaude-hub.github.io/kistly/**

Die Adressen stehen als Repository-Variablen unter
**Settings → Secrets and variables → Actions → Variables**:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
Fehlt eine davon, bricht der Bau mit einer Meldung ab, statt eine tote Seite
zu veroeffentlichen.

Weil Pages unter einem Unterordner ausliefert, setzt der Bau `VITE_BASE`.
Alles, was eine vollstaendige Adresse braucht (QR-Codes, Einladungslink,
Passwort-Link, Service Worker), laeuft ueber `appUrl` in
[src/lib/util.ts](src/lib/util.ts) und ueber den Geltungsbereich des Service
Workers. Lokal und bei Vercel bleibt es die Wurzel.

Fuer Vercel liegt `vercel.json` bei, fuer Netlify `netlify.toml`. Dort
entfaellt der Unterordner, `VITE_BASE` bleibt einfach ungesetzt.

```bash
npm run build     # erzeugt dist/
```

Nach dem Deployen die URL in Supabase unter
**Authentication → URL Configuration** als Site URL eintragen, sonst zeigt
der Link zum Zuruecksetzen des Passworts auf localhost.

### Passwort zuruecksetzen

Die Seite "Passwort vergessen" schickt den Link mit der Zieladresse
`<Adresse der App>/passwort-neu`. Damit Supabase dorthin zurueckleitet:

1. **Authentication → URL Configuration → Redirect URLs**: die Adresse
   `https://harryclaude-hub.github.io/kistly/passwort-neu` eintragen (lokal
   zusaetzlich `http://localhost:5173/passwort-neu`).
2. Empfohlen: **Authentication → Emails → Reset Password** im Text der Mail
   den Link `{{ .ConfirmationURL }}` ersetzen durch
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`.
   Dann loest erst der Knopf "Weiter zum neuen Passwort" den Link ein. Ein
   Mail-Scanner, der Links vorab oeffnet, verbraucht ihn so nicht, und der
   Link klappt auch auf einem anderen Geraet als dem, auf dem er angefordert
   wurde. Ohne diese Aenderung kommt der Link als `?code=` an und geht nur im
   selben Browser, die Seite sagt das dann auch.
3. Empfohlen, die Wand auf dem Server: **Authentication → Sign In /
   Providers → Email → Secure password change** einschalten und speichern
   (direkt: https://supabase.com/dashboard/project/_/auth/providers, dort
   das Projekt waehlen und "Email" aufklappen). Dann lehnt Supabase selbst
   jedes Aendern des Passworts ab, wenn die Anmeldung schon laenger
   zurueckliegt (bei Supabase derzeit 24 Stunden), auch wenn jemand die App
   umgeht. Die Einstellungen zeigen dann "neu anmelden"; nach Ab- und
   wieder Anmelden klappt es. Der Link aus der Mail meldet frisch an und
   sollte deshalb weiter gehen. **Danach den Weg ueber die Mail einmal echt
   testen:** auf "Passwort vergessen" einen Link anfordern, ihn oeffnen,
   ein neues Passwort setzen und mit ihm anmelden. Klappt das nicht, den
   Schalter wieder ausschalten und Bescheid geben.
4. **Passwortregel, gleich wie in der App:** Authentication → Sign In /
   Providers → Email: **Minimum password length** `10`, **Password
   Requirements** "Letters and digits", speichern. Die App verlangt beim
   Registrieren, Zuruecksetzen und Aendern dasselbe (mindestens 10 Zeichen,
   ein Buchstabe a bis z und eine Ziffer, `src/lib/passwort.ts`). Alte,
   kuerzere Passwoerter gehen beim Anmelden weiter.

Das Formular fuer das neue Passwort erscheint nur, wenn dieser Tab den Link
in diesem Seitenaufruf selbst eingeloest hat; meldet ein anderer Tab das
Einloesen, zaehlt das hier nicht. Nur angemeldet sein reicht nicht. Im
Formular steht, fuer welches Konto das neue Passwort gilt; war vorher ein
anderes Konto angemeldet, sagt ein Hinweis das (nur beim Link mit
token_hash nach dem Klick auf "Weiter", beim alten Link mit ?code= nicht).
Bis das neue Passwort
steht, fuehrt jede andere Seite dorthin zurueck. Danach werden alle anderen
Geraete abgemeldet; klappt das nicht, sagt die Seite das, statt es zu
behaupten. Wer angemeldet ist, aendert das Passwort in den Einstellungen,
dort nur mit dem aktuellen Passwort.

---

## Sicherheit

- Jede Tabelle hat Row Level Security. Ohne Mitgliedschaft im Umzug gibt es
  keine Zeile zu sehen, auch nicht ueber die API. Der Smoketest prueft das.
- Die Pruefung steht an genau einer Stelle: `is_member`, `is_editor` und
  `is_owner`.
- Jede Funktion hat einen festen `search_path`. Ausfuehrrechte sind entzogen
  und nur dort wieder vergeben, wo sie gebraucht werden (siehe
  `0006_hardening.sql`). `anon` darf gar nichts.
- `next_seq` prueft die Mitgliedschaft. Ohne diese Pruefung haette ein
  angemeldeter Nutzer die Nummerierung fremder Umzuege verschieben koennen.
- Die Speicher-Buckets sind privat. Bilder und Sprachnachrichten kommen nur
  ueber zeitlich begrenzte, signierte Links. Der erste Ordner im Pfad ist die
  Projekt-ID, daran haengt die Berechtigung.
- Die Rolle eines Mitglieds kann nur der Besitzer aendern, abgesichert durch
  einen Trigger, nicht nur durch die Oberflaeche.
- Ein Projekt kann nicht ohne Besitzer zurueckbleiben.
- Der private VAPID-Schluessel liegt nur serverseitig, nie im Frontend.

## Bekannte Grenzen

Ehrlich aufgeschrieben, damit niemand davon ueberrascht wird:

- **Anrufe ohne TURN-Server.** Die Verbindung wird direkt zwischen den Geraeten
  aufgebaut. In manchen Mobilfunknetzen klappt das nicht. Die App meldet dann
  "Die direkte Verbindung kam nicht zustande", statt still zu haengen. Abhilfe:
  einen TURN-Server in `ICE_SERVERS` in
  [`src/lib/webrtc.ts`](src/lib/webrtc.ts) eintragen.
- **Anrufe sind fuer kleine Runden gedacht.** Jeder verbindet sich mit jedem.
  Bis etwa vier Personen unproblematisch, darueber wird es auf dem Handy eng.
- **Push auf dem iPhone** funktioniert erst, wenn die App ueber Teilen,
  "Zum Home-Bildschirm" installiert wurde. Vorgabe von Apple.
- **Der Push-Versand selbst ist noch nicht auf einem echten Geraet erprobt.**
  Berechtigung, Mitgliedschaftspruefung und Schluesselzugriff der Edge Function
  sind geprueft (401 ohne Token, 403 bei fremdem Projekt, 200 mit Token). Die
  Verschluesselung nach RFC 8291 laesst sich nur mit einem echten Abo im
  Browser abschliessend pruefen. Fehlschlaege landen sichtbar in `push_log`.
- **Der Chat ist auf dem Transportweg verschluesselt (TLS) und durch RLS
  geschuetzt, aber nicht Ende zu Ende verschluesselt.** Wer Zugriff auf die
  Datenbank hat, koennte mitlesen. Fuer ein privates Umzugsprojekt in Ordnung,
  soll aber nicht falsch klingen.
- **Der Passwort-Link zum Zuruecksetzen** laeuft ueber den eingebauten
  Mailversand von Supabase. Der ist stark begrenzt (wenige Mails pro Stunde).
  Fuer mehr braucht es einen eigenen SMTP-Zugang im Supabase-Projekt.
- **Der Merker "Link eingeloest" lebt nur im Speicher der Seite.** Laedt man
  die Seite neu, bevor das neue Passwort gesetzt ist, ist er weg, die
  Sitzung aus dem Link aber noch da: man ist dann normal angemeldet. Die App
  merkt sich den Zustand absichtlich nicht im Browser-Speicher.

## Ordner

```
src/
  components/   Bausteine der Oberflaeche, Scanner, Anrufe, Sprachbubble
  lib/          Datenzugriff (api.ts), Auth, Medien, Push, WebRTC, Hilfen
  pages/        eine Datei je Seite, AppLayout haelt die untere Leiste
supabase/
  migrations/   Schema, Funktionen, RLS, Storage, Haertung
  functions/    Edge Function push-send
scripts/        Symbole, VAPID-Schluessel, Smoketest
public/         Manifest, Service Worker, Symbole
```
