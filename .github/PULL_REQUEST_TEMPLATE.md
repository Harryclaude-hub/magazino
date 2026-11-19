## Was ändert sich und warum

<!-- Ein Thema pro Pull Request. Kurz und konkret. -->

## Art der Änderung

- [ ] Fehler behoben
- [ ] Neue Funktion
- [ ] Datenbank (Migration, Rechte, Funktion)
- [ ] Nur Doku oder Aufräumen

## Prüfung

- [ ] `npm run pruefen` läuft ohne Fehler
- [ ] Bei Datenbank-Änderungen: neue Migrationsnummer (keine eingespielte geändert), Probelauf in `supabase/probelauf/` mit Bericht unten, nur gegen ein Test-Projekt gelaufen
- [ ] Texte nur im Wörterbuch, Datenbankzugriff nur in `src/lib/api.ts`
- [ ] Keine Schlüssel, Passwörter oder `service_role`-Werte im Diff
- [ ] Kein langer Gedankenstrich (U+2014)

## Probelauf-Bericht oder Screenshot

<!-- Bei Datenbank- oder Oberflächen-Änderungen einfügen. -->

## Worauf soll der Reviewer besonders achten

