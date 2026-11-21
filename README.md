# Magazino

Lagerverwaltung für eine kleine Gemeinschaft: mehrere Lager in Bundeslandprojekten, Bestand mit Mengen,
Mitnehmen mit Rückgabetermin, Ein- und Austragen per Tür-QR, Kisten mit QR-Etiketten, Grundriss und 3D-Ansicht,
Erinnerungen per Push. Konten legt nur ein Admin an.

- **Live:** https://harryclaude-hub.github.io/magazino/
- **Ursprung:** entstanden aus *Kistly*, einem Umzugsprogramm (Kisten, Zimmer, Grundriss). Kistly lebt als eigenes
  Repo weiter (`Harryclaude-hub/kistly`). Wie Magazino daraus wurde: [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md).
- **Status:** läuft produktiv für wenige Nutzer. Sprache der Oberfläche und des Codes (Namen, Kommentare, Commits): Deutsch.

## Für Reviewer: wo anfangen (30 Minuten)

| Frage | Datei |
|---|---|
| Wie ist es gebaut, und warum? | [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) |
| Jede wichtige Entscheidung mit Herkunft | [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md) |
| Wo ist es schwach, was ist offen? | [docs/BEKANNTE-SCHULDEN.md](docs/BEKANNTE-SCHULDEN.md) |
| Sicherheit: Prüfung und Stand | [docs/SICHERHEITSPRUEFUNG-2026-11-20.md](docs/SICHERHEITSPRUEFUNG-2026-11-20.md) |
| Warum GitHub-Kosten, Hosting, Grenzen | [docs/GITHUB-KOSTEN-2026-11-20.md](docs/GITHUB-KOSTEN-2026-11-20.md) |
| Regeln für Änderungen | [CONTRIBUTING.md](CONTRIBUTING.md) |

Die schärfste Stelle zum Prüfen sind die Datenbankregeln: `supabase/migrations/0050` bis `0063` (Lager, Rechte,
Startpasswort-Zwang, Geräte). Die Datenbank ist die Sicherheitsgrenze, die Oberfläche ist nur Bedienung.

## Technik

| Teil | Wahl |
|---|---|
| Oberfläche | React 19, TypeScript 6, Vite 8, Tailwind 4, React Router 7 (nur Hooks und Context) |
| 3D | three.js, als eigener Code-Teil, lädt erst beim Öffnen des Grundrisses |
| Backend | Supabase: Postgres mit Zeilenregeln (RLS), Auth, Speicher, Edge Functions (Deno), pg_cron |
| Hosting | GitHub Pages (Zweig `gh-pages`), Push-Nachrichten per Web Push (VAPID) |
| Prüfung | Typprüfung, oxlint, Build und Prüfskripte unter `scripts/` (kein Test-Framework, siehe Entscheidungen) |

## Ordner

```
src/
  pages/        eine Datei je Seite (Start, Lager, Bestand, Unterwegs, Admin, Grundriss ...)
  components/   geteilte Bausteine (ui.tsx = Knöpfe, Felder, Dialoge), plan/ und plan3d/ für Plan und 3D, etikett/
  zeichner/     der Grundriss-Zeichner (nur für Admins sichtbar, Regale)
  lib/          api.ts (der EINZIGE Ort mit Datenbankzugriff), auth, fuzzy (Suche), kalender, etikett, i18n/
  design/       die Design-Schicht (Apple-Stil, Farben nur über Variablen)
supabase/
  migrations/   0001 bis 0064, nummeriert, eingespielte werden nie geändert
  functions/    konto-anlegen, passwort-setzen, erinnern, kalender, push-send, bild-analyse
  probelauf/    zu jeder neueren Migration ein Probelauf, der alles zurückrollt und eine Berichtszeile je Regel liefert
  demo/         Beispieldaten (zwei Demo-Lager)
scripts/        Prüfskripte (*-pruefen.mjs), veroeffentlichen.mjs, vapid.mjs
docs/           Architektur, Entscheidungen, Schulden, Sicherheit, Kosten
```

## Lokal starten

Voraussetzungen: Node 22, ein eigenes (kostenloses) Supabase-Projekt, die Supabase-CLI (`npx supabase`).

```bash
npm ci
cp .env.example .env.local        # Werte eintragen (siehe unten)
npm run dev                        # http://localhost:5173
```

**Eigene Datenbank aufsetzen** (nie gegen die echte arbeiten):

1. Supabase-Projekt anlegen, in `.env.local` die Werte `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` eintragen
   (Project Settings, API; der Anon-Schlüssel ist öffentlich gedacht, der `service_role`-Schlüssel gehört nie in eine Datei).
2. Migrationen der Reihe nach einspielen: `npx supabase link --project-ref <deine-ref>` und `npx supabase db push`
   (oder die Dateien `supabase/migrations/*.sql` nacheinander im SQL-Editor ausführen).
3. Dein Konto als Admin eintragen: im SQL-Editor ein Konto unter Authentication anlegen und dann
   `insert into public.app_admins (user_id) select id from auth.users where email = 'du@beispiel.de';`
   sowie `update public.konto_freigaben set status = 'frei' where user_id = (select id from auth.users where email = 'du@beispiel.de');`
4. Edge Functions deployen: `npx supabase functions deploy konto-anlegen passwort-setzen push-send bild-analyse`
   und `erinnern` mit `--no-verify-jwt` (sie schützt sich selbst durch ein Zufallszeichen aus `private.config`) sowie `kalender` mit `--no-verify-jwt` (der geheime Link ist das Geheimnis).
5. Optional Beispieldaten: `supabase/demo/demo_lager.sql`.
6. In Supabase unter Authentication die freie Anmeldung ausschalten (Konten legt der Admin im Portal an).

Push-Nachrichten brauchen ein VAPID-Schlüsselpaar (`node scripts/vapid.mjs`); ohne sie läuft alles außer Push.

## Prüfen vor jeder Änderung

```bash
npm run pruefen        # Typen, Linter, Build, Wörter und alle Prüfskripte, mit Zusammenfassung
```

Einzeln: `npx tsc -b`, `npx oxlint`, `npm run build`, `node scripts/woerter-pruefen.mjs`, `node scripts/zeichner-pruefen.mjs` usw.
Bekannt: `oxlint` meldet einige Warnungen (`set-state-in-effect`), keine Fehler.

## Veröffentlichen

`npm run veroeffentlichen` baut den letzten Commit lokal und legt ihn auf den Zweig `gh-pages`
(kostenlos, siehe [docs/GITHUB-KOSTEN-2026-11-20.md](docs/GITHUB-KOSTEN-2026-11-20.md)). Der Ablauf `.github/workflows/pages.yml`
ist gehärtet und von Hand startbar; bei geklärter Abrechnung kann er wieder bei jedem Push laufen.

## Sicherheit

Meldungen zu Sicherheitslücken bitte **nicht** als öffentliches Issue, sondern über „Report a vulnerability“
(Reiter Security) oder siehe [SECURITY.md](SECURITY.md).

## Lizenz

Noch nicht festgelegt: ohne ausdrückliche Lizenz gelten alle Rechte beim Besitzer. Das Repo ist zur Einsicht und für
Rückmeldungen öffentlich; eine Weiterverwendung braucht die Zustimmung des Besitzers.
