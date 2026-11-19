# UEBERGABE Kistly
Stand: 23.09.2026, abends

## GEPLANT: UMZUG IN DIE ORGANISATION "K7" AB 19.10.2026 (Nachtrag 06.10.2026)

Das Supabase-Projekt `vqpirkgvclfsduklnnzv` ist pausiert. Karam will es zusammen mit Kombi
Exchange in der zweiten Organisation **K7** (`sykvuuskknubbicyjgng`, Owner dem Besitzer-Konto,
dem Admin-Konto dort Developer) aktiv haben.
- Am 06.10.2026 lehnte Supabase die Übertragung ab: Die Quell-Organisation liegt über dem
  Kontingent (Log Ingestion 2,13 GB von 1 GB, Zeitraum bis 19.10.2026).
- Plan: ab dem 19./20.10.2026 übertragen (Projekt-Einstellungen, General, "Transfer project",
  Ziel K7), dann in K7 "Resume project". Adresse und Schlüssel bleiben gleich. Karam klickt das selbst.

## 1. Was ist das hier

Kistly ist ein Umzugsprogramm als Web-App (PWA). Jedes Zimmer und jede Person
bekommt ein Kuerzel, jede Kiste daraus eine Nummer und einen QR-Code, die
Etiketten kommen aus dem Programm, und beim Einzug sieht man in Sekunden, was
schon da ist und was fehlt. Deutsch und Arabisch, Arabisch von rechts nach
links. Karams Probeprojekt: an ihm entscheidet sich, ob er groessere Sachen
auf diesem Weg baut.

## 2. Wo es laeuft

| Was | Wo |
|---|---|
| Live | https://harryclaude-hub.github.io/kistly/ |
| Repo | https://github.com/Harryclaude-hub/kistly, Zweig `main` |
| Lokal | `C:\Users\Home\kistly` |
| Veroeffentlichen | `.github\workflows\pages.yml`, laeuft bei jedem Push auf `main` |
| Datenbank | Supabase-Projekt `vqpirkgvclfsduklnnzv` (Kistly allein) |
| Edge Functions | `push-send` (v1), `bild-analyse` (v2 auf dem Server, lokal neuer) |
| Fahrplan und Begruendungen | `C:\Users\Home\kistly\PLAN.md` |

Arbeiten:

```
npm run dev                  Entwicklungsserver auf Port 5173
npx tsc -b                   Typpruefung, muss still durchlaufen
npx oxlint                   nur Warnungen sind in Ordnung, keine Fehler
node scripts/smoketest.mjs   Kernlogik gegen die echte Datenbank, braucht .env.local
```

## 3. Stand heute

**Gepusht und live: `5dcccc3`** (23.09.2026 abends). Die Veroeffentlichung
lief durch, im ausgelieferten Buendel sind Suche, Groessen und Rahmen
nachgewiesen, Direktlinks wie `/app/suche?q=kleber` laden die App.
`UEBERGABE.md` ist bewusst NICHT im Repo: sie nennt das fremde
Supabase-Projekt und Karams andere Programme, und das Repo ist oeffentlich.
Beim Committen darum immer mit `git add -A -- . ":(exclude)UEBERGABE.md"`.

Datenbank: Migrationen **0020 bis 0026 sind angewandt**, jede vorher in
einem Probelauf gegen die echte Datenbank, der am Ende alles zurueckrollt.
0026 hat Karam am 24.09. selbst im SQL-Editor eingespielt, nachgeprueft
(der Funktionskoerper von `inhalt_suchen` enthaelt `strpos`).

Bilderkennung: Karam hat `OVH_AI_ENDPOINTS_TOKEN` als Function Secret
gesetzt. `bild-analyse` laeuft seit 24.09. als **Version 4 mit dem neuen
Code**, per Supabase-MCP ausgerollt auf Karams ausdrueckliches Wort. Von
aussen geprueft: die Vorabfrage aus `http://127.0.0.1:5173` wird erlaubt
(das kann nur die neue Fassung), ein Aufruf ohne Anmeldung bekommt 401.
**Noch nie mit echten Bildern gelaufen**: am 24.09. gab es in Kistly kein
einziges Kistenfoto (3 Umzuege, 9 Kisten, 0 Fotos, 0 Auswertungen).

Fertig und live: Grundgeruest, Schnellansicht, Umzug verlassen, Zimmer als
Regel, Raumplan, Schichten und Punkte, und seit 5dcccc3:

- **E, Hoehe, Stapel, Regale** (0022, 0025): jede Kiste hat eine echte Hoehe
  aus ihrer Groesse oder eine eigene. Stapel auf dem Boden und auf den
  Brettern eines Regals, die Datenbank prueft Decke und naechstes Brett.
  Seitenansicht mit Zentimeterskala, 3D mit echten Hoehen. Die Hoehe wird nie
  gespeichert, sie ergibt sich aus dem Stapel. 0025 sperrt Zimmer und Zelle,
  damit zwei Leute nicht gleichzeitig dieselbe Stelle belegen.
- **F, Kistengroessen in Litern** (0021): Stufe 1 bis 10 nach DIN 323 R40,
  15 bis 100 Liter, der klassische Umzugskarton ist Stufe 7. Seite
  `Groessen` unter jedem Umzug: Rechner, Tabelle, bestehende Kisten neu
  einstufen, danach die geaenderten Etiketten gesammelt drucken.
- **G, Rahmen und Ausschnitte** (0023): statt Punkten Rahmen um jedes Ding im
  Foto, daraus ein kleines Bild im Speicher. Rahmen von Hand ziehen, Dinge,
  die die Erkennung uebersehen hat, von Hand markieren.
  `bild-analyse` ist neu geschrieben: Qwen3.5-9B bei OVHcloud (offenes
  Modell, EU), ohne `service_role`, alles mit dem Schluessel des Nutzers.
- **H, Suche ueber alle Umzuege** (0024, `src\pages\Suche.tsx`): eigener Reiter
  "Suchen" unten. Findet auch mit Tippfehlern, Umlauten und auf Arabisch.
  Jeder Treffer mit Bildausschnitt, Umzug, Zimmer, Kiste, Schicht, Regal und
  Brett, und der Hoehe ueber dem Boden. Ein Tipp zeigt den Fundort: kleiner
  Raumplan mit Tuer und rotem Rahmen, darunter die Reihe von der Seite. Von
  dort in die Kiste (die Zeile ist rot umrandet), ins Foto oder in den ganzen
  Raumplan.

Geprueft: Typpruefung, Linter, Build, die eigene Platzhalterpruefung der
Woerterbuecher (die 9 Meldungen sind die bekannten arabischen
Einzahl-Saetze ohne Zahl, gewollt), kein langer Gedankenstrich. Drei
Gegenpruefungen mit mehreren Agenten, alle bestaetigten Befunde behoben.
Die dritte fand nebenbei einen echten Fehler: eine Inhaltszeile mit Rahmen
liess sich nicht in eine andere Kiste verschieben (`moveContent` schickte
`photo_id` mit und umging so das Abraeumen in 0023). Behoben.
Die Suche habe ich mit erfundenen Daten auf Handybreite angesehen, deutsch
und arabisch. Hinter der Anmeldung noch nicht.

## 4. Was offen ist

1. **Erledigt: committen und pushen** (5dcccc3, auf Karams Wort).
2. **Erledigt: 0026 angewandt** (Karam, SQL-Editor, 24.09.).
3. **Erledigt: OVH-Konto und Schluessel** (Karam, 24.09.). Der
   `ANTHROPIC_API_KEY` wird nicht mehr gebraucht.
4. **Erledigt: `bild-analyse` ausgerollt** (Version 4, 24.09.).
5. **Probelauf der Erkennung** mit 10 bis 20 echten Schichtfotos: sitzen die
   Rahmen, stimmen die Namen, was kostet es. Haengt an echten Fotos und an
   Karams Anmeldung. Wenn beides da ist: ein Foto durchschicken, dann
   `photo_analyses` lesen (Rahmen, Namen, Fehlercode) und die Ausschnitte
   ansehen. Faellt Qwen3.5-9B bei den Rahmen durch, das Secret
   `BILD_MODELL` auf ein anderes Modell aus dem OVH-Katalog setzen, ohne neu
   auszurollen.
6. **Durchgang hinter der Anmeldung**: Raumplan mit Regalen und Stapeln,
   Groessen neu einstufen, Schichten und Rahmen, Suche. Claude tippt keine
   Passwoerter, Karam meldet sich selbst an.
7. **Etiketten neu drucken** nach dem Neueinstufen (Karams Entscheidung:
   alle neu einstufen und drucken). Die Seite Groessen sammelt die Liste.
8. **`push-send` benutzt noch `service_role`.** Der VAPID-Schluessel gehoert
   als Function Secret hinein, dann kann die Funktion wie `bild-analyse` ohne
   auskommen.
9. **Admin-Frage, seit 16.09.2026 unbeantwortet.** Soll ein Admin die Umzuege
   ALLER Nutzer sehen oder nur einen vollstaendigen Ueberblick ueber seine
   eigenen? Aendert die Zeilen-Sicherheit grundlegend, darum nicht selbst
   entschieden.
10. **Kuerzel umbenennen ueberrascht.** Eine betroffene Kiste bekommt ihre neue
   Nummer erst bei der naechsten beliebigen Aenderung (0002). Braucht eine
   Entscheidung.
11. **Zimmerfotos ohne Oberflaeche** und **`seite` ohne Eingabefeld**, beides
    bewusst liegen gelassen.

## 5. Was man NICHT anfassen darf

- **Das Supabase-Projekt `mqmevpyatjsambervgtu`.** Dort liegen Kombi Exchange,
  Kombi Tafel und immo-check. Kistly hat damit nichts zu tun, weder lesend
  noch schreibend.
- **Nummernvergabe.** `prefix`, `seq` und `code` vergibt ausschliesslich die
  Datenbank in `items_before_insert` und `items_before_update` (0002). Nie im
  Browser nachrechnen, sonst gibt es zwei Fassungen derselben Regel.
- **`src\lib\api.ts` ist die einzige Stelle mit Datenbankzugriffen.** Keine
  zweite Abfrage in einer Seite, auch nicht "nur schnell".
- **Angewandte Migrationen werden nicht nachtraeglich geaendert.** Ein Fehler
  bekommt eine neue Nummer. So geschehen bei 0014 zu 0013 und 0019 zu 0018.
- **Kein Zugangscode und kein API-Schluessel** in eine Datei, eine
  Commit-Nachricht oder ins Repo. Das Repo ist oeffentlich. Kein
  `service_role`-Schluessel, nie.
- **Die Woerterbuecher** unter `src\lib\i18n\bausteine`: jeder Eintrag hat
  `de` UND `ar`, und beide benutzen dieselben Platzhalter.
- **Hoehen werden nicht gespeichert.** Wo eine Kiste in der Hoehe steht,
  rechnen `item_hoehe_cm` und der Stapel aus. Eine gespeicherte Hoehe liefe
  beim ersten Umstapeln auseinander.

## 6. Bekannte Fallen

- **Drucken wirft Farben weg.** Ohne `print-color-adjust: exact` sieht die
  Vorschau gestreift aus und das Blatt kommt weiss heraus. Steht in
  `index.css`, in `Export.tsx`, in der HTML- und in der Word-Ausgabe.
- **Dialoge behalten die vorige Auswahl.** Jeder Dialog setzt seinen Zustand
  beim Oeffnen zurueck.
- **Deutsche Merkbuchstaben auf arabischen Boegen.** Symbole werden als Bild
  gezeichnet (`markZeichenBild` in `ausgabe.ts`), nicht als Buchstabe.
- **`inherit_project_from_item`**: `project_id` NIE nur setzen, wenn es null
  ist, immer ueberschreiben (0014).
- **Fremdschluessel gegen Pruefung.** In 0018 bissen sich "ein Punkt braucht
  ein Bild" und `on delete set null`. 0019 raeumt vorher auf.
- **`jsonb @>` ist eine Mengenfrage.** `gesperrt @> '[[2,3]]'` ist auch dann
  wahr, wenn irgendwo eine 2 und eine 3 stehen. Seit 0022 fragt
  `zelle_gesperrt(gesperrt, x, y)`.
- **Der Speicher erlaubt Anlegen und Loeschen, kein Ueberschreiben.** Ein
  neuer Ausschnitt bekommt immer einen neuen Pfad, der alte wird geloescht.
- **OVH**: `chat_template_kwargs` lehnt der Dienst mit 400 ab. Das Denken von
  Qwen schaltet `/no_think` am Ende der Anweisung ab.
- **Nachruecken im Stapel** laeuft als Trigger und ruft sich selbst auf. Der
  Waechter ist `pg_trigger_depth()`, ohne ihn laeuft er endlos.
- **Arabisch und Latein in einer Zeile.** Eine Menge wie "2x" steht in einem
  eigenen LTR-Stueck; das Leerzeichen gehoert dahinter, nicht hinein, sonst
  klebt sie im arabischen Satz am Wort.
- **Migrationen gegen die echte Datenbank durchspielen** in einem
  `do $$`-Block, der am Ende mit `raise exception` den Bericht ausgibt. Der
  Fehler rollt alles zurueck. `next_seq` braucht dafuer gesetzte
  JWT-Angaben und eine Mitgliedschaft im Umzug.
- **Bash-Heredocs brechen auf diesem Rechner.** Aenderungen als Python-Datei
  ins Scratchpad schreiben und mit `python <pfad>` laufen lassen.
  Commit-Nachrichten mit `git commit -F <datei>`.

## 7. Naechster Schritt (Stand 24.09.2026 nachts, Karam hat angehalten)

**Bilderkennung** ist live (`84da1cd`, Funktion Version 5): ein Foto je
Aufruf, reasoning_effort "none", Abbruch nach 25 s Nachdenken bzw. 45 s
Stille, dann Ersatzmodell Qwen3.8-27B (eigens gebucht), Ladeanzeige in
der Designschicht. Karams erster Versuch davor (Version 4) brach ab: das
Modell dachte ueber 90 s nach. Ob die neue Fassung mit seinen zwei
Getraenkefotos klappt, ist offen: zuerst `photo_analyses` und das
Funktionsprotokoll lesen (Zeilen "[bild-analyse] tempo").

**Grundriss-Umbau** (Karams grosser Auftrag vom 24.09., noch nichts gebaut):
- Wunsch: Wohnung am Desktop auf den Zentimeter zeichnen (Waende, Nischen,
  Balkon, Zimmer teilen, Hoehe, Tueren ORANGE, Fenster BLAU, Moebel wie
  L-Couch mit Massen, Regale und Schraenke mit Faechern, Platzieren wie in
  Minecraft, 3D am Desktop, Wand und Boden in kraeftigem Kontrast). Handy:
  nichts zeichnen, nur Kiste ins Zimmer setzen, x/y in cm, dann Hoehe oder
  Fach. Kistenseite: Fotos, ganz unten der Lageplan. Suche: Treffer mit
  Kiste, Schicht, Zimmer, Tipp fuehrt zu Foto und Kiste. Desktop soll die
  Breite nutzen, beide Fassungen schoener.
- Karams Entscheidungen: alten Raster-Plan ERSETZEN und umrechnen;
  MEHRERE Grundrisse je Umzug; Migrationen nach Probelauf wende Claude an;
  Veroeffentlichung in ETAPPEN.
- Etappen: 1 Datenmodell in cm + Desktop-Rahmen; 2 Zeichner; 3 Handy
  platzieren, Kistenseite, Suche; 4 3D und Design.
- Der Entwurfs-Durchlauf wurde vor dem letzten Schritt gestoppt. Gesichert
  sind Code-Karte (5 Bereiche), drei vollstaendige Entwuerfe und zwei
  Bewertungen in `.plan/grundriss_entwurf_teil.json` (lokal, per
  .git/info/exclude aus dem Repo gehalten). Es fehlt nur die Synthese zum
  Bauplan: aus diesen Teilen einen Bauplan schreiben, nicht neu kartieren.

**Budget:** Karam hat den Pro-Plan. Am 24.09. waren 57 % der Wochengrenze
verbraucht, Zuruecksetzen am 30.09. um 07:00. Der ganze Umbau braucht grob
15 bis 25 Mio. Tokens, das passt nicht in eine Restwoche. Karam will
naechste Woche weitermachen und ueberlegt, 250 EUR Guthaben fuer eine
Cloud-Sitzung einzusetzen. Sparsam arbeiten: grosse Pruefrunden nur fuer
Datenbank und Geld.

Seine Regel: wenn Claude etwas von ihm braucht, immer als Stichpunkte mit
direkten Links zu den Anbietern.
