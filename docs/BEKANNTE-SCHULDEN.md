# Bekannte Schulden und offene Punkte

Ehrliche Liste für Reviewer: Wo ist es schwach, was ist ungetestet, was würden wir als Nächstes tun. Stand 20.11.2026.
Zuerst die Punkte, bei denen Rückmeldung am meisten hilft.

## Hoch

| Punkt | Stand | Vorschlag |
|---|---|---|
| Startpasswort-Sperre nach dem **zweiten** Anmelden (Supabase könnte den Hash neu schreiben) | nicht getestet | Konto mit Startpasswort anlegen, zweimal anmelden, `rpc meine_freigabe` muss `passwort` bleiben |
| Kein Durchlauf mit echten Konten im Browser durch die Entwicklung (kein Zugang zu Passwörtern) | offen | Admin plus Test-Kollege, Checkliste in `docs/SICHERHEITSPRUEFUNG-2026-11-20.md` |
| Admin ist ein einzelnes Konto ohne zweite Anmeldestufe | offen | TOTP-Anmeldung für Admins (Supabase unterstützt MFA) |
| Keine Datensicherung bei Supabase Free | offen | Pro-Plan oder regelmäßiger `supabase db dump` vor echten Daten |
| GitHub-Abrechnung gesperrt: eigene Abläufe starten nicht, kein automatischer Bau | extern | Zahlung klären; bis dahin Veröffentlichen lokal |

## Mittel

| Punkt | Stand | Vorschlag |
|---|---|---|
| Suche lädt den ganzen Bestand eines Lagers (alle Lager des Nutzers) und filtert im Browser | geht bis ca. 2.000 Produkte je Lager | Suche in die Datenbank (`pg_trgm`, seitenweise) |
| `src/lib/api.ts` ca. 1.700 Zeilen | funktioniert | nach Bereichen aufteilen (admin, lager, bestand, konto), Regel "nur dort Datenbankzugriff" behalten |
| Push-Text: Bearbeiter können Mitgliedern eigene Texte schicken (nur Titel und Text, keine Bilder) | teilweise entschärft | Text serverseitig aus festen Bausteinen bauen |
| Verschlüsselungscode für Web Push steht doppelt (`push-send`, `erinnern`) | bewusst | gemeinsame Datei, sobald `push-send` angefasst wird (Bündelung in `--use-api`-Deploy ungeprüft) |
| Die Begehen-Engine (`plan3d/motor.ts`, ca. 7.000 Zeilen) enthält Reste für Mehrspieler, Fahrzeuge, Stockwerke | von außen nicht mehr erreichbar | in einem eigenen Lauf mit Sichtprüfung herausschneiden |
| Fehlertexte aus der Datenbank gehen teils ungefiltert an die Oberfläche (`bild-analyse`) | gering | durch feste Texte ersetzen |
| Tür-Pflicht ist ein Ablaufhelfer, kein Schloss | dokumentiert | bei Schloss-Anbindung echte Sperre |

## Niedrig

| Punkt | Stand |
|---|---|
| `physik-pruefen` hat Zeitgrenzen (z. B. 60 ms) und schlägt auf langsameren oder ausgelasteten Rechnern fehl, obwohl die Rechenregeln stimmen (nur die Zeilen "Leistung") | Zeitgrenzen lockern |
| Wörterbuch-Einträge ohne Verwendung (z. B. `start.ts` 2 von 55 benutzt, `umzuege.ts` 9 von 63) und Typ `Lang` mit `ar` | Aufräumlauf mit Prüfskript |
| `oxlint`-Warnungen `set-state-in-effect` in einigen Dateien (z. B. `Zeichner.tsx`) | bekannt, keine Fehler |
| Tolerante Suche kennt nur lateinische Buchstaben (Arabisch wurde entfernt) | bei Bedarf `\p{L}` |
| Datenbank: Spalte `profiles.avatar_path` und leere Speicher-Ordner `chat-media`, `avatars` | im Dashboard löschen |
| Edge Function `produkt-lesen` bei Supabase noch deployt (im Repo gelöscht) | im Dashboard entfernen |
| Einführungs-Tour (`src/lib/fuehrung.ts`) verweist teils auf entfernte Elemente | prüfen, ob die Tour fehlende Ziele überspringt |
| In `supabase/probelauf` steht die Kennung des Admin-Kontos (keine Zugangsdaten) | beim nächsten Umbau durch eine Abfrage ersetzen |
| Zeilenenden: `.gitattributes` erzwingt LF, einzelne Arbeitsdateien unter Windows zeigen CRLF-Warnungen beim Commit | harmlos |

## Grenzen der Skalierung

Siehe [ARCHITEKTUR.md](ARCHITEKTUR.md) Abschnitt 8 und [GITHUB-KOSTEN-2026-11-20.md](GITHUB-KOSTEN-2026-11-20.md).
Kurz: bis einige Dutzend Nutzer und einige tausend Produkte genügt der Free-Plan; vor echten Daten Backup (Pro), danach Suche in die
Datenbank, bei Bezahlangebot anderen Hoster.
