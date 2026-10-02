/* Die Stadt um die Siedlung (E87): Gelaende, Strassen, Haeuser, Baeume,
 * Zaeune, Wasser, Laternen, Fahrzeuge und ein paar Dinge, alles aus den
 * Daten der Stadt (StadtDaten aus OpenStreetMap und einem Hoehenmodell).
 * Welche Stadt und wo, steht nie im Code; die Daten kommen aus der
 * Datenbank. Jedes Haus ist begehbar: sein Inneres (innenGenerator.ts,
 * innen3d.ts) entsteht erst, wenn die Kamera nah kommt, und faellt weit
 * weg wieder weg.
 *
 * Koordinaten: die Daten rechnen in Siedlungsmetern (x Osten, z Sueden, y
 * ueber dem Boden der Siedlung). Alles Feste haengt in der Gruppe
 * 'stadtLage' mit der Matrix zuWelt; ihre Hoehe kommt aus bodenY (der
 * Boden der Siedlung, y = 0, liegt in der Welt bei bodenY; die y-
 * Verschiebung von zuWelt wird dafuer ersetzt). gruppe selbst liegt in
 * der Welt (keine Matrix): darin haengen Fahrzeuge, Dinge und das Innere
 * der Haeuser mit Weltkoordinaten. Alles, was herausgeht (Hindernisse,
 * Ebenen, Treppen, Sprungziele, Karte, Fahrzeuge, Dinge), ist in
 * Weltmetern; Winkel bekommen die Drehung von zuWelt dazu.
 *
 * Hoehe: das Gelaende liegt in der Welt bei bodenY + hoehe(x, z);
 * hoehe() rechnet Welt -> Siedlung und fragt gelaendeHoehe (src/lib/
 * stadt.ts), ohne etwas anzulegen. Gezeichnet wird es 6 cm tiefer, damit
 * der Boden der Siedlung (siedlung3d.ts) ohne Flimmern darauf liegt; jede
 * Zelle des Gitters wird an der Diagonale geteilt, die unter der
 * bilinearen Flaeche bleibt, so ragt das Gelaende nie durch Strassen.
 *
 * Was entsteht:
 * - Gelaende als Gitter mit weichen Normalen und Farben je Ecke, dazu im
 *   Browser ein Bild mit Flaechen (Wiese, Wald, Acker, Wasser, Parkplatz,
 *   Sport, Friedhof, Gewerbe, Fels, Schwimmbad), Wasserlaeufen und
 *   Strassen fuer die Ferne. Ohne Zeichenflaeche (node) tragen die Ecken
 *   die Farbe der Flaeche. Beidseitig (aus einem Fenster am Hang sieht man
 *   Erde). Wo o.aussparen es will (konvexe Huelle je Flaeche, etwa der Grund
 *   der Siedlung und die Grube ihrer Rampe), gibt es keins; ebenso im Umriss
 *   eines offenen Hauses, wenn das Gelaende dort hoeher liegt als sein
 *   Boden (Hang): die Dreiecke werden beschnitten, das Stueck in schritt()
 *   neu gebaut.
 * - Strassen als Baender auf dem Gelaende (alle 4 m laengs neu abgetastet,
 *   quer ein Feld je 6 m), Asphalt mit Mittellinie (haupt, neben), hellere Wege,
 *   Feldwege, Stufen als echte Stufen, Bruecken gerade von Ende zu Ende mit
 *   Bruestung, Tunnel weg, Gleise als Schotterbett mit zwei Schienen;
 *   Baeche und Fluesse als ruhige blaue Baender.
 * - Haeuser: Waende vom tiefsten Gelaende unter dem Umriss bis boden +
 *   geschosse * geschossHoehe (ein dunklerer Sockel nur, wo er hoch ist),
 *   Farbe aus farbe oder ruhig nach Art, Fenster genau nach stadtMasse
 *   (fensterReihe, fensterOhneTuer je Kante und Geschoss): nah (Kacheln
 *   bis NAH_M) als dunkles Glas mit hellem Rahmen, fern als Muster in der
 *   Wand. Die Haustuer (Lage aus tuerLage, innenGenerator.ts: dieselbe
 *   Stelle wie innen, weg von den Ecken) als Luecke (TUER_H) mit Blatt,
 *   solange das Innere nicht zu sehen ist; nah dazu Leibung, Rahmen und
 *   Stufen vom Gelaende SCHWELLE_VOR vor der Kante bis zum Erdgeschoss
 *   (immer, offen wie zu). Ein Schild mit
 *   dem Namen ueber der Tuer (nur im Browser, Text wie gegeben, nie
 *   gespiegelt). Daecher flach mit Attika (grosse mit Abdeckung), Sattel
 *   entlang der langen Achse des kleinsten umschliessenden Rechtecks,
 *   Walm; Haeuser mit Hof immer flach.
 * - Baeume (einzeln aus baeume, gestreut im Wald) und Laternen entlang der
 *   Haupt- und Nebenstrassen als InstancedMesh, Mauern, Zaeune und Hecken.
 * - Fahrzeuge (fahrzeug3d.ts): geparkte Autos bis FAHRZEUG_UMKREIS um die
 *   Siedlung (hoechstens FAHRZEUG_MAX = 25; ferne blendet der Motor aus), je Feuerwehrhaus zwei
 *   Loeschfahrzeuge vor der Tuer, zwei Rettungswagen vor dem hoechsten
 *   Spital, ein Polizeiauto beim groessten Einkaufszentrum, ein Bus an
 *   einer Haltestelle. Kennungen 'stadt:f<n>', gleiche Daten, gleiche
 *   Kennungen.
 * - Dinge zum Aufheben (Ball, Leitkegel, Kuebel, Tonne) auf Spielplaetzen
 *   und in Parks nahe der Siedlung, Kennungen 'stadt:d<n>'.
 *
 * Billig fuers Handy: Haeuser, Strassen und Zaeune in einem Mesh je
 * Kachel von KACHEL m (Farben je Ecke als Bytes, flach schattiert, ohne
 * Normalen), Gelaende und Baumkronen je Kachel von GROSS m (Kronen fern
 * grob), alle Staemme und alle Laternen in je einem InstancedMesh. Jede
 * Kachel wird fuer sich weggeschnitten, wenn sie nicht im Bild ist. Glas,
 * Tuerrahmen und Stufen gibt es nur in Kacheln bis NAH_M um die Kamera
 * (kamera() schaltet um, schritt() baut in Stuecken nach, ab NAH_WEG_M
 * wieder frei); fern zeigt die Wand dasselbe Raster als Muster. Gleiche
 * Daten geben dieselbe Welt (Zufall mit Saat aus Kennungen und Lagen).
 * Fuer 4000 Haeuser und 2500 Strassen (Pruefung): unter 700 000 Dreiecke
 * und 300 Zeichenaufrufe ohne Fahrzeuge.
 *
 * Begehen: hindernisse() sind je Kante jedes Hauses ein Rechteck der
 * Dicke AUSSENWAND_M innen am Umriss, an der Haustuer mit Luecke, die ein
 * Rechteck der Tuer fest schliesst (am Ende der Liste), dazu Mauern, Zaeune
 * und Hecken mit Oberkante. hindernisse() ist immer dasselbe Feld mit
 * denselben Rechtecken (der Motor rastert es einmal): hinein fuehrt die
 * Schwelle (Treppe3D quer ueber die Wandlinie), und auf einer Treppe
 * gelten die Hindernisse der Ebenen nicht.
 * Laden ohne Ruckeln: kamera() sucht Haeuser bis PLAN_M (Raster, kein
 * Durchlauf ueber alle); ihre Plaene rechnet ein Web Worker (innenWerker.ts,
 * hoechstens PLAN_OFFEN zugleich, die naechsten zuerst), fertige Plaene
 * liegen in einem Vorrat (auch ueber den Abbau hinaus). Bis INNEN_LADEN_M
 * baut schritt() das Innere in Stuecken (innenBauen, je Bild BAU_MS, beim
 * schnellen Vorbeiziehen weniger), haengt es ein und zaehlt version()
 * hoch. Ohne Worker (node, alte Browser) rechnet es hier, je Bild
 * hoechstens ein Plan. Zu sehen ist das Innere nur bis SICHT_M (draussen
 * das Erdgeschoss durch die offene Tuer, drinnen das Geschoss und je eins
 * darueber und darunter); weiter weg ist es aus und die Tuer zu. Ebenen
 * kommen nur hinten dazu; beim Entladen (weiter als INNEN_ENTLADEN_M, je
 * Bild eins) fallen Meshes und Dinge weg, Ebenen und Treppen bleiben. Beim
 * erneuten Laden bleiben es dieselben Ebenen (gleiche Objekte, gleiche
 * Kennungen). Ein Haus, dessen Ding oder Fahrzeug jemand weggetragen oder
 * weggefahren hat, bleibt geladen (weggetragene Dinge bleiben zu sehen).
 *
 * Einbau (Siedlung): zuWelt ist die Matrix der Gruppe, in der die
 * Siedlung ihre Haeuser zeichnet (Siedlungsmeter -> Welt), bodenY die Hoehe
 * ihrer Ebene bodenEbene. gruppe kommt in die Weltgruppe (nicht in die
 * gedrehte), Fahrzeuge und Dinge haengen schon darin. Auf die Ebene
 * bodenEbene: hindernisse() dazu, hoehe als Ebene3D.hoehe; ebenen() hinten
 * anhaengen; treppen(), fahrzeuge(), dinge() weiterreichen und bei jeder
 * neuen version() neu lesen; kamera() und schritt() jedes Bild weitergeben.
 *
 * Pruefung ohne Browser: node scripts/stadt-pruefen.mjs */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  ShapeUtils,
  Sphere,
  SphereGeometry,
  Vector2,
  Vector3,
  BoxGeometry,
  type Material,
  type Intersection,
  type Raycaster,
  type Texture,
} from 'three'
import type { Farben3D } from './szene'
import type { Ebene3D, Fahrzeug3D, FahrzeugArt, Hindernis3D, Karte3D, KartenFlaeche, Sprungziel3D, Treppe3D, WeltDing3D } from './vertrag3d'
import type { StadtDaten, StadtFlaechenArt, StadtHaus, StadtHausArt, StadtStrasse } from '../../lib/types'
import { gelaendeHoehe } from '../../lib/stadt.ts'
import { innenPlanen, tuerLage, type InnenEingabe, type InnenPlan } from '../../lib/innenGenerator.ts'
import type { InnenAnfrage, InnenAntwort } from '../../lib/innenWerker.ts'
import { innenBauen, innenVorbereiten, type InnenBau, type InnenTeil } from './innen3d.ts'
import { baueFahrzeug } from './fahrzeug3d.ts'
import {
  AUSSENWAND_M,
  FENSTER_ABSTAND,
  FENSTER_B,
  FENSTER_BRUESTUNG,
  FENSTER_H,
  INNEN_ENTLADEN_M,
  INNEN_LADEN_M,
  SCHWELLE_VOR,
  TUER_H,
  fensterOhneTuer,
  fensterReihe,
} from './stadtMasse.ts'

export interface StadtOptionen {
  stadt: StadtDaten
  farben: Farben3D
  /** Siedlungsmeter (x Osten, z Sueden, y ueber dem Boden der Siedlung) ->
   *  Welt. Nur Drehung um die Hochachse und Verschiebung. */
  zuWelt: Matrix4
  /** Kennung der Ebene des Gelaendes in der Welt (die Siedlung nennt sie
   *  'boden'); Schwellen der Haustueren fuehren von ihr ins Haus. */
  bodenEbene: string
  /** Boden der Ebene des Gelaendes in der Welt (Meter): Ebene3D.y. */
  bodenY: number
  /** Flaechen (Siedlungsmeter x, z), unter denen kein Gelaende entsteht:
   *  etwa die Grube der Tiefgarage und der Grund, den die Siedlung selbst
   *  zeichnet. Jede Flaeche zaehlt als ihre konvexe Huelle. Fehlt: keine. */
  aussparen?: [number, number][][]
  /** Wer die Plaene fuers Innere rechnet. Fehlt: ein Web Worker
   *  (innenWerker.ts), ohne Worker gleich hier (je Bild hoechstens ein
   *  Haus). Fuer Pruefungen. */
  planer?: InnenPlaner
}

/** Rechnet Plaene fuers Innere (E87), am besten nebenher (Web Worker).
 *  planen() ruft fertig genau einmal, mit dem Plan oder einem Fehlertext;
 *  nebenher sagt, ob das Rechnen ausserhalb der Bilder laeuft (sonst kostet
 *  planen() die Zeit sofort). */
export interface InnenPlaner {
  readonly nebenher: boolean
  planen(e: InnenEingabe, fertig: (plan: InnenPlan | null, fehler: string | null) => void): void
  dispose(): void
}

/** Rechnet gleich hier (node, Pruefungen, Browser ohne Worker). */
export function sofortPlaner(): InnenPlaner {
  return {
    nebenher: false,
    planen(e, fertig) {
      let plan: InnenPlan | null = null
      let fehler: string | null = null
      try {
        plan = innenPlanen(e)
      } catch (err) {
        fehler = err instanceof Error ? err.message : String(err)
      }
      fertig(plan, fehler)
    },
    dispose() {},
  }
}

/** Rechnet in einem Web Worker (innenWerker.ts); null, wenn es keinen gibt
 *  oder er sich nicht starten laesst (das steht dann in der Konsole). Faellt
 *  er spaeter aus, rechnet er die offenen Anfragen hier und danach alles. */
export function werkerPlaner(): InnenPlaner | null {
  if (typeof Worker === 'undefined') return null
  /** Erst beim ersten Plan gestartet (wer nie in die Naehe eines Hauses kommt, braucht ihn nicht). */
  let w: Worker | null = null
  const offen = new Map<number, { e: InnenEingabe; fertig: (plan: InnenPlan | null, fehler: string | null) => void }>()
  let nr = 0
  let kaputt = false
  let weg = false
  const ersatz = sofortPlaner()
  const ausgefallen = (grund: unknown) => {
    if (kaputt || weg) return
    kaputt = true
    console.error('stadt3d: der Worker fuer das Innere ist ausgefallen, es wird im Bild gerechnet', grund)
    w?.terminate()
    const liste = [...offen.values()]
    offen.clear()
    for (const o of liste) ersatz.planen(o.e, o.fertig)
  }
  const starten = (): Worker | null => {
    if (w || kaputt) return w
    try {
      w = new Worker(new URL('../../lib/innenWerker.ts', import.meta.url), { type: 'module' })
    } catch (err) {
      console.warn('stadt3d: kein Worker fuer das Innere, es wird im Bild gerechnet', err)
      kaputt = true
      return null
    }
    w.onmessage = (ev: MessageEvent<InnenAntwort>) => {
      const a = ev.data
      const o = a ? offen.get(a.nr) : undefined
      if (!o) return
      offen.delete(a.nr)
      if (a.plan) o.fertig(a.plan, null)
      else o.fertig(null, a.fehler ?? 'innenWerker: keine Antwort')
    }
    w.onerror = (ev: ErrorEvent) => {
      ev.preventDefault()
      ausgefallen(ev.message)
    }
    w.onmessageerror = () => ausgefallen('Antwort nicht lesbar')
    return w
  }
  return {
    get nebenher() {
      return !kaputt
    },
    planen(e, fertig) {
      if (weg) return
      const x = kaputt ? null : starten()
      if (!x) {
        ersatz.planen(e, fertig)
        return
      }
      const anfrage: InnenAnfrage = { nr: ++nr, eingabe: e }
      offen.set(anfrage.nr, { e, fertig })
      x.postMessage(anfrage)
    },
    dispose() {
      if (weg) return
      weg = true
      offen.clear()
      w?.terminate()
      w = null
    },
  }
}

/** Fertige Plaene, auch ueber den Abbau einer Stadt hinaus (wer zurueck
 *  in die Siedlung kommt, wartet nicht noch einmal). Schluessel ist die
 *  ganze Eingabe; hoechstens PLAENE_MAX, die aeltesten fallen zuerst. */
const plaene = new Map<string, InnenPlan>()
const PLAENE_MAX = 64
function planMerken(k: string, p: InnenPlan): void {
  plaene.delete(k)
  plaene.set(k, p)
  while (plaene.size > PLAENE_MAX) {
    const erst = plaene.keys().next().value
    if (erst === undefined) break
    plaene.delete(erst)
  }
}
function planVorrat(k: string): InnenPlan | null {
  const p = plaene.get(k)
  if (!p) return null
  plaene.delete(k)
  plaene.set(k, p)
  return p
}

/** Was die Stadt der Siedlung gibt. Alles in Weltkoordinaten. Die Siedlung
 *  haengt gruppe in ihre Welt, legt hindernisse und hoehe auf ihre Ebene
 *  bodenEbene, haengt ebenen hinten an ihre an und reicht treppen,
 *  fahrzeuge, dinge, sprungziele und karte weiter. version() zaehlt hoch,
 *  wenn ein Haus innen dazukam (neue Ebenen, Treppen, Dinge). */
export interface StadtWelt {
  gruppe: Group
  /** Hindernisse auf dem Gelaende (Aussenwaende, Tueren zu, Mauern). */
  hindernisse: () => Hindernis3D[]
  /** Hoehe des Gelaendes an (x, z) Welt, relativ zu bodenY. */
  hoehe: (x: number, z: number) => number
  ebenen: () => Ebene3D[]
  treppen: () => Treppe3D[]
  fahrzeuge: () => Fahrzeug3D[]
  dinge: () => WeltDing3D[]
  /** Orte mit Namen (vor der Tuer, auf bodenEbene). ebene ist hier -1:
   *  die Siedlung setzt den Index ihrer Ebene bodenEbene ein. */
  sprungziele: Sprungziel3D[]
  karte: Pick<Karte3D, 'haeuser' | 'flaechen' | 'strassen' | 'orte'> & { rahmen: [number, number, number, number] }
  version: () => number
  /** Stelle der Kamera (Welt) in jedem Bild beim Begehen: laedt Haeuser
   *  innen in der Naehe nach und entlaedt ferne. */
  kamera: (x: number, y: number, z: number) => void
  /** Jedes Bild: Ampeln, Blaulicht, nachladen in Stuecken. true = es tut sich noch was. */
  schritt: (dt: number) => boolean
  dispose: () => void
}

/* ------------------------------------------------ Zahlen */

/** Kachel fuer Haeuser, Strassen, Zaeune und Fenster (Meter). */
const KACHEL = 250
/** Kachel fuer Gelaende und Baeume (Meter). */
const GROSS = 400
/** Kacheln, deren Mitte naeher an der Kamera liegt, zeigen Fenster als Glas. */
const NAH_M = 350
/** Weiter weg wird das Glas einer Kachel freigegeben. */
const NAH_WEG_M = 450
/** Baeume bis hier mit feiner Krone. */
const BAUM_FEIN_M = 300
/** So viel tiefer als hoehe() liegt das gezeichnete Gelaende. */
const TIEFER = 0.06
/** Waende beginnen so weit unter dem tiefsten Gelaende am Umriss. */
const UNTER = 0.3
/** Attika der Flachdaecher: Hoehe ueber dem Dach und Breite. */
const ATTIKA = 0.6
const ATTIKA_B = 0.25
/** Ab dieser Grundflaeche (m2) bekommt ein Flachdach eine Attika mit Innenseite. */
const ATTIKA_FLAECHE = 250
/** Eigener Sockel erst, wenn er hoeher ist als dieser Teil eines Geschosses
 *  (darunter zeigt das Muster dort keine Fenster). */
const SOCKEL_ANTEIL = 0.22
/** Fenster im Muster: Anteil einer Zelle (Geschoss), von unten. */
const MUSTER_V0 = FENSTER_BRUESTUNG / 3
const MUSTER_V1 = (FENSTER_BRUESTUNG + FENSTER_H) / 3
/** Steigung der Satteldaecher (tan) und hoechster First ueber der Traufe. */
const DACH_NEIGUNG = 0.7
const FIRST_MAX = 4.5
/** So lange darf ein Aufruf von schritt() bauen (ms); wer schneller als
 *  SCHNELL_M je Bild unterwegs ist (Sprung, Flug), braucht das Innere hier
 *  nicht: dann nur BAU_SCHNELL_MS. */
const BAU_MS = 5
const BAU_SCHNELL_MS = 1
const SCHNELL_M = 1
/** Ab diesem Abstand (Meter zum Umriss) wird der Plan eines Hauses schon
 *  gerechnet (im Worker), damit er bei INNEN_LADEN_M bereitliegt. */
const PLAN_M = 60
/** So viele Plaene rechnet der Worker hoechstens zugleich (die naechsten
 *  Haeuser zuerst; wer vorbeifaehrt, laesst keine lange Schlange zurueck). */
const PLAN_OFFEN = 2
/** Das Innere eines geladenen Hauses ist nur bis hier zu sehen (Meter zum
 *  Umriss): weiter weg sieht man durch die Tuer nichts mehr davon, und es
 *  kostet keine Zeichenaufrufe. Ab SICHT_WEG_M wieder aus (kein Flackern). */
const SICHT_M = 22
const SICHT_WEG_M = 26
/** Raster fuer die Suche nach Haeusern und Hindernissen (Meter). */
const ZELLE = 50
/** Strassen werden alle so viele Meter neu abgetastet. */
const STRASSE_SCHRITT = 4
/** Fahrzeuge: hoechstens so viele geparkte, nur so weit um die Siedlung
 *  (dazu Feuerwehr, Rettung, Polizei und Bus; ferne blendet der Motor aus). */
const FAHRZEUG_MAX = 25
const FAHRZEUG_UMKREIS = 700
/** Dinge zum Aufheben: so viele, so weit um die Siedlung. */
const DING_ZAHL = 15
const DING_UMKREIS = 500
/** Sprungziele: so weit vor der Tuer, hoechstens so viele. */
const SPRUNG_VOR = 1.5
const SPRUNG_MAX = 80
/** Stellen vor der Tuer fuer Sprungziele: Abstand nach aussen und quer (m). */
const SPRUNG_STELLEN: readonly (readonly [number, number])[] = [
  [SPRUNG_VOR, 0], [2.5, 0], [3.5, 0], [5, 0], [3.5, 2], [3.5, -2], [7, 0], [5, 3.5], [5, -3.5],
]
/** Arten, deren Haeuser immer Sprungziele werden, auch weit weg. */
const SPRUNG_WICHTIG: ReadonlySet<StadtHausArt> = new Set<StadtHausArt>(['einkaufszentrum', 'spital', 'feuerwehr', 'schule', 'kirche', 'supermarkt', 'kindergarten'])
/** Frei heisst: so weit (Meter) von jedem Hindernis. */
const FREI_R = 0.3
/** Laternen entlang der Haupt- und Nebenstrassen. */
const LAMPE_ABSTAND = 40
const LAMPE_MAX = 300
/** Baeume: hoechstens so viele, im Wald etwa so dicht (Meter). */
const BAUM_MAX = 5000
const WALD_RASTER = 9
/** So viele Gitterpunkte zeichnet das Gelaende hoechstens (sonst jeder zweite ...). */
const GITTER_MAX = 110000
/** Stelle im Fenstermuster ohne Fenster (fuer alles ausser Fassaden). */
const LEER_U = 0.04
const LEER_V = 0.04
/** Fenster: Glas und Rahmen vor der Wand, Rahmenbreite. */
const GLAS_VOR = 0.03
const RAHMEN_VOR = 0.018
const RAHMEN_B = 0.07
/** Tuerblatt so weit hinter der Aussenkante, Stufen so tief. */
const BLATT_TIEF = 0.12
const STUFE_TIEF = 0.3
const STUFE_HOCH = 0.17
/** Hoehe der Oberflaechen ueber dem Gelaende (Meter), damit sich nichts schneidet. */
const UEBER: Record<StadtStrasse['art'], number> = {
  haupt: 0.045,
  neben: 0.042,
  wohn: 0.038,
  dienst: 0.036,
  feldweg: 0.03,
  fuss: 0.033,
  rad: 0.034,
  treppe: 0.035,
  gleis: 0.032,
}
const WASSER_UEBER = 0.02
const MARKE_UEBER = 0.012
const EPS = 1e-9

type P = [number, number]
type Ton = [number, number, number]

const ART_NAME: Record<StadtHausArt, string> = {
  wohnen: 'Wohnhaus',
  haus: 'Haus',
  laden: 'Geschäft',
  supermarkt: 'Supermarkt',
  einkaufszentrum: 'Einkaufszentrum',
  feuerwehr: 'Feuerwehr',
  spital: 'Spital',
  schule: 'Schule',
  kindergarten: 'Kindergarten',
  kirche: 'Kirche',
  buero: 'Büro',
  halle: 'Halle',
  garage: 'Garage',
  schuppen: 'Schuppen',
  sonst: 'Gebäude',
}

/** Groesse der Fahrzeuge zum Aufstellen (laenge, breite), wie fahrzeug3d.ts ungefaehr. */
const FZ_MASS: Record<FahrzeugArt, [number, number]> = {
  auto: [4.3, 1.8],
  kombi: [4.7, 1.85],
  transporter: [5.3, 2.0],
  feuerwehr: [8.0, 2.5],
  rettung: [6.0, 2.1],
  polizei: [4.7, 1.85],
  bus: [12.0, 2.55],
}

/* ------------------------------------------------ Kleine Rechnungen */

function zufallMit(saat: number): () => number {
  let s = saat >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Saat aus einem Text (FNV-1a). */
function saatText(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Saat aus Zahlen auf ganze Zentimeter. */
function saatZahlen(a: number, b: number, c = 0): number {
  let h = 0x811c9dc5
  for (const v of [a, b, c]) {
    h ^= Math.round(v * 100) | 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const begrenzt = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const endlich = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Flaeche mit Vorzeichen (x, z). */
function flaecheVon(poly: readonly P[]): number {
  let a = 0
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % n]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return a / 2
}

function imVieleck(x: number, z: number, poly: readonly P[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1] || EPS) + a[0]) drin = !drin
  }
  return drin
}

function abstandStrecke(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  const t = l2 > EPS ? begrenzt(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0
  return Math.hypot(px - ax - dx * t, pz - az - dz * t)
}

/** Ein gedrehtes Rechteck in Siedlungsmetern: Mitte, halbe Laenge entlang
 *  (ux, uz), halbe Tiefe quer dazu. */
interface Rech {
  x: number
  z: number
  hl: number
  ht: number
  ux: number
  uz: number
  oben?: number
}

/** Abstand eines Punkts zum Rechteck (innen negativ oder 0). */
function rechAbstand(r: Rech, px: number, pz: number): number {
  const dx = px - r.x
  const dz = pz - r.z
  const a = Math.abs(dx * r.ux + dz * r.uz) - r.hl
  const b = Math.abs(-dx * r.uz + dz * r.ux) - r.ht
  if (a <= 0 && b <= 0) return Math.max(a, b)
  return Math.hypot(Math.max(a, 0), Math.max(b, 0))
}

/** Ueberlappen sich zwei Rechtecke (Trennachsen)? */
function rechUeber(a: Rech, b: Rech): boolean {
  const achsen: P[] = [
    [a.ux, a.uz],
    [-a.uz, a.ux],
    [b.ux, b.uz],
    [-b.uz, b.ux],
  ]
  const dx = b.x - a.x
  const dz = b.z - a.z
  for (const [ax, az] of achsen) {
    const ra = a.hl * Math.abs(a.ux * ax + a.uz * az) + a.ht * Math.abs(-a.uz * ax + a.ux * az)
    const rb = b.hl * Math.abs(b.ux * ax + b.uz * az) + b.ht * Math.abs(-b.uz * ax + b.ux * az)
    if (Math.abs(dx * ax + dz * az) >= ra + rb) return false
  }
  return true
}

/** Strahlen mit begrenzter Weite (Hinstellen, Antippen) pruefen ein
 *  grosses Mesh einer Kachel nur, wenn es in Reichweite ist; three prueft
 *  sonst jedes Dreieck der Kachel, auch fuer einen Strahl von 5 m. */
const KUGEL = new Sphere()
function nurInReichweite(m: Mesh): void {
  m.raycast = (rc: Raycaster, treffer: Intersection[]) => {
    const g = m.geometry
    if (Number.isFinite(rc.far)) {
      if (!g.boundingSphere) g.computeBoundingSphere()
      if (g.boundingSphere) {
        KUGEL.copy(g.boundingSphere).applyMatrix4(m.matrixWorld)
        if (rc.ray.origin.distanceTo(KUGEL.center) - KUGEL.radius > rc.far) return
      }
    }
    Mesh.prototype.raycast.call(m, rc, treffer)
  }
}

/** Trifft die Hoehe y0..y1 ein Fensterband im Muster (Geschosse ab boden)? */
function fensterBand(y0: number, y1: number, boden: number, gh: number): boolean {
  const v0 = (y0 - boden) / gh
  const v1 = (y1 - boden) / gh
  for (let g = Math.floor(v0) - 1; g <= Math.floor(v1) + 1; g++) {
    if (g + MUSTER_V1 > v0 + 1e-6 && g + MUSTER_V0 < v1 - 1e-6) return true
  }
  return false
}

/** Ein Raster von Zellen mit Indizes, fuer schnelle Suche in der Naehe. */
class Raster {
  private karte = new Map<number, number[]>()
  private stempel: Int32Array
  private nr = 0
  private zelle: number

  constructor(zelle: number, anzahl: number) {
    this.zelle = zelle
    this.stempel = new Int32Array(Math.max(1, anzahl))
  }

  private schluessel(gx: number, gz: number): number {
    return (gx + 4096) * 8192 + (gz + 4096)
  }

  dazu(i: number, x0: number, z0: number, x1: number, z1: number): void {
    if (i >= this.stempel.length) {
      const neu = new Int32Array(Math.max(i + 1, this.stempel.length * 2))
      neu.set(this.stempel)
      this.stempel = neu
    }
    const gx0 = Math.floor(x0 / this.zelle)
    const gx1 = Math.floor(x1 / this.zelle)
    const gz0 = Math.floor(z0 / this.zelle)
    const gz1 = Math.floor(z1 / this.zelle)
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const k = this.schluessel(gx, gz)
        const l = this.karte.get(k)
        if (l) l.push(i)
        else this.karte.set(k, [i])
      }
    }
  }

  /** Jeden Index im Bereich hoechstens einmal. fn gibt true: aufhoeren. */
  suche(x0: number, z0: number, x1: number, z1: number, fn: (i: number) => boolean | void): void {
    this.nr++
    const nr = this.nr
    const gx0 = Math.floor(x0 / this.zelle)
    const gx1 = Math.floor(x1 / this.zelle)
    const gz0 = Math.floor(z0 / this.zelle)
    const gz1 = Math.floor(z1 / this.zelle)
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        const l = this.karte.get(this.schluessel(gx, gz))
        if (!l) continue
        for (const i of l) {
          if (this.stempel[i] === nr) continue
          this.stempel[i] = nr
          if (fn(i) === true) return
        }
      }
    }
  }
}

/* ------------------------------------------------ Geometrie sammeln */

/** Dreiecke mit Index: Lage, Farbe (ein Byte je Kanal) und Stelle im
 *  Fenstermuster. Ohne Normalen: das Material schattiert flach. */
class Puffer {
  l: Float32Array
  f: Uint8Array
  t: Float32Array
  i: Uint32Array
  nv = 0
  ni = 0

  constructor(platz = 1024) {
    this.l = new Float32Array(3 * platz)
    this.f = new Uint8Array(3 * platz)
    this.t = new Float32Array(2 * platz)
    this.i = new Uint32Array(platz * 2)
  }

  ecke(x: number, y: number, z: number, c: Ton, u = LEER_U, v = LEER_V): number {
    const k = this.nv
    if (3 * k + 3 > this.l.length) {
      const l = new Float32Array(this.l.length * 2)
      l.set(this.l)
      this.l = l
      const f = new Uint8Array(this.f.length * 2)
      f.set(this.f)
      this.f = f
      const t = new Float32Array(this.t.length * 2)
      t.set(this.t)
      this.t = t
    }
    this.l[3 * k] = x
    this.l[3 * k + 1] = y
    this.l[3 * k + 2] = z
    this.f[3 * k] = c[0]
    this.f[3 * k + 1] = c[1]
    this.f[3 * k + 2] = c[2]
    this.t[2 * k] = u
    this.t[2 * k + 1] = v
    this.nv = k + 1
    return k
  }

  dreieck(a: number, b: number, c: number): void {
    if (this.ni + 3 > this.i.length) {
      const i = new Uint32Array(this.i.length * 2)
      i.set(this.i)
      this.i = i
    }
    this.i[this.ni] = a
    this.i[this.ni + 1] = b
    this.i[this.ni + 2] = c
    this.ni += 3
  }

  bauen(): BufferGeometry | null {
    if (!this.ni) return null
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(this.l.slice(0, 3 * this.nv), 3))
    g.setAttribute('color', new BufferAttribute(this.f.slice(0, 3 * this.nv), 3, true))
    g.setAttribute('uv', new BufferAttribute(this.t.slice(0, 2 * this.nv), 2))
    g.setIndex(new BufferAttribute(this.nv < 65536 ? Uint16Array.from(this.i.subarray(0, this.ni)) : this.i.slice(0, this.ni), 1))
    g.computeBoundingSphere()
    return g
  }
}

/* Viereck ueber die Felder Q (vier Ecken a, b, c, d rundherum) und QT (Stellen
 * im Muster), sichtbar zur Seite n. Ohne Listen, damit beim Bauen kaum
 * Muell entsteht. */
const Q = new Float64Array(12)
const QT = new Float64Array(8)
function setQ(a0: number, a1: number, a2: number, b0: number, b1: number, b2: number, c0: number, c1: number, c2: number, d0: number, d1: number, d2: number): void {
  Q[0] = a0
  Q[1] = a1
  Q[2] = a2
  Q[3] = b0
  Q[4] = b1
  Q[5] = b2
  Q[6] = c0
  Q[7] = c1
  Q[8] = c2
  Q[9] = d0
  Q[10] = d1
  Q[11] = d2
}
function vierQ(p: Puffer, nx: number, ny: number, nz: number, c: Ton, muster: boolean): void {
  const ex = Q[3] - Q[0]
  const ey = Q[4] - Q[1]
  const ez = Q[5] - Q[2]
  const fx = Q[6] - Q[0]
  const fy = Q[7] - Q[1]
  const fz = Q[8] - Q[2]
  const vorn = (ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz >= 0
  const i0 = p.ecke(Q[0], Q[1], Q[2], c, muster ? QT[0] : LEER_U, muster ? QT[1] : LEER_V)
  const i1 = p.ecke(Q[3], Q[4], Q[5], c, muster ? QT[2] : LEER_U, muster ? QT[3] : LEER_V)
  const i2 = p.ecke(Q[6], Q[7], Q[8], c, muster ? QT[4] : LEER_U, muster ? QT[5] : LEER_V)
  const i3 = p.ecke(Q[9], Q[10], Q[11], c, muster ? QT[6] : LEER_U, muster ? QT[7] : LEER_V)
  if (vorn) {
    p.dreieck(i0, i1, i2)
    p.dreieck(i0, i2, i3)
  } else {
    p.dreieck(i0, i2, i1)
    p.dreieck(i0, i3, i2)
  }
}

/** Dreieck, nach oben (oben = true) oder unten gewendet. */
function dreiObenAuf(p: Puffer, ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, c: Ton, oben = true): void {
  const ex = bx - ax
  const ez = bz - az
  const fx = cx - ax
  const fz = cz - az
  const ny = ez * fx - ex * fz
  if (Math.abs(ny) < 1e-12) return
  const i0 = p.ecke(ax, ay, az, c)
  const i1 = p.ecke(bx, by, bz, c)
  const i2 = p.ecke(cx, cy, cz, c)
  if (ny > 0 === oben) p.dreieck(i0, i1, i2)
  else p.dreieck(i0, i2, i1)
}

/* ------------------------------------------------ Farben */

function farbenAus(f: Farben3D) {
  const c = (s: string) => new Color(s)
  const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t)
  const mal = (a: Color, k: number) => a.clone().multiplyScalar(k)
  const b = {
    rasen: c(f.rasen),
    weg: c(f.weg),
    baum: c(f.baum),
    stamm: c(f.stamm),
    hecke: c(f.hecke),
    fassade: c(f.fassade),
    wand: c(f.wand3d),
    weiss: c(f.weiss),
    metall: c(f.metall),
    schwarz: c(f.schwarz),
    glas: c(f.glas),
    holz: c(f.holz),
    holzDunkel: c(f.holzDunkel),
    rot: c(f.spielRot),
    blau: c(f.spielBlau),
    gelb: c(f.spielGelb),
    gruen: c(f.spielGruen),
    rahmen: c(f.rahmen3d),
    platte: c(f.platte),
    wasser: c(f.wasser),
  }
  return {
    ...b,
    boden: mix(b.rasen, b.weg, 0.12),
    flaeche: {
      wiese: b.rasen.clone(),
      park: mix(b.rasen, b.gruen, 0.18),
      wald: mal(mix(b.baum, b.stamm, 0.3), 0.85),
      acker: mal(mix(b.weg, b.holz, 0.45), 0.92),
      wasser: mix(b.wasser, b.blau, 0.2),
      parkplatz: mal(b.weg, 0.5),
      sport: mix(b.rasen, b.gruen, 0.4),
      spielplatz: mix(b.gelb, b.weg, 0.6),
      friedhof: mix(b.rasen, b.hecke, 0.5),
      gewerbe: mal(mix(b.weg, b.fassade, 0.3), 0.85),
      wohngebiet: mix(b.rasen, b.weg, 0.22),
      fels: mal(mix(b.metall, b.weg, 0.5), 0.85),
      schwimmbad: mix(b.wasser, b.weiss, 0.35),
    } as Record<StadtFlaechenArt, Color>,
    strasse: {
      haupt: mal(b.weg, 0.32),
      neben: mal(b.weg, 0.35),
      wohn: mal(b.weg, 0.38),
      dienst: mal(b.weg, 0.41),
      feldweg: mix(b.weg, b.holz, 0.3),
      fuss: mix(b.weg, b.fassade, 0.25),
      rad: mix(mal(b.weg, 0.55), b.rot, 0.15),
      treppe: mal(mix(b.weg, b.fassade, 0.4), 0.92),
      gleis: mal(mix(b.weg, b.stamm, 0.4), 0.7),
    } as Record<StadtStrasse['art'], Color>,
    schiene: mal(b.metall, 0.8),
    marke: mal(b.weiss, 0.95),
    sockel: mal(b.wand, 0.72),
    leibung: mal(b.fassade, 0.82),
    glasDunkel: mix(b.glas, b.schwarz, 0.62),
    tuer: mix(b.holzDunkel, b.holz, 0.3),
    stufe: mix(b.weg, b.fassade, 0.45),
    mauer: mal(mix(b.fassade, b.metall, 0.35), 0.85),
    zaun: mix(b.metall, b.schwarz, 0.3),
    bruecke: mal(mix(b.fassade, b.metall, 0.3), 0.9),
    dachFlach: mal(mix(b.weg, b.metall, 0.3), 0.78),
    daecher: [mal(mix(b.rot, b.stamm, 0.45), 0.85), mix(b.platte, b.metall, 0.25), mix(b.schwarz, b.platte, 0.5), mix(b.holzDunkel, b.rot, 0.25)],
    fassaden: {
      wohnen: [mix(b.fassade, b.weiss, 0.55), mix(b.fassade, b.holz, 0.2), mix(b.fassade, b.gelb, 0.18), mix(b.fassade, b.metall, 0.3), mix(b.fassade, b.rot, 0.1), mix(b.fassade, b.weiss, 0.3)],
      laden: [mix(b.fassade, b.weiss, 0.6), mix(b.fassade, b.metall, 0.4), mix(b.fassade, b.blau, 0.12)],
      halle: [mix(b.metall, b.fassade, 0.4), mix(b.holz, b.holzDunkel, 0.3), mix(b.metall, b.weiss, 0.3)],
      feuerwehr: [mix(b.rot, b.fassade, 0.35)],
      spital: [mix(b.fassade, b.weiss, 0.7)],
      schule: [mix(b.fassade, b.gelb, 0.3)],
      kirche: [mix(b.fassade, b.weiss, 0.6)],
    },
    laub: [mix(b.gelb, b.baum, 0.2), mix(b.gelb, b.rot, 0.45), mix(b.rot, b.stamm, 0.2), mix(b.baum, b.gelb, 0.4), b.baum.clone(), mix(b.gelb, b.rot, 0.25)],
    waldLaub: [b.baum.clone(), mal(b.baum, 0.85), mix(b.baum, b.hecke, 0.5), mix(b.baum, b.gelb, 0.2), mal(mix(b.baum, b.schwarz, 0.2), 0.95)],
    lampe: mix(b.weiss, b.gelb, 0.25),
  }
}
type Farben = ReturnType<typeof farbenAus>

/** Farbe als drei Bytes (linear wie Color), mal k. */
function ton(c: Color, k = 1): Ton {
  return [begrenzt(Math.round(c.r * k * 255), 0, 255), begrenzt(Math.round(c.g * k * 255), 0, 255), begrenzt(Math.round(c.b * k * 255), 0, 255)]
}

/** Fassadenfarbe eines Hauses: aus der Karte oder ruhig nach Art. */
function fassadeVon(d: StadtHaus, F: Farben): Color {
  if (typeof d.farbe === 'string' && /^#[0-9a-f]{6}$/i.test(d.farbe)) return new Color(d.farbe)
  const r = saatText(d.id)
  const a = d.art
  const liste =
    a === 'laden' || a === 'supermarkt' || a === 'einkaufszentrum' || a === 'buero'
      ? F.fassaden.laden
      : a === 'halle' || a === 'garage' || a === 'schuppen'
        ? F.fassaden.halle
        : a === 'feuerwehr'
          ? F.fassaden.feuerwehr
          : a === 'spital'
            ? F.fassaden.spital
            : a === 'schule'
              ? F.fassaden.schule
              : a === 'kirche'
                ? F.fassaden.kirche
                : F.fassaden.wohnen
  return liste[r % liste.length]
}

/* ------------------------------------------------ Daten lesen */

function punktLesen(v: unknown, was: string): P {
  if (!Array.isArray(v) || v.length < 2 || !endlich(v[0]) || !endlich(v[1])) throw new Error(`stadt3d: ${was} ist kein Punkt`)
  return [v[0], v[1]]
}

/** Ring ohne doppelten Endpunkt (sonst unveraendert, damit die Indizes der
 *  Kanten wie in den Daten bleiben). */
function ringLesen(v: unknown, was: string): P[] {
  if (!Array.isArray(v)) throw new Error(`stadt3d: ${was} ist keine Liste`)
  const r = v.map((p, i) => punktLesen(p, `${was}[${i}]`))
  if (r.length > 1) {
    const a = r[0]
    const b = r[r.length - 1]
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) r.pop()
  }
  return r
}

function stadtGrob(s: StadtDaten): void {
  if (!s || typeof s !== 'object' || s.art !== 'kistly-stadt') throw new Error('stadt3d: keine Stadt (art)')
  for (const k of ['haeuser', 'strassen', 'flaechen', 'gewaesser', 'zaeune', 'baeume', 'orte'] as const) {
    if (!Array.isArray(s[k])) throw new Error(`stadt3d: ${k} fehlt`)
  }
  const g = s.gelaende
  if (!g || typeof g !== 'object' || !Array.isArray(g.dm)) throw new Error('stadt3d: gelaende fehlt')
}

/** Eine Kante eines Hauses: Anfang a, Richtung u, n nach aussen (weg vom
 *  Haus, bei Innenhoefen in den Hof), Laenge, Index in umriss (-1 bei
 *  Hoefen), Mitten der Fenster je Geschoss (eg: im Erdgeschoss der
 *  Tuerkante ohne die an der Tuer). */
interface Kante {
  ax: number
  az: number
  ux: number
  uz: number
  nx: number
  nz: number
  L: number
  idx: number
  reihe: number[]
  eg: number[] | null
}

interface Haus {
  nr: number
  d: StadtHaus
  id: string
  art: StadtHausArt
  n: number
  gh: number
  boden: number
  oben: number
  unten: number
  umriss: P[]
  loecher: P[][]
  kanten: Kante[]
  tuer: { k: Kante; t: number; b: number; x: number; z: number } | null
  box: [number, number, number, number]
  name: string
  dach: 'flach' | 'sattel' | 'walm'
  kachel: number
  /** Was innenPlanen bekommt (auch Schluessel im Vorrat der Plaene). */
  eingabe: InnenEingabe
  /* Laufzeit */
  teil: InnenTeil | null
  fehler: boolean
  wartet: boolean
  /** Plan: 0 keiner, 1 angefragt (Worker), 2 da (in plan). */
  planStand: 0 | 1 | 2
  plan: InnenPlan | null
  /** Welche Geschosse des Inneren gerade zu sehen sind (k0 bis k1), null: keins. */
  sicht: [number, number] | null
  /** Ausschnitte im Gelaende (Siedlungsmeter), solange das Haus geladen
   *  ist und das Gelaende in ihm hoeher als sein Boden liegt; null: keiner
   *  noetig, undefined: noch nicht gerechnet. */
  schnitt: Ausschnitt[] | null | undefined
  /** Ecken des Tuerblatts im Mesh der Kachel und ihre Lage. */
  blatt: { start: number; ende: number; lage: Float32Array | null } | null
  tuerRech: Rech | null
}

function kanteAus(a: P, b: P, aussenLinks: boolean, idx: number): Kante {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  const ux = L > EPS ? dx / L : 1
  const uz = L > EPS ? dz / L : 0
  // Liegt das Innere links von u (Flaeche positiv), zeigt (uz, -ux) nach aussen.
  const nx = aussenLinks ? uz : -uz
  const nz = aussenLinks ? -ux : ux
  return { ax: a[0], az: a[1], ux, uz, nx, nz, L, idx, reihe: [], eg: null }
}

/* ------------------------------------------------ Bauen */

export function baueStadt(o: StadtOptionen): StadtWelt {
  const s = o.stadt
  stadtGrob(s)
  if (!endlich(o.bodenY)) throw new Error('stadt3d: bodenY ist keine Zahl')
  const F = farbenAus(o.farben)
  const M = o.zuWelt.clone()
  M.elements[13] = o.bodenY
  const me = M.elements
  const c0 = me[0]
  const c2 = me[2]
  const c8 = me[8]
  const c10 = me[10]
  const tx = me[12]
  const tz = me[14]
  if (![c0, c2, c8, c10, tx, tz].every(endlich)) throw new Error('stadt3d: zuWelt ist keine Matrix')
  /** Drehung von zuWelt um die Hochachse (wie rotation.y). */
  const gier0 = Math.atan2(c8, c0)
  const g = s.gelaende
  const hs = (x: number, z: number) => gelaendeHoehe(g, x, z)
  const weltX = (x: number, z: number) => c0 * x + c8 * z + tx
  const weltZ = (x: number, z: number) => c2 * x + c10 * z + tz
  const hoehe = (x: number, z: number): number => {
    const dx = x - tx
    const dz = z - tz
    return gelaendeHoehe(g, c0 * dx + c2 * dz, c8 * dx + c10 * dz)
  }
  /** Blickrichtung (gier, 0 = nach -z) aus einer Richtung in Siedlungsmetern. */
  const gierAus = (dx: number, dz: number) => Math.atan2(-dx, -dz) + gier0
  /** Drehung eines Rechtecks in der Welt aus seiner Richtung (Siedlung). */
  const drehAus = (ux: number, uz: number) => Math.atan2(-uz, ux) + gier0
  const hatLeinwand = typeof document !== 'undefined' && typeof document.createElement === 'function'

  /* ------------------------------------------------ Rahmen und Kacheln */
  let [rx0, rz0, rx1, rz1] = Array.isArray(s.rahmen) && s.rahmen.length === 4 && s.rahmen.every(endlich) ? s.rahmen : [0, 0, 0, 0]
  if (!(rx1 > rx0 && rz1 > rz0)) {
    rx0 = g.x0
    rz0 = g.z0
    rx1 = g.x0 + Math.max(1, g.nx - 1) * g.schritt
    rz1 = g.z0 + Math.max(1, g.nz - 1) * g.schritt
    if (!(rx1 > rx0 && rz1 > rz0)) [rx0, rz0, rx1, rz1] = [-500, -500, 500, 500]
  }
  const nKx = Math.max(1, Math.ceil((rx1 - rx0) / KACHEL))
  const nKz = Math.max(1, Math.ceil((rz1 - rz0) / KACHEL))
  const kachelVon = (x: number, z: number) => begrenzt(Math.floor((x - rx0) / KACHEL), 0, nKx - 1) + nKx * begrenzt(Math.floor((z - rz0) / KACHEL), 0, nKz - 1)

  interface Kachel {
    nr: number
    cx: number
    cz: number
    puffer: Puffer
    mesh: Mesh | null
    fenster: Mesh | null
    wartet: boolean
    /** Halb gebautes Nah-Mesh (Fenster, Tueren), naechstes Haus und Stufen. */
    bau: { p: Puffer; i: number } | null
    nah: boolean
    haeuser: number[]
  }
  const kacheln = new Map<number, Kachel>()
  const kachel = (nr: number): Kachel => {
    let k = kacheln.get(nr)
    if (!k) {
      const i = nr % nKx
      const j = Math.floor(nr / nKx)
      k = { nr, cx: rx0 + (i + 0.5) * KACHEL, cz: rz0 + (j + 0.5) * KACHEL, puffer: new Puffer(), mesh: null, fenster: null, wartet: false, bau: null, nah: false, haeuser: [] }
      kacheln.set(nr, k)
    }
    return k
  }
  const pufferBei = (x: number, z: number) => kachel(kachelVon(x, z)).puffer

  /* ------------------------------------------------ Haeuser lesen */
  const ortName = new Map<string, string>()
  for (const ort of s.orte) {
    const n = typeof ort?.name === 'string' ? ort.name.trim() : ''
    if (ort && typeof ort.haus === 'string' && n && !ortName.has(ort.haus)) ortName.set(ort.haus, n)
  }
  const haeuser: Haus[] = []
  let uebersprungen = 0
  for (let i = 0; i < s.haeuser.length; i++) {
    const d = s.haeuser[i]
    if (!d || typeof d !== 'object' || typeof d.id !== 'string') throw new Error(`stadt3d: haus ${i} ohne Kennung`)
    const umriss = ringLesen(d.umriss, `haus ${d.id}`)
    if (umriss.length < 3 || Math.abs(flaecheVon(umriss)) < 1) {
      uebersprungen++
      continue
    }
    const loecher = (Array.isArray(d.loecher) ? d.loecher : []).map((r, j) => ringLesen(r, `haus ${d.id} hof ${j}`)).filter((r) => r.length >= 3 && Math.abs(flaecheVon(r)) > 0.5)
    const n = begrenzt(Math.round(endlich(d.geschosse) ? d.geschosse : 1), 1, 60)
    const gh = endlich(d.geschossHoehe) && d.geschossHoehe >= 2.5 ? Math.min(d.geschossHoehe, 10) : 3
    let bx0 = Infinity
    let bz0 = Infinity
    let bx1 = -Infinity
    let bz1 = -Infinity
    for (const [x, z] of umriss) {
      bx0 = Math.min(bx0, x)
      bz0 = Math.min(bz0, z)
      bx1 = Math.max(bx1, x)
      bz1 = Math.max(bz1, z)
    }
    const boden = endlich(d.boden) ? d.boden : hs((bx0 + bx1) / 2, (bz0 + bz1) / 2)
    const links = flaecheVon(umriss) > 0
    const kanten: Kante[] = umriss.map((a, k) => kanteAus(a, umriss[(k + 1) % umriss.length], links, k))
    for (const r of loecher) {
      // Fuer einen Hof zeigt "aussen" in den Hof: umgekehrt wie beim Umriss.
      const l = flaecheVon(r) > 0
      r.forEach((a, k) => kanten.push(kanteAus(a, r[(k + 1) % r.length], !l, -1)))
    }
    // Tiefstes Gelaende am Umriss (Ecken und alle 6 m).
    let tief = Infinity
    for (const k of kanten) {
      const m = Math.max(1, Math.ceil(k.L / 6))
      for (let q = 0; q <= m; q++) tief = Math.min(tief, hs(k.ax + (k.ux * k.L * q) / m, k.az + (k.uz * k.L * q) / m))
    }
    tief = Math.min(tief, boden)
    // Die Tuer genau dort, wo auch das Innere sie hat (tuerLage: weg von
    // den Ecken); ohne Angabe an der ersten Kante in der Mitte.
    const tuerDaten = d.tuer && typeof d.tuer === 'object' ? d.tuer : { kante: 0, t: 0.5 }
    let tuer: Haus['tuer'] = null
    const lage = tuerLage(umriss, tuerDaten, d.art)
    if (lage) {
      const kt = kanten[lage.kante]
      tuer = { k: kt, t: lage.t, b: lage.breite, x: kt.ax + kt.ux * lage.t, z: kt.az + kt.uz * lage.t }
    }
    for (const k of kanten) {
      if (k.L < 0.05) continue
      k.reihe = fensterReihe(k.L)
      if (tuer && k === tuer.k) k.eg = fensterOhneTuer(k.L, tuer.t, tuer.b)
    }
    const dach = d.dach === 'sattel' || d.dach === 'walm' ? d.dach : 'flach'
    const name = (typeof d.name === 'string' ? d.name.trim() : '') || ortName.get(d.id) || ''
    const h: Haus = {
      nr: haeuser.length,
      d,
      id: d.id,
      art: d.art,
      n,
      gh,
      boden,
      oben: boden + n * gh,
      unten: tief - UNTER - TIEFER,
      umriss,
      loecher,
      kanten,
      tuer,
      box: [bx0, bz0, bx1, bz1],
      name,
      dach: loecher.length ? 'flach' : dach,
      kachel: kachelVon((bx0 + bx1) / 2, (bz0 + bz1) / 2),
      eingabe: {
        id: d.id,
        art: d.art,
        umriss,
        loecher,
        geschosse: n,
        geschossHoehe: gh,
        tuer: tuerDaten,
        name: name || undefined,
        laeden: Array.isArray(d.laeden) ? d.laeden : undefined,
      },
      teil: null,
      fehler: false,
      wartet: false,
      planStand: 0,
      plan: null,
      sicht: null,
      schnitt: undefined,
      blatt: null,
      tuerRech: null,
    }
    haeuser.push(h)
    kachel(h.kachel).haeuser.push(h.nr)
  }

  const hausRaster = new Raster(ZELLE, haeuser.length)
  for (const h of haeuser) hausRaster.dazu(h.nr, h.box[0], h.box[1], h.box[2], h.box[3])

  /** Liegt (x, z) in einem Haus oder naeher als rand an seinem Umriss? */
  const inHaus = (x: number, z: number, rand: number): boolean => {
    let ja = false
    hausRaster.suche(x - rand, z - rand, x + rand, z + rand, (i) => {
      const h = haeuser[i]
      if (x < h.box[0] - rand || x > h.box[2] + rand || z < h.box[1] - rand || z > h.box[3] + rand) return
      if (imVieleck(x, z, h.umriss) && !h.loecher.some((r) => imVieleck(x, z, r))) {
        ja = true
        return true
      }
      if (rand > 0) {
        for (const k of h.kanten) {
          if (abstandStrecke(x, z, k.ax, k.az, k.ax + k.ux * k.L, k.az + k.uz * k.L) < rand) {
            ja = true
            return true
          }
        }
      }
    })
    return ja
  }
  /** Abstand der Stelle zum Umriss eines Hauses (innen 0). */
  const abstandHaus = (h: Haus, x: number, z: number): number => {
    if (x >= h.box[0] && x <= h.box[2] && z >= h.box[1] && z <= h.box[3] && imVieleck(x, z, h.umriss) && !h.loecher.some((r) => imVieleck(x, z, r))) return 0
    let m = Infinity
    for (const k of h.kanten) m = Math.min(m, abstandStrecke(x, z, k.ax, k.az, k.ax + k.ux * k.L, k.az + k.uz * k.L))
    return m
  }

  /* ------------------------------------------------ Strassen vorbereiten */
  interface Linie {
    art: StadtStrasse['art']
    breite: number
    punkte: P[]
    bruecke: boolean
  }
  const linien: Linie[] = []
  for (let i = 0; i < s.strassen.length; i++) {
    const r = s.strassen[i]
    if (!r || r.tunnel) continue
    const art = r.art in UEBER ? r.art : 'wohn'
    const punkte = ohneDoppelte(ringLesen(r.punkte, `strasse ${i}`))
    if (punkte.length < 2) continue
    const breite = endlich(r.breite) && r.breite > 0.3 ? Math.min(r.breite, 40) : art === 'haupt' ? 7 : art === 'fuss' || art === 'rad' || art === 'treppe' ? 2 : 5
    linien.push({ art, breite, punkte, bruecke: !!r.bruecke })
  }
  // Raster der Strassenstuecke (fuer Baeume im Wald, Laternen, Bus).
  interface Stueck {
    ax: number
    az: number
    bx: number
    bz: number
    b: number
    li: number
  }
  const stuecke: Stueck[] = []
  for (let li = 0; li < linien.length; li++) {
    const l = linien[li]
    for (let k = 0; k + 1 < l.punkte.length; k++) {
      const [ax, az] = l.punkte[k]
      const [bx, bz] = l.punkte[k + 1]
      stuecke.push({ ax, az, bx, bz, b: l.breite, li })
    }
  }
  const stueckRaster = new Raster(25, stuecke.length)
  stuecke.forEach((st, i) => stueckRaster.dazu(i, Math.min(st.ax, st.bx) - st.b, Math.min(st.az, st.bz) - st.b, Math.max(st.ax, st.bx) + st.b, Math.max(st.az, st.bz) + st.b))
  const aufStrasse = (x: number, z: number, rand: number): boolean => {
    let ja = false
    stueckRaster.suche(x - rand, z - rand, x + rand, z + rand, (i) => {
      const st = stuecke[i]
      if (abstandStrecke(x, z, st.ax, st.az, st.bx, st.bz) < st.b / 2 + rand) {
        ja = true
        return true
      }
    })
    return ja
  }

  /* ------------------------------------------------ Baender */

  /** Ein Band entlang punkte zwischen den Versaetzen v0 und v1 (quer zur
   *  Richtung, rechts positiv), Oberseite bei yVon(x, z, f) + hoch (f:
   *  Anteil der Laenge), mit Seiten bis yVon - tief. unten: die Flaeche
   *  zeigt nach unten (Unterseite einer Bruecke). Alle schritt Meter neu
   *  abgetastet, quer ein Feld je 6 m. */
  function band(punkte: P[], v0: number, v1: number, yVon: (x: number, z: number, f: number) => number, farbe: Ton, hoch = 0, seiten = false, tief = 0, unten = false, schritt = STRASSE_SCHRITT, seitenTon: Ton = farbe): void {
    const n = punkte.length
    if (n < 2) return
    // Laengen
    const lang: number[] = [0]
    for (let k = 1; k < n; k++) lang.push(lang[k - 1] + Math.hypot(punkte[k][0] - punkte[k - 1][0], punkte[k][1] - punkte[k - 1][1]))
    const gesamt = lang[n - 1]
    if (gesamt < 0.05) return
    // Abtastpunkte mit Querrichtung (an Ecken auf Gehrung).
    const sx: number[] = []
    const sz: number[] = []
    const qx: number[] = []
    const qz: number[] = []
    const sf: number[] = []
    for (let k = 0; k < n - 1; k++) {
      const [ax, az] = punkte[k]
      const [bx, bz] = punkte[k + 1]
      const l = lang[k + 1] - lang[k]
      if (l < 1e-6) continue
      const ux = (bx - ax) / l
      const uz = (bz - az) / l
      // rechts von u: (-uz, ux)
      let nx = -uz
      let nz = ux
      if (k > 0) {
        const [px, pz] = punkte[k - 1]
        const lp = Math.hypot(ax - px, az - pz)
        if (lp > 1e-6) {
          const mx = -(az - pz) / lp + nx
          const mz = (ax - px) / lp + nz
          const ml = Math.hypot(mx, mz)
          if (ml > 1e-6) {
            const cos = (mx / ml) * nx + (mz / ml) * nz
            const f = 1 / Math.max(cos, 0.35)
            nx = (mx / ml) * f
            nz = (mz / ml) * f
          }
        }
      }
      const m = Math.max(1, Math.ceil(l / schritt))
      for (let q = 0; q < m; q++) {
        sx.push(ax + (bx - ax) * (q / m))
        sz.push(az + (bz - az) * (q / m))
        qx.push(q === 0 ? nx : -uz)
        qz.push(q === 0 ? nz : ux)
        sf.push((lang[k] + (l * q) / m) / gesamt)
      }
    }
    {
      const [ax, az] = punkte[n - 2]
      const [bx, bz] = punkte[n - 1]
      const l = Math.hypot(bx - ax, bz - az) || 1
      sx.push(bx)
      sz.push(bz)
      qx.push(-(bz - az) / l)
      qz.push((bx - ax) / l)
      sf.push(1)
    }
    // Quer ein Feld bis 6 m: bilinear weicht auf 6 m nur wenige cm von der Geraden ab.
    const quer = Math.max(1, Math.ceil((v1 - v0) / 6))
    const reihe = (j: number, p: Puffer): number[] => {
      const out: number[] = []
      for (let q = 0; q <= quer; q++) {
        const v = v0 + ((v1 - v0) * q) / quer
        const x = sx[j] + qx[j] * v
        const z = sz[j] + qz[j] * v
        out.push(p.ecke(x, yVon(x, z, sf[j]) + hoch, z, farbe))
      }
      return out
    }
    let vorher: { k: number; idx: number[] } | null = null
    for (let j = 0; j + 1 < sx.length; j++) {
      const mx = (sx[j] + sx[j + 1]) / 2
      const mz = (sz[j] + sz[j + 1]) / 2
      const kn = kachelVon(mx, mz)
      const p = kachel(kn).puffer
      const a = vorher && vorher.k === kn ? vorher.idx : reihe(j, p)
      const b = reihe(j + 1, p)
      // Richtung der Flaeche: von a nach b und quer.
      const ex = sx[j + 1] - sx[j]
      const ez = sz[j + 1] - sz[j]
      const auf = qz[j] * ex - qx[j] * ez > 0 // Dreieck (a, a+1, b+1) zeigt nach oben
      for (let q = 0; q < quer; q++) {
        if (auf !== unten) {
          p.dreieck(a[q], a[q + 1], b[q + 1])
          p.dreieck(a[q], b[q + 1], b[q])
        } else {
          p.dreieck(a[q], b[q + 1], a[q + 1])
          p.dreieck(a[q], b[q], b[q + 1])
        }
      }
      if (seiten) {
        for (const [v, rechts] of [
          [v0, false],
          [v1, true],
        ] as const) {
          const x0 = sx[j] + qx[j] * v
          const z0 = sz[j] + qz[j] * v
          const x1 = sx[j + 1] + qx[j + 1] * v
          const z1 = sz[j + 1] + qz[j + 1] * v
          const y0 = yVon(x0, z0, sf[j])
          const y1 = yVon(x1, z1, sf[j + 1])
          setQ(x0, y0 - tief, z0, x1, y1 - tief, z1, x1, y1 + hoch, z1, x0, y0 + hoch, z0)
          const s = rechts ? 1 : -1
          vierQ(p, qx[j] * s, 0, qz[j] * s, seitenTon, false)
        }
      }
      vorher = { k: kn, idx: b }
    }
  }

  /** Querstuecke (Stirnseiten) eines erhabenen Bands an Anfang und Ende. */
  function stirn(punkte: P[], v0: number, v1: number, y: (x: number, z: number) => number, hoch: number, tief: number, farbe: Ton): void {
    const n = punkte.length
    if (n < 2) return
    for (const [a, b, s] of [
      [punkte[0], punkte[1], -1],
      [punkte[n - 1], punkte[n - 2], -1],
    ] as const) {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (l < 1e-6) continue
      const ux = (b[0] - a[0]) / l
      const uz = (b[1] - a[1]) / l
      const x0 = a[0] - uz * v0
      const z0 = a[1] + ux * v0
      const x1 = a[0] - uz * v1
      const z1 = a[1] + ux * v1
      const y0 = y(x0, z0)
      const y1 = y(x1, z1)
      setQ(x0, y0 - tief, z0, x1, y1 - tief, z1, x1, y1 + hoch, z1, x0, y0 + hoch, z0)
      vierQ(pufferBei(a[0], a[1]), ux * s, 0, uz * s, farbe, false)
    }
  }

  /* ------------------------------------------------ Strassen, Wasser, Gleise, Stufen */
  const strassenNachArt: Linie[][] = [[], [], [], []]
  for (const l of linien) {
    const rang = l.art === 'haupt' || l.art === 'neben' ? 3 : l.art === 'wohn' || l.art === 'dienst' ? 2 : l.art === 'gleis' ? 0 : 1
    strassenNachArt[rang].push(l)
  }
  // Wasser zuerst (unter allem).
  for (const w of s.gewaesser) {
    if (!w) continue
    const punkte = ohneDoppelte(ringLesen(w.punkte, 'gewaesser'))
    const b = endlich(w.breite) && w.breite > 0.2 ? Math.min(w.breite, 120) : 2
    band(punkte, -b / 2, b / 2, (x, z) => hs(x, z) + WASSER_UEBER, ton(F.flaeche.wasser))
  }
  for (const gruppeL of strassenNachArt) {
    for (const l of gruppeL) {
      const off = UEBER[l.art]
      const farbe = ton(F.strasse[l.art])
      const pa = l.punkte[0]
      const pe = l.punkte[l.punkte.length - 1]
      const ya = hs(pa[0], pa[1])
      const ye = hs(pe[0], pe[1])
      const brueckeY = (_x: number, _z: number, f: number) => ya + (ye - ya) * f + off
      const draufY = (x: number, z: number) => hs(x, z) + off
      if (l.art === 'treppe' && !l.bruecke) {
        stufenBand(l.punkte, l.breite, farbe)
        continue
      }
      if (l.art === 'gleis') {
        const y = l.bruecke ? brueckeY : draufY
        band(l.punkte, -1.4, 1.4, y, farbe)
        for (const v of [-0.75, 0.68]) band(l.punkte, v, v + 0.07, y, ton(F.schiene), 0.15, true, 0, false, STRASSE_SCHRITT, ton(F.schiene, 0.8))
        continue
      }
      if (l.bruecke) {
        band(l.punkte, -l.breite / 2, l.breite / 2, brueckeY, farbe)
        band(l.punkte, -l.breite / 2, l.breite / 2, (x, z, f) => brueckeY(x, z, f) - 0.6, ton(F.bruecke, 0.8), 0, false, 0, true)
        for (const v of [-l.breite / 2 - 0.25, l.breite / 2]) band(l.punkte, v, v + 0.25, brueckeY, ton(F.bruecke), 1.0, true, 0.6, false, STRASSE_SCHRITT, ton(F.bruecke, 0.9))
      } else {
        band(l.punkte, -l.breite / 2, l.breite / 2, draufY, farbe)
      }
      if ((l.art === 'haupt' || l.art === 'neben') && l.breite >= 5) {
        // Mittellinie: 3 m Strich, 6 m Luecke.
        const y = l.bruecke ? brueckeY : draufY
        let laenge = 0
        for (let k = 0; k + 1 < l.punkte.length; k++) laenge += Math.hypot(l.punkte[k + 1][0] - l.punkte[k][0], l.punkte[k + 1][1] - l.punkte[k][1])
        for (let a = 3; a + 3 < laenge - 2; a += 9) {
          const p0 = aufLinie(l.punkte, a)
          const p1 = aufLinie(l.punkte, a + 3)
          if (!p0 || !p1) break
          band([p0, p1], -0.06, 0.06, (x, z, f) => y(x, z, (a + 3 * f) / Math.max(laenge, 1e-6)) + MARKE_UEBER, ton(F.marke))
        }
      }
    }
  }

  /** Stufen entlang einer Linie: flache Tritte nach dem Gelaende, dazwischen
   *  Setzstufen, an den Seiten bis unter das Gelaende. */
  function stufenBand(punkte: P[], breite: number, farbe: Ton): void {
    const seite = ton(F.strasse.treppe, 0.85)
    for (let k = 0; k + 1 < punkte.length; k++) {
      const [ax, az] = punkte[k]
      const [bx, bz] = punkte[k + 1]
      const l = Math.hypot(bx - ax, bz - az)
      if (l < 0.05) continue
      const ux = (bx - ax) / l
      const uz = (bz - az) / l
      const nx = -uz
      const nz = ux
      const tritte = Math.max(1, Math.min(200, Math.round(l / 0.35)))
      const tl = l / tritte
      const p = pufferBei((ax + bx) / 2, (az + bz) / 2)
      let yVor = NaN
      for (let q = 0; q < tritte; q++) {
        const t0 = q * tl
        const t1 = (q + 1) * tl
        const mx = ax + ux * (t0 + t1) / 2
        const mz = az + uz * (t0 + t1) / 2
        const y = hs(mx, mz) + UEBER.treppe
        const x0 = ax + ux * t0
        const z0 = az + uz * t0
        const x1 = ax + ux * t1
        const z1 = az + uz * t1
        const b = breite / 2
        // Tritt
        setQ(x0 - nx * b, y, z0 - nz * b, x0 + nx * b, y, z0 + nz * b, x1 + nx * b, y, z1 + nz * b, x1 - nx * b, y, z1 - nz * b)
        vierQ(p, 0, 1, 0, farbe, false)
        // Setzstufe an t0 zwischen yVor und y.
        if (Number.isFinite(yVor) && Math.abs(y - yVor) > 0.005) {
          const hoch = Math.max(y, yVor)
          const tiefY = Math.min(y, yVor)
          const s = y > yVor ? -1 : 1
          setQ(x0 - nx * b, tiefY, z0 - nz * b, x0 + nx * b, tiefY, z0 + nz * b, x0 + nx * b, hoch, z0 + nz * b, x0 - nx * b, hoch, z0 - nz * b)
          vierQ(p, ux * s, 0, uz * s, seite, false)
        }
        // Seiten bis unter das Gelaende.
        for (const sv of [-1, 1]) {
          const ex0 = x0 + nx * b * sv
          const ez0 = z0 + nz * b * sv
          const ex1 = x1 + nx * b * sv
          const ez1 = z1 + nz * b * sv
          const g0 = Math.min(hs(ex0, ez0), hs(ex1, ez1)) - 0.15
          if (y - g0 < 0.03) continue
          setQ(ex0, g0, ez0, ex1, g0, ez1, ex1, y, ez1, ex0, y, ez0)
          vierQ(p, nx * sv, 0, nz * sv, seite, false)
        }
        yVor = y
      }
    }
  }

  /* ------------------------------------------------ Mauern, Zaeune, Hecken */
  const zaunRechs: Rech[] = []
  for (let zi = 0; zi < s.zaeune.length; zi++) {
    const zn = s.zaeune[zi]
    if (!zn) continue
    const punkte = ohneDoppelte(ringLesen(zn.punkte, `zaun ${zi}`))
    if (punkte.length < 2) continue
    const art = zn.art === 'mauer' || zn.art === 'hecke' ? zn.art : 'zaun'
    const dick = art === 'mauer' ? 0.25 : art === 'hecke' ? 0.8 : 0.08
    const oben = art === 'mauer' ? 1.0 : art === 'hecke' ? 1.3 : 1.1
    const r = zufallMit(saatZahlen(punkte[0][0], punkte[0][1], zi))
    for (let k = 0; k + 1 < punkte.length; k++) {
      const [ax, az] = punkte[k]
      const [bx, bz] = punkte[k + 1]
      const l = Math.hypot(bx - ax, bz - az)
      if (l < 0.05) continue
      zaunRechs.push({ x: (ax + bx) / 2, z: (az + bz) / 2, hl: l / 2, ht: dick / 2, ux: (bx - ax) / l, uz: (bz - az) / l, oben })
    }
    if (art === 'mauer') {
      const c = ton(F.mauer, 0.95 + r() * 0.1)
      band(punkte, -dick / 2, dick / 2, (x, z) => hs(x, z) - 0.2, c, oben + 0.2, true, 0, false, STRASSE_SCHRITT, ton(F.mauer, 0.88))
      stirn(punkte, -dick / 2, dick / 2, (x, z) => hs(x, z) - 0.2, oben + 0.2, 0, ton(F.mauer, 0.85))
    } else if (art === 'hecke') {
      const c = ton(F.hecke, 0.9 + r() * 0.15)
      band(punkte, -dick / 2, dick / 2, (x, z) => hs(x, z) - 0.2, c, oben + 0.2, true, 0, false, STRASSE_SCHRITT, ton(F.hecke, 0.82))
      stirn(punkte, -dick / 2, dick / 2, (x, z) => hs(x, z) - 0.2, oben + 0.2, 0, ton(F.hecke, 0.8))
    } else {
      // Holm oben und Pfosten etwa alle 4 m.
      const c = ton(F.zaun)
      band(punkte, -0.03, 0.03, (x, z) => hs(x, z) + oben - 0.08, c, 0.08, true, 0, false, STRASSE_SCHRITT, ton(F.zaun, 0.85))
      for (let k = 0; k + 1 < punkte.length; k++) {
        const [ax, az] = punkte[k]
        const [bx, bz] = punkte[k + 1]
        const l = Math.hypot(bx - ax, bz - az)
        const m = Math.max(1, Math.round(l / 4))
        for (let q = k === 0 ? 0 : 1; q <= m; q++) pfosten(ax + ((bx - ax) * q) / m, az + ((bz - az) * q) / m, 0.05, oben, c)
      }
    }
  }

  /** Ein duenner Pfosten (vier Seiten) vom Gelaende bis hoch. */
  function pfosten(x: number, z: number, b: number, hoch: number, c: Ton): void {
    const p = pufferBei(x, z)
    const y0 = hs(x, z) - 0.15
    const y1 = hs(x, z) + hoch
    const r = b / 2
    const ecken: P[] = [
      [x - r, z - r],
      [x + r, z - r],
      [x + r, z + r],
      [x - r, z + r],
    ]
    for (let k = 0; k < 4; k++) {
      const a = ecken[k]
      const e = ecken[(k + 1) % 4]
      const mx = (a[0] + e[0]) / 2 - x
      const mz = (a[1] + e[1]) / 2 - z
      setQ(a[0], y0, a[1], e[0], y0, e[1], e[0], y1, e[1], a[0], y1, a[1])
      vierQ(p, mx, 0, mz, c, false)
    }
  }

  /* ------------------------------------------------ Haeuser */

  /** Wandstueck an der Kante k: t0..t1, y0..y1, bei s vor der Kante. Mit
   *  Muster: u nach dem Raster der Fenster (gitter = Mitte des ersten), v
   *  je Geschoss ab boden. */
  function wandViereck(p: Puffer, k: Kante, t0: number, t1: number, y0: number, y1: number, sv: number, c: Ton, gitter: number | null, boden: number, gh: number): void {
    if (t1 - t0 < 1e-3 || y1 - y0 < 1e-3) return
    const x0 = k.ax + k.ux * t0 + k.nx * sv
    const z0 = k.az + k.uz * t0 + k.nz * sv
    const x1 = k.ax + k.ux * t1 + k.nx * sv
    const z1 = k.az + k.uz * t1 + k.nz * sv
    setQ(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0)
    if (gitter !== null) {
      const a = gitter - FENSTER_ABSTAND / 2
      const u0 = (t0 - a) / FENSTER_ABSTAND
      const u1 = (t1 - a) / FENSTER_ABSTAND
      const v0 = (y0 - boden) / gh
      const v1 = (y1 - boden) / gh
      QT[0] = u0
      QT[1] = v0
      QT[2] = u1
      QT[3] = v0
      QT[4] = u1
      QT[5] = v1
      QT[6] = u0
      QT[7] = v1
    }
    vierQ(p, k.nx, 0, k.nz, c, gitter !== null)
  }

  /** Wand mit Fenstermuster: wo die Fenster dieses Stuecks (aus der Reihe
   *  der Kante), schlicht, wo im Raster kein Fenster sein soll. */
  function wandMitMuster(p: Puffer, k: Kante, t0: number, t1: number, y0: number, y1: number, c: Ton, wo: readonly number[] | null, boden: number, gh: number): void {
    if (t1 - t0 < 1e-3 || y1 - y0 < 1e-3) return
    if (!wo || !wo.length || !k.reihe.length || !fensterBand(y0, y1, boden, gh)) {
      wandViereck(p, k, t0, t1, y0, y1, 0, c, null, boden, gh)
      return
    }
    const A = FENSTER_ABSTAND
    const gitter = k.reihe[0]
    const m0 = Math.floor((t0 - gitter) / A) - 1
    const m1 = Math.ceil((t1 - gitter) / A) + 1
    const schlicht: P[] = []
    for (let m = m0; m <= m1; m++) {
      const cm = gitter + m * A
      if (cm + FENSTER_B / 2 <= t0 || cm - FENSTER_B / 2 >= t1) continue
      if (wo.some((w) => Math.abs(w - cm) < 1e-6)) continue
      const a = cm - A / 2
      const b = cm + A / 2
      const letzte = schlicht[schlicht.length - 1]
      if (letzte && a <= letzte[1] + 1e-9) letzte[1] = b
      else schlicht.push([a, b])
    }
    let t = t0
    for (const [a, b] of schlicht) {
      const a1 = Math.max(a, t0)
      const b1 = Math.min(b, t1)
      if (b1 <= t) continue
      if (a1 > t) wandViereck(p, k, t, a1, y0, y1, 0, c, gitter, boden, gh)
      wandViereck(p, k, Math.max(a1, t), b1, y0, y1, 0, c, null, boden, gh)
      t = b1
    }
    if (t < t1) wandViereck(p, k, t, t1, y0, y1, 0, c, gitter, boden, gh)
  }

  /** Waende, Dach und Tuerblatt eines Hauses in den Puffer seiner Kachel.
   *  Einen eigenen Sockel gibt es nur, wo er hoch ist; sonst und oben an
   *  der Attika laeuft die Wand mit Muster durch (dort hat das Muster keine
   *  Fenster). Rahmen, Leibung und Stufen der Tuer kommen mit den Fenstern
   *  in die Naehe (nahBauen). */
  function hausBauen(h: Haus): void {
    const p = kachel(h.kachel).puffer
    const fassade = fassadeVon(h.d, F)
    const r = zufallMit(saatText(h.id))
    const wandTon = ton(fassade, 0.96 + r() * 0.08)
    const wandOben = h.dach === 'flach' ? h.oben + ATTIKA : h.oben
    const sockel = h.boden - h.unten >= SOCKEL_ANTEIL * h.gh
    const fuss = sockel ? h.boden : h.unten
    for (const k of h.kanten) {
      if (k.L < 0.05) continue
      if (sockel) wandViereck(p, k, 0, k.L, h.unten, h.boden, 0, ton(F.sockel), null, h.boden, h.gh)
      const tuer = h.tuer && h.tuer.k === k ? h.tuer : null
      if (tuer) {
        const d0 = begrenzt(tuer.t - tuer.b / 2, 0, k.L)
        const d1 = begrenzt(tuer.t + tuer.b / 2, 0, k.L)
        const eg = k.eg ?? k.reihe
        const egOben = Math.min(h.boden + h.gh, h.oben)
        wandMitMuster(p, k, 0, d0, fuss, egOben, wandTon, eg, h.boden, h.gh)
        wandMitMuster(p, k, d1, k.L, fuss, egOben, wandTon, eg, h.boden, h.gh)
        wandMitMuster(p, k, d0, d1, Math.min(h.boden + TUER_H, egOben), egOben, wandTon, eg, h.boden, h.gh)
        if (!sockel) wandViereck(p, k, d0, d1, h.unten, h.boden, 0, wandTon, null, h.boden, h.gh)
        wandMitMuster(p, k, 0, k.L, egOben, wandOben, wandTon, k.reihe, h.boden, h.gh)
      } else {
        wandMitMuster(p, k, 0, k.L, fuss, wandOben, wandTon, k.reihe, h.boden, h.gh)
      }
    }
    if (h.dach === 'flach') flachdach(p, h, wandTon)
    else steildach(p, h, wandTon, ton(F.daecher[saatText(h.id + 'd') % F.daecher.length]))
    // Zuletzt das Tuerblatt: diese Ecken verschwinden, sobald das Haus offen ist.
    if (h.tuer) {
      const t = h.tuer
      const k = t.k
      const start = p.nv
      const laden = h.art === 'laden' || h.art === 'supermarkt' || h.art === 'einkaufszentrum'
      wandViereck(p, k, begrenzt(t.t - t.b / 2, 0, k.L), begrenzt(t.t + t.b / 2, 0, k.L), h.boden, h.boden + TUER_H, -BLATT_TIEF, ton(laden ? F.glasDunkel : F.tuer), null, h.boden, 1)
      h.blatt = { start, ende: p.nv, lage: null }
    }
  }

  /** Rahmen und Leibung (Seiten und Sturz) der Tuerluecke, fuer die Naehe. */
  function tuerLeibung(p: Puffer, h: Haus): void {
    const t = h.tuer
    if (!t) return
    const k = t.k
    const d0 = begrenzt(t.t - t.b / 2, 0, k.L)
    const d1 = begrenzt(t.t + t.b / 2, 0, k.L)
    const boden = h.boden
    const yo = boden + TUER_H
    const w = AUSSENWAND_M
    const c = ton(fassadeVon(h.d, F), 0.8)
    // Seiten der Luecke (zeigen zur Mitte der Tuer).
    for (const [tt, sv] of [
      [d0, 1],
      [d1, -1],
    ] as const) {
      const x = k.ax + k.ux * tt
      const z = k.az + k.uz * tt
      setQ(x, boden, z, x - k.nx * w, boden, z - k.nz * w, x - k.nx * w, yo, z - k.nz * w, x, yo, z)
      vierQ(p, k.ux * sv, 0, k.uz * sv, c, false)
    }
    // Sturz, nach unten sichtbar.
    const xa = k.ax + k.ux * d0
    const za = k.az + k.uz * d0
    const xb = k.ax + k.ux * d1
    const zb = k.az + k.uz * d1
    setQ(xa, yo, za, xb, yo, zb, xb - k.nx * w, yo, zb - k.nz * w, xa - k.nx * w, yo, za - k.nz * w)
    vierQ(p, 0, -1, 0, c, false)
    // Rahmen vorn: zwei Pfosten und oben.
    const rb = 0.1
    const rt = ton(F.rahmen)
    wandViereck(p, k, d0 - rb, d0, boden, yo + rb, 0.02, rt, null, boden, 1)
    wandViereck(p, k, d1, d1 + rb, boden, yo + rb, 0.02, rt, null, boden, 1)
    wandViereck(p, k, d0, d1, yo, yo + rb, 0.02, rt, null, boden, 1)
  }

  /** Stufen vor der Haustuer: vom Gelaende SCHWELLE_VOR vor der Kante (dort
   *  beginnt die Schwelle, Treppe3D aus innen3d.ts) bis zum Boden des
   *  Erdgeschosses an der Aussenkante. Immer da, offen wie zu: beim Laden
   *  aendert sich nichts, und innen3d zeichnet sie nicht noch einmal. */
  function tuerStufen(p: Puffer, h: Haus): void {
    const t = h.tuer
    if (!t) return
    const k = t.k
    const d0 = begrenzt(t.t - t.b / 2, 0, k.L)
    const d1 = begrenzt(t.t + t.b / 2, 0, k.L)
    const vx = t.x + k.nx * SCHWELLE_VOR
    const vz = t.z + k.nz * SCHWELLE_VOR
    const unten = hs(vx, vz)
    const hoehe = h.boden - unten
    if (hoehe < 0.08) return
    const n = Math.max(1, Math.min(12, Math.ceil(hoehe / STUFE_HOCH)))
    const auf = hoehe / n
    const tief = Math.min(STUFE_TIEF, SCHWELLE_VOR / n)
    const st = ton(F.stufe)
    const seite = ton(F.stufe, 0.85)
    const b0 = Math.max(0, d0 - 0.2)
    const b1 = Math.min(k.L, d1 + 0.2)
    const g = Math.min(unten, h.boden) - 0.25
    const pt = (tt: number, ss: number): P => [k.ax + k.ux * tt + k.nx * ss, k.az + k.uz * tt + k.nz * ss]
    for (let i = 0; i < n; i++) {
      const y = h.boden - i * auf
      const s0 = i * tief
      const s1 = i === n - 1 ? SCHWELLE_VOR : (i + 1) * tief
      const a = pt(b0, s0)
      const b = pt(b1, s0)
      const c = pt(b1, s1)
      const d = pt(b0, s1)
      setQ(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1], d[0], y, d[1])
      vierQ(p, 0, 1, 0, st, false)
      // Setzstufe vorn bis zum naechsten Tritt (oder unter das Gelaende).
      const yu = i === n - 1 ? g : y - auf
      setQ(d[0], yu, d[1], c[0], yu, c[1], c[0], y, c[1], d[0], y, d[1])
      vierQ(p, k.nx, 0, k.nz, seite, false)
      for (const [tt, sv] of [
        [b0, -1],
        [b1, 1],
      ] as const) {
        const e0 = pt(tt, s0)
        const e1 = pt(tt, s1)
        setQ(e0[0], g, e0[1], e1[0], g, e1[1], e1[0], y, e1[1], e0[0], y, e0[1])
        vierQ(p, k.ux * sv, 0, k.uz * sv, seite, false)
      }
    }
  }

  /** Flachdach mit Attika. Grosse Haeuser mit Abdeckung und Innenseite
   *  (nach innen versetzt), kleine nur mit der Innenseite der Wand. */
  function flachdach(p: Puffer, h: Haus, wandTon: Ton): void {
    const attika = Math.abs(flaecheVon(h.umriss)) >= ATTIKA_FLAECHE
    const y = h.oben + 0.02
    const dachTon = ton(F.dachFlach, 0.95 + (saatText(h.id) % 10) / 100)
    const kontur = h.umriss.map(([x, z]) => new Vector2(x, z))
    const hoefe = h.loecher.map((r) => r.map(([x, z]) => new Vector2(x, z)))
    const alle: P[] = [...h.umriss, ...h.loecher.flat()]
    let dreiecke: number[][] = []
    try {
      dreiecke = ShapeUtils.triangulateShape(kontur, hoefe)
    } catch {
      dreiecke = []
    }
    for (const [a, b, c] of dreiecke) {
      const pa = alle[a]
      const pb = alle[b]
      const pc = alle[c]
      if (!pa || !pb || !pc) continue
      dreiObenAuf(p, pa[0], y, pa[1], pb[0], y, pb[1], pc[0], y, pc[1], dachTon)
    }
    const innenTon: Ton = [Math.round(wandTon[0] * 0.85), Math.round(wandTon[1] * 0.85), Math.round(wandTon[2] * 0.85)]
    const yo = h.oben + ATTIKA
    if (!attika) {
      // Duenne Attika: die Wand von innen, vom Dach bis oben.
      for (const k of h.kanten) {
        if (k.L < 0.05) continue
        const bx = k.ax + k.ux * k.L
        const bz = k.az + k.uz * k.L
        setQ(k.ax, y, k.az, bx, y, bz, bx, yo, bz, k.ax, yo, k.az)
        vierQ(p, -k.nx, 0, -k.nz, innenTon, false)
      }
      return
    }
    // Attika je Ring: Abdeckung und Innenseite bis zur Dachflaeche.
    const kappe = ton(F.mauer, 1.05)
    for (const ring of [h.umriss, ...h.loecher]) {
      const ein = einwaerts(ring, ATTIKA_B, ring === h.umriss ? flaecheVon(ring) > 0 : flaecheVon(ring) < 0)
      const n = ring.length
      for (let i = 0; i < n; i++) {
        const a = ring[i]
        const b = ring[(i + 1) % n]
        const ia = ein[i]
        const ib = ein[(i + 1) % n]
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05) continue
        setQ(a[0], yo, a[1], b[0], yo, b[1], ib[0], yo, ib[1], ia[0], yo, ia[1])
        vierQ(p, 0, 1, 0, kappe, false)
        // Innenseite: zeigt vom Umriss weg ins Dach.
        const mx = (a[0] + b[0]) / 2 - (ia[0] + ib[0]) / 2
        const mz = (a[1] + b[1]) / 2 - (ia[1] + ib[1]) / 2
        setQ(ia[0], y, ia[1], ib[0], y, ib[1], ib[0], yo, ib[1], ia[0], yo, ia[1])
        vierQ(p, -mx, 0, -mz, innenTon, false)
      }
    }
  }

  /** Sattel- oder Walmdach ueber dem kleinsten Rechteck um den Umriss,
   *  auf den Umriss zugeschnitten, mit Giebeln. */
  function steildach(p: Puffer, h: Haus, wandTon: Ton, dachTon: Ton): void {
    const box = kleinstesRechteck(h.umriss)
    if (!box) {
      flachdach(p, h, wandTon)
      return
    }
    const { cx, cz, ex, ez, halbL, halbB } = box
    const k = Math.min(DACH_NEIGUNG, FIRST_MAX / Math.max(halbB, 0.5))
    // Ebenen: Hoehe = oben + k * (d - a.p); a als Richtung, d als Abstand.
    const ebenen: { ax: number; az: number; d: number }[] = [
      { ax: -ez, az: ex, d: halbB + (-ez * cx + ex * cz) },
      { ax: ez, az: -ex, d: halbB + (ez * cx - ex * cz) },
    ]
    if (h.dach === 'walm') {
      ebenen.push({ ax: ex, az: ez, d: halbL + (ex * cx + ez * cz) })
      ebenen.push({ ax: -ex, az: -ez, d: halbL - (ex * cx + ez * cz) })
    }
    const dachY = (x: number, z: number) => {
      let m = Infinity
      for (const e of ebenen) m = Math.min(m, e.d - (e.ax * x + e.az * z))
      return h.oben + k * Math.max(0, m)
    }
    for (let i = 0; i < ebenen.length; i++) {
      const e = ebenen[i]
      let stueck: P[] = h.umriss.slice()
      for (let j = 0; j < ebenen.length && stueck.length >= 3; j++) {
        if (j === i) continue
        const f = ebenen[j]
        // Behalten, wo e niedriger oder gleich f: (f.a - e.a).p <= f.d - e.d
        stueck = halbebene(stueck, f.ax - e.ax, f.az - e.az, f.d - e.d)
      }
      if (stueck.length < 3 || Math.abs(flaecheVon(stueck)) < 1e-4) continue
      let dreiecke: number[][] = []
      try {
        dreiecke = ShapeUtils.triangulateShape(
          stueck.map(([x, z]) => new Vector2(x, z)),
          [],
        )
      } catch {
        dreiecke = []
      }
      const y = (q: P) => h.oben + k * Math.max(0, e.d - (e.ax * q[0] + e.az * q[1]))
      for (const [a, b, c] of dreiecke) {
        const pa = stueck[a]
        const pb = stueck[b]
        const pc = stueck[c]
        if (!pa || !pb || !pc) continue
        dreiObenAuf(p, pa[0], y(pa), pa[1], pb[0], y(pb), pb[1], pc[0], y(pc), pc[1], dachTon)
      }
    }
    // Giebel: je Kante des Umrisses von oben bis unter das Dach.
    const grenzen: { ax: number; az: number; d: number }[] = []
    for (let i = 0; i < ebenen.length; i++) {
      for (let j = i + 1; j < ebenen.length; j++) grenzen.push({ ax: ebenen[j].ax - ebenen[i].ax, az: ebenen[j].az - ebenen[i].az, d: ebenen[j].d - ebenen[i].d })
    }
    for (const kn of h.kanten) {
      if (kn.idx < 0 || kn.L < 0.05) continue
      const ts = [0, kn.L]
      for (const gr of grenzen) {
        const nenner = gr.ax * kn.ux + gr.az * kn.uz
        if (Math.abs(nenner) < 1e-9) continue
        const t = (gr.d - (gr.ax * kn.ax + gr.az * kn.az)) / nenner
        if (t > 1e-4 && t < kn.L - 1e-4) ts.push(t)
      }
      ts.sort((a, b) => a - b)
      for (let q = 0; q + 1 < ts.length; q++) {
        const t0 = ts[q]
        const t1 = ts[q + 1]
        if (t1 - t0 < 1e-4) continue
        const x0 = kn.ax + kn.ux * t0
        const z0 = kn.az + kn.uz * t0
        const x1 = kn.ax + kn.ux * t1
        const z1 = kn.az + kn.uz * t1
        const y0 = dachY(x0, z0)
        const y1 = dachY(x1, z1)
        if (y0 - h.oben < 0.01 && y1 - h.oben < 0.01) continue
        setQ(x0, h.oben, z0, x1, h.oben, z1, x1, y1, z1, x0, y0, z0)
        vierQ(p, kn.nx, 0, kn.nz, wandTon, false)
      }
    }
  }

  for (const h of haeuser) hausBauen(h)

  /* ------------------------------------------------ Gelaende */
  const geometrien: BufferGeometry[] = []
  const materialien: Material[] = []
  const texturen: Texture[] = []
  const gruppe = new Group()
  gruppe.name = 'stadt'
  const lage = new Group()
  lage.name = 'stadtLage'
  lage.matrix.copy(M)
  lage.matrix.decompose(lage.position, lage.quaternion, lage.scale)
  lage.matrixAutoUpdate = false
  gruppe.add(lage)

  const gitter = gitterAus(g, [rx0, rz0, rx1, rz1], hs)
  const bild = hatLeinwand ? gelaendeBild() : null
  // Beidseitig: aus einem Fenster im Erdgeschoss am Hang sieht man Erde (die
  // Unterseite), nicht den Himmel durch das Gelaende.
  const bodenMat = new MeshLambertMaterial({ vertexColors: true, map: bild, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3 })
  materialien.push(bodenMat)
  if (bild) texturen.push(bild)
  /** Ein Stueck Gelaende (GROSS m): Gitterbereich, Mesh und die Ausschnitte
   *  darin (fest aus o.aussparen, dazu je offenem Haus seine). */
  interface GelaendeStueck {
    i0: number
    i1: number
    j0: number
    j1: number
    box: Kasten
    mesh: Mesh | null
    fest: Ausschnitt[]
    haus: Map<Haus, Ausschnitt[]>
    /** Muss neu gebaut werden (Ausschnitte eines Hauses kamen oder gingen). */
    neu: boolean
  }
  const gelaendeStuecke: GelaendeStueck[] = []
  const gelaendeMeshes: Mesh[] = []
  const festeAusschnitte: Ausschnitt[] = []
  const basen = new Map<GelaendeStueck, GelaendeBasis>()
  for (const roh of Array.isArray(o.aussparen) ? o.aussparen : []) {
    if (!Array.isArray(roh)) continue
    const pts = roh.filter((p): p is [number, number] => Array.isArray(p) && endlich(p[0]) && endlich(p[1]))
    const a = ausschnittAus(huelle(pts))
    if (a) festeAusschnitte.push(a)
  }
  const gelaendeDaten = (() => {
    const { xs, zs, h: H } = gitter
    const nc = xs.length
    const nr = zs.length
    const klasse = bild ? null : flaechenRaster(xs, zs)
    const klassenTon: Color[] = FLAECHEN_REIHE.map((a) => F.flaeche[a])
    const ph = [0.7, 2.1, 4.4, 5.3]
    const welle = (x: number, z: number) => 0.5 * Math.sin(x * 0.013 + ph[0]) * Math.sin(z * 0.011 + ph[1]) + 0.3 * Math.sin((x - z) * 0.005 + ph[2]) + 0.2 * Math.sin((x + 0.6 * z) * 0.031 + ph[3])
    return { xs, zs, H, nc, nr, klasse, klassenTon, welle, ex0: xs[0], ez0: zs[0], ew: Math.max(1e-6, xs[nc - 1] - xs[0]), eh: Math.max(1e-6, zs[nr - 1] - zs[0]) }
  })()
  {
    const { xs, zs, nc, nr } = gelaendeDaten
    const per = Math.max(1, Math.round(GROSS / Math.max(1e-6, gitter.schritt)))
    for (let ci = 0; ci * per < nc - 1; ci++) {
      for (let cj = 0; cj * per < nr - 1; cj++) {
        const i0 = ci * per
        const i1 = Math.min(nc - 1, (ci + 1) * per)
        const j0 = cj * per
        const j1 = Math.min(nr - 1, (cj + 1) * per)
        const box: Kasten = [xs[i0], zs[j0], xs[i1], zs[j1]]
        const st: GelaendeStueck = { i0, i1, j0, j1, box, mesh: null, fest: festeAusschnitte.filter((a) => kastenUeber(a.box, box)), haus: new Map(), neu: false }
        const geo = gelaendeGeo(st)
        geometrien.push(geo)
        const m = new Mesh(geo, bodenMat)
        m.name = 'gelaende'
        m.matrixAutoUpdate = false
        nurInReichweite(m)
        lage.add(m)
        st.mesh = m
        gelaendeMeshes.push(m)
        gelaendeStuecke.push(st)
      }
    }
  }

  /** Ecken eines Stuecks (Gitter) einmal gerechnet: Lage, Normale, Farbe,
   *  Stelle im Bild, die Dreiecke je Zelle und die Kugel darum. Beim Neubau
   *  mit Ausschnitten werden nur die Zellen mit Ausschnitt neu gerechnet. */
  interface GelaendeBasis {
    lagen: Float32Array
    normalen: Float32Array
    farben: Uint8Array
    uvs: Float32Array
    /** Je Zelle sechs Indizes (zwei Dreiecke, nach oben). */
    zellen: Uint32Array
    kugel: Sphere
  }
  function gelaendeBasis(st: GelaendeStueck): GelaendeBasis {
    const alt = basen.get(st)
    if (alt) return alt
    const { xs, zs, H, nc, nr, klasse, klassenTon, welle, ex0, ez0, ew, eh } = gelaendeDaten
    const { i0, i1, j0, j1 } = st
    const w = i1 - i0 + 1
    const hh = j1 - j0 + 1
    const lagen = new Float32Array(w * hh * 3)
    const normalen = new Float32Array(w * hh * 3)
    const farben = new Uint8Array(w * hh * 3)
    const uvs = new Float32Array(w * hh * 2)
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const v = (j - j0) * w + (i - i0)
        const x = xs[i]
        const z = zs[j]
        const y = H[j * nc + i]
        lagen[3 * v] = x
        lagen[3 * v + 1] = y - TIEFER
        lagen[3 * v + 2] = z
        const ia = Math.max(0, i - 1)
        const ib = Math.min(nc - 1, i + 1)
        const ja = Math.max(0, j - 1)
        const jb = Math.min(nr - 1, j + 1)
        const dx = (H[j * nc + ib] - H[j * nc + ia]) / Math.max(1e-6, xs[ib] - xs[ia])
        const dz = (H[jb * nc + i] - H[ja * nc + i]) / Math.max(1e-6, zs[jb] - zs[ja])
        const l = Math.hypot(dx, 1, dz)
        normalen[3 * v] = -dx / l
        normalen[3 * v + 1] = 1 / l
        normalen[3 * v + 2] = -dz / l
        const steil = Math.hypot(dx, dz)
        const k = (1 + 0.06 * welle(x, z)) * (1 - Math.min(0.25, Math.max(0, steil - 0.45) * 0.4))
        const kl = klasse ? klasse[j * nc + i] : 0
        const c = bild ? null : kl ? klassenTon[kl - 1] : F.boden
        const fr = c ? c.r * k : k * 0.98
        const fg = c ? c.g * k : k
        const fb = c ? c.b * k : k * 0.98
        farben[3 * v] = begrenzt(Math.round(fr * 255), 0, 255)
        farben[3 * v + 1] = begrenzt(Math.round(fg * 255), 0, 255)
        farben[3 * v + 2] = begrenzt(Math.round(fb * 255), 0, 255)
        uvs[2 * v] = (x - ex0) / ew
        uvs[2 * v + 1] = (z - ez0) / eh
      }
    }
    const zellen = new Uint32Array((w - 1) * (hh - 1) * 6)
    let q = 0
    for (let j = j0; j < j1; j++) {
      for (let i = i0; i < i1; i++) {
        const a = (j - j0) * w + (i - i0)
        const b = a + 1
        const d = a + w
        const c = d + 1
        // Die Diagonale, unter der die Flaeche unter der bilinearen bleibt.
        const ha = H[j * nc + i]
        const hb = H[j * nc + i + 1]
        const hc = H[(j + 1) * nc + i + 1]
        const hd = H[(j + 1) * nc + i]
        if (ha + hc <= hb + hd) zellen.set([a, c, b, a, d, c], q)
        else zellen.set([a, d, b, b, d, c], q)
        q += 6
      }
    }
    const roh = new BufferGeometry()
    roh.setAttribute('position', new BufferAttribute(lagen, 3))
    roh.computeBoundingSphere()
    const kugel = (roh.boundingSphere as Sphere).clone()
    roh.dispose()
    const neu: GelaendeBasis = { lagen, normalen, farben, uvs, zellen, kugel }
    basen.set(st, neu)
    return neu
  }

  /** Geometrie eines Stuecks Gelaende: Gitter mit weichen Normalen und Farben
   *  je Ecke; Zellen mit Ausschnitt werden je Dreieck beschnitten (Ecken der
   *  Teile in der Ebene des Dreiecks, Farben und Normalen dazwischen). */
  function gelaendeGeo(st: GelaendeStueck): BufferGeometry {
    const B = gelaendeBasis(st)
    const { xs, zs } = gelaendeDaten
    const { i0, i1, j0, j1 } = st
    const w = i1 - i0 + 1
    const nBasis = B.lagen.length / 3
    const schnitte = st.fest.concat(...st.haus.values())
    const geo = new BufferGeometry()
    if (!schnitte.length) {
      geo.setAttribute('position', new BufferAttribute(B.lagen, 3))
      geo.setAttribute('normal', new BufferAttribute(B.normalen, 3))
      geo.setAttribute('color', new BufferAttribute(B.farben, 3, true))
      geo.setAttribute('uv', new BufferAttribute(B.uvs, 2))
      geo.setIndex(new BufferAttribute(nBasis < 65536 ? Uint16Array.from(B.zellen) : B.zellen, 1))
      geo.boundingSphere = B.kugel.clone()
      return geo
    }
    // Zellen je Ausschnitt (Rahmen im Gitter), damit nur dort geschnitten wird.
    const zelleVon = (wert: number, feld: Float64Array, a: number, b: number): number => {
      let lo = a
      let hi = b
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1
        if (feld[m] <= wert) lo = m
        else hi = m
      }
      return lo
    }
    const marke = new Uint8Array((w - 1) * (j1 - j0))
    for (const s of schnitte) {
      if (s.box[2] < xs[i0] || s.box[0] > xs[i1] || s.box[3] < zs[j0] || s.box[1] > zs[j1]) continue
      const ci0 = zelleVon(s.box[0], xs, i0, i1)
      const ci1 = zelleVon(s.box[2], xs, i0, i1)
      const cj0 = zelleVon(s.box[1], zs, j0, j1)
      const cj1 = zelleVon(s.box[3], zs, j0, j1)
      for (let j = cj0; j <= Math.min(cj1, j1 - 1); j++) for (let i = ci0; i <= Math.min(ci1, i1 - 1); i++) marke[(j - j0) * (w - 1) + (i - i0)] = 1
    }
    const extraL: number[] = []
    const extraN: number[] = []
    const extraF: number[] = []
    const extraU: number[] = []
    const idx: number[] = []
    /** Eine neue Ecke bei (x, z) in der Ebene des Dreiecks (a, b, c). */
    const neueEcke = (a: number, b: number, c: number, x: number, z: number): number => {
      const ax = B.lagen[3 * a]
      const az = B.lagen[3 * a + 2]
      const bx = B.lagen[3 * b] - ax
      const bz = B.lagen[3 * b + 2] - az
      const cx = B.lagen[3 * c] - ax
      const cz = B.lagen[3 * c + 2] - az
      const det = bx * cz - cx * bz
      const px = x - ax
      const pz = z - az
      const wb = Math.abs(det) > EPS ? (px * cz - cx * pz) / det : 0
      const wc = Math.abs(det) > EPS ? (bx * pz - px * bz) / det : 0
      const wa = 1 - wb - wc
      const v = nBasis + extraL.length / 3
      extraL.push(x, wa * B.lagen[3 * a + 1] + wb * B.lagen[3 * b + 1] + wc * B.lagen[3 * c + 1], z)
      for (let q = 0; q < 3; q++) {
        extraN.push(wa * B.normalen[3 * a + q] + wb * B.normalen[3 * b + q] + wc * B.normalen[3 * c + q])
        extraF.push(begrenzt(Math.round(wa * B.farben[3 * a + q] + wb * B.farben[3 * b + q] + wc * B.farben[3 * c + q]), 0, 255))
      }
      for (let q = 0; q < 2; q++) extraU.push(wa * B.uvs[2 * a + q] + wb * B.uvs[2 * b + q] + wc * B.uvs[2 * c + q])
      return v
    }
    /** Dreieck (a, b, c) zeigt nach oben; beschnitten, wo Ausschnitte liegen. */
    const dreieck = (a: number, b: number, c: number) => {
      const poly: P[] = [
        [B.lagen[3 * a], B.lagen[3 * a + 2]],
        [B.lagen[3 * b], B.lagen[3 * b + 2]],
        [B.lagen[3 * c], B.lagen[3 * c + 2]],
      ]
      const pb: Kasten = [Math.min(poly[0][0], poly[1][0], poly[2][0]), Math.min(poly[0][1], poly[1][1], poly[2][1]), Math.max(poly[0][0], poly[1][0], poly[2][0]), Math.max(poly[0][1], poly[1][1], poly[2][1])]
      let stuecke: P[][] = [poly]
      for (const s of schnitte) {
        if (!kastenUeber(s.box, pb)) continue
        stuecke = stuecke.flatMap((q) => ohneKonvex(q, s.poly))
        if (!stuecke.length) break
      }
      if (stuecke.length === 1 && stuecke[0] === poly) {
        idx.push(a, b, c)
        return
      }
      const sinn = flaecheVon(poly) > 0
      for (const q of stuecke) {
        const ecken = q.map(([x, z]) => neueEcke(a, b, c, x, z))
        const gleich = flaecheVon(q) > 0 === sinn
        for (let k = 1; k + 1 < ecken.length; k++) {
          if (gleich) idx.push(ecken[0], ecken[k], ecken[k + 1])
          else idx.push(ecken[0], ecken[k + 1], ecken[k])
        }
      }
    }
    const Z = B.zellen
    for (let z = 0; z < marke.length; z++) {
      const q = 6 * z
      if (!marke[z]) {
        idx.push(Z[q], Z[q + 1], Z[q + 2], Z[q + 3], Z[q + 4], Z[q + 5])
        continue
      }
      dreieck(Z[q], Z[q + 1], Z[q + 2])
      dreieck(Z[q + 3], Z[q + 4], Z[q + 5])
    }
    const nv = nBasis + extraL.length / 3
    const lagen = new Float32Array(3 * nv)
    lagen.set(B.lagen)
    lagen.set(extraL, 3 * nBasis)
    const normalen = new Float32Array(3 * nv)
    normalen.set(B.normalen)
    normalen.set(extraN, 3 * nBasis)
    const farben = new Uint8Array(3 * nv)
    farben.set(B.farben)
    farben.set(extraF, 3 * nBasis)
    const uvs = new Float32Array(2 * nv)
    uvs.set(B.uvs)
    uvs.set(extraU, 2 * nBasis)
    geo.setAttribute('position', new BufferAttribute(lagen, 3))
    geo.setAttribute('normal', new BufferAttribute(normalen, 3))
    geo.setAttribute('color', new BufferAttribute(farben, 3, true))
    geo.setAttribute('uv', new BufferAttribute(uvs, 2))
    geo.setIndex(new BufferAttribute(nv < 65536 ? Uint16Array.from(idx) : Uint32Array.from(idx), 1))
    // Teile liegen in den alten Dreiecken: die Kugel bleibt dieselbe.
    geo.boundingSphere = B.kugel.clone()
    return geo
  }

  /** Ein Stueck Gelaende neu bauen (Ausschnitte eines Hauses kamen oder gingen). */
  const gelaendeNeu = (st: GelaendeStueck): void => {
    st.neu = false
    const m = st.mesh
    if (!m) return
    const alt = m.geometry
    const geo = gelaendeGeo(st)
    m.geometry = geo
    const i = geometrien.indexOf(alt)
    if (i >= 0) geometrien[i] = geo
    else geometrien.push(geo)
    alt.dispose()
  }

  /** Rastert die Flaechen auf die Gitterpunkte (Index in FLAECHEN_REIHE + 1). */
  function flaechenRaster(xs: Float64Array, zs: Float64Array): Uint8Array {
    const nc = xs.length
    const out = new Uint8Array(nc * zs.length)
    const s0 = xs[0]
    const st = nc > 1 ? xs[1] - xs[0] : 1
    for (const [ai, art] of FLAECHEN_REIHE.entries()) {
      for (const fl of s.flaechen) {
        if (!fl || fl.art !== art) continue
        const poly = ringLesen(fl.punkte, 'flaeche')
        if (poly.length < 3) continue
        let pz0 = Infinity
        let pz1 = -Infinity
        for (const q of poly) {
          pz0 = Math.min(pz0, q[1])
          pz1 = Math.max(pz1, q[1])
        }
        for (let j = 0; j < zs.length; j++) {
          const z = zs[j]
          if (z < pz0 || z > pz1) continue
          const xsSchnitt: number[] = []
          for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
            const p0 = poly[a]
            const p1 = poly[b]
            if (p0[1] > z !== p1[1] > z) xsSchnitt.push(p0[0] + ((z - p0[1]) * (p1[0] - p0[0])) / (p1[1] - p0[1]))
          }
          xsSchnitt.sort((u, v) => u - v)
          for (let q = 0; q + 1 < xsSchnitt.length; q += 2) {
            const i0 = Math.max(0, Math.ceil((xsSchnitt[q] - s0) / st - 1e-9))
            const i1 = Math.min(nc - 1, Math.floor((xsSchnitt[q + 1] - s0) / st + 1e-9))
            for (let i = i0; i <= i1; i++) out[j * nc + i] = ai + 1
          }
        }
      }
    }
    return out
  }

  /** Bild fuer das Gelaende (nur im Browser): Flaechen, Wasser, Strassen. */
  function gelaendeBild(): CanvasTexture | null {
    const { xs, zs } = gitter
    const ex0 = xs[0]
    const ez0 = zs[0]
    const ew = xs[xs.length - 1] - ex0
    const eh = zs[zs.length - 1] - ez0
    if (!(ew > 0 && eh > 0)) return null
    const pot = (v: number) => begrenzt(2 ** Math.ceil(Math.log2(Math.max(1, v / 1.2))), 256, 2048)
    const W = pot(ew)
    const Hh = pot(eh)
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = Hh
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const sx = W / ew
    const sz = Hh / eh
    const css = (c: Color) => '#' + c.getHexString()
    ctx.fillStyle = css(F.boden)
    ctx.fillRect(0, 0, W, Hh)
    const pfad = (pts: readonly P[], zu: boolean) => {
      ctx.beginPath()
      pts.forEach(([x, z], i) => (i ? ctx.lineTo((x - ex0) * sx, (z - ez0) * sz) : ctx.moveTo((x - ex0) * sx, (z - ez0) * sz)))
      if (zu) ctx.closePath()
    }
    for (const art of FLAECHEN_REIHE) {
      ctx.fillStyle = css(F.flaeche[art])
      for (const fl of s.flaechen) {
        if (!fl || fl.art !== art) continue
        const poly = ringLesen(fl.punkte, 'flaeche')
        if (poly.length < 3) continue
        pfad(poly, true)
        ctx.fill()
      }
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = css(F.flaeche.wasser)
    for (const w of s.gewaesser) {
      if (!w) continue
      ctx.lineWidth = Math.max(1, (endlich(w.breite) ? w.breite : 2) * sx)
      pfad(ringLesen(w.punkte, 'gewaesser'), false)
      ctx.stroke()
    }
    for (const gruppeL of strassenNachArt) {
      for (const l of gruppeL) {
        ctx.strokeStyle = css(F.strasse[l.art])
        ctx.lineWidth = Math.max(1, l.breite * sx)
        pfad(l.punkte, false)
        ctx.stroke()
      }
    }
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.flipY = false
    tex.anisotropy = 8
    return tex
  }

  /* ------------------------------------------------ Kacheln zu Meshes */
  const muster = fensterMuster()
  texturen.push(muster)
  const musterMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true, map: muster })
  const schlichtMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true })
  materialien.push(musterMat, schlichtMat)
  for (const k of kacheln.values()) {
    const geo = k.puffer.bauen()
    k.puffer = new Puffer(1)
    if (!geo) continue
    geometrien.push(geo)
    const m = new Mesh(geo, musterMat)
    m.name = `kachel:${k.nr}`
    m.matrixAutoUpdate = false
    nurInReichweite(m)
    lage.add(m)
    k.mesh = m
    // Lage der Tueren merken (zum Wiederherstellen nach dem Oeffnen).
    const lagen = geo.getAttribute('position').array as Float32Array
    for (const hi of k.haeuser) {
      const h = haeuser[hi]
      if (h.blatt) h.blatt.lage = lagen.slice(3 * h.blatt.start, 3 * h.blatt.ende)
    }
  }

  /* ------------------------------------------------ Schilder (nur im Browser) */
  if (hatLeinwand) schilderBauen()

  function schilderBauen(): void {
    const liste = haeuser.filter((h) => h.name && h.tuer)
    if (!liste.length) return
    const PX = 64
    const RAND = 22
    const BREIT = 2048
    const schrift = `600 ${Math.round(PX * 0.62)}px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Tahoma, sans-serif`
    const mess = document.createElement('canvas').getContext('2d')
    if (!mess) return
    mess.font = schrift
    interface Platz {
      h: Haus
      text: string
      w: number
      x: number
      y: number
      blatt: number
    }
    const plaetze: Platz[] = []
    let bx = 0
    let by = 0
    let blatt = 0
    for (const h of liste) {
      const text = kuerzen(h.name, 40)
      const w = Math.min(BREIT, Math.ceil(mess.measureText(text).width) + 2 * RAND)
      if (bx + w > BREIT) {
        bx = 0
        by += PX
      }
      if (by + PX > BREIT) {
        blatt++
        bx = 0
        by = 0
      }
      plaetze.push({ h, text, w, x: bx, y: by, blatt })
      bx += w
    }
    for (let b = 0; b <= blatt; b++) {
      const meine = plaetze.filter((q) => q.blatt === b)
      if (!meine.length) continue
      const hoehe = 2 ** Math.ceil(Math.log2(Math.max(PX, ...meine.map((q) => q.y + PX))))
      const canvas = document.createElement('canvas')
      canvas.width = BREIT
      canvas.height = hoehe
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const p = new Puffer(4 * meine.length)
      for (const q of meine) {
        ctx.fillStyle = '#2b2b2e'
        ctx.fillRect(q.x, q.y, q.w, PX)
        ctx.fillStyle = '#f4f2ed'
        ctx.font = schrift
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.direction = istRtl(q.text) ? 'rtl' : 'ltr'
        ctx.fillText(q.text, q.x + q.w / 2, q.y + PX / 2 + 2)
        schildViereck(p, q.h, q.w / PX, [(q.x + 0.5) / BREIT, (q.y + 0.5) / hoehe, (q.x + q.w - 0.5) / BREIT, (q.y + PX - 0.5) / hoehe])
      }
      const tex = new CanvasTexture(canvas)
      tex.colorSpace = SRGBColorSpace
      tex.flipY = false
      tex.anisotropy = 4
      texturen.push(tex)
      const mat = new MeshLambertMaterial({ map: tex })
      materialien.push(mat)
      const geo = p.bauen()
      if (!geo) continue
      geometrien.push(geo)
      const m = new Mesh(geo, mat)
      m.name = 'schilder'
      m.matrixAutoUpdate = false
      nurInReichweite(m)
      lage.add(m)
    }
  }

  /** Viereck des Schilds ueber der Tuer, Text von aussen lesbar (u nach rechts). */
  function schildViereck(p: Puffer, h: Haus, verhaeltnis: number, uv: [number, number, number, number]): void {
    const t = h.tuer
    if (!t) return
    const k = t.k
    const gross = h.art === 'supermarkt' || h.art === 'einkaufszentrum' || h.art === 'spital' || h.art === 'feuerwehr' || h.art === 'schule'
    let hoch = gross ? 0.75 : 0.5
    let breit = hoch * verhaeltnis
    if (breit > k.L - 0.3) {
      breit = Math.max(0.3, k.L - 0.3)
      hoch = breit / verhaeltnis
    }
    const tm = begrenzt(t.t, breit / 2 + 0.1, Math.max(breit / 2 + 0.1, k.L - breit / 2 - 0.1))
    const decke = (h.dach === 'flach' ? h.oben + ATTIKA : h.oben) - 0.05
    const y0 = Math.max(h.boden + TUER_H + 0.12, Math.min(h.boden + TUER_H + 0.25, decke - hoch))
    const y1 = y0 + hoch
    // Wer davor steht, schaut nach -n; rechts ist (nz, -nx).
    const rechtsGleich = k.ux * k.nz + k.uz * -k.nx > 0
    const tl = rechtsGleich ? tm - breit / 2 : tm + breit / 2
    const tr = rechtsGleich ? tm + breit / 2 : tm - breit / 2
    const sv = 0.05
    const xl = k.ax + k.ux * tl + k.nx * sv
    const zl = k.az + k.uz * tl + k.nz * sv
    const xr = k.ax + k.ux * tr + k.nx * sv
    const zr = k.az + k.uz * tr + k.nz * sv
    const [u0, v0, u1, v1] = uv
    const weiss: Ton = [255, 255, 255]
    // unten links, unten rechts, oben rechts, oben links; v = 0 oben im Bild.
    const a = p.ecke(xl, y0, zl, weiss, u0, v1)
    const b = p.ecke(xr, y0, zr, weiss, u1, v1)
    const c = p.ecke(xr, y1, zr, weiss, u1, v0)
    const d = p.ecke(xl, y1, zl, weiss, u0, v0)
    // Von aussen gegen den Uhrzeiger: links unten, rechts unten, rechts oben.
    p.dreieck(a, b, c)
    p.dreieck(a, c, d)
  }

  /* ------------------------------------------------ Baeume */
  interface Baum {
    x: number
    z: number
    wald: boolean
  }
  const baumListe: Baum[] = []
  for (const b of s.baeume) {
    if (baumListe.length >= BAUM_MAX) break
    if (!Array.isArray(b) || !endlich(b[0]) || !endlich(b[1])) throw new Error('stadt3d: baum ist kein Punkt')
    if (inHaus(b[0], b[1], 0.8)) continue
    baumListe.push({ x: b[0], z: b[1], wald: false })
  }
  for (const fl of s.flaechen) {
    if (!fl || fl.art !== 'wald' || baumListe.length >= BAUM_MAX) continue
    const poly = ringLesen(fl.punkte, 'wald')
    if (poly.length < 3) continue
    let x0 = Infinity
    let z0 = Infinity
    let x1 = -Infinity
    let z1 = -Infinity
    for (const [x, z] of poly) {
      x0 = Math.min(x0, x)
      z0 = Math.min(z0, z)
      x1 = Math.max(x1, x)
      z1 = Math.max(z1, z)
    }
    const r = zufallMit(saatZahlen(x0, z0, x1 + z1))
    for (let x = Math.floor(x0 / WALD_RASTER) * WALD_RASTER; x <= x1 && baumListe.length < BAUM_MAX; x += WALD_RASTER) {
      for (let z = Math.floor(z0 / WALD_RASTER) * WALD_RASTER; z <= z1 && baumListe.length < BAUM_MAX; z += WALD_RASTER) {
        const px = x + (r() - 0.5) * WALD_RASTER * 0.8
        const pz = z + (r() - 0.5) * WALD_RASTER * 0.8
        if (!imVieleck(px, pz, poly) || inHaus(px, pz, 1.5) || aufStrasse(px, pz, 1.5)) continue
        baumListe.push({ x: px, z: pz, wald: true })
      }
    }
  }
  const kroneFein = kugelGeo(1)
  const kroneGrob = kugelGeo(0)
  const stammGeo = new CylinderGeometry(0.6, 1, 1, 6, 1, true)
  stammGeo.translate(0, 0.5, 0)
  geometrien.push(kroneFein, kroneGrob, stammGeo)
  const kroneMat = new MeshLambertMaterial({ color: 0xffffff })
  const stammMat = new MeshLambertMaterial({ color: F.stamm.clone() })
  materialien.push(kroneMat, stammMat)
  interface BaumKachel {
    cx: number
    cz: number
    kronen: InstancedMesh
    fein: boolean
  }
  const baumKacheln: BaumKachel[] = []
  /** Alle Staemme in einem Mesh (wenige Dreiecke, ein Zeichenaufruf). */
  let staemme: InstancedMesh | null = null
  {
    const nach = new Map<number, Baum[]>()
    for (const b of baumListe) {
      const kn = Math.floor((b.x - rx0) / GROSS) * 100003 + Math.floor((b.z - rz0) / GROSS)
      const l = nach.get(kn)
      if (l) l.push(b)
      else nach.set(kn, [b])
    }
    const m4 = new Matrix4()
    const q = new Quaternion()
    const achse = new Vector3(0, 1, 0)
    const pos = new Vector3()
    const gr = new Vector3()
    const farbe = new Color()
    if (baumListe.length) {
      staemme = new InstancedMesh(stammGeo, stammMat, baumListe.length)
      staemme.name = 'staemme'
    }
    let nStamm = 0
    for (const liste of nach.values()) {
      const kronen = new InstancedMesh(kroneGrob, kroneMat, liste.length)
      kronen.name = 'kronen'
      let sx = 0
      let sz = 0
      liste.forEach((b, i) => {
        const r = zufallMit(saatZahlen(b.x, b.z, 7))
        const boden = hs(b.x, b.z)
        // Runde Krone auf kurzem Stamm; im Wald hoeher und schlanker.
        const kr = b.wald ? 2.3 + r() * 1.3 : 2.2 + r() * 1.8
        const stammH = b.wald ? 3 + r() * 3 : 1.6 + r() * 1.4
        const kh = kr * (b.wald ? 1.5 + r() * 0.5 : 1.12 + r() * 0.25)
        const sr = 0.14 + r() * 0.1 + (b.wald ? 0.04 : 0)
        q.setFromAxisAngle(achse, r() * Math.PI * 2)
        pos.set(b.x, boden - 0.3, b.z)
        gr.set(sr, stammH + 0.3 + kh * 0.5, sr)
        staemme?.setMatrixAt(nStamm++, m4.compose(pos, q, gr))
        pos.set(b.x, boden + stammH + kh * 0.8, b.z)
        gr.set(kr, kh, kr)
        kronen.setMatrixAt(i, m4.compose(pos, q, gr))
        const pal = b.wald ? F.waldLaub : F.laub
        farbe.copy(pal[Math.floor(r() * pal.length) % pal.length]).multiplyScalar(0.9 + r() * 0.2)
        kronen.setColorAt(i, farbe)
        sx += b.x
        sz += b.z
      })
      kronen.instanceMatrix.needsUpdate = true
      if (kronen.instanceColor) kronen.instanceColor.needsUpdate = true
      lage.add(kronen)
      baumKacheln.push({ cx: sx / liste.length, cz: sz / liste.length, kronen, fein: false })
    }
    if (staemme) {
      staemme.instanceMatrix.needsUpdate = true
      lage.add(staemme)
    }
  }

  /* ------------------------------------------------ Laternen */
  const lampeGeo = lampenForm(F)
  geometrien.push(lampeGeo)
  const lampeMat = new MeshLambertMaterial({ vertexColors: true })
  materialien.push(lampeMat)
  let laternenZahl = 0
  {
    const stellen: { x: number; z: number; gier: number }[] = []
    const lampenRaster = new Raster(20, LAMPE_MAX)
    const frei = (x: number, z: number) => {
      let ok = true
      lampenRaster.suche(x - 12, z - 12, x + 12, z + 12, (i) => {
        if (Math.hypot(stellen[i].x - x, stellen[i].z - z) < 12) {
          ok = false
          return true
        }
      })
      return ok
    }
    for (const l of linien) {
      if (stellen.length >= LAMPE_MAX) break
      if ((l.art !== 'haupt' && l.art !== 'neben') || l.bruecke) continue
      const r = zufallMit(saatZahlen(l.punkte[0][0], l.punkte[0][1], l.breite))
      let laenge = 0
      for (let k = 0; k + 1 < l.punkte.length; k++) laenge += Math.hypot(l.punkte[k + 1][0] - l.punkte[k][0], l.punkte[k + 1][1] - l.punkte[k][1])
      let seite = r() < 0.5 ? -1 : 1
      for (let a = 8 + r() * 10; a < laenge - 2 && stellen.length < LAMPE_MAX; a += LAMPE_ABSTAND) {
        const st = aufLinieMitRichtung(l.punkte, a)
        if (!st) break
        const [px, pz, ux, uz] = st
        const nx = -uz * seite
        const nz = ux * seite
        const x = px + nx * (l.breite / 2 + 0.6)
        const z = pz + nz * (l.breite / 2 + 0.6)
        seite = -seite
        if (inHaus(x, z, 0.6) || !frei(x, z)) continue
        lampenRaster.dazu(stellen.length, x, z, x, z)
        // Der Arm zeigt (lokal -z) zur Strasse.
        stellen.push({ x, z, gier: Math.atan2(nx, nz) })
      }
    }
    if (stellen.length) {
      const lampen = new InstancedMesh(lampeGeo, lampeMat, stellen.length)
      lampen.name = 'laternen'
      const m4 = new Matrix4()
      const q = new Quaternion()
      const achse = new Vector3(0, 1, 0)
      const pos = new Vector3()
      const eins = new Vector3(1, 1, 1)
      stellen.forEach((st, i) => {
        q.setFromAxisAngle(achse, st.gier)
        pos.set(st.x, hs(st.x, st.z) - 0.1, st.z)
        lampen.setMatrixAt(i, m4.compose(pos, q, eins))
      })
      lampen.instanceMatrix.needsUpdate = true
      lage.add(lampen)
      laternenZahl = stellen.length
    }
  }

  /* ------------------------------------------------ Hindernisse */
  const statisch: Rech[] = []
  for (const h of haeuser) {
    for (const k of h.kanten) {
      if (k.L < 0.05) continue
      const stuecke: P[] = []
      if (h.tuer && h.tuer.k === k) {
        const d0 = begrenzt(h.tuer.t - h.tuer.b / 2, 0, k.L)
        const d1 = begrenzt(h.tuer.t + h.tuer.b / 2, 0, k.L)
        if (d0 > 0.01) stuecke.push([0, d0])
        if (k.L - d1 > 0.01) stuecke.push([d1, k.L])
        if (d1 - d0 > 0.01) h.tuerRech = rechAnKante(k, d0, d1)
      } else stuecke.push([0, k.L])
      for (const [a, b] of stuecke) statisch.push(rechAnKante(k, a, b))
    }
  }
  statisch.push(...zaunRechs)
  const rechRaster = new Raster(20, statisch.length + haeuser.length)
  statisch.forEach((r, i) => {
    const e = r.hl + r.ht
    rechRaster.dazu(i, r.x - e, r.z - e, r.x + e, r.z + e)
  })
  /* Die Tuerrechtecke stehen fest am Ende (E87), auch wenn das Haus offen
   * ist: hinein fuehrt die Schwelle (Treppe3D quer ueber die Wandlinie), und
   * auf einer Treppe gelten die Hindernisse der Ebenen nicht. So bleibt die
   * Liste immer dieselbe (der Motor rastert sie nur einmal). */
  const statischWelt: Hindernis3D[] = statisch.map(nachWelt)
  for (const h of haeuser) if (h.tuerRech) statischWelt.push(nachWelt(h.tuerRech))
  /** Ist der Kreis (x, z, r) frei von festen Hindernissen (Waende, Tueren)? */
  const punktFrei = (x: number, z: number, r: number): boolean => {
    let ok = true
    rechRaster.suche(x - r - 1, z - r - 1, x + r + 1, z + r + 1, (i) => {
      if (rechAbstand(statisch[i], x, z) < r) {
        ok = false
        return true
      }
    })
    if (!ok) return false
    hausRaster.suche(x - r - 3, z - r - 3, x + r + 3, z + r + 3, (i) => {
      const t = haeuser[i].tuerRech
      if (t && rechAbstand(t, x, z) < r) {
        ok = false
        return true
      }
    })
    return ok
  }
  const rechFrei = (q: Rech): boolean => {
    let ok = true
    const e = q.hl + q.ht
    rechRaster.suche(q.x - e - 1, q.z - e - 1, q.x + e + 1, q.z + e + 1, (i) => {
      if (rechUeber(statisch[i], q)) {
        ok = false
        return true
      }
    })
    return ok
  }

  function rechAnKante(k: Kante, t0: number, t1: number): Rech {
    const tm = (t0 + t1) / 2
    return {
      x: k.ax + k.ux * tm - (k.nx * AUSSENWAND_M) / 2,
      z: k.az + k.uz * tm - (k.nz * AUSSENWAND_M) / 2,
      hl: (t1 - t0) / 2,
      ht: AUSSENWAND_M / 2,
      ux: k.ux,
      uz: k.uz,
    }
  }
  function nachWelt(r: Rech): Hindernis3D {
    const out: Hindernis3D = { x: weltX(r.x, r.z), z: weltZ(r.x, r.z), laenge: 2 * r.hl, tiefe: 2 * r.ht, drehY: drehAus(r.ux, r.uz) }
    if (r.oben !== undefined) out.oben = r.oben
    return out
  }

  /* ------------------------------------------------ Fahrzeuge */
  const fahrzeugeDraussen: Fahrzeug3D[] = []
  const fzRechs: Rech[] = []
  const fzRech = (x: number, z: number, gierS: number, laenge: number, breite: number): Rech => ({
    x,
    z,
    hl: laenge / 2,
    ht: breite / 2,
    ux: -Math.sin(gierS),
    uz: -Math.cos(gierS),
  })
  const fzFrei = (q: Rech): boolean => {
    if (inHaus(q.x, q.z, 0.3)) return false
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const ex = q.x + q.ux * q.hl * sx - q.uz * q.ht * sz
      const ez = q.z + q.uz * q.hl * sx + q.ux * q.ht * sz
      if (inHaus(ex, ez, 0.1)) return false
    }
    if (!rechFrei(q)) return false
    return !fzRechs.some((r) => rechUeber(r, q))
  }
  /** Stellt ein Fahrzeug auf: Lage in Siedlungsmetern, gierS dort. */
  const aufstellen = (art: FahrzeugArt, farbe: string, x: number, z: number, gierS: number): Fahrzeug3D => {
    const id = `stadt:f${fahrzeugeDraussen.length}`
    const xw = weltX(x, z)
    const zw = weltZ(x, z)
    const gw = gierS + gier0
    const fz = baueFahrzeug(art, farbe, id, { x: xw, z: zw, gier: gw, ebene: o.bodenEbene })
    fz.gruppe.position.set(xw, o.bodenY + hs(x, z), zw)
    fz.gruppe.rotation.y = gw
    gruppe.add(fz.gruppe)
    fahrzeugeDraussen.push(fz)
    fzRechs.push(fzRech(x, z, gierS, fz.laenge, fz.breite))
    return fz
  }
  /** Vor der Tuer eines Hauses, seitlich versetzt, Blick von der Tuer weg. */
  const vorTuer = (h: Haus, art: FahrzeugArt, seite: number, farbe: string) => {
    const t = h.tuer
    if (!t) return
    const [laenge, breite] = FZ_MASS[art]
    const k = t.k
    const gierS = Math.atan2(-k.nx, -k.nz)
    let gewaehlt: P | null = null
    for (const abstand of [1.2, 2.5, 4, 6]) {
      for (const extra of [0, 1.5, 3]) {
        const quer = seite * (t.b / 2 + 0.6 + breite / 2 + extra)
        const x = t.x + k.ux * quer + k.nx * (abstand + laenge / 2)
        const z = t.z + k.uz * quer + k.nz * (abstand + laenge / 2)
        if (!gewaehlt) gewaehlt = [x, z]
        if (fzFrei(fzRech(x, z, gierS, laenge, breite))) {
          gewaehlt = [x, z]
          aufstellen(art, farbe, x, z, gierS)
          return
        }
      }
    }
    if (gewaehlt) aufstellen(art, farbe, gewaehlt[0], gewaehlt[1], gierS)
  }
  for (const h of haeuser) {
    if (h.art !== 'feuerwehr' || !h.tuer) continue
    vorTuer(h, 'feuerwehr', -1, '#c8102e')
    vorTuer(h, 'feuerwehr', 1, '#c8102e')
  }
  {
    let spital: Haus | null = null
    for (const h of haeuser) if (h.art === 'spital' && h.tuer && (!spital || h.n > spital.n)) spital = h
    if (spital) {
      vorTuer(spital, 'rettung', -1, '#f4f1e8')
      vorTuer(spital, 'rettung', 1, '#f4f1e8')
    }
    let ez: Haus | null = null
    let ezFl = 0
    for (const h of haeuser) {
      if (h.art !== 'einkaufszentrum' || !h.tuer) continue
      const fl = Math.abs(flaecheVon(h.umriss))
      if (fl > ezFl) {
        ez = h
        ezFl = fl
      }
    }
    if (ez && ez.tuer) {
      // Laengs vor der Fassade, neben dem Eingang.
      const t = ez.tuer
      const k = t.k
      const [laenge, breite] = FZ_MASS.polizei
      const gierS = Math.atan2(-k.ux, -k.uz)
      let gesetzt = false
      for (const abstand of [2, 3.5, 5, 7]) {
        for (const seite of [1, -1]) {
          const quer = seite * (t.b / 2 + 2 + laenge / 2)
          const x = t.x + k.ux * quer + k.nx * (abstand + breite / 2)
          const z = t.z + k.uz * quer + k.nz * (abstand + breite / 2)
          if (!gesetzt && fzFrei(fzRech(x, z, gierS, laenge, breite))) {
            aufstellen('polizei', '#f4f4f2', x, z, gierS)
            gesetzt = true
          }
        }
      }
      if (!gesetzt) {
        const quer = t.b / 2 + 2 + laenge / 2
        aufstellen('polizei', '#f4f4f2', t.x + k.ux * quer + k.nx * (2 + breite / 2), t.z + k.uz * quer + k.nz * (2 + breite / 2), gierS)
      }
    }
    // Bus an der Haltestelle, die der Siedlung am naechsten ist.
    let halt: { x: number; z: number } | null = null
    for (const ort of s.orte) {
      if (!ort || !endlich(ort.x) || !endlich(ort.z) || typeof ort.art !== 'string' || !/bus/i.test(ort.art)) continue
      if (!halt || Math.hypot(ort.x, ort.z) < Math.hypot(halt.x, halt.z)) halt = { x: ort.x, z: ort.z }
    }
    if (halt) {
      let best: { d: number; px: number; pz: number; ux: number; uz: number; b: number } | null = null
      stueckRaster.suche(halt.x - 30, halt.z - 30, halt.x + 30, halt.z + 30, (i) => {
        const st = stuecke[i]
        const art = linien[st.li].art
        if (art !== 'haupt' && art !== 'neben' && art !== 'wohn') return
        const dx = st.bx - st.ax
        const dz = st.bz - st.az
        const l = Math.hypot(dx, dz)
        if (l < 1) return
        const t = begrenzt(((halt.x - st.ax) * dx + (halt.z - st.az) * dz) / (l * l), 0, 1)
        const px = st.ax + dx * t
        const pz = st.az + dz * t
        const d = Math.hypot(halt.x - px, halt.z - pz)
        if (d < 30 && (!best || d < best.d)) best = { d, px, pz, ux: dx / l, uz: dz / l, b: st.b }
      })
      const b = best as { d: number; px: number; pz: number; ux: number; uz: number; b: number } | null
      if (b) {
        // Rechts fahren: die Haltestelle liegt rechts der Fahrtrichtung.
        const rechts = (halt.x - b.px) * -b.uz + (halt.z - b.pz) * b.ux > 0
        const fx = rechts ? b.ux : -b.ux
        const fz = rechts ? b.uz : -b.uz
        const quer = Math.max(0, b.b / 2 - FZ_MASS.bus[1] / 2 - 0.3)
        const x = b.px + -fz * quer
        const z = b.pz + fx * quer
        aufstellen('bus', '#e8e4da', x, z, Math.atan2(-fx, -fz))
      } else aufstellen('bus', '#e8e4da', halt.x, halt.z, 0)
    }
  }
  // Geparkte Autos: Parkplaetze und Strassenrand nahe der Siedlung.
  {
    interface Platz {
      x: number
      z: number
      gier: number
      wert: number
      art: FahrzeugArt
      farbe: string
    }
    const kandidaten: Platz[] = []
    const FARBEN = ['#d9d9d6', '#2f3b4c', '#8c1c13', '#f2f2ef', '#1f1f22', '#5b6d5b', '#c9a227', '#3b6ea5', '#7a7d80', '#4a2f2a']
    const artAus = (r: number): FahrzeugArt => (r < 0.68 ? 'auto' : r < 0.9 ? 'kombi' : 'transporter')
    for (const fl of s.flaechen) {
      if (!fl || fl.art !== 'parkplatz') continue
      const poly = ringLesen(fl.punkte, 'parkplatz')
      if (poly.length < 3) continue
      const box = kleinstesRechteck(poly)
      if (!box) continue
      if (Math.hypot(box.cx, box.cz) - Math.hypot(box.halbL, box.halbB) > FAHRZEUG_UMKREIS) continue
      const { cx, cz, ex, ez, halbL, halbB } = box
      const r = zufallMit(saatZahlen(cx, cz, 11))
      for (let reihe = 0; -halbB + 2.8 + reihe * 6.5 <= halbB - 2.2; reihe++) {
        const sv = -halbB + 2.8 + reihe * 6.5
        for (let platz = 0; -halbL + 1.5 + platz * 2.7 <= halbL - 1.2; platz++) {
          const tv = -halbL + 1.5 + platz * 2.7
          const x = cx + ex * tv - ez * sv
          const z = cz + ez * tv + ex * sv
          if (Math.hypot(x, z) > FAHRZEUG_UMKREIS) continue
          const w = r()
          if (w > 0.6) continue
          const vor = reihe % 2 ? 1 : -1
          // Laengs quer zur langen Achse: vorne = +-(−ez, ex).
          const fx = -ez * vor
          const fz = ex * vor
          const [laenge, breite] = FZ_MASS.kombi
          const ecken: P[] = [
            [x + fx * laenge * 0.5 + ex * breite * 0.5, z + fz * laenge * 0.5 + ez * breite * 0.5],
            [x - fx * laenge * 0.5 + ex * breite * 0.5, z - fz * laenge * 0.5 + ez * breite * 0.5],
            [x + fx * laenge * 0.5 - ex * breite * 0.5, z + fz * laenge * 0.5 - ez * breite * 0.5],
            [x - fx * laenge * 0.5 - ex * breite * 0.5, z - fz * laenge * 0.5 - ez * breite * 0.5],
          ]
          if (!ecken.every(([qx, qz]) => imVieleck(qx, qz, poly))) continue
          kandidaten.push({ x, z, gier: Math.atan2(-fx, -fz), wert: Math.hypot(x, z) * (0.7 + 0.6 * r()), art: artAus(r()), farbe: FARBEN[Math.floor(r() * FARBEN.length) % FARBEN.length] })
        }
      }
    }
    for (const l of linien) {
      if ((l.art !== 'wohn' && l.art !== 'neben' && l.art !== 'dienst') || l.bruecke) continue
      const r = zufallMit(saatZahlen(l.punkte[0][0], l.punkte[0][1], 13))
      let laenge = 0
      for (let k = 0; k + 1 < l.punkte.length; k++) laenge += Math.hypot(l.punkte[k + 1][0] - l.punkte[k][0], l.punkte[k + 1][1] - l.punkte[k][1])
      for (let a = 7 + r() * 12; a < laenge - 5; a += 22 + r() * 25) {
        const st = aufLinieMitRichtung(l.punkte, a)
        if (!st) break
        const [px, pz, ux, uz] = st
        if (Math.hypot(px, pz) > FAHRZEUG_UMKREIS) continue
        // Rechts am Rand, bei schmalen Strassen daneben.
        const ab = l.breite >= 5.5 ? l.breite / 2 - 1.05 : l.breite / 2 + 1.1
        const x = px - uz * ab
        const z = pz + ux * ab
        kandidaten.push({ x, z, gier: Math.atan2(-ux, -uz), wert: Math.hypot(x, z) * (0.7 + 0.6 * r()), art: artAus(r()), farbe: FARBEN[Math.floor(r() * FARBEN.length) % FARBEN.length] })
      }
    }
    kandidaten.sort((a, b) => a.wert - b.wert || a.x - b.x || a.z - b.z)
    let geparkt = 0
    for (const k of kandidaten) {
      if (geparkt >= FAHRZEUG_MAX) break
      const [laenge, breite] = FZ_MASS[k.art]
      if (!fzFrei(fzRech(k.x, k.z, k.gier, laenge + 0.6, breite + 0.4))) continue
      aufstellen(k.art, k.farbe, k.x, k.z, k.gier)
      geparkt++
    }
  }

  /* ------------------------------------------------ Dinge */
  const dingeDraussen: WeltDing3D[] = []
  const dingGeos: BufferGeometry[] = []
  const dingMats: Material[] = []
  {
    const ballGeo = new SphereGeometry(0.11, 16, 12)
    ballGeo.translate(0, 0.11, 0)
    const kegelGeo = new CylinderGeometry(0.035, 0.15, 0.48, 16)
    kegelGeo.translate(0, 0.27, 0)
    const fussGeo = new BoxGeometry(0.34, 0.03, 0.34)
    fussGeo.translate(0, 0.015, 0)
    const eimerGeo = new CylinderGeometry(0.14, 0.11, 0.28, 16)
    eimerGeo.translate(0, 0.14, 0)
    const tonneGeo = new CylinderGeometry(0.21, 0.19, 0.72, 16)
    tonneGeo.translate(0, 0.36, 0)
    const deckelGeo = new CylinderGeometry(0.225, 0.225, 0.05, 16)
    deckelGeo.translate(0, 0.745, 0)
    dingGeos.push(ballGeo, kegelGeo, fussGeo, eimerGeo, tonneGeo, deckelGeo)
    const mat = (c: Color) => {
      const m = new MeshLambertMaterial({ color: c })
      dingMats.push(m)
      return m
    }
    const rot = mat(F.rot.clone())
    const blau = mat(F.blau.clone())
    const gelb = mat(F.gelb.clone())
    const orange = mat(F.rot.clone().lerp(F.gelb, 0.45))
    const dunkel = mat(F.schwarz.clone().lerp(F.metall, 0.2))
    const tonneMat = mat(F.hecke.clone().multiplyScalar(0.7))
    type DingArt = { geos: [BufferGeometry, Material][]; b: number; t: number; h: number }
    const ARTEN: DingArt[] = [
      { geos: [[ballGeo, rot]], b: 0.22, t: 0.22, h: 0.22 },
      { geos: [[kegelGeo, orange], [fussGeo, dunkel]], b: 0.34, t: 0.34, h: 0.51 },
      { geos: [[eimerGeo, blau]], b: 0.28, t: 0.28, h: 0.28 },
      { geos: [[tonneGeo, tonneMat], [deckelGeo, dunkel]], b: 0.45, t: 0.45, h: 0.77 },
      { geos: [[ballGeo, blau]], b: 0.22, t: 0.22, h: 0.22 },
      { geos: [[eimerGeo, gelb]], b: 0.28, t: 0.28, h: 0.28 },
    ]
    const flaechen = s.flaechen
      .filter((fl) => fl && (fl.art === 'spielplatz' || fl.art === 'park'))
      .map((fl) => {
        const poly = ringLesen(fl.punkte, 'flaeche')
        let cx = 0
        let cz = 0
        for (const [x, z] of poly) {
          cx += x
          cz += z
        }
        cx /= Math.max(1, poly.length)
        cz /= Math.max(1, poly.length)
        return { poly, spiel: fl.art === 'spielplatz', d: Math.hypot(cx, cz) }
      })
      .filter((f) => f.poly.length >= 3 && f.d <= DING_UMKREIS)
      .sort((a, b) => (a.spiel === b.spiel ? a.d - b.d : a.spiel ? -1 : 1))
    const gesetzt: P[] = []
    for (const f of flaechen) {
      if (dingeDraussen.length >= DING_ZAHL) break
      let x0 = Infinity
      let z0 = Infinity
      let x1 = -Infinity
      let z1 = -Infinity
      for (const [x, z] of f.poly) {
        x0 = Math.min(x0, x)
        z0 = Math.min(z0, z)
        x1 = Math.max(x1, x)
        z1 = Math.max(z1, z)
      }
      const r = zufallMit(saatZahlen(x0, z0, x1 + 3 * z1))
      let hier = 0
      for (let versuch = 0; versuch < 60 && hier < 5 && dingeDraussen.length < DING_ZAHL; versuch++) {
        const x = x0 + r() * (x1 - x0)
        const z = z0 + r() * (z1 - z0)
        if (!imVieleck(x, z, f.poly) || inHaus(x, z, 0.8) || !punktFrei(x, z, 0.6) || aufStrasse(x, z, 0.5)) continue
        if (gesetzt.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 2)) continue
        if (fzRechs.some((q) => rechAbstand(q, x, z) < 0.8)) continue
        const art = ARTEN[dingeDraussen.length % ARTEN.length]
        const objekt = new Group()
        for (const [geo, m] of art.geos) objekt.add(new Mesh(geo, m))
        const id = `stadt:d${dingeDraussen.length}`
        objekt.name = id
        const xw = weltX(x, z)
        const zw = weltZ(x, z)
        objekt.position.set(xw, o.bodenY + hs(x, z), zw)
        objekt.rotation.y = r() * Math.PI * 2
        gruppe.add(objekt)
        dingeDraussen.push({ id, objekt, breite: art.b, tiefe: art.t, hoehe: art.h, ebene: o.bodenEbene })
        gesetzt.push([x, z])
        hier++
      }
    }
  }

  /* ------------------------------------------------ Sprungziele */
  const sprungziele: Sprungziel3D[] = []
  {
    const liste: { s: Sprungziel3D; d: number; wichtig: boolean }[] = []
    for (const h of haeuser) {
      if (!h.name || !h.tuer) continue
      const t = h.tuer
      const k = t.k
      // Vor der Tuer, sonst weiter weg und seitlich versetzt (etwa wenn ein
      // abgestelltes Auto davor steht).
      for (const [ab, quer] of SPRUNG_STELLEN) {
        const x = t.x + k.nx * ab - k.nz * quer
        const z = t.z + k.nz * ab + k.nx * quer
        if (inHaus(x, z, FREI_R) || !punktFrei(x, z, FREI_R) || fzRechs.some((q) => rechAbstand(q, x, z) < FREI_R)) continue
        liste.push({ s: { name: h.name, ebene: -1, x: weltX(x, z), z: weltZ(x, z), gier: gierAus(-k.nx, -k.nz) }, d: Math.hypot(x, z), wichtig: SPRUNG_WICHTIG.has(h.art) })
        break
      }
    }
    // Je Name nur das naechste Haus (ein Spital hat viele Haeuser mit
    // demselben Namen). Wichtige Orte (Einkaufszentrum, Spital, Feuerwehr,
    // Schule, Kirche, Supermarkt) kommen immer in die Liste, auch weit weg;
    // die uebrigen nach Abstand bis SPRUNG_MAX.
    liste.sort((a, b) => a.d - b.d)
    const namen = new Set<string>()
    const einmal = liste.filter((e) => (namen.has(e.s.name) ? false : (namen.add(e.s.name), true)))
    const wichtige = einmal.filter((e) => e.wichtig)
    const andere = einmal.filter((e) => !e.wichtig).slice(0, Math.max(0, SPRUNG_MAX - wichtige.length))
    for (const e of [...wichtige, ...andere].sort((a, b) => a.d - b.d)) sprungziele.push(e.s)
  }

  /* ------------------------------------------------ Karte */
  const weltPunkt = ([x, z]: P): [number, number] => [weltX(x, z), weltZ(x, z)]
  const karte: StadtWelt['karte'] = (() => {
    const ecken = [
      weltPunkt([rx0, rz0]),
      weltPunkt([rx1, rz0]),
      weltPunkt([rx1, rz1]),
      weltPunkt([rx0, rz1]),
    ]
    const rahmen: [number, number, number, number] = [
      Math.min(...ecken.map((e) => e[0])),
      Math.min(...ecken.map((e) => e[1])),
      Math.max(...ecken.map((e) => e[0])),
      Math.max(...ecken.map((e) => e[1])),
    ]
    const haeuserK = haeuser.map((h) => ({ name: h.name, punkte: h.umriss.map(weltPunkt) }))
    const flaechenK: Karte3D['flaechen'] = []
    for (const art of KARTEN_REIHE) {
      for (const fl of s.flaechen) {
        if (!fl || KARTEN_ART[fl.art] !== art) continue
        const poly = ringLesen(fl.punkte, 'flaeche')
        if (poly.length >= 3) flaechenK.push({ art, punkte: poly.map(weltPunkt) })
      }
    }
    const strassenK: NonNullable<Karte3D['strassen']> = []
    for (const w of s.gewaesser) {
      if (!w) continue
      const punkte = ringLesen(w.punkte, 'gewaesser')
      if (punkte.length >= 2) strassenK.push({ art: 'wasser', breite: endlich(w.breite) ? w.breite : 2, punkte: punkte.map(weltPunkt) })
    }
    const strassenArt = (a: StadtStrasse['art']): 'haupt' | 'neben' | 'fuss' | 'gleis' => (a === 'haupt' || a === 'neben' ? 'haupt' : a === 'gleis' ? 'gleis' : a === 'fuss' || a === 'rad' || a === 'treppe' ? 'fuss' : 'neben')
    for (const art of ['fuss', 'neben', 'haupt', 'gleis'] as const) {
      for (const l of linien) if (strassenArt(l.art) === art) strassenK.push({ art, breite: l.breite, punkte: l.punkte.map(weltPunkt) })
    }
    const orteK: NonNullable<Karte3D['orte']> = []
    for (const ort of s.orte) {
      const n = typeof ort?.name === 'string' ? ort.name.trim() : ''
      if (!n || !endlich(ort.x) || !endlich(ort.z)) continue
      orteK.push({ name: n, x: weltX(ort.x, ort.z), z: weltZ(ort.x, ort.z) })
    }
    return { rahmen, haeuser: haeuserK, flaechen: flaechenK, strassen: strassenK, orte: orteK }
  })()

  /* ------------------------------------------------ Laufzeit: innen laden */
  let weg = false
  let versionNr = 0
  const ebenenListe: Ebene3D[] = []
  const ebeneNachId = new Map<string, Ebene3D>()
  const treppenListe: Treppe3D[] = []
  const treppeNachId = new Map<string, number>()
  let dingeAktuell: WeltDing3D[] = dingeDraussen.slice()
  let fahrzeugeAktuell: Fahrzeug3D[] = fahrzeugeDraussen.slice()
  /** Immer dasselbe Feld mit denselben Rechtecken (bis dispose). */
  let hindernisseAktuell: Hindernis3D[] = statischWelt
  const geladen = new Set<Haus>()
  /** Haeuser bis INNEN_LADEN_M ohne Inneres, das naechste zuerst. */
  let warte: Haus[] = []
  /** Haeuser bis PLAN_M ohne Plan, das naechste zuerst. */
  let planWarte: Haus[] = []
  /** Haeuser mit einem Plan, der noch nicht gebaut ist. */
  const mitPlan = new Set<Haus>()
  /** Anfragen beim Worker, die noch laufen. */
  let planOffen = 0
  /** Das Haus, dessen Inneres gerade Stueck fuer Stueck entsteht. */
  let imBau: { h: Haus; bau: InnenBau } | null = null
  const fensterWarte: Kachel[] = []
  let innenFehler = 0
  const eigenerPlaner = !o.planer
  const planer: InnenPlaner = o.planer ?? werkerPlaner() ?? sofortPlaner()
  /** Wo die Dinge eines Hauses beim Laden standen (weggetragen: nicht mehr dort). */
  const dingStart = new Map<WeltDing3D, [number, number, number]>()
  /** Geschoss, in dem ein Ding des Inneren liegt. */
  const dingStock = new Map<WeltDing3D, number>()

  const listenNeu = () => {
    const dinge = dingeDraussen.slice()
    const fz = fahrzeugeDraussen.slice()
    for (const h of haeuser) {
      if (!h.teil) continue
      dinge.push(...h.teil.dinge)
      fz.push(...h.teil.fahrzeuge)
    }
    dingeAktuell = dinge
    fahrzeugeAktuell = fz
  }

  const fehlerMelden = (h: Haus, was: string, e: unknown) => {
    // Nicht still: melden; das Haus bleibt zu und wird nicht wieder versucht.
    h.fehler = true
    h.wartet = false
    h.plan = null
    mitPlan.delete(h)
    innenFehler++
    gruppe.userData.innenFehler = innenFehler
    console.error(`stadt3d: Haus ${h.id} innen nicht ${was}`, e)
  }

  /** Ecken start..ende eines Meshes wie gebaut (zu) oder auf einen Punkt
   *  gelegt (offen: keine Flaeche mehr). */
  const ecken = (m: Mesh, start: number, ende: number, alt: Float32Array, zu: boolean) => {
    const attr = m.geometry.getAttribute('position') as BufferAttribute
    const arr = attr.array as Float32Array
    if (zu) arr.set(alt, 3 * start)
    else for (let v = start; v < ende; v++) arr.set(alt.subarray(0, 3), 3 * v)
    attr.addUpdateRange(3 * start, 3 * (ende - start))
    attr.needsUpdate = true
  }
  /** Tuerblatt (Kachel) eines Hauses zeigen (zu) oder wegnehmen (offen). */
  const tuerZeigen = (h: Haus, zu: boolean) => {
    const k = kacheln.get(h.kachel)
    if (k?.mesh && h.blatt?.lage) ecken(k.mesh, h.blatt.start, h.blatt.ende, h.blatt.lage, zu)
  }

  /** Welche Geschosse eines geladenen Hauses man sieht (k0 bis k1), null:
   *  keins. Weit weg (ab SICHT_M, zurueck ab SICHT_WEG_M) nichts; draussen
   *  davor nur das Erdgeschoss (durch die Tuer; Fenster sind von aussen
   *  dunkel); drinnen das Geschoss der Fuesse und je eins darueber und
   *  darunter (Treppenauge). Waende und Decken verdecken den Rest. */
  const sichtVon = (h: Haus, d: number, yWelt: number): [number, number] | null => {
    if (d > (h.sicht ? SICHT_WEG_M : SICHT_M)) return null
    if (d > 0 || !Number.isFinite(yWelt)) return [0, 0]
    const fuss = yWelt - o.bodenY - h.boden - 1.2
    const k = begrenzt(Math.floor(fuss / h.gh + 1e-6), 0, h.n - 1)
    return [Math.max(0, k - 1), Math.min(h.n - 1, k + 1)]
  }
  /** Das Innere eines geladenen Hauses so weit zeigen: die Meshes dieser
   *  Geschosse, Glas und Schrift und die Dinge dort (weggetragene immer);
   *  ohne Sicht ist die Tuer zu, so sieht man nie durch ein leeres Haus. */
  const sichtSetzen = (h: Haus, s: [number, number] | null) => {
    const teil = h.teil
    if (!teil) return
    const alt = h.sicht
    if (alt === s || (alt && s && alt[0] === s[0] && alt[1] === s[1])) return
    h.sicht = s
    const zeigt = (k: number) => !!s && k >= s[0] && k <= s[1]
    teil.fest.visible = !!s
    teil.stockMeshes.forEach((m, k) => {
      if (m) m.visible = zeigt(k)
    })
    for (const d of teil.dinge) d.objekt.visible = zeigt(dingStock.get(d) ?? 0) || weggetragen(d)
    if (!alt !== !s) tuerZeigen(h, !s)
  }
  const weggetragen = (d: WeltDing3D): boolean => {
    const s = dingStart.get(d)
    const p = d.objekt.position
    return !s || Math.abs(p.x - s[0]) + Math.abs(p.y - s[1]) + Math.abs(p.z - s[2]) > 0.05
  }

  /** Ausschnitte im Gelaende fuer ein offenes Haus, wenn das Gelaende in
   *  ihm hoeher liegt als sein Boden (Hang): der Umriss ohne Hoefe in
   *  Dreiecken. Einmal gerechnet; null: keiner noetig. */
  const schnittVon = (h: Haus): Ausschnitt[] | null => {
    if (h.schnitt !== undefined) return h.schnitt
    let hoch = -Infinity
    for (const k of h.kanten) {
      const m = Math.max(1, Math.ceil(k.L / 1.5))
      for (let q = 0; q <= m; q++) hoch = Math.max(hoch, hs(k.ax + (k.ux * k.L * q) / m, k.az + (k.uz * k.L * q) / m))
    }
    const { xs, zs } = gelaendeDaten
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] < h.box[0] || xs[i] > h.box[2]) continue
      for (let j = 0; j < zs.length; j++) {
        if (zs[j] < h.box[1] || zs[j] > h.box[3]) continue
        if (imVieleck(xs[i], zs[j], h.umriss)) hoch = Math.max(hoch, hs(xs[i], zs[j]))
      }
    }
    // Gezeichnet liegt das Gelaende TIEFER unter hs, der Estrich innen 1 cm unter dem Boden.
    if (!(hoch - TIEFER > h.boden - 0.03)) {
      h.schnitt = null
      return null
    }
    const teile: Ausschnitt[] = []
    try {
      const alle: P[] = [...h.umriss, ...h.loecher.flat()]
      const dreiecke = ShapeUtils.triangulateShape(
        h.umriss.map(([x, z]) => new Vector2(x, z)),
        h.loecher.map((r) => r.map(([x, z]) => new Vector2(x, z))),
      )
      for (const [a, b, c] of dreiecke) {
        const d: P[] = [alle[a], alle[b], alle[c]]
        if (d.some((p) => !p)) continue
        const t = ausschnittAus(flaecheVon(d) > 0 ? d : [d[0], d[2], d[1]])
        if (t) teile.push(t)
      }
    } catch (e) {
      console.error(`stadt3d: Haus ${h.id}: Umriss nicht zerlegt, Gelaende bleibt`, e)
    }
    h.schnitt = teile.length ? teile : null
    return h.schnitt
  }
  /** Ausschnitte eines Hauses in die Stuecke Gelaende (an) oder heraus. */
  const schnittSetzen = (h: Haus, an: boolean) => {
    const teile = an ? schnittVon(h) : null
    for (const st of gelaendeStuecke) {
      if (!kastenUeber(st.box, h.box)) continue
      if (teile) {
        const hier = teile.filter((t) => kastenUeber(t.box, st.box))
        if (!hier.length) continue
        st.haus.set(h, hier)
        st.neu = true
      } else if (st.haus.delete(h)) st.neu = true
    }
  }

  /** Plan anfragen (Vorrat, sonst Worker oder gleich hier). */
  const planAnfragen = (h: Haus): void => {
    if (h.planStand !== 0 || h.fehler || !h.tuer) return
    const k = JSON.stringify(h.eingabe)
    const alt = planVorrat(k)
    if (alt) {
      h.plan = alt
      h.planStand = 2
      mitPlan.add(h)
      return
    }
    h.planStand = 1
    const nebenher = planer.nebenher
    if (nebenher) planOffen++
    planer.planen(h.eingabe, (plan, fehler) => {
      if (nebenher) planOffen = Math.max(0, planOffen - 1)
      if (weg) return
      if (!plan) {
        h.planStand = 0
        fehlerMelden(h, 'geplant', fehler)
        return
      }
      planMerken(k, plan)
      h.plan = plan
      h.planStand = 2
      mitPlan.add(h)
    })
  }

  const bauStarten = (h: Haus): void => {
    const t = h.tuer
    const plan = h.plan
    if (!t || !plan) return
    const zu = M.clone().multiply(new Matrix4().makeTranslation(0, h.boden, 0))
    const sx = t.x + t.k.nx * SCHWELLE_VOR
    const sz = t.z + t.k.nz * SCHWELLE_VOR
    imBau = {
      h,
      bau: innenBauen({
        plan,
        farben: o.farben,
        zuWelt: zu,
        praefix: `stadt:${h.id}`,
        name: h.name || ART_NAME[h.art] || h.art,
        bodenEbene: o.bodenEbene,
        schwelleY: o.bodenY + hs(sx, sz),
      }),
    }
  }

  const bauFertig = (h: Haus, teil: InnenTeil): void => {
    gruppe.add(teil.gruppe)
    h.teil = teil
    h.plan = null
    h.planStand = 0
    mitPlan.delete(h)
    geladen.add(h)
    for (const e of teil.ebenen) {
      const alt = ebeneNachId.get(e.id)
      if (alt) Object.assign(alt, e)
      else {
        ebeneNachId.set(e.id, e)
        ebenenListe.push(e)
      }
    }
    for (const tr of teil.treppen) {
      const i = treppeNachId.get(tr.id)
      if (i === undefined) {
        treppeNachId.set(tr.id, treppenListe.length)
        treppenListe.push(tr)
      } else treppenListe[i] = tr
    }
    const vorne = `stadt:${h.id}:`
    for (const d of teil.dinge) {
      const p = d.objekt.position
      dingStart.set(d, [p.x, p.y, p.z])
      const k = d.ebene.startsWith(vorne) ? Number(d.ebene.slice(vorne.length)) : 0
      dingStock.set(d, Number.isFinite(k) ? k : 0)
    }
    // Erst alles aus (Tuer zu), dann so weit zeigen, wie man sieht.
    h.sicht = null
    teil.fest.visible = false
    for (const d of teil.dinge) d.objekt.visible = false
    if (Number.isFinite(letzteX)) sichtSetzen(h, sichtVon(h, abstandHaus(h, letzteX, letzteZ), letzteY))
    schnittSetzen(h, true)
    versionNr++
    listenNeu()
  }

  /** Hat jemand ein Ding oder Fahrzeug aus dem Haus weggebracht? */
  const wegGebracht = (h: Haus): boolean => {
    if (!h.teil) return false
    const v = new Vector3()
    const [x0, z0, x1, z1] = h.box
    const draussen = (obj: Object3D) => {
      obj.getWorldPosition(v)
      const dx = v.x - tx
      const dz = v.z - tz
      const x = c0 * dx + c2 * dz
      const z = c8 * dx + c10 * dz
      return x < x0 - 3 || x > x1 + 3 || z < z0 - 3 || z > z1 + 3
    }
    return h.teil.dinge.some((d) => draussen(d.objekt)) || h.teil.fahrzeuge.some((f) => draussen(f.gruppe))
  }

  const entladen = (h: Haus) => {
    if (!h.teil) return
    const teil = h.teil
    gruppe.remove(teil.gruppe)
    for (const d of teil.dinge) {
      dingStart.delete(d)
      dingStock.delete(d)
    }
    try {
      teil.dispose()
    } catch (e) {
      // Nicht still: melden; das Haus gilt trotzdem als entladen.
      console.error(`stadt3d: Haus ${h.id} innen nicht freigegeben`, e)
    }
    if (h.sicht) tuerZeigen(h, true)
    h.teil = null
    h.sicht = null
    geladen.delete(h)
    entladeWarte.delete(h)
    schnittSetzen(h, false)
  }
  /** Haeuser, die weit genug weg sind: je Bild eins entladen (dispose
   *  kostet Zeit, ein Sprung laesst sonst viele auf einmal fallen). */
  const entladeWarte = new Set<Haus>()

  let letzteX = NaN
  let letzteY = NaN
  /** Stelle beim letzten Aufruf und ob es seither weit war (schnell). */
  let vorX = NaN
  let vorZ = NaN
  let schnell = false
  let letzteZ = NaN
  let kachelX = NaN
  let kachelZ = NaN
  const kamera = (x: number, y: number, z: number) => {
    if (weg) return
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      for (const h of warte) h.wartet = false
      warte = []
      planWarte = []
      letzteX = NaN
      return
    }
    const dx = x - tx
    const dz = z - tz
    const xs = c0 * dx + c2 * dz
    const zs = c8 * dx + c10 * dz
    schnell = Math.hypot(xs - vorX, zs - vorZ) > SCHNELL_M
    vorX = xs
    vorZ = zs
    if (!(Math.hypot(xs - letzteX, zs - letzteZ) < 0.5) || !(Math.abs(y - letzteY) < 0.5)) {
      letzteX = xs
      letzteY = y
      letzteZ = zs
      // Plaene ab PLAN_M, Laden ab INNEN_LADEN_M (Raster, kein Durchlauf ueber alle).
      const plaeneNeu: { h: Haus; d: number }[] = []
      const neu: Haus[] = []
      hausRaster.suche(xs - PLAN_M, zs - PLAN_M, xs + PLAN_M, zs + PLAN_M, (i) => {
        const h = haeuser[i]
        if (h.teil || h.fehler || !h.tuer || (imBau && imBau.h === h)) return
        const d = abstandHaus(h, xs, zs)
        if (d > PLAN_M) return
        if (h.planStand === 0) plaeneNeu.push({ h, d })
        if (d <= INNEN_LADEN_M && !h.wartet) {
          h.wartet = true
          neu.push(h)
        }
      })
      planWarte = plaeneNeu.sort((a, b) => a.d - b.d).map((x) => x.h)
      if (neu.length) warte.push(...neu)
      if (warte.length > 1) warte.sort((a, b) => abstandHaus(a, xs, zs) - abstandHaus(b, xs, zs))
      // Plaene ferner Haeuser loslassen (der Vorrat behaelt die letzten).
      for (const h of mitPlan) {
        if (abstandHaus(h, xs, zs) > PLAN_M + 30 && (!imBau || imBau.h !== h)) {
          h.plan = null
          h.planStand = 0
          mitPlan.delete(h)
        }
      }
      // Ein Bau, der zu weit weg ist, hoert auf.
      if (imBau && abstandHaus(imBau.h, xs, zs) > INNEN_LADEN_M + 10) {
        imBau.bau.abbrechen()
        imBau = null
      }
      // Fern genug zum Entladen? (vorgemerkt, schritt() entlaedt je Bild eins)
      for (const h of geladen) {
        const d = abstandHaus(h, xs, zs)
        if (d > INNEN_ENTLADEN_M && !wegGebracht(h)) {
          entladeWarte.add(h)
          sichtSetzen(h, null)
        } else entladeWarte.delete(h)
        if (!entladeWarte.has(h)) sichtSetzen(h, sichtVon(h, d, y))
        // Weggetragene Dinge bleiben zu sehen.
        if (h.teil) for (const di of h.teil.dinge) if (!di.objekt.visible && weggetragen(di)) di.objekt.visible = true
      }
    }
    if (!(Math.hypot(xs - kachelX, zs - kachelZ) < 5)) {
      kachelX = xs
      kachelZ = zs
      for (const k of kacheln.values()) {
        if (!k.mesh) continue
        const d = Math.hypot(k.cx - xs, k.cz - zs)
        const nah = d <= NAH_M
        if (nah !== k.nah) {
          k.nah = nah
          k.mesh.material = nah ? schlichtMat : musterMat
          if (nah && !k.fenster && !k.wartet) {
            k.wartet = true
            fensterWarte.push(k)
          }
        }
        if (k.fenster) {
          k.fenster.visible = nah
          if (!nah && d > NAH_WEG_M) {
            lage.remove(k.fenster)
            k.fenster.geometry.dispose()
            const i = geometrien.indexOf(k.fenster.geometry)
            if (i >= 0) geometrien.splice(i, 1)
            k.fenster = null
          }
        }
      }
      fensterWarte.sort((a, b) => Math.hypot(a.cx - xs, a.cz - zs) - Math.hypot(b.cx - xs, b.cz - zs))
      for (const b of baumKacheln) {
        const fein = Math.hypot(b.cx - xs, b.cz - zs) <= BAUM_FEIN_M
        if (fein !== b.fein) {
          b.fein = fein
          b.kronen.geometry = fein ? kroneFein : kroneGrob
        }
      }
    }
  }

  /** Was es nur nah gibt: Glas und Rahmen der Fenster, Rahmen und Leibung
   *  der Tueren und die Stufen davor. */
  const fensterBauen = (k: Kachel, bis: number): boolean => {
    if (!k.nah || k.fenster || weg) {
      k.wartet = false
      k.bau = null
      return true
    }
    // In Stuecken: je Aufruf Haeuser, bis die Zeit um ist (mindestens eins).
    const bau = k.bau ?? (k.bau = { p: new Puffer(4096), i: 0 })
    const p = bau.p
    const glas = ton(F.glasDunkel)
    const rahmen = ton(F.rahmen)
    while (bau.i < k.haeuser.length) {
      const h = haeuser[k.haeuser[bau.i++]]
      if (h.tuer) {
        tuerLeibung(p, h)
        tuerStufen(p, h)
      }
      for (const kn of h.kanten) {
        if (!kn.reihe.length) continue
        for (let gs = 0; gs < h.n; gs++) {
          const wo = gs === 0 && kn.eg ? kn.eg : kn.reihe
          const y0 = h.boden + gs * h.gh + FENSTER_BRUESTUNG
          for (const c of wo) {
            wandViereck(p, kn, c - FENSTER_B / 2 - RAHMEN_B, c + FENSTER_B / 2 + RAHMEN_B, y0 - RAHMEN_B, y0 + FENSTER_H + RAHMEN_B, RAHMEN_VOR, rahmen, null, 0, 1)
            wandViereck(p, kn, c - FENSTER_B / 2, c + FENSTER_B / 2, y0, y0 + FENSTER_H, GLAS_VOR, glas, null, 0, 1)
          }
        }
      }
      if (performance.now() >= bis) break
    }
    if (bau.i < k.haeuser.length) return false
    k.bau = null
    k.wartet = false
    const geo = p.bauen()
    if (!geo) return true
    geometrien.push(geo)
    const m = new Mesh(geo, schlichtMat)
    m.name = `fenster:${k.nr}`
    m.matrixAutoUpdate = false
    nurInReichweite(m)
    lage.add(m)
    k.fenster = m
    return true
  }

  const schritt = (_dt: number): boolean => {
    if (weg) return false
    const bis = performance.now() + (schnell ? BAU_SCHNELL_MS : BAU_MS)
    // 0. Entladen: je Bild eins (mehr am Ende, wenn Zeit bleibt).
    let entladen1 = false
    for (const h of entladeWarte) {
      entladen(h)
      entladen1 = true
      break
    }
    // 1. Plaene: beim Worker hoechstens PLAN_OFFEN zugleich, die naechsten
    // zuerst; ohne Worker einer je Bild (kostet Zeit), nur fuer Haeuser, die
    // schon laden wollen, und nur, wenn gerade nichts gebaut wird.
    if (planer.nebenher) {
      while (planOffen < PLAN_OFFEN && planWarte.length) {
        const h = planWarte.shift() as Haus
        if (h.planStand === 0 && !h.teil && !h.fehler) planAnfragen(h)
      }
    } else if (!imBau) {
      const h = warte.find((x) => x.planStand === 0 && !x.fehler)
      if (h) planAnfragen(h)
    }
    // 2. Bauen: hoechstens ein Haus zugleich, in Stuecken bis zur Zeit.
    if (!imBau && warte.length) {
      for (let i = 0; i < warte.length; i++) {
        const h = warte[i]
        if (h.teil || h.fehler || (Number.isFinite(letzteX) && abstandHaus(h, letzteX, letzteZ) > INNEN_LADEN_M + 5)) {
          h.wartet = false
          warte.splice(i--, 1)
          continue
        }
        if (h.planStand !== 2 || !h.plan) continue
        h.wartet = false
        warte.splice(i, 1)
        try {
          bauStarten(h)
        } catch (e) {
          fehlerMelden(h, 'gebaut', e)
        }
        break
      }
    }
    if (imBau && performance.now() < bis) {
      const jetzt = imBau
      try {
        if (jetzt.bau.weiter(bis)) {
          imBau = null
          if (jetzt.bau.teil) bauFertig(jetzt.h, jetzt.bau.teil)
        }
      } catch (e) {
        imBau = null
        // Halb eingehaengt? Dann wie Entladen, sonst den Bau freigeben.
        if (jetzt.h.teil) entladen(jetzt.h)
        else jetzt.bau.abbrechen()
        fehlerMelden(jetzt.h, 'gebaut', e)
      }
    }
    // 3. Gelaende mit neuen Ausschnitten (ein Stueck je Bild).
    let gelaendeOffen = false
    for (const st of gelaendeStuecke) {
      if (!st.neu) continue
      if (performance.now() < bis) gelaendeNeu(st)
      else gelaendeOffen = true
      break
    }
    // 4. Fenster der nahen Kacheln.
    while (fensterWarte.length && performance.now() < bis) {
      if (fensterBauen(fensterWarte[0], bis)) fensterWarte.shift()
    }
    for (const h of entladeWarte) {
      if (performance.now() >= bis) break
      entladen(h)
      entladen1 = true
    }
    if (entladen1) {
      versionNr++
      listenNeu()
    }
    return warte.length > 0 || fensterWarte.length > 0 || imBau !== null || planOffen > 0 || entladeWarte.size > 0 || gelaendeOffen || gelaendeStuecke.some((st) => st.neu)
  }

  const dispose = () => {
    if (weg) return
    weg = true
    if (imBau) {
      imBau.bau.abbrechen()
      imBau = null
    }
    for (const h of haeuser) {
      if (h.teil) {
        h.teil.dispose()
        h.teil = null
      }
      h.plan = null
    }
    if (eigenerPlaner) planer.dispose()
    geladen.clear()
    mitPlan.clear()
    dingStart.clear()
    dingStock.clear()
    entladeWarte.clear()
    warte = []
    planWarte = []
    fensterWarte.length = 0
    for (const fz of fahrzeugeDraussen) fz.dispose()
    for (const geo of [...geometrien, ...dingGeos]) geo.dispose()
    for (const m of [...materialien, ...dingMats]) m.dispose()
    for (const t of texturen) t.dispose()
    for (const b of baumKacheln) b.kronen.dispose()
    staemme?.dispose()
    lage.clear()
    gruppe.clear()
    dingeAktuell = []
    fahrzeugeAktuell = []
    hindernisseAktuell = []
  }

  // Die Fahrzeuge zum Anschauen im Inneren einmal vorrechnen (sonst haelt
  // das erste Haus mit Fahrzeug ein Bild auf).
  try {
    innenVorbereiten(o.farben)
  } catch (e) {
    console.error('stadt3d: Fahrzeuge fuers Innere nicht vorgerechnet', e)
  }

  gruppe.userData = {
    haeuser: haeuser.length,
    uebersprungen,
    strassen: linien.length,
    baeume: baumListe.length,
    laternen: laternenZahl,
    kacheln: kacheln.size,
    gelaende: gelaendeMeshes.length,
    innenFehler,
  }

  return {
    gruppe,
    hindernisse: () => hindernisseAktuell,
    hoehe,
    ebenen: () => ebenenListe,
    treppen: () => treppenListe,
    fahrzeuge: () => fahrzeugeAktuell,
    dinge: () => dingeAktuell,
    sprungziele,
    karte,
    version: () => versionNr,
    kamera,
    schritt,
    dispose,
  }
}

/* ------------------------------------------------ Hilfen ausserhalb */

/** Reihenfolge der Flaechen beim Malen (spaetere liegen oben). */
const FLAECHEN_REIHE: StadtFlaechenArt[] = ['wohngebiet', 'acker', 'wiese', 'gewerbe', 'wald', 'park', 'friedhof', 'sport', 'fels', 'parkplatz', 'spielplatz', 'schwimmbad', 'wasser']

/** Flaechen der Stadt auf der Minikarte; wohngebiet faellt weg. */
const KARTEN_ART: Record<StadtFlaechenArt, KartenFlaeche | null> = {
  wiese: 'wiese',
  park: 'wiese',
  friedhof: 'wiese',
  wald: 'wald',
  acker: 'acker',
  fels: 'acker',
  wasser: 'wasser',
  schwimmbad: 'wasser',
  parkplatz: 'parkplatz',
  sport: 'sport',
  spielplatz: 'spielplatz',
  gewerbe: 'gewerbe',
  wohngebiet: null,
}
const KARTEN_REIHE: KartenFlaeche[] = ['acker', 'wiese', 'gewerbe', 'wald', 'sport', 'parkplatz', 'spielplatz', 'wasser']

/** Rechteck x0, z0, x1, z1. */
type Kasten = [number, number, number, number]

/** Ein Ausschnitt im Gelaende: konvexes Vieleck gegen den Uhrzeigersinn
 *  (flaecheVon > 0, innen links jeder Kante) mit Rahmen. */
interface Ausschnitt {
  poly: P[]
  box: Kasten
}

const kastenUeber = (a: Kasten, b: Kasten): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]

function ausschnittAus(poly: P[]): Ausschnitt | null {
  if (poly.length < 3 || !(flaecheVon(poly) > 1e-6)) return null
  let x0 = Infinity
  let z0 = Infinity
  let x1 = -Infinity
  let z1 = -Infinity
  for (const [x, z] of poly) {
    x0 = Math.min(x0, x)
    z0 = Math.min(z0, z)
    x1 = Math.max(x1, x)
    z1 = Math.max(z1, z)
  }
  return { poly, box: [x0, z0, x1, z1] }
}

/** Konvexe Huelle (Andrew), gegen den Uhrzeigersinn (flaecheVon > 0). */
function huelle(punkte: readonly P[]): P[] {
  const p = [...punkte].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const kreuz = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const unten: P[] = []
  for (const q of p) {
    while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 1e-12) unten.pop()
    unten.push(q)
  }
  const oben: P[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 1e-12) oben.pop()
    oben.push(q)
  }
  unten.pop()
  oben.pop()
  return unten.concat(oben)
}

/** Liegen zwei konvexe Vielecke getrennt (eine Kante trennt sie)? */
function getrennt(a: readonly P[], b: readonly P[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const q = poly[(i + 1) % poly.length]
      const nx = -(q[1] - p[1])
      const nz = q[0] - p[0]
      let a0 = Infinity
      let a1 = -Infinity
      for (const r of a) {
        const s = r[0] * nx + r[1] * nz
        a0 = Math.min(a0, s)
        a1 = Math.max(a1, s)
      }
      let b0 = Infinity
      let b1 = -Infinity
      for (const r of b) {
        const s = r[0] * nx + r[1] * nz
        b0 = Math.min(b0, s)
        b1 = Math.max(b1, s)
      }
      if (a1 <= b0 + 1e-9 || b1 <= a0 + 1e-9) return true
    }
  }
  return false
}

/** Ein konvexes Vieleck ohne den konvexen Ausschnitt c (gegen den
 *  Uhrzeigersinn): die Teile draussen, je Kante von c eins. Liegen beide
 *  getrennt, kommt poly selbst (dasselbe Feld) zurueck. */
function ohneKonvex(poly: P[], c: readonly P[]): P[][] {
  if (getrennt(poly, c)) return [poly]
  const out: P[][] = []
  let rest = poly
  for (let i = 0; i < c.length && rest.length >= 3; i++) {
    const p = c[i]
    const q = c[(i + 1) % c.length]
    const dx = q[0] - p[0]
    const dz = q[1] - p[1]
    // Innen (links der Kante): dz x - dx z <= dz px - dx pz.
    const d = dz * p[0] - dx * p[1]
    const draussen = halbebene(rest, -dz, dx, -d)
    if (draussen.length >= 3 && Math.abs(flaecheVon(draussen)) > 1e-6) out.push(draussen)
    rest = halbebene(rest, dz, -dx, d)
  }
  return out
}

function ohneDoppelte(punkte: P[]): P[] {
  const out: P[] = []
  for (const p of punkte) {
    const l = out[out.length - 1]
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.01) out.push(p)
  }
  return out
}

/** Punkt bei Bogenlaenge a auf der Linie. */
function aufLinie(punkte: P[], a: number): P | null {
  const r = aufLinieMitRichtung(punkte, a)
  return r ? [r[0], r[1]] : null
}

/** Punkt und Richtung (x, z, ux, uz) bei Bogenlaenge a. */
function aufLinieMitRichtung(punkte: P[], a: number): [number, number, number, number] | null {
  let rest = a
  for (let k = 0; k + 1 < punkte.length; k++) {
    const [ax, az] = punkte[k]
    const [bx, bz] = punkte[k + 1]
    const l = Math.hypot(bx - ax, bz - az)
    if (l < 1e-9) continue
    if (rest <= l) return [ax + ((bx - ax) * rest) / l, az + ((bz - az) * rest) / l, (bx - ax) / l, (bz - az) / l]
    rest -= l
  }
  return null
}

/** Teil des Vielecks, wo ax * x + az * z <= d. */
function halbebene(poly: P[], ax: number, az: number, d: number): P[] {
  const out: P[] = []
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % n]
    const fp = ax * p[0] + az * p[1] - d
    const fq = ax * q[0] + az * q[1] - d
    if (fp <= 1e-9) out.push(p)
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
      const t = fp / (fp - fq)
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t])
    }
  }
  return out
}

/** Kleinstes Rechteck um das Vieleck, ausgerichtet an einer seiner Kanten:
 *  Mitte, Richtung der langen Seite, halbe Laenge und halbe Breite. */
function kleinstesRechteck(poly: readonly P[]): { cx: number; cz: number; ex: number; ez: number; halbL: number; halbB: number } | null {
  let best: { f: number; cx: number; cz: number; ex: number; ez: number; halbL: number; halbB: number } | null = null
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (l < 0.05) continue
    const ux = (b[0] - a[0]) / l
    const uz = (b[1] - a[1]) / l
    let t0 = Infinity
    let t1 = -Infinity
    let s0 = Infinity
    let s1 = -Infinity
    for (const p of poly) {
      const t = p[0] * ux + p[1] * uz
      const sv = -p[0] * uz + p[1] * ux
      t0 = Math.min(t0, t)
      t1 = Math.max(t1, t)
      s0 = Math.min(s0, sv)
      s1 = Math.max(s1, sv)
    }
    const f = (t1 - t0) * (s1 - s0)
    if (!best || f < best.f - 1e-9) {
      const tm = (t0 + t1) / 2
      const sm = (s0 + s1) / 2
      const cx = tm * ux - sm * uz
      const cz = tm * uz + sm * ux
      const lang = t1 - t0 >= s1 - s0
      best = lang
        ? { f, cx, cz, ex: ux, ez: uz, halbL: (t1 - t0) / 2, halbB: (s1 - s0) / 2 }
        : { f, cx, cz, ex: -uz, ez: ux, halbL: (s1 - s0) / 2, halbB: (t1 - t0) / 2 }
    }
  }
  if (!best || best.halbB < 0.05) return null
  return { cx: best.cx, cz: best.cz, ex: best.ex, ez: best.ez, halbL: best.halbL, halbB: best.halbB }
}

/** Punkte des Rings um d nach innen (ins Material) versetzt, auf Gehrung
 *  (hoechstens dreimal d). links: das Material liegt links der Kanten. */
function einwaerts(ring: readonly P[], d: number, links: boolean): P[] {
  const n = ring.length
  const out: P[] = []
  for (let i = 0; i < n; i++) {
    const p = ring[(i + n - 1) % n]
    const q = ring[i]
    const r = ring[(i + 1) % n]
    const nAus = (a: P, b: P): P => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      const ux = (b[0] - a[0]) / l
      const uz = (b[1] - a[1]) / l
      // nach innen: links von u ist (-uz, ux) ... (bei links = Material links)
      return links ? [-uz, ux] : [uz, -ux]
    }
    const n1 = nAus(p, q)
    const n2 = nAus(q, r)
    let mx = n1[0] + n2[0]
    let mz = n1[1] + n2[1]
    const ml = Math.hypot(mx, mz)
    if (ml < 1e-6) {
      mx = n1[0]
      mz = n1[1]
    } else {
      mx /= ml
      mz /= ml
    }
    const cos = mx * n1[0] + mz * n1[1]
    const f = Math.min(3 * d, d / Math.max(cos, 1e-3))
    out.push([q[0] + mx * f, q[1] + mz * f])
  }
  return out
}

/** Gitter des Gelaendes zum Zeichnen: Spalten- und Zeilenlagen, Hoehen
 *  (aus gelaendeHoehe, an den Gitterpunkten genau die Daten). Zu feine
 *  Gitter werden ausgeduennt; ohne brauchbares Gitter eben ueber dem Rahmen. */
function gitterAus(g: StadtDaten['gelaende'], rahmen: [number, number, number, number], hs: (x: number, z: number) => number): { xs: Float64Array; zs: Float64Array; h: Float32Array; schritt: number } {
  let xs: number[] = []
  let zs: number[] = []
  let schritt: number
  if (g && g.nx >= 2 && g.nz >= 2 && g.schritt > 0 && Array.isArray(g.dm) && g.dm.length >= g.nx * g.nz && endlich(g.x0) && endlich(g.z0)) {
    let st = 1
    while (Math.ceil((g.nx - 1) / st + 1) * Math.ceil((g.nz - 1) / st + 1) > GITTER_MAX) st++
    const spalten: number[] = []
    for (let i = 0; i < g.nx - 1; i += st) spalten.push(i)
    spalten.push(g.nx - 1)
    const zeilen: number[] = []
    for (let j = 0; j < g.nz - 1; j += st) zeilen.push(j)
    zeilen.push(g.nz - 1)
    xs = spalten.map((i) => g.x0 + i * g.schritt)
    zs = zeilen.map((j) => g.z0 + j * g.schritt)
    schritt = g.schritt * st
  } else {
    const [x0, z0, x1, z1] = rahmen
    schritt = 25
    for (let x = x0; x < x1 + schritt - 1e-6; x += schritt) xs.push(Math.min(x, x1))
    for (let z = z0; z < z1 + schritt - 1e-6; z += schritt) zs.push(Math.min(z, z1))
    if (xs.length < 2) xs = [x0, x1]
    if (zs.length < 2) zs = [z0, z1]
  }
  const h = new Float32Array(xs.length * zs.length)
  for (let j = 0; j < zs.length; j++) for (let i = 0; i < xs.length; i++) h[j * xs.length + i] = hs(xs[i], zs[j])
  return { xs: Float64Array.from(xs), zs: Float64Array.from(zs), h, schritt }
}

/** Kugel fuer Baumkronen mit weichen Normalen (detail 0 grob, 1 fein). */
function kugelGeo(detail: number): BufferGeometry {
  const g = new IcosahedronGeometry(1, detail)
  const lagen = g.getAttribute('position')
  const normalen = g.getAttribute('normal')
  const v = new Vector3()
  for (let i = 0; i < lagen.count; i++) {
    v.fromBufferAttribute(lagen, i).normalize()
    normalen.setXYZ(i, v.x, v.y, v.z)
  }
  return g
}

/** Laterne: Mast, Arm und Leuchte, Farben je Ecke; Arm nach lokal -z. */
function lampenForm(F: Farben): BufferGeometry {
  const teile: [BufferGeometry, Color][] = []
  const mast = new CylinderGeometry(0.06, 0.09, 5.2, 6, 1, true)
  mast.translate(0, 2.6, 0)
  teile.push([mast, F.zaun])
  const arm = new BoxGeometry(0.06, 0.06, 1.0)
  arm.translate(0, 5.12, -0.5)
  teile.push([arm, F.zaun])
  const kopf = new BoxGeometry(0.24, 0.12, 0.48)
  kopf.translate(0, 5.06, -1.0)
  teile.push([kopf, F.zaun])
  const licht = new BoxGeometry(0.2, 0.02, 0.42)
  licht.translate(0, 4.995, -1.0)
  teile.push([licht, F.lampe])
  const lagen: number[] = []
  const normalen: number[] = []
  const farben: number[] = []
  for (const [geo, c] of teile) {
    const n = geo.index ? geo.toNonIndexed() : geo
    const pa = n.getAttribute('position')
    const na = n.getAttribute('normal')
    for (let i = 0; i < pa.count; i++) {
      lagen.push(pa.getX(i), pa.getY(i), pa.getZ(i))
      normalen.push(na.getX(i), na.getY(i), na.getZ(i))
      farben.push(c.r, c.g, c.b)
    }
    if (n !== geo) n.dispose()
    geo.dispose()
  }
  const out = new BufferGeometry()
  out.setAttribute('position', new BufferAttribute(new Float32Array(lagen), 3))
  out.setAttribute('normal', new BufferAttribute(new Float32Array(normalen), 3))
  out.setAttribute('color', new BufferAttribute(new Float32Array(farben), 3))
  out.computeBoundingSphere()
  return out
}

/** Fenstermuster fuer ferne Fassaden: eine Zelle ist ein Fensterabstand
 *  breit und ein Geschoss (3 m) hoch, das Fenster dunkel in der Mitte. */
function fensterMuster(): DataTexture {
  const N = 64
  const daten = new Uint8Array(N * N * 4)
  const x0 = Math.round(((FENSTER_ABSTAND - FENSTER_B) / 2 / FENSTER_ABSTAND) * N)
  const x1 = Math.round(((FENSTER_ABSTAND + FENSTER_B) / 2 / FENSTER_ABSTAND) * N)
  const y0 = Math.round((FENSTER_BRUESTUNG / 3) * N)
  const y1 = Math.round(((FENSTER_BRUESTUNG + FENSTER_H) / 3) * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = 4 * (y * N + x)
      const fenster = x >= x0 && x < x1 && y >= y0 && y < y1
      daten[i] = fenster ? 62 : 255
      daten[i + 1] = fenster ? 72 : 255
      daten[i + 2] = fenster ? 88 : 255
      daten[i + 3] = 255
    }
  }
  const t = new DataTexture(daten, N, N)
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.magFilter = LinearFilter
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

/** Arabisch oder Hebraeisch zuerst: von rechts nach links. */
function istRtl(text: string): boolean {
  for (const z of text) {
    if (/[֐-ࣿיִ-﷿ﹰ-﻿]/.test(z)) return true
    if (/[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/.test(z)) return false
  }
  return false
}

function kuerzen(text: string, max: number): string {
  const zeichen = Array.from(text)
  return zeichen.length > max ? zeichen.slice(0, max - 1).join('') + '…' : text
}
