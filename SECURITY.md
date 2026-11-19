# Sicherheit melden

Danke, dass ihr genau hinschaut. Bitte meldet Sicherheitslücken **nicht** als öffentliches Issue.

## So meldet ihr

1. Auf GitHub im Reiter **Security** auf **Report a vulnerability** klicken (privater Bericht, nur der Besitzer sieht ihn).
2. Beschreibt, was ihr gefunden habt, wie man es nachstellt und was passieren kann. Ein Beispiel genügt.
3. Antwort in der Regel innerhalb weniger Tage. Bis zur Behebung bitte nichts veröffentlichen.

## Was wichtig ist

- Die Datenbank ist die Sicherheitsgrenze (Zeilenregeln, geprüfte Funktionen, Trigger): `supabase/migrations/0050` bis `0063`.
  Funde dort sind am wertvollsten (Rechte umgehen, fremde Daten lesen, Menge ohne Buchung ändern, Startpasswort-Sperre umgehen).
- Der Anon-Schlüssel im Browser ist öffentlich gedacht und kein Fund. Ein `service_role`-Schlüssel oder ein Passwort im Code oder im
  Git-Verlauf wäre einer: bitte sofort melden.
- Bisherige Prüfung und bekannte offene Punkte: [docs/SICHERHEITSPRUEFUNG-2026-11-20.md](docs/SICHERHEITSPRUEFUNG-2026-11-20.md) und
  [docs/BEKANNTE-SCHULDEN.md](docs/BEKANNTE-SCHULDEN.md).

## Bitte nicht

- Keine Angriffe auf die laufende Seite oder die echte Datenbank (kein Durchprobieren von Passwörtern, keine Massenabfragen,
  kein Denial of Service). Zum Testen eine eigene Datenbank aufsetzen (siehe README).
- Keine echten Konten anderer Personen verwenden.
