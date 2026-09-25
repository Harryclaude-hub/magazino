---
name: lueckenlos-abarbeiten
description: Zerlegt jeden Auftrag mit mehr als einem Schritt in eine nummerierte Liste kleiner, prüfbarer Teilaufgaben und arbeitet sie vollständig und sparsam ab. Kein Punkt wird übersprungen, gekürzt oder still weggelassen; am Ende folgt ein Abgleich mit dem Originalauftrag. Verwenden bei jeder Aufgabe mit zwei oder mehr Teilen, bei langen oder gesprochenen Aufträgen, bei großen Umbauten über viele Runden und bei Sätzen wie "mach alles", "nichts überspringen", "geh jeden Punkt durch", "Schritt für Schritt", "prüf alle", "jede Datei", "jeden Skill". Gilt für alle Modelle gleich (Opus, Sonnet, Fable, Haiku).
---

# Lückenlos abarbeiten

Karam gibt oft lange Aufträge per Sprachnachricht, mit mehreren Wünschen in
einem Satz und Nebenbemerkungen am Ende ("und bitte schau auch noch ...").
Genau diese Nebenbemerkungen gehen sonst verloren. Dieser Ablauf sorgt dafür,
dass jeder Wunsch erfasst, erledigt und nachgewiesen wird, ohne Tokens zu
verschwenden.

Kleine Aufgaben mit einem einzigen Schritt brauchen keine Liste: einfach
erledigen. Alles andere läuft so:

## 1. Auftrag zerlegen (vor der ersten Aktion)

1. Den ganzen Auftrag einmal lesen und **jeden** Wunsch als eigenen Punkt
   notieren, auch Nebensätze, Nachträge und stillschweigend Mitgemeintes.
   Bei Sprachnachrichten Füllwörter ignorieren, Inhalte nicht.
2. Jeder Punkt bekommt ein Erledigt-Kriterium, das sich prüfen lässt
   ("fertig, wenn der Build durchläuft", "fertig, wenn alle 23 Dateien
   geprüft sind"). Ein Punkt, der nicht in einem Zug prüfbar ist, wird
   weiter zerlegt.
3. Geht es um eine Menge ("alle Skills", "jede Seite", "alle Fehler"),
   zuerst die Menge wirklich zählen (Dateiliste, grep, Abfrage) und die
   Zahl N in den Punkt schreiben.
4. Die Liste dort führen, wo sie eine Zusammenfassung des Verlaufs
   überlebt: im Aufgaben-Werkzeug (TaskCreate / TodoWrite), sonst in einer
   kurzen Datei (z. B. `AUFTRAG.md` im Arbeitsordner). Nicht jedes Mal
   die ganze Liste im Chat wiederholen.

## 2. Abarbeiten

- Immer genau ein Punkt in Arbeit. Erst als erledigt markieren, wenn das
  Erledigt-Kriterium nachweislich erfüllt ist (Ausgabe eines Befehls,
  Datei vorhanden, Test grün). "Sollte gehen" ist kein Nachweis.
- Bei Mengen jedes Element einzeln bearbeiten und am Ende zählen:
  "23 von 23". Stichproben sind nur erlaubt, wenn der Auftrag Stichproben
  verlangt.
- Neue Punkte, die unterwegs auftauchen, sofort in die Liste aufnehmen.

### Was als Überspringen zählt (verboten)

- "Der Rest funktioniert analog", "usw.", "...", Platzhalter wie
  `// TODO` oder `[weitere Einträge]` in einem Ergebnis, das fertig sein soll.
- Einen Punkt still verkleinern, zusammenlegen oder weglassen.
- Einen Punkt als erledigt melden, der nur geplant oder nur teilweise
  gemacht ist.
- Eine Frage stellen, um einem schwierigen Punkt auszuweichen.

### Wenn ein Punkt nicht geht

Nie still fallen lassen. Den Punkt als **blockiert** markieren, mit Grund
und dem, was fehlt, und mit dem nächsten Punkt weitermachen. Fehlt nur
eine Entscheidung, die sich vernünftig treffen lässt: die einfachste
robuste Lösung wählen, kurz notieren, weiterarbeiten. Nachfragen nur, wenn
die Entscheidung wirklich Karams ist (Geld, Löschen echter Daten, etwas
Unumkehrbares, Zugang, den nur er hat).

## 3. Sparsam arbeiten (gleiche Qualität, weniger Tokens)

- Vor dem Lesen suchen: erst `grep`/Glob, dann nur die nötigen Zeilen.
  Eine Datei nicht zweimal lesen, wenn sie sich nicht geändert hat.
- Unabhängige Schritte in einem Zug ausführen (mehrere Werkzeugaufrufe
  parallel), abhängige nacheinander.
- Lange Befehlsausgaben kürzen (`| tail -20`, `--quiet`).
- Nicht erzählen, was gleich passiert, sondern es tun. Statusmeldungen:
  ein Satz.
- Große, klar abgegrenzte Blöcke an einen Unteragenten mit genauer
  Dateiliste und Erledigt-Kriterium geben; der Hauptfaden steuert und
  prüft das Ergebnis, statt es blind zu übernehmen.
- Zwischenergebnisse bei langen Aufträgen in Dateien, nicht im Chat.

Sparen heißt kürzer arbeiten, nie weniger erledigen. Ist das Budget zu
knapp für alles, das offen sagen und fragen, welche Punkte zuerst kommen.

## 4. Abschlussabgleich (vor der letzten Antwort)

1. Den **Originalauftrag noch einmal lesen**, nicht nur die eigene Liste.
2. Jeden Wunsch daraus einem Listenpunkt zuordnen. Fehlt einer: jetzt
   erledigen.
3. In der Antwort kurz aufführen: jeder Punkt mit Status (erledigt,
   blockiert mit Grund) und wo das Ergebnis liegt. Keine Punkte
   weglassen, auch nicht die unbequemen.

## Beispiel

Auftrag: "Bau mir einen Skill gegen Überspringen, und schau bei jedem
Skill, ob er noch optimal ist für die neuen Modelle."

Liste:
1. Neuen Skill schreiben. Fertig, wenn SKILL.md gültig ist und die
   Prüfung durchläuft.
2. Alle eigenen Skills zählen (N = 23) und jeden prüfen. Fertig bei
   23 von 23 mit Befund je Skill.
3. Gefundene Mängel beheben. Fertig, wenn die automatische Prüfung
   für alle 23 sauber ist.
4. Ergebnis ausliefern und erklären, wie Karam es hochlädt.
