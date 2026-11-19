# Mitmachen und Rückmeldungen

Danke fürs Anschauen. Wir freuen uns über Rückmeldung zu Aufbau, Sicherheit, Fehlern und Lesbarkeit. Bitte zuerst das
[README](README.md) und [docs/ENTSCHEIDUNGEN.md](docs/ENTSCHEIDUNGEN.md) lesen, dann [docs/BEKANNTE-SCHULDEN.md](docs/BEKANNTE-SCHULDEN.md)
(was wir schon wissen).

## Wie Rückmeldung geht

- **Fehler oder Idee:** ein Issue mit der passenden Vorlage anlegen.
- **Lücke in der Sicherheit:** **kein** öffentliches Issue, siehe [SECURITY.md](SECURITY.md).
- **Code-Änderung:** ein Branch, ein Pull Request mit der Vorlage. Bitte klein und mit einem Thema.
- **Review einer Stelle:** am schnellsten über einen Kommentar im Pull Request oder an einer Zeile im Code (GitHub, "Add a comment").
- Wo ihr unsicher seid, lieber eine Frage als eine Vermutung.

## Regeln, die im Code gelten

1. **Datenbankzugriff nur in `src/lib/api.ts`** (und `src/lib/bildki.ts`). Keine Abfragen in Seiten.
2. **Regeln gehören in die Datenbank**, nicht nur in die Oberfläche. Wer eine Berechtigung ändert, ändert sie in einer Migration.
3. **Migrationen nie ändern, wenn sie eingespielt sind.** Ein Fehler bekommt die nächste Nummer. Zu jeder Migration mit Regeln gehört
   ein Probelauf unter `supabase/probelauf/`, der mit einer Fehlermeldung endet (rollt alles zurück) und je Regel eine Berichtszeile liefert.
4. **Texte nur im Wörterbuch** (`src/lib/i18n/bausteine/`), Form `'schluessel': { de: 'Text' }`. `node scripts/woerter-pruefen.mjs` meldet Fehlendes.
5. **Design nur über die Design-Schicht** (`src/index.css`, `src/design/`): Farben und Größen als CSS-Variablen, keine festen Farben in Komponenten.
   Bei Design-Aufgaben keine Logik ändern.
6. **Laden, Fehler und leer sind drei Zustände.** Fehler nie still schlucken. Dialoge setzen ihren Zustand beim Öffnen zurück.
7. **Keine Schlüssel, Passwörter oder `service_role`-Werte in Dateien, Commits oder Issues.** Der Anon-Schlüssel ist öffentlich gedacht.
8. Kein langer Gedankenstrich (U+2014) im Code, in Kommentaren und Texten (Hausregel).
9. Namen, Kommentare, Commit-Nachrichten und Oberfläche auf **Deutsch**.

## Vor jedem Pull Request

```bash
npm run pruefen
```

Das führt Typprüfung, Linter, Build, Wörter-Prüfung und alle Prüfskripte aus. Es muss ohne Fehler durchlaufen (Warnungen von `oxlint`
zu `set-state-in-effect` sind bekannt). Bei Datenbank-Änderungen den Probelauf mit dem Bericht in die Beschreibung legen
(Probelauf gegen ein eigenes Test-Projekt, nie gegen die echten Daten, siehe README "Eigene Datenbank aufsetzen").

## Commits

Kurze Beschreibung auf Deutsch, was und warum. Beispiel: `Bestand: Mengen auf zwei Stellen runden (Prüfbefund M7)`.

## Wer entscheidet

Karam (Besitzer) entscheidet über Aufnahme, Veröffentlichung und alles, was Daten oder Zugänge betrifft. Änderungen an Rechten,
Konten, Passwörtern und Datenbankregeln werden besonders genau gelesen.
