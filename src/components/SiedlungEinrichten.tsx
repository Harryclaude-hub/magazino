import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent as ZeigerEreignis, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, MapPin, RotateCcw, RotateCw, Search, TriangleAlert, X } from 'lucide-react'
import { Button, Card, ErrorBox, Field, IconButton, Input, Loading, Select, useToast } from './ui'
import { useSprache } from '../lib/i18n'
import { ladeGrundriss, ladeGrundrisse, listProjects, speichereSiedlung } from '../lib/api'
import { adresseSuchen, gebaeudeLaden, OSM_HINWEIS } from '../lib/osm'
import type { Grundriss, Project, Siedlung, SiedlungAussen, SiedlungGebaeude, SiedlungStil, SiedlungWohnung } from '../lib/types'
import { cx } from '../lib/util'

/* Siedlung einrichten (E83): vier Schritte, am Handy bildschirmfuellend.
 *
 *  1 Adresse   suchen (OpenStreetMap), einen Treffer antippen
 *  2 Haeuser   die Haeuser im Umkreis von 120 m von oben; antippen nimmt
 *              ein Haus dazu oder laesst es weg; je Haus Name, Stockwerke
 *              und Aussehen
 *  3 Wohnung   einen Grundriss aus einem Umzug waehlen, Haus und Stockwerk,
 *              dann auf der Karte an seine Stelle ziehen und drehen
 *  4 Speichern Name, dann speichern
 *
 * Koordinaten wie im Vertrag (types.ts): Meter um den Mittelpunkt (lat,
 * lon), x nach Osten, z nach Sueden. Der Ursprung des Grundrisses (0,0 cm)
 * liegt bei (wohnung.x, wohnung.z), gedreht um wohnung.drehung:
 *   (x, z) = (w.x, w.z) + R(drehung) * (px / 100, py / 100)
 *   R(t) = [[cos t, -sin t], [sin t, cos t]]
 * Positiv dreht im Uhrzeigersinn (Norden oben, Osten rechts).
 *
 * Die Karte wird nie gespiegelt, auch nicht im Arabischen (dir="ltr").
 * Der Zustand gehoert dieser Komponente: sie wird bei jedem Oeffnen neu
 * eingehaengt und beginnt frisch. Datenzugriff nur ueber api.ts und
 * osm.ts. Die Rechnungen unten sind rein und werden von
 * scripts/siedlung-ui-pruefen.mjs geprueft. */

/* ------------------------------------------------------------ Rechnen */

type Drehung = SiedlungWohnung['drehung']
type P = [number, number]
type Kasten = [number, number, number, number]
/** Wo der Ursprung des Grundrisses in der Siedlung liegt. */
export type Lage = Pick<SiedlungWohnung, 'x' | 'z' | 'drehung'>

/** Umkreis fuer die Haeuser (Meter). */
const UMKREIS_M = 120
/** Ein Druck auf einen Pfeil schiebt so weit (Meter). */
const SCHIEBEN_M = 0.1
/** Lagen auf den Zentimeter. */
const rund = (v: number) => Math.round(v * 100) / 100

/** cos und sin fuer 0, 90, 180 und 270 Grad, ohne Rundungsreste. */
function drehWerte(d: Drehung): P {
  if (d === 90) return [0, 1]
  if (d === 180) return [-1, 0]
  if (d === 270) return [0, -1]
  return [1, 0]
}

/** Punkt des Plans (cm) in der Siedlung (m). */
export function planNachSiedlung(w: Lage, px: number, py: number): P {
  const [c, s] = drehWerte(w.drehung)
  const x = px / 100
  const y = py / 100
  return [w.x + c * x - s * y, w.z + s * x + c * y]
}

/** Lage so, dass die Mitte des Plans (cm) auf ziel (m) liegt. */
export function mitteSetzen(drehung: Drehung, mitteCm: P, ziel: P): Lage {
  const [c, s] = drehWerte(drehung)
  const x = mitteCm[0] / 100
  const y = mitteCm[1] / 100
  return { x: rund(ziel[0] - (c * x - s * y)), z: rund(ziel[1] - (s * x + c * y)), drehung }
}

/** Um 90 Grad drehen (+90 im Uhrzeigersinn), die Mitte bleibt stehen. */
export function drehenUmMitte(w: Lage, mitteCm: P, schritt: 90 | -90): Lage {
  const drehung = ((((w.drehung + schritt) % 360) + 360) % 360) as Drehung
  return mitteSetzen(drehung, mitteCm, planNachSiedlung(w, mitteCm[0], mitteCm[1]))
}

/** Rahmen um Punkte (x0, z0, x1, z1), null ohne Punkte. */
export function rahmenVon(punkte: P[]): Kasten | null {
  if (punkte.length === 0) return null
  let x0 = Infinity
  let z0 = Infinity
  let x1 = -Infinity
  let z1 = -Infinity
  for (const [x, z] of punkte) {
    x0 = Math.min(x0, x)
    z0 = Math.min(z0, z)
    x1 = Math.max(x1, x)
    z1 = Math.max(z1, z)
  }
  return [x0, z0, x1, z1]
}

const mitteVon = (k: Kasten): P => [(k[0] + k[2]) / 2, (k[1] + k[3]) / 2]

/** Liegt p im Umriss? (Strahl nach Osten, Ecken in beliebiger Richtung.) */
export function punktImUmriss(p: P, umriss: P[]): boolean {
  let drin = false
  for (let i = 0, j = umriss.length - 1; i < umriss.length; j = i++) {
    const [xi, zi] = umriss[i]
    const [xj, zj] = umriss[j]
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) drin = !drin
  }
  return drin
}

/** Liegt der Rahmen des Plans (cm) ganz im Umriss des Hauses? Die Ecken
 *  werden 5 cm nach innen genommen, damit buendig an der Wand gilt. */
export function wohnungImHaus(w: Lage, rahmenCm: Kasten, umriss: P[]): boolean {
  const [x0, y0, x1, y1] = rahmenCm
  const ecken: P[] = [
    [x0 + 5, y0 + 5],
    [x1 - 5, y0 + 5],
    [x1 - 5, y1 - 5],
    [x0 + 5, y1 - 5],
  ]
  return ecken.every(([px, py]) => punktImUmriss(planNachSiedlung(w, px, py), umriss))
}

/** Was an Koordinaten haengt: Mittelpunkt und alles, was um ihn liegt. */
export type SiedlungOrt = Pick<Siedlung, 'lat' | 'lon' | 'gebaeude' | 'wohnung' | 'aussen'>

/** Den Mittelpunkt (lat, lon) um (dx, dz) Meter verlegen: alles in der
 *  Siedlung rueckt um dasselbe zurueck, jeder Punkt bleibt, wo er auf der
 *  Erde ist (Formel aus dem Vertrag; Abweichung auf 100 m um 2 mm). */
export function mitteVerlegen(s: SiedlungOrt, dx: number, dz: number): SiedlungOrt {
  const p = ([x, z]: P): P => [x - dx, z - dz]
  const a: SiedlungAussen = s.aussen
  return {
    lat: s.lat - dz / 110574,
    lon: s.lon + dx / (111320 * Math.cos((s.lat * Math.PI) / 180)),
    gebaeude: s.gebaeude.map((g) => ({ ...g, umriss: g.umriss.map(p) })),
    wohnung: s.wohnung ? { ...s.wohnung, x: s.wohnung.x - dx, z: s.wohnung.z - dz } : null,
    aussen: {
      spielplatz: a.spielplatz ? a.spielplatz.map(p) : null,
      tiefgarage: a.tiefgarage ? { ...a.tiefgarage, x: a.tiefgarage.x - dx, z: a.tiefgarage.z - dz } : null,
      wege: a.wege.map((weg) => weg.map(p)),
    },
  }
}

/** Name eines Stockwerks: 0 ist das Erdgeschoss. */
export function geschossName(t: (k: string, v?: Record<string, string | number>) => string, n: number): string {
  return n === 0 ? t('siedlung.geschoss_eg') : t('siedlung.geschoss_n', { n })
}

const STILE: SiedlungStil[] = ['weiss_loggia', 'putz', 'holz', 'grau']
const STIL_KEY: Record<SiedlungStil, string> = {
  weiss_loggia: 'siedlung.stil_weiss_loggia',
  putz: 'siedlung.stil_putz',
  holz: 'siedlung.stil_holz',
  grau: 'siedlung.stil_grau',
}

/** Haeuser aus der Karte: jede Kennung genau einmal, sinnvolle Werte,
 *  ein Name, wo keiner ist. */
function bereinigen(liste: SiedlungGebaeude[], vergeben: Set<string>, nameFuer: (nr: number) => string): SiedlungGebaeude[] {
  const out: SiedlungGebaeude[] = []
  for (const g of liste) {
    if (!Array.isArray(g.umriss) || g.umriss.length < 3) continue
    let id = g.id
    if (!id || vergeben.has(id)) id = crypto.randomUUID()
    vergeben.add(id)
    out.push({
      ...g,
      id,
      name: g.name?.trim() || nameFuer(vergeben.size),
      geschosse: Math.max(1, Math.min(40, Math.round(g.geschosse) || 1)),
      geschossHoehe: g.geschossHoehe > 0 ? g.geschossHoehe : 3,
      stil: STILE.includes(g.stil) ? g.stil : 'putz',
    })
  }
  return out
}

/** Das Haus am Suchpunkt (0, 0): das, in dem er liegt, sonst das naechste
 *  in 30 m. Damit ist das eigene Haus gleich gewaehlt. */
function hausAmPunkt(liste: SiedlungGebaeude[]): string | null {
  const drin = liste.find((g) => punktImUmriss([0, 0], g.umriss))
  if (drin) return drin.id
  let best: { id: string; d: number } | null = null
  for (const g of liste) {
    const r = rahmenVon(g.umriss)
    if (!r) continue
    const [mx, mz] = mitteVon(r)
    const d = Math.hypot(mx, mz)
    if (d <= 30 && (!best || d < best.d)) best = { id: g.id, d }
  }
  return best?.id ?? null
}

const fehlerText = (e: unknown) => (e instanceof Error ? e.message : String(e))
const abgebrochen = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/* ------------------------------------------------------------ Zustaende */

/** fehlt: es gibt das Gesuchte nicht (mehr), anders als ein Netzfehler. */
type Laden<T> = { art: 'ruht' } | { art: 'laedt' } | { art: 'fehler'; text: string; fehlt?: boolean } | { art: 'fertig'; daten: T }
type Treffer = Awaited<ReturnType<typeof adresseSuchen>>[number]
type Gruppe = { projekt: Project; grundrisse: Grundriss[] }
/** Der gewaehlte Grundriss: Raeume als Umrisse (cm), Rahmen und Mitte. */
type Plan = { id: string; raeume: P[][]; rahmen: Kasten; mitte: P }
type Schritt = 0 | 1 | 2 | 3

export default function SiedlungEinrichten({
  vorher,
  onClose,
  onGespeichert,
}: {
  /** Bearbeiten: diese Siedlung. null legt eine neue an. */
  vorher: Siedlung | null
  onClose: () => void
  onGespeichert: (s: Siedlung) => void
}) {
  const { t } = useSprache()
  const toast = useToast()
  const [schritt, setSchritt] = useState<Schritt>(vorher ? 1 : 0)
  const [punkt, setPunkt] = useState<{ lat: number; lon: number } | null>(vorher ? { lat: vorher.lat, lon: vorher.lon } : null)

  // Schritt 1
  const [text, setText] = useState('')
  const [suche, setSuche] = useState<Laden<Treffer[]>>({ art: 'ruht' })
  // Schritt 2
  const [haeuser, setHaeuser] = useState<Laden<true>>(vorher ? { art: 'fertig', daten: true } : { art: 'ruht' })
  const [kandidaten, setKandidaten] = useState<SiedlungGebaeude[]>(() => vorher?.gebaeude ?? [])
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(() => new Set(vorher?.gebaeude.map((g) => g.id) ?? []))
  const [aktiv, setAktiv] = useState<string | null>(null)
  // Schritt 3
  const [grundrisse, setGrundrisse] = useState<Laden<Gruppe[]>>({ art: 'ruht' })
  const [wohnung, setWohnung] = useState<SiedlungWohnung | null>(vorher?.wohnung ?? null)
  // Der Grundriss im Feld; die Wohnung folgt erst, wenn er geladen ist.
  const [planWahl, setPlanWahl] = useState(vorher?.wohnung?.grundrissId ?? '')
  const [plan, setPlan] = useState<Laden<Plan>>({ art: 'ruht' })
  // Schritt 4
  const [name, setName] = useState(() => vorher?.name ?? t('siedlung.name_vorschlag'))
  const [speichern, setSpeichern] = useState<{ busy: boolean; fehler: string | null }>({ busy: false, fehler: null })

  // Laufende Anfragen: beim Schliessen und bei einer neueren abbrechen.
  const sucheAbbruch = useRef<AbortController | null>(null)
  const haeuserAbbruch = useRef<AbortController | null>(null)
  const planNr = useRef(0)
  const lebt = useRef(true)
  useEffect(() => {
    lebt.current = true
    return () => {
      lebt.current = false
      sucheAbbruch.current?.abort()
      haeuserAbbruch.current?.abort()
    }
  }, [])

  // Escape schliesst, die Seite dahinter rollt nicht mit. Waehrend des
  // Speicherns bleibt der Dialog offen, sonst ginge die Antwort verloren.
  const sichertGerade = useRef(false)
  useEffect(() => {
    const taste = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !sichertGerade.current) onClose()
    }
    document.addEventListener('keydown', taste)
    const vorherUeberlauf = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorherUeberlauf
    }
  }, [onClose])

  const gewaehlteHaeuser = useMemo(() => kandidaten.filter((g) => gewaehlt.has(g.id)), [kandidaten, gewaehlt])
  const wohnHaus = wohnung ? (gewaehlteHaeuser.find((g) => g.id === wohnung.gebaeudeId) ?? null) : null
  // Gespeichert wird die Wohnung nur in einem gewaehlten Haus, und nicht,
  // wenn ihr Grundriss nachweislich fehlt. Ein Netzfehler beim Laden des
  // Grundrisses laesst sie dagegen, wie sie war.
  const wohnungZumSpeichern = wohnung && wohnHaus && !(plan.art === 'fehler' && plan.fehlt) ? wohnung : null

  /* ---------------------------------------------------- Schritt 1: suchen */

  async function suchen(e?: FormEvent) {
    e?.preventDefault()
    const q = text.trim()
    if (!q) return
    sucheAbbruch.current?.abort()
    const ab = new AbortController()
    sucheAbbruch.current = ab
    setSuche({ art: 'laedt' })
    try {
      const treffer = await adresseSuchen(q)
      if (lebt.current && !ab.signal.aborted) setSuche({ art: 'fertig', daten: treffer })
    } catch (err) {
      if (abgebrochen(err) || !lebt.current) return
      setSuche({ art: 'fehler', text: fehlerText(err) })
    }
  }

  function ortWaehlen(tr: Treffer) {
    const p = { lat: tr.lat, lon: tr.lon }
    setPunkt(p)
    // Ein neuer Ort: neue Haeuser, die alte Wahl gilt nicht mehr.
    setKandidaten([])
    setGewaehlt(new Set())
    setAktiv(null)
    setSchritt(1)
    void haeuserLaden(p, 'neu')
  }

  /* ---------------------------------------------------- Schritt 2: Haeuser */

  async function haeuserLaden(p: { lat: number; lon: number }, art: 'neu' | 'dazu') {
    haeuserAbbruch.current?.abort()
    const ab = new AbortController()
    haeuserAbbruch.current = ab
    setHaeuser({ art: 'laedt' })
    try {
      const roh = await gebaeudeLaden(p.lat, p.lon, UMKREIS_M)
      if (!lebt.current || ab.signal.aborted) return
      const nameFuer = (nr: number) => t('siedlung.haus_vorschlag', { nr })
      if (art === 'neu') {
        const liste = bereinigen(roh, new Set(), nameFuer)
        const eigenes = hausAmPunkt(liste)
        setKandidaten(liste)
        setGewaehlt(new Set(eigenes ? [eigenes] : []))
        setAktiv(eigenes)
      } else {
        // Bearbeiten: was schon da ist, bleibt mit allen Einstellungen; neue
        // Haeuser kommen ungewaehlt dazu.
        setKandidaten((alt) => {
          const quellen = new Set(alt.map((g) => g.quelle).filter((q): q is string => !!q))
          const neu = roh.filter((g) => !g.quelle || !quellen.has(g.quelle))
          return [...alt, ...bereinigen(neu, new Set(alt.map((g) => g.id)), nameFuer)]
        })
      }
      setHaeuser({ art: 'fertig', daten: true })
    } catch (err) {
      if (abgebrochen(err) || !lebt.current) return
      setHaeuser({ art: 'fehler', text: fehlerText(err) })
    }
  }

  function hausUmschalten(id: string) {
    setAktiv(id)
    setGewaehlt((alt) => {
      const neu = new Set(alt)
      if (neu.has(id)) neu.delete(id)
      else neu.add(id)
      return neu
    })
  }

  function hausAendern(id: string, patch: Partial<SiedlungGebaeude>) {
    setKandidaten((alt) => alt.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }

  /* ---------------------------------------------------- Schritt 3: Wohnung */

  async function grundrisseLaden() {
    setGrundrisse({ art: 'laedt' })
    try {
      const projekte = await listProjects()
      const gruppen = await Promise.all(
        projekte.map(async (p) => ({ projekt: p.project, grundrisse: await ladeGrundrisse(p.project.id) })),
      )
      if (lebt.current) setGrundrisse({ art: 'fertig', daten: gruppen.filter((g) => g.grundrisse.length > 0) })
    } catch (err) {
      if (lebt.current) setGrundrisse({ art: 'fehler', text: fehlerText(err) })
    }
  }

  /** Grundriss laden. neu: die Wohnung danach mitten ins Haus stellen, Haus
   *  und Stockwerk wie bei vorlage (die Wohnung von vorher), wo es passt.
   *  null: die Wohnung bleibt, wie sie ist (Bearbeiten, Nochmal). */
  async function planLaden(id: string, neu: { vorlage: SiedlungWohnung | null } | null) {
    const nr = ++planNr.current
    setPlan({ art: 'laedt' })
    try {
      const daten = await ladeGrundriss(id)
      if (!lebt.current || nr !== planNr.current) return
      if (!daten) {
        setPlan({ art: 'fehler', text: t('siedlung.grundriss_fehlt'), fehlt: true })
        return
      }
      const raeume = daten.raeume.filter((r) => r.punkte.length >= 3).map((r) => r.punkte.map(([x, y]) => [x, y] as P))
      const rahmen = rahmenVon(raeume.flat())
      if (!rahmen) {
        setPlan({ art: 'fehler', text: t('siedlung.grundriss_ohne_raeume') })
        return
      }
      const p: Plan = { id, raeume, rahmen, mitte: mitteVon(rahmen) }
      setPlan({ art: 'fertig', daten: p })
      if (neu) {
        const alt = neu.vorlage
        const haus = gewaehlteHaeuser.find((g) => g.id === alt?.gebaeudeId) ?? gewaehlteHaeuser[0]
        const r = haus ? rahmenVon(haus.umriss) : null
        const ziel = r ? mitteVon(r) : ([0, 0] as P)
        const geschoss = haus ? Math.min(alt?.geschoss ?? 0, haus.geschosse - 1) : 0
        setWohnung({ grundrissId: id, gebaeudeId: haus?.id ?? '', geschoss, ...mitteSetzen(0, p.mitte, ziel) })
      }
    } catch (err) {
      if (lebt.current && nr === planNr.current) setPlan({ art: 'fehler', text: fehlerText(err) })
    }
  }

  /** Anderer Grundriss: die alte Wohnung gilt nicht mehr. Bis der neue
   *  geladen ist, gibt es keine (sonst stuende im Feld der neue Plan, im
   *  Speichern aber noch der alte). */
  function grundrissWaehlen(id: string) {
    setPlanWahl(id)
    const vorlage = wohnung
    setWohnung(null)
    if (!id) {
      planNr.current++
      setPlan({ art: 'ruht' })
      return
    }
    void planLaden(id, { vorlage })
  }

  function planNochmal() {
    if (!planWahl) return
    void planLaden(planWahl, wohnung?.grundrissId === planWahl ? null : { vorlage: wohnung })
  }

  /** In ein anderes Haus: mitten hinein, Stockwerk passend. */
  function hausWechseln(id: string) {
    const haus = gewaehlteHaeuser.find((g) => g.id === id)
    if (!haus || !wohnung) return
    const r = rahmenVon(haus.umriss)
    const p = plan.art === 'fertig' ? plan.daten : null
    const lage = r && p ? mitteSetzen(wohnung.drehung, p.mitte, mitteVon(r)) : wohnung
    setWohnung({ ...wohnung, ...lage, gebaeudeId: id, geschoss: Math.min(wohnung.geschoss, haus.geschosse - 1) })
  }

  /* ---------------------------------------------------- Weiter, Zurueck */

  function weiter() {
    if (schritt === 1) {
      if (gewaehlt.size === 0) return
      // Die Wohnung braucht ein gewaehltes Haus; sonst ins erste.
      if (wohnung && !gewaehlt.has(wohnung.gebaeudeId)) {
        const haus = gewaehlteHaeuser[0]
        const r = haus ? rahmenVon(haus.umriss) : null
        const p = plan.art === 'fertig' ? plan.daten : null
        setWohnung({
          ...wohnung,
          ...(r && p ? mitteSetzen(wohnung.drehung, p.mitte, mitteVon(r)) : {}),
          gebaeudeId: haus.id,
          geschoss: Math.min(wohnung.geschoss, haus.geschosse - 1),
        })
      } else if (wohnung && wohnHaus && wohnung.geschoss > wohnHaus.geschosse - 1) {
        setWohnung({ ...wohnung, geschoss: wohnHaus.geschosse - 1 })
      }
      if (grundrisse.art === 'ruht' || grundrisse.art === 'fehler') void grundrisseLaden()
      if (wohnung && plan.art === 'ruht') void planLaden(wohnung.grundrissId, null)
      setSchritt(2)
    } else if (schritt === 2) {
      setSpeichern({ busy: false, fehler: null })
      setSchritt(3)
    }
  }

  function zurueck() {
    if (schritt > 0) setSchritt((schritt - 1) as Schritt)
  }

  /* ---------------------------------------------------- Schritt 4: Speichern */

  async function sichern() {
    const n = name.trim()
    if (!n) {
      setSpeichern({ busy: false, fehler: t('siedlung.name_fehlt') })
      return
    }
    if (!punkt) return
    const gebaeude = gewaehlteHaeuser.map((g, i) => ({ ...g, name: g.name.trim() || t('siedlung.haus_vorschlag', { nr: i + 1 }) }))
    let ort: SiedlungOrt = {
      lat: punkt.lat,
      lon: punkt.lon,
      gebaeude,
      wohnung: wohnungZumSpeichern,
      aussen: vorher?.aussen ?? { spielplatz: null, tiefgarage: null, wege: [] },
    }
    // Neu angelegt: der Mittelpunkt kommt in die Mitte der Haeuser, nicht an
    // den Suchpunkt. Beim Bearbeiten bleibt er, wo er ist.
    const r = rahmenVon(gebaeude.flatMap((g) => g.umriss))
    if (!vorher && r) {
      const [dx, dz] = mitteVon(r)
      if (Math.hypot(dx, dz) >= 1) ort = mitteVerlegen(ort, dx, dz)
    }
    const s = { name: n, ...ort }
    const eingabe: Parameters<typeof speichereSiedlung>[0] = vorher ? { ...s, id: vorher.id } : s
    setSpeichern({ busy: true, fehler: null })
    sichertGerade.current = true
    try {
      const gespeichert = await speichereSiedlung(eingabe)
      sichertGerade.current = false
      if (!lebt.current) return
      setSpeichern({ busy: false, fehler: null })
      toast(t('siedlung.gespeichert'), 'ok')
      onGespeichert(gespeichert)
    } catch (err) {
      sichertGerade.current = false
      if (lebt.current) setSpeichern({ busy: false, fehler: fehlerText(err) })
    }
  }

  /* ---------------------------------------------------- Anzeige */

  const titel = t(vorher ? 'siedlung.bearbeiten_titel' : 'siedlung.einrichten_titel')
  const schrittNamen = [t('siedlung.schritt_adresse'), t('siedlung.schritt_haeuser'), t('siedlung.schritt_wohnung'), t('siedlung.schritt_speichern')]

  let inhalt: ReactNode
  if (schritt === 0) {
    inhalt = (
      <div className="space-y-4">
        <form onSubmit={suchen} className="space-y-2">
          <Field label={t('siedlung.schritt_adresse')} hint={t('siedlung.adresse_hinweis')}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('siedlung.adresse_platzhalter')}
                autoComplete="street-address"
                enterKeyHint="search"
                autoFocus
              />
              <Button type="submit" className="justify-center" disabled={!text.trim()} loading={suche.art === 'laedt'}>
                <Search size={18} /> {t('aktion.suchen')}
              </Button>
            </div>
          </Field>
        </form>
        {suche.art === 'laedt' ? (
          <Loading label={t('siedlung.sucht')} />
        ) : suche.art === 'fehler' ? (
          <ErrorBox error={suche.text} onRetry={() => void suchen()} />
        ) : suche.art === 'fertig' ? (
          suche.daten.length === 0 ? (
            <p className="rounded-karte border border-dashed border-line px-4 py-6 text-center text-muted">{t('siedlung.keine_treffer')}</p>
          ) : (
            <div>
              <p className="t-sub mb-2">{t('siedlung.treffer_waehlen')}</p>
              <ul className="overflow-hidden rounded-karte border border-line bg-surface">
                {suche.daten.map((tr, i) => (
                  <li key={`${i}-${tr.lat}-${tr.lon}`} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => ortWaehlen(tr)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-raised"
                    >
                      <MapPin size={19} className="mt-0.5 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 break-words font-bold">{tr.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : null}
      </div>
    )
  } else if (schritt === 1) {
    const nochmal = punkt ? () => void haeuserLaden(punkt, vorher ? 'dazu' : 'neu') : undefined
    inhalt =
      haeuser.art === 'laedt' && kandidaten.length === 0 ? (
        <Loading label={t('siedlung.haeuser_laden')} />
      ) : haeuser.art === 'fehler' && kandidaten.length === 0 ? (
        <ErrorBox error={haeuser.text} onRetry={nochmal} />
      ) : kandidaten.length === 0 ? (
        <div className="space-y-3 rounded-karte border border-dashed border-line px-4 py-6 text-center">
          <p className="text-muted">{t('siedlung.haeuser_leer')}</p>
          <Button variant="outline" onClick={() => setSchritt(0)}>
            <Search size={18} /> {t('siedlung.schritt_adresse')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Beim Bearbeiten bleiben die Haeuser stehen, waehrend neu geladen
              wird oder das Nachladen scheitert. */}
          {haeuser.art === 'laedt' ? <Loading label={t('siedlung.haeuser_laden')} /> : null}
          {haeuser.art === 'fehler' ? <ErrorBox error={haeuser.text} onRetry={nochmal} /> : null}
          <p className="t-sub">{t('siedlung.haeuser_hinweis')}</p>
          <Karte
            haeuser={kandidaten}
            gewaehlt={gewaehlt}
            aktiv={aktiv}
            ausschnitt={rahmenVon([...kandidaten.flatMap((g) => g.umriss), [0, 0]])}
            punktZeigen={!vorher}
            onHaus={hausUmschalten}
            label={t('siedlung.karte')}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{t('siedlung.haeuser_gewaehlt', { n: gewaehlt.size })}</p>
            {vorher && punkt ? (
              <Button size="sm" variant="outline" onClick={() => void haeuserLaden(punkt, 'dazu')}>
                {t('siedlung.haeuser_neu_laden')}
              </Button>
            ) : null}
          </div>
          {gewaehlt.size === 0 ? <p className="text-sm font-bold text-warn">{t('siedlung.mindestens_ein_haus')}</p> : null}
          <ul className="grid gap-3 sm:grid-cols-2">
            {gewaehlteHaeuser.map((g) => (
              <li key={g.id}>
                <Card
                  className={cx('space-y-3 p-3', aktiv === g.id && 'border-ink')}
                  onFocusCapture={() => setAktiv(g.id)}
                  onClick={() => setAktiv(g.id)}
                >
                  <Field label={t('siedlung.haus_name')}>
                    <Input value={g.name} onChange={(e) => hausAendern(g.id, { name: e.target.value })} maxLength={60} />
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label={t('siedlung.geschosse')}>
                      <Select value={g.geschosse} onChange={(e) => hausAendern(g.id, { geschosse: Number(e.target.value) })}>
                        {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n === 1 ? t('siedlung.geschosse_nur_eg') : t('siedlung.geschosse_zahl', { n, oben: n - 1 })}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={t('siedlung.stil')}>
                      <Select value={g.stil} onChange={(e) => hausAendern(g.id, { stil: e.target.value as SiedlungStil })}>
                        {STILE.map((s) => (
                          <option key={s} value={s}>
                            {t(STIL_KEY[s])}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => hausUmschalten(g.id)}>
                    <X size={16} /> {t('siedlung.weglassen')}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )
  } else if (schritt === 2) {
    inhalt = (
      <SchrittWohnung
        grundrisse={grundrisse}
        onGrundrisseNochmal={() => void grundrisseLaden()}
        planWahl={planWahl}
        wohnung={wohnung}
        setWohnung={setWohnung}
        plan={plan}
        onPlanNochmal={planNochmal}
        onGrundriss={grundrissWaehlen}
        onHaus={hausWechseln}
        haeuser={gewaehlteHaeuser}
      />
    )
  } else {
    inhalt = (
      <div className="space-y-4">
        <Field label={t('siedlung.name')} hint={t('siedlung.name_hinweis')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        </Field>
        <Card className="space-y-1 p-4">
          <p className="font-bold">{t('siedlung.haeuser_zahl', { n: gewaehlteHaeuser.length })}</p>
          <p className="t-sub">
            {wohnungZumSpeichern && wohnHaus
              ? t('siedlung.wohnung_in', { haus: wohnHaus.name, stock: geschossName(t, wohnungZumSpeichern.geschoss) })
              : t('siedlung.ohne_wohnung')}
          </p>
        </Card>
        {speichern.fehler ? <ErrorBox error={speichern.fehler} /> : null}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      {/* Ein Tipp daneben schliesst nicht: zu leicht ginge die Arbeit verloren. */}
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className="relative flex h-full w-full flex-col bg-surface shadow-dialog sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-karte sm:border sm:border-line"
      >
        <header className="safe-top flex items-center gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="t-name truncate">{titel}</h2>
            <p className="t-sub truncate">{t('siedlung.schritt_von', { nr: schritt + 1, von: 4, name: schrittNamen[schritt] })}</p>
          </div>
          <IconButton label={t('aktion.schliessen')} size="sm" onClick={onClose} disabled={speichern.busy}>
            <X size={20} />
          </IconButton>
        </header>
        {/* Fortschritt: vier Striche. */}
        <div className="flex gap-1 px-4 pt-3" aria-hidden="true">
          {schrittNamen.map((n, i) => (
            <span key={n} className={cx('h-1.5 flex-1 rounded-full', i <= schritt ? 'bg-ink' : 'bg-raised')} />
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {inhalt}
          {/* Pflichtangabe der Kartendaten, ueberall wo sie zu sehen sind. */}
          <p className="mt-6 text-xs text-muted" dir="ltr">
            {OSM_HINWEIS}
          </p>
        </div>
        <footer className="safe-bottom flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          {schritt > 0 ? (
            <Button variant="ghost" onClick={zurueck} disabled={speichern.busy}>
              <ArrowLeft size={18} className="spiegeln" /> {t('aktion.zurueck')}
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              {t('aktion.abbrechen')}
            </Button>
          )}
          {schritt === 0 && kandidaten.length > 0 && punkt ? (
            // Zurueck aus Schritt 2 ohne neue Suche: weiter mit den Haeusern von vorhin.
            <Button onClick={() => setSchritt(1)}>
              {t('aktion.weiter')} <ArrowRight size={18} className="spiegeln" />
            </Button>
          ) : schritt === 1 ? (
            <Button onClick={weiter} disabled={gewaehlt.size === 0 || haeuser.art === 'laedt'}>
              {t('aktion.weiter')} <ArrowRight size={18} className="spiegeln" />
            </Button>
          ) : schritt === 2 ? (
            <Button onClick={weiter} disabled={plan.art === 'laedt'}>
              {t('aktion.weiter')} <ArrowRight size={18} className="spiegeln" />
            </Button>
          ) : schritt === 3 ? (
            <Button onClick={() => void sichern()} loading={speichern.busy} disabled={!name.trim() || !punkt}>
              {t('aktion.speichern')}
            </Button>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------ Schritt 3 */

function SchrittWohnung({
  grundrisse,
  onGrundrisseNochmal,
  planWahl,
  wohnung,
  setWohnung,
  plan,
  onPlanNochmal,
  onGrundriss,
  onHaus,
  haeuser,
}: {
  grundrisse: Laden<Gruppe[]>
  onGrundrisseNochmal: () => void
  /** Der Grundriss im Feld ('' = keine Wohnung). */
  planWahl: string
  wohnung: SiedlungWohnung | null
  setWohnung: (w: SiedlungWohnung) => void
  plan: Laden<Plan>
  onPlanNochmal: () => void
  onGrundriss: (id: string) => void
  onHaus: (id: string) => void
  haeuser: SiedlungGebaeude[]
}) {
  const { t } = useSprache()
  const haus = wohnung ? (haeuser.find((g) => g.id === wohnung.gebaeudeId) ?? null) : null
  const p = plan.art === 'fertig' && wohnung && plan.daten.id === wohnung.grundrissId ? plan.daten : null

  // Ausschnitt: das Haus und die Wohnung in seiner Mitte, mit Rand. Haengt
  // nicht an der Lage, sonst wanderte die Karte beim Ziehen mit.
  const ausschnitt = useMemo(() => {
    if (!haus) return null
    const r = rahmenVon(haus.umriss)
    if (!r) return null
    const punkte: P[] = [
      [r[0], r[1]],
      [r[2], r[3]],
    ]
    if (p) {
      const mitte = mitteSetzen(0, p.mitte, mitteVon(r))
      const halb = Math.max(p.rahmen[2] - p.rahmen[0], p.rahmen[3] - p.rahmen[1]) / 200
      punkte.push([mitte.x + p.mitte[0] / 100 - halb, mitte.z + p.mitte[1] / 100 - halb])
      punkte.push([mitte.x + p.mitte[0] / 100 + halb, mitte.z + p.mitte[1] / 100 + halb])
    }
    const k = rahmenVon(punkte)
    return k ? ([k[0] - 6, k[1] - 6, k[2] + 6, k[3] + 6] as Kasten) : null
  }, [haus, p])

  const drin = wohnung && p && haus ? wohnungImHaus(wohnung, p.rahmen, haus.umriss) : true
  const lageSetzen = (l: Partial<Lage>) => wohnung && setWohnung({ ...wohnung, ...l })
  // Ein gespeicherter Grundriss, den es in keinem Umzug mehr gibt.
  const unbekannt =
    planWahl !== '' && grundrisse.art === 'fertig' && !grundrisse.daten.some((g) => g.grundrisse.some((gr) => gr.id === planWahl))

  return (
    <div className="space-y-4">
      <div>
        <p className="t-name">{t('siedlung.wohnung_frage')}</p>
        <p className="t-sub mt-1">{t('siedlung.wohnung_hinweis')}</p>
      </div>
      {grundrisse.art === 'laedt' || grundrisse.art === 'ruht' ? (
        <Loading label={t('siedlung.grundrisse_laden')} />
      ) : grundrisse.art === 'fehler' ? (
        <ErrorBox error={grundrisse.text} onRetry={onGrundrisseNochmal} />
      ) : grundrisse.daten.length === 0 ? (
        <p className="rounded-karte border border-dashed border-line px-4 py-6 text-center text-muted">{t('siedlung.grundrisse_leer')}</p>
      ) : (
        <>
          <Field label={t('siedlung.grundriss')}>
            <Select value={planWahl} onChange={(e) => onGrundriss(e.target.value)}>
              <option value="">{t('siedlung.keine_wohnung')}</option>
              {unbekannt ? <option value={planWahl}>{t('siedlung.grundriss_unbekannt')}</option> : null}
              {grundrisse.daten.map((g) => (
                <optgroup key={g.projekt.id} label={g.projekt.name}>
                  {g.grundrisse.map((gr) => (
                    <option key={gr.id} value={gr.id}>
                      {gr.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          {wohnung ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('siedlung.haus')}>
                <Select value={wohnung.gebaeudeId} onChange={(e) => onHaus(e.target.value)}>
                  {haeuser.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('siedlung.stockwerk')}>
                <Select value={wohnung.geschoss} onChange={(e) => setWohnung({ ...wohnung, geschoss: Number(e.target.value) })}>
                  {Array.from({ length: haus?.geschosse ?? 1 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>
                      {geschossName(t, n)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}
        </>
      )}

      {planWahl && grundrisse.art === 'fertig' ? (
        plan.art === 'laedt' || plan.art === 'ruht' ? (
          <Loading label={t('siedlung.grundriss_laedt')} />
        ) : plan.art === 'fehler' ? (
          // Fehlt der Grundriss, hilft Nochmal nicht; dann nur der Hinweis.
          <ErrorBox error={plan.text} onRetry={plan.fehlt ? undefined : onPlanNochmal} />
        ) : wohnung && p && ausschnitt ? (
          <div className="space-y-3">
            <p className="t-sub">{t('siedlung.platzieren_hinweis')}</p>
            <Karte
              haeuser={haeuser}
              gewaehlt={new Set(haeuser.map((g) => g.id))}
              aktiv={wohnung.gebaeudeId}
              ausschnitt={ausschnitt}
              label={t('siedlung.wohnung_karte')}
              wohnung={{
                raeume: p.raeume.map((r) => r.map(([x, y]) => planNachSiedlung(wohnung, x, y))),
                lage: wohnung,
                onLage: (x, z) => lageSetzen({ x, z }),
              }}
            />
            {!drin ? (
              <p className="flex items-start gap-2 text-sm font-bold text-warn" role="status">
                <TriangleAlert size={17} className="mt-0.5 shrink-0" /> {t('siedlung.ausserhalb')}
              </p>
            ) : null}
            {/* Richtungen der Karte, nie gespiegelt. Zwei Gruppen, die am
                Handy je eine Reihe bilden: drehen und mittig, dann schieben. */}
            <div dir="ltr" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <div className="flex gap-1.5">
                <IconButton size="sm" label={t('siedlung.drehen_links')} onClick={() => lageSetzen(drehenUmMitte(wohnung, p.mitte, -90))}>
                  <RotateCcw size={18} />
                </IconButton>
                <IconButton size="sm" label={t('siedlung.drehen_rechts')} onClick={() => lageSetzen(drehenUmMitte(wohnung, p.mitte, 90))}>
                  <RotateCw size={18} />
                </IconButton>
                <IconButton
                  size="sm"
                  label={t('siedlung.in_die_mitte')}
                  onClick={() => {
                    const r = haus ? rahmenVon(haus.umriss) : null
                    if (r) lageSetzen(mitteSetzen(wohnung.drehung, p.mitte, mitteVon(r)))
                  }}
                >
                  <Crosshair size={18} />
                </IconButton>
              </div>
              <div className="flex gap-1.5">
                <IconButton size="sm" label={t('siedlung.schieben_westen')} onClick={() => lageSetzen({ x: rund(wohnung.x - SCHIEBEN_M) })}>
                  <ArrowLeft size={18} />
                </IconButton>
                <IconButton size="sm" label={t('siedlung.schieben_norden')} onClick={() => lageSetzen({ z: rund(wohnung.z - SCHIEBEN_M) })}>
                  <ArrowUp size={18} />
                </IconButton>
                <IconButton size="sm" label={t('siedlung.schieben_sueden')} onClick={() => lageSetzen({ z: rund(wohnung.z + SCHIEBEN_M) })}>
                  <ArrowDown size={18} />
                </IconButton>
                <IconButton size="sm" label={t('siedlung.schieben_osten')} onClick={() => lageSetzen({ x: rund(wohnung.x + SCHIEBEN_M) })}>
                  <ArrowRight size={18} />
                </IconButton>
              </div>
            </div>
          </div>
        ) : null
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------ Karte */

/** Haeuser von oben (Meter, Norden oben), optional die eigene Wohnung zum
 *  Ziehen. Haeuser lassen sich antippen und mit der Tastatur waehlen. */
function Karte({
  haeuser,
  gewaehlt,
  aktiv,
  ausschnitt,
  punktZeigen,
  onHaus,
  wohnung,
  label,
}: {
  haeuser: SiedlungGebaeude[]
  gewaehlt: Set<string>
  aktiv: string | null
  ausschnitt: Kasten | null
  /** Den Suchpunkt (0, 0) zeigen. */
  punktZeigen?: boolean
  onHaus?: (id: string) => void
  wohnung?: { raeume: P[][]; lage: Lage; onLage: (x: number, z: number) => void }
  label: string
}) {
  const { t } = useSprache()
  const svg = useRef<SVGSVGElement>(null)
  const zug = useRef<{ id: number; p: P; x: number; z: number } | null>(null)
  if (!ausschnitt) return null
  const rand = 8
  const x0 = ausschnitt[0] - rand
  const z0 = ausschnitt[1] - rand
  const breite = Math.max(ausschnitt[2] - ausschnitt[0] + 2 * rand, 10)
  const hoehe = Math.max(ausschnitt[3] - ausschnitt[1] + 2 * rand, 10)
  const gross = Math.max(breite, hoehe)
  const schrift = gross * 0.03
  // Massstab: eine runde Laenge um ein Fuenftel der Breite.
  const massstab = [5, 10, 20, 50, 100].find((m) => m >= breite / 6) ?? 100

  const svgPunkt = (e: ZeigerEreignis): P | null => {
    const m = svg.current?.getScreenCTM()
    if (!m) return null
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return [q.x, q.y]
  }
  const taste = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onHaus?.(id)
    }
  }

  return (
    <div dir="ltr" className="overflow-hidden rounded-karte border border-line">
      <svg
        ref={svg}
        role="group"
        aria-label={label}
        viewBox={`${x0} ${z0} ${breite} ${hoehe}`}
        className={cx('block max-h-[55vh] w-full select-none', wohnung && 'touch-none')}
        style={{ background: 'var(--plan-grund)', aspectRatio: `${breite} / ${hoehe}` }}
      >
        {haeuser.map((g) => {
          const an = gewaehlt.has(g.id)
          const hier = aktiv === g.id
          return (
            <g key={g.id}>
              <polygon
                points={g.umriss.map(([x, z]) => `${x},${z}`).join(' ')}
                role={onHaus ? 'button' : undefined}
                tabIndex={onHaus ? 0 : undefined}
                aria-pressed={onHaus ? an : undefined}
                aria-label={onHaus ? g.name : undefined}
                onClick={onHaus ? () => onHaus(g.id) : undefined}
                onKeyDown={onHaus ? taste(g.id) : undefined}
                vectorEffect="non-scaling-stroke"
                strokeWidth={hier ? 3 : an ? 2 : 1}
                style={{
                  fill: an ? 'var(--plan-boden)' : 'var(--plan-objekt)',
                  fillOpacity: an ? 1 : 0.55,
                  stroke: hier ? 'var(--plan-auswahl)' : an ? 'var(--plan-wand)' : 'var(--plan-objekt-rand)',
                  cursor: onHaus ? 'pointer' : undefined,
                  outline: 'none',
                }}
              />
            </g>
          )
        })}
        {punktZeigen ? (
          <circle cx={0} cy={0} r={gross * 0.01} style={{ fill: 'var(--plan-hervor)' }} pointerEvents="none" />
        ) : null}
        {/* Namen der gewaehlten Haeuser zuletzt, mit Rand in Bodenfarbe,
            damit sie ueber dem Suchpunkt lesbar bleiben. */}
        {wohnung
          ? null
          : haeuser
              .filter((g) => gewaehlt.has(g.id))
              .map((g) => {
                const r = rahmenVon(g.umriss)
                return r ? (
                  <text
                    key={g.id}
                    x={(r[0] + r[2]) / 2}
                    y={(r[1] + r[3]) / 2}
                    fontSize={schrift}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                    style={{
                      fill: 'var(--plan-wand)',
                      stroke: 'var(--plan-boden)',
                      strokeWidth: schrift * 0.25,
                      paintOrder: 'stroke',
                      fontWeight: 700,
                    }}
                  >
                    {g.name}
                  </text>
                ) : null
              })}
        {wohnung ? (
          <g
            style={{ cursor: 'move' }}
            onPointerDown={(e) => {
              const p = svgPunkt(e)
              if (!p) return
              e.currentTarget.setPointerCapture(e.pointerId)
              zug.current = { id: e.pointerId, p, x: wohnung.lage.x, z: wohnung.lage.z }
            }}
            onPointerMove={(e) => {
              const z = zug.current
              if (!z || z.id !== e.pointerId) return
              const p = svgPunkt(e)
              if (p) wohnung.onLage(rund(z.x + p[0] - z.p[0]), rund(z.z + p[1] - z.p[1]))
            }}
            onPointerUp={() => (zug.current = null)}
            onPointerCancel={() => (zug.current = null)}
          >
            {wohnung.raeume.map((r, i) => (
              <polygon
                key={i}
                points={r.map(([x, z]) => `${x},${z}`).join(' ')}
                vectorEffect="non-scaling-stroke"
                strokeWidth={2}
                style={{ fill: 'var(--plan-hervor)', fillOpacity: 0.35, stroke: 'var(--plan-hervor)' }}
              />
            ))}
          </g>
        ) : null}
        {/* Norden oben links, Massstab unten links. */}
        <g pointerEvents="none" style={{ fill: 'var(--plan-wand)', stroke: 'var(--plan-wand)' }}>
          <path
            d={`M ${x0 + schrift * 1.6} ${z0 + schrift * 0.6} l ${schrift * 0.7} ${schrift * 1.6} l ${-schrift * 1.4} 0 z`}
            strokeWidth={0}
          />
          <text x={x0 + schrift * 1.6} y={z0 + schrift * 3.4} fontSize={schrift * 1.1} textAnchor="middle" strokeWidth={0} fontWeight={700}>
            {t('siedlung.norden')}
          </text>
          <line
            x1={x0 + schrift}
            y1={z0 + hoehe - schrift}
            x2={x0 + schrift + massstab}
            y2={z0 + hoehe - schrift}
            vectorEffect="non-scaling-stroke"
            strokeWidth={2}
          />
          <text x={x0 + schrift + massstab / 2} y={z0 + hoehe - schrift * 1.5} fontSize={schrift} textAnchor="middle" strokeWidth={0}>
            {t('siedlung.massstab', { m: massstab })}
          </text>
        </g>
      </svg>
    </div>
  )
}
