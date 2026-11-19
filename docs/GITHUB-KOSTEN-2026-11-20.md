# GitHub-Kosten und Grenzen (Stand 20.11.2026)

Auswertung der Abrechnungsdaten von GitHub (Konto Harryclaude-hub, Plan Pro) fuer Oktober und November 2026.

## 1. Woher die Zahl kommt

GitHub Actions ist die "Rechenzeit in der Cloud": Jedes Mal, wenn in einem **privaten** Repo ein Ablaufplan (Workflow) laeuft, zaehlt
GitHub die Minuten. Der Pro-Plan enthaelt 3.000 Linux-Minuten im Monat; alles darueber kostet Geld. Die Minuten sind nicht gleich
teuer: Windows zaehlt doppelt, macOS zehnfach.

| System | Preis je Minute | Minuten im November | Kosten brutto |
|---|---|---|---|
| Linux | 0,008 USD | 2.682 | 16,09 USD |
| Windows | 0,016 USD | 2.287 | 22,87 USD |
| macOS | 0,08 USD | 495 | 30,69 USD |
| Kleinere Posten (ARM) | | 168 | 1,22 USD |
| **Summe Rechenzeit** | | | **70,87 USD** (davon 21 USD durch die enthaltenen Minuten gedeckt, **rund 50 USD zu zahlen**) |

**97 Prozent kommen nicht von deinen Apps, sondern von den Werkzeug-Kopien** (artcraft-*, programmier-werkzeug-*,
claude-sammlung-ecc, security-werkzeug-*, video-werkzeug-*): Das sind private Kopien fremder Open-Source-Projekte. Sie bringen
ihre eigenen Zeitplaene mit (naechtliche Windows-, macOS- und FreeBSD-Builds, "Close stale issues", Docker-Builds,
Abhaengigkeits-Updates). Die laufen in deinem Konto weiter, obwohl du diese Kopien nur zum Lesen brauchst.

| Repo | Kosten brutto im November | Minuten |
|---|---|---|
| claude-sammlung-ecc | 16,98 USD | 667 |
| artcraft-photocraft | 12,86 USD | 353 |
| artcraft-pdfcraft | 11,64 USD | 1.428 |
| programmier-werkzeug-openspec | 9,52 USD | 606 |
| artcraft-figcraft | 3,09 USD | 318 |
| artcraft-vectorcraft | 2,61 USD | 261 |
| artcraft-effectcraft | 1,81 USD | 196 |
| security-werkzeug-osv-scanner-google | 1,71 USD | 285 |
| **Magazino (alle Bauten im November)** | **0,11 USD** | **18** |
| Kistly | 0,01 USD | 1 |
| Alle eigenen Apps zusammen (Magazino, Atrium, Kombi, Scheinwerk, Store ...) | 2,35 USD | |

Die teuersten Tage waren der 9.11. (23 USD) und der 15.11. (13 USD): sehr wahrscheinlich, als die Kopien hochgeladen wurden und
ihre Ablaufplaene zum ersten Mal losliefen.

## 2. Was passiert am 30. November und was, wenn nicht gezahlt wird

- Die **Zaehler beginnen mit dem neuen Abrechnungszeitraum von vorn**: dann stehen wieder 3.000 enthaltene Linux-Minuten zur Verfuegung.
- Der **November-Betrag bleibt geschuldet**. Er verschwindet nicht durch den Neubeginn. GitHub bucht ihn am Ende des Zeitraums ab
  (oder verlangt Zahlung).
- Bei offener oder fehlgeschlagener Zahlung und bei einem erreichten Ausgabenlimit **startet GitHub keine Actions-Laeufe mehr**.
  Genau das siehst du: "startup_failure" bei jedem Bau, auch bei von Hand gestartetem. Ob das Konto ausserdem gesperrt wird,
  steht auf https://github.com/settings/billing. Repos, Code und bereits ausgelieferte Seiten bleiben; es werden keine Repos geloescht.
- Wichtig: Alle Repos teilen sich **dieselben Minuten**. Verbrauchen die Werkzeug-Kopien den Topf, bleibt fuer Magazino nichts,
  selbst wenn Magazino fast nichts braucht. **Ohne Aenderung wiederholt sich das im Dezember.**

## 3. Was ich in Magazino geaendert habe

- Der Bau lief bisher bei **jedem Push** ueber GitHub Actions. Das ist jetzt ausgeschaltet: `.github/workflows/pages.yml` startet nur
  noch von Hand (Notweg).
- Neu: `node scripts/veroeffentlichen.mjs` baut die Seite auf dem eigenen Rechner (aus dem letzten Commit, nie halbfertige Dateien)
  und legt das Ergebnis auf den Zweig `gh-pages`. Kosten fuer Rechenzeit: **0**. Der Zweig ist hochgeladen und Pages auf
  "Zweig gh-pages" umgestellt.
- **Haken:** GitHub Pages braucht fuer die Auslieferung (auch vom Zweig aus) selbst einen kleinen Actions-Lauf. Solange dein Konto fuer
  Actions gesperrt ist, geht die neue Seite also noch nicht online. Sie geht automatisch online, sobald die Abrechnung geklaert ist.

## 4. Was DU entscheiden musst (ich habe keine Repos ausgeschaltet)

1. **Abrechnung klaeren:** https://github.com/settings/billing (offener Betrag, Zahlungsart, "Budgets and alerts").
2. **Dezember absichern**, damit es sich nicht wiederholt. Moeglichkeiten, von mild bis stark:
   - Unter "Budgets and alerts" ein **hartes Ausgabenlimit** fuer Actions setzen (zum Beispiel 5 USD). Dann kostet nichts mehr, aber
     die Kopien koennen den Topf trotzdem leer machen und Magazino blockieren.
   - In den Werkzeug-Kopien **Actions ausschalten** (Settings, Actions, "Disable actions") oder die Kopien **archivieren**
     (archivierte Repos fuehren keine Zeitplaene aus). Das ist die einzige Aenderung, die die Kosten wirklich auf null bringt.
   - Die **Werkzeug-Kopien aus dem Konto nehmen** und bei Bedarf neu klonen (sie gibt es ja im Original).
3. **Magazino unabhaengig von GitHub-Rechenzeit ausliefern:** Cloudflare Pages (kostenlos, baut auf eigenen Servern oder nimmt den
   fertigen Ordner von diesem Rechner, keine Minuten bei GitHub, auch fuer private Repos). Dafuer brauchst du ein kostenloses
   Cloudflare-Konto und einen Zugriffsschluessel; dann stelle ich um (neue Adresse in Supabase und in den Server-Funktionen
   eintragen, App auf dem Handy neu hinzufuegen).

## 5. Wie viel traegt das heutige Hosting (Tabelle)

| Baustein | Grenze | Aktuell (Magazino) | Spielraum |
|---|---|---|---|
| GitHub Actions (private Repos, Pro) | 3.000 Linux-Minuten im Monat, Windows 2x, macOS 10x | Magazino: 18 Minuten im November | Magazino allein braucht rund 1 Minute je Bau: 3.000 Minuten waeren 3.000 Bauten |
| GitHub Pages: Groesse der Seite | 1 GB | ca. 4 MB | 250-mal |
| GitHub Pages: Datenverkehr | ca. 100 GB im Monat (weich) | Hauptteil 277 kB gzip | rund 250.000 Aufrufe im Monat |
| GitHub Pages: Builds | 10 je Stunde (weich, gilt nicht bei eigenem Workflow) | wenige am Tag | reichlich |
| GitHub Pages: Seiten je Konto | je Repo eine Seite | 1 je App | beliebig viele Repos |
| Supabase Free: Datenbank | 500 MB je Projekt, max. 2 aktive Projekte | wenige MB | siehe docs/ARCHITEKTUR.md Abschnitt 8 |
| Supabase Free: Server-Funktionen | 500.000 Aufrufe im Monat | rund 1.500 (erinnern alle 30 Minuten) | reichlich |
| Supabase Free: Datenverkehr | 5 GB im Monat | gering | Suche im Browser ab ca. 2.000 Produkten je Lager umbauen |
| Supabase Free: Sicherung | keine | | vor echten Daten Pro (25 USD im Monat) |

**Wenn weitere Programme und Funktionen dazukommen:**
- Jedes weitere Programm mit eigener Datenbank braucht ein eigenes Supabase-Projekt; der Free-Plan erlaubt **zwei aktive**
  (Magazino belegt eins). Ab dem dritten: Pro-Plan (25 USD, jedes weitere Projekt kostet zusaetzlich Rechenleistung) oder
  Tabellen mit Vorsilbe in einem gemeinsamen Projekt (nicht empfohlen, siehe Trennung der Datenbanken).
- Server-Funktionen sind billig; das Limit (500.000 Aufrufe) wird erst mit tausenden Nutzern erreicht.
- Die Hosting-Frage (GitHub Pages gegen Cloudflare Pages) entscheidet sich nicht an der Zahl der Programme, sondern an den
  Rechenminuten: je mehr Apps mit Bau bei jedem Commit, desto mehr Minuten. Ein Hoster, der selbst baut (Cloudflare) oder ein Bau auf
  dem eigenen Rechner, haelt GitHub aus der Rechnung.

## 6. Das Repo ist oeffentlich (seit 20.11.2026, auf Karams Wunsch)

- Bei oeffentlichen Repos laeuft GitHub Actions kostenlos und auch bei gesperrter Abrechnung. Erst dadurch ging die Seite am 20.11.
  online (der Pages-Bau lief durch, ein Aufruf bei privatem Repo scheiterte mit "startup_failure").
- **Wieder privat stellen schaltet die Seite ab:** GitHub meldet dann "Ihr Plan unterstuetzt GitHub Pages fuer dieses Repo nicht" und
  entfernt die Seite (Pages fuer private Repos setzt einen zahlenden Plan mit geklaerter Abrechnung voraus). Darum bleibt das Repo
  oeffentlich, bis die Abrechnung geklaert ist oder die Seite woanders liegt (Cloudflare Pages).
- Vorher geprueft: keine Schluessel im aktuellen Stand und in den Staenden des Verlaufs (Mustersuche), zwei private Adressen aus der
  Uebergabe entfernt. In aelteren Staenden des Verlaufs stehen sie noch.
- Veroeffentlichen bleibt: `node scripts/veroeffentlichen.mjs` (Zweig gh-pages), danach baut GitHub die Seite kostenlos aus.
