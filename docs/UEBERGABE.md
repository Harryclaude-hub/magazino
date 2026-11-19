# Magazino: Übergabe (Stand 20.11.2026)

Zuerst lesen: diese Datei, dann `CLAUDE.md` (Regeln). Frühere Übergaben aus der Kistly-Zeit liegen in `docs/keller/`.

## Wo alles ist

| Was | Wo |
|---|---|
| Live | https://harryclaude-hub.github.io/magazino/ |
| Repo | https://github.com/Harryclaude-hub/magazino, Zweig `main` (öffentlich, muss es bleiben, siehe `docs/GITHUB-KOSTEN-2026-11-20.md`) |
| Lokal | `C:\Users\Home\kistly` (Ordnername bewusst unverändert) |
| Datenbank | Supabase `vqpirkgvclfsduklnnzv`, nur dieses Projekt |
| Veröffentlichen | nach jedem Push `node scripts/veroeffentlichen.mjs` (baut lokal, legt auf `gh-pages`) |

## Stand

- Lagerprogramm läuft: Lager in Bundeslandprojekten, Bestand, Mitnehmen und Unterwegs, Tür-QR, Erinnerungen, Etiketten, Grundriss und 3D (nur Admin zeichnet).
- Konten nur durch den Admin (Benutzername oder E-Mail, Startpasswort-Zwang), Pausieren, Geräteliste im Profil.
- Migrationen 0001 bis 0063 eingespielt; nächste Nummer: 0064.
- Sicherheitsprüfung durch unabhängigen Prüfer erledigt, Funde in 0062 behoben.
- Für Reviewer vorbereitet: README, `ENTSCHEIDUNGEN.md`, `BEKANNTE-SCHULDEN.md`, `CONTRIBUTING.md`, `SECURITY.md`, Vorlagen.

## Offen (nur der Besitzer kann)

1. GitHub-Abrechnung klären: https://github.com/settings/billing (bis dahin laufen eigene Abläufe nicht).
2. Supabase, Authentication, Passwortregeln: Mindestlänge 10 (Dashboard).
3. Zweite Anmeldestufe bei GitHub, Supabase und E-Mail einschalten.
4. Echter Durchlauf mit Admin plus einem Test-Konto, vor allem die Startpasswort-Sperre nach dem zweiten Anmelden.
5. Lizenz festlegen, bevor andere den Code weiterverwenden.
6. Vor echten Daten: Datensicherung (Supabase Pro oder regelmäßiger Dump).

## Nächste Schritte für Entwickler

Siehe `docs/BEKANNTE-SCHULDEN.md` (Hoch, Mittel, Niedrig). Zuerst: Suche in die Datenbank, `api.ts` aufteilen, MFA für Admins.

## Regeln in Kurzform

Datenbankzugriff nur in `src/lib/api.ts`; eingespielte Migrationen nie ändern; Probelauf vor jedem Einspielen; Datenbank nur auf Karams Wort; keine Schlüssel im Repo; Texte nur Deutsch und nur im Wörterbuch; kein langer Gedankenstrich.
