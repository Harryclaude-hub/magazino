import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Building2, ChevronRight, DoorOpen, FileUp, House, MapPin, Search, Sofa, Users, X } from 'lucide-react'
import { AppHeader } from '../components/AppShell'
import { Ansicht3D } from '../components/plan3d/oeffnen'
import type { Raum3DLive, Raum3DSteuer } from '../components/plan3d/Raum3D'
import type { Farben3D } from '../components/plan3d/szene'
import type { DingLage3D, Sprungziel3D } from '../components/plan3d/vertrag3d'
import SiedlungLeute from '../components/SiedlungLeute'
import { Button, Empty, ErrorBox, IconButton, Input, Loading, useToast } from '../components/ui'
import {
  grundrissDarf,
  ladeSiedlung,
  SiedlungStadtFehler,
  siedlungDinge,
  siedlungDingSetzen,
  siedlungImportieren,
  siedlungMitglieder,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { siedlungWoerter } from '../lib/i18n/bausteine/siedlung'
import { woerterNachladen } from '../lib/i18n/woerter'
import { OSM_HINWEIS } from '../lib/osm'
import { siedlungDateiLesen, type SiedlungDatei } from '../lib/siedlungImport'
import type { GrundrissDaten, Siedlung } from '../lib/types'
import { cx, useAsync } from '../lib/util'

// Die Saetze der Siedlung kommen erst mit dieser Seite (siehe siedlung.ts).
woerterNachladen(siedlungWoerter)

/* Eine Siedlung in 3D (E83).
 *
 * Laedt die Siedlung und, wenn eine eigene Wohnung darin liegt, deren
 * Grundriss. Die Wohnung ist die Szene, die Raum3D immer zeigt (Ursprung
 * des Plans bei 0, Boden bei 0); die Siedlung kommt als eigene Welt dazu
 * (siedlung3d.ts) und wird dort um die Wohnung herum gelegt. Ohne Wohnung
 * steht man in der Mitte der Siedlung.
 *
 * Nichts davon laedt beim Start der App: diese Seite ist ein eigener Teil
 * (App.tsx), three kommt mit Raum3D (oeffnen.tsx) und siedlung3d.ts hier
 * per import(), beides erst, wenn die Seite offen ist. Laden, Fehler und
 * "gibt es nicht" sind eigene Zustaende.
 *
 * E84: Oben der Knopf "Wohnungen". Er oeffnet die Liste der Sprungziele,
 * die die Welt mitbringt (am Handy ein Blatt von unten, am Computer eine
 * Leiste am Rand); Tippen schliesst sie und bringt einen beim Begehen
 * dorthin. Solange die Welt nicht gebaut ist, ist der Knopf aus; hat sie
 * keine Ziele, steht in der Liste ein Hinweis. Der Name oben ist der
 * gespeicherte Name der Siedlung, nie ein fester Text.
 *
 * E86: Die Siedlung ist gemeinsam. Der Besitzer laedt registrierte Leute
 * ein (Knopf "Leute", SiedlungLeute.tsx); Gaeste kommen ueber dieselbe
 * Seite herein (listSiedlungen gibt ihnen die Siedlung). Wer gerade da
 * ist, geht in 3D als Figur mit und ist zu hoeren (Raum3D, live), sobald
 * ausser einem selbst noch jemand dazugehoert. Die eingerichtete Wohnung
 * des Besitzers liegt in seinem Umzug: ein Gast, der sie nicht laden darf,
 * sieht die Siedlung ohne sie (kein Fehler, das ist so gewollt), mit allen
 * Haeusern und den geplanten Wohnungen. Die Lage der Wohnung bleibt dabei
 * stehen: sie legt den Ursprung der Welt fest, und alle muessen dieselben
 * Weltkoordinaten haben, sonst stuenden die Figuren woanders.
 *
 * Seit E86 (Entscheidung von Karam) gilt das fuer alle, auch fuer den
 * Besitzer: Siedlung und eingerichtete Wohnung sind zwei getrennte Dinge.
 * In der Siedlung ist die eigene Wohnung leer wie jede andere (die
 * geplante aus innen); eingerichtet sieht man sie nur im Umzug, im
 * Grundriss. Darum laedt diese Seite keinen Grundriss, und alle bekommen
 * dieselbe Welt. Das Begehen beginnt am Sprungziel 'Start' (Raum3D).
 *
 * E87: Die Welt ist jetzt auch der Stadtteil rundherum (siedlung.stadt,
 * bis etwa 2 MB, kommt mit ladeSiedlung; bis dahin der Ladezustand wie
 * bisher). Die Liste heisst "Orte" (Wohnungen, Geschaefte, Feuerwehr,
 * Spital; die Orte des Stadtteils stehen auf dem Gelaende). Der Besitzer
 * hat oben "Zu unserer Wohnung", wenn die Welt sie kennt
 * (SiedlungWelt3D.eigeneWohnung, Paket siedlung), und wer im Umzug ist
 * (grundrissDarf), "Eingerichtet ansehen": das fuehrt in den Grundriss des
 * Umzugs, dort ist die Wohnung eingerichtet. In der Siedlung bleibt sie
 * leer wie jede andere. Dinge und Fahrzeuge, die jemand bewegt hat, stehen
 * dort, wo sie zuletzt hingestellt wurden (siedlungDinge, sobald die Welt
 * gebaut ist); Neues wird je Ding nach 400 ms Ruhe gespeichert
 * (siedlungDingSetzen, dingSpeicherer). Fehler beim Laden oder Speichern
 * stehen klein in der Ansicht, auch im Vollbild, nie still.
 *
 * E87, Nachtrag: Der Besitzer hat oben "Aus Datei aktualisieren" (am Handy
 * unter "Mehr"): dieselbe Datei wie beim ersten Laden (Siedlungen.tsx),
 * siedlungImportieren ersetzt die eigene Siedlung mit derselben Wohnung.
 * Danach laedt die Seite die Siedlung neu, und Raum3D baut die neue Welt
 * an Ort und Stelle (die alte bleibt bis dahin stehen). Scheitert nur die
 * Umgebung (SiedlungStadtFehler), steht der Satz dazu da, die Siedlung ist
 * trotzdem gespeichert und wird neu geladen. Ohne Dialog: Knopf mit
 * Ladezustand, Hinweise als Toast, Fehler zusaetzlich als Zeile unter dem
 * Kopf. Laesst sich die Umgebung nicht bauen (SiedlungWelt3D.stadtFehler),
 * steht unten ein kleiner Hinweis; Antippen zeigt den Grund. */

/** So lange (ms) muss ein Ding ruhig liegen, bevor seine Lage gespeichert wird. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export const DING_SPEICHERN_MS = 400

/** Zeitgeber fuer dingSpeicherer (zum Pruefen ohne echte Zeit ersetzbar). */
export interface Uhr {
  setTimeout(f: () => void, ms: number): unknown
  clearTimeout(h: unknown): void
}

const ECHTE_UHR: Uhr = {
  setTimeout: (f, ms) => window.setTimeout(f, ms),
  clearTimeout: (h) => window.clearTimeout(h as number),
}

/** Speichert Lagen von Dingen entprellt (E87): je Kennung erst, wenn sie ms
 *  lang ruhig liegt; die letzte Lage gewinnt. Je Kennung laeuft hoechstens
 *  ein Speichern, das naechste wartet darauf (die Reihenfolge bleibt).
 *  melden(grund) bei einem Fehler (und in der Konsole), melden(null) nach
 *  einem gelungenen Speichern. beenden() speichert sofort, was noch wartet
 *  (Seite zu), danach nimmt setzen nichts mehr an und melden schweigt; die
 *  Konsole nicht. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function dingSpeicherer(
  speichern: (l: DingLage3D) => Promise<void>,
  melden: (grund: string | null) => void,
  ms: number = DING_SPEICHERN_MS,
  uhr: Uhr = ECHTE_UHR,
): { setzen(l: DingLage3D): void; beenden(): void; wartend(): number } {
  const warten = new Map<string, { l: DingLage3D; h: unknown }>()
  const laeuft = new Map<string, Promise<void>>()
  let aus = false
  const los = (l: DingLage3D) => {
    const vorher = laeuft.get(l.id) ?? Promise.resolve()
    const jetzt = vorher
      .then(() => speichern(l))
      .then(
        () => {
          if (!aus) melden(null)
        },
        (err: unknown) => {
          const grund = err instanceof Error ? err.message : String(err)
          console.warn('[siedlung] Lage eines Dings nicht gespeichert:', grund)
          if (!aus) melden(grund)
        },
      )
    laeuft.set(l.id, jetzt)
    void jetzt.then(() => {
      if (laeuft.get(l.id) === jetzt) laeuft.delete(l.id)
    })
  }
  return {
    setzen(l) {
      if (aus) return
      const alt = warten.get(l.id)
      if (alt) uhr.clearTimeout(alt.h)
      const h = uhr.setTimeout(() => {
        warten.delete(l.id)
        los(l)
      }, ms)
      warten.set(l.id, { l, h })
    },
    beenden() {
      if (aus) return
      for (const { l, h } of warten.values()) {
        uhr.clearTimeout(h)
        los(l)
      }
      warten.clear()
      aus = true
    },
    wartend: () => warten.size,
  }
}

/** Das Sprungziel der eigenen Wohnung, wenn die Welt es nennt (E87,
 *  SiedlungWelt3D.eigeneWohnung aus dem Paket siedlung, hier ohne den Typ
 *  gelesen): eine Nummer in ziele, das Ziel selbst oder eine Rueckgabe
 *  davon. Sonst null. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function eigeneWohnungIndex(welt: unknown, ziele: readonly Sprungziel3D[]): number | null {
  if (!welt || typeof welt !== 'object') return null
  let e = (welt as { eigeneWohnung?: unknown }).eigeneWohnung
  if (typeof e === 'function') {
    try {
      e = (e as () => unknown).call(welt)
    } catch (err) {
      console.warn('[siedlung] eigeneWohnung der Welt:', err instanceof Error ? err.message : err)
      return null
    }
  }
  if (typeof e === 'number') return Number.isInteger(e) && e >= 0 && e < ziele.length ? e : null
  if (e && typeof e === 'object') {
    const i = ziele.indexOf(e as Sprungziel3D)
    if (i >= 0) return i
    const z = e as Partial<Sprungziel3D>
    const j = ziele.findIndex((q) => q.ebene === z.ebene && q.x === z.x && q.z === z.z)
    return j >= 0 ? j : null
  }
  return null
}

/** Wohin "Eingerichtet ansehen" fuehrt: der Grundriss im Umzug (App.tsx,
 *  p/:pid/grundriss/:gid). begehen=1: die Seite des Grundrisses oeffnet 3D
 *  gleich und beginnt das Begehen, einmal (Grundriss.tsx). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function eingerichtetPfad(projectId: string, grundrissId: string): string {
  return `/app/p/${encodeURIComponent(projectId)}/grundriss/${encodeURIComponent(grundrissId)}?begehen=1`
}

/** Ergebnis von "Aus Datei aktualisieren" (E87). id: die gespeicherte
 *  Siedlung (gleich sid: neu laden, sonst dorthin), null: nichts
 *  gespeichert. toasts der Reihe nach; fehler bleibt als Zeile stehen. */
export interface AusDateiErgebnis {
  id: string | null
  toasts: { text: string; art: 'ok' | 'error' }[]
  fehler: string | null
}

/** "Aus Datei aktualisieren" ohne Browser pruefbar (E87): liest den Text
 *  der Datei (lesen, siedlungDateiLesen) und traegt ihn ein (importieren,
 *  siedlungImportieren; es ersetzt die eigene Siedlung mit derselben
 *  Wohnung). Toasts wie beim ersten Laden (Siedlungen.tsx). Scheitert nur
 *  die Umgebung (SiedlungStadtFehler), ist die Siedlung trotzdem
 *  gespeichert: id gesetzt, der Satz als Toast und als fehler. Jeder andere
 *  Fehler: id null, Toast und fehler, nichts verschwiegen. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export async function ausDateiAktualisieren(
  text: string,
  sid: string,
  t: (k: string, v?: Record<string, string | number>) => string,
  lesen: (text: string) => SiedlungDatei,
  importieren: (d: SiedlungDatei) => Promise<{ siedlung: { id: string }; deko: 'ok' | 'keine' | { fehler: string } }>,
): Promise<AusDateiErgebnis> {
  const toasts: AusDateiErgebnis['toasts'] = []
  try {
    const r = await importieren(lesen(text))
    const id = r.siedlung.id
    toasts.push({ text: t(id === sid ? 'siedlung.aktualisiert' : 'siedlung.geladen'), art: 'ok' })
    if (r.deko === 'ok') toasts.push({ text: t('siedlung.deko_ok'), art: 'ok' })
    else if (r.deko !== 'keine') toasts.push({ text: t('siedlung.deko_fehler', { grund: r.deko.fehler }), art: 'error' })
    return { id, toasts, fehler: null }
  } catch (err) {
    if (err instanceof SiedlungStadtFehler) {
      console.warn('[siedlung] Aus Datei: Umgebung nicht gespeichert:', err.message)
      toasts.push({ text: err.message, art: 'error' })
      return { id: err.siedlung.id, toasts, fehler: err.message }
    }
    const grund = err instanceof Error ? err.message : String(err)
    console.warn('[siedlung] Aus Datei aktualisieren:', grund)
    toasts.push({ text: grund, art: 'error' })
    return { id: null, toasts, fehler: grund }
  }
}

/** Die zuletzt gebaute Welt je Bau-Funktion (E87): gelesen gleich nach dem
 *  Bau, wenn Raum3D die Sprungziele meldet (eigeneWohnung, stadtFehler). */
const GEBAUT = new WeakMap<object, SiedlungWelt>()

type SiedlungWelt = ReturnType<Teil['baueSiedlung']>

/** Warum die Umgebung (Stadt) nicht gebaut wurde, aus der gebauten Welt
 *  (SiedlungWelt3D.stadtFehler); sonst null. Ohne Typ gelesen wie
 *  eigeneWohnungIndex, damit eine Welt ohne das Feld nicht stoert. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function stadtFehlerVon(welt: unknown): string | null {
  if (!welt || typeof welt !== 'object') return null
  const f = (welt as { stadtFehler?: unknown }).stadtFehler
  return typeof f === 'string' && f.trim() ? f : null
}

/** Die Bau-Funktion fuer Raum3D (welt): baut die Siedlung mit den Farben
 *  und merkt sich das Ergebnis in GEBAUT. */
function weltBauer(baue: Teil['baueSiedlung'], siedlung: Siedlung): (farben: Farben3D) => SiedlungWelt {
  const bauen = (farben: Farben3D): SiedlungWelt => {
    const w = baue({ siedlung, farben, wohnungRahmen: null })
    GEBAUT.set(bauen, w)
    return w
  }
  return bauen
}

/** Keine Wohnung in der Szene: nur die Welt (die Siedlung) drumherum. */
const OHNE_WOHNUNG: GrundrissDaten = {
  grundriss: { id: 'siedlung-ohne-wohnung', project_id: '', name: '', sort: 0, version: 0, created_at: '', updated_at: '' },
  raeume: [],
  oeffnungen: [],
  objekte: [],
  kisten: [],
}

type Teil = typeof import('../components/plan3d/siedlung3d')
type TeilLaden = { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'fertig'; teil: Teil }

export default function SiedlungAnsicht() {
  const { t } = useSprache()
  const nav = useNavigate()
  const { sid = '' } = useParams()
  const { user } = useAuth()
  const ich = user?.id ?? null

  const zustand = useAsync(async () => {
    const siedlung = await ladeSiedlung(sid)
    if (!siedlung) return null
    return { siedlung, besitzer: !!ich && siedlung.owner_id === ich }
  }, [sid, ich])
  // Wer dazugehoert (E86): fuer die Figuren in 3D und den Dialog "Leute".
  const mitglieder = useAsync(() => siedlungMitglieder(sid), [sid])

  // Der Bau der Haeuser (mit three) laedt gleichzeitig mit den Daten.
  const [teil, setTeil] = useState<TeilLaden>({ art: 'laedt' })
  const [versuch, setVersuch] = useState(0)
  useEffect(() => {
    let alive = true
    import('../components/plan3d/siedlung3d')
      .then((m) => alive && setTeil({ art: 'fertig', teil: m }))
      .catch((err: unknown) => alive && setTeil({ art: 'fehler', text: err instanceof Error ? err.message : String(err) }))
    return () => {
      alive = false
    }
  }, [versuch])

  const ergebnis = zustand.data
  const besitzer = ergebnis?.besitzer ?? false
  // E87: Aus Datei aktualisieren (ausDatei unten): laeuft, Fehler. Nach dem
  // Speichern laedt die Siedlung neu, die alte Welt bleibt so lange stehen.
  const toast = useToast()
  const datei = useRef<HTMLInputElement>(null)
  const [ausDateiLaeuft, setAusDateiLaeuft] = useState(false)
  const [ausDateiFehler, setAusDateiFehlerRoh] = useState<string | null>(null)
  const [ausDateiFehlerGanz, setAusDateiFehlerGanz] = useState(false)
  const setAusDateiFehler = (f: string | null) => {
    setAusDateiFehlerRoh(f)
    setAusDateiFehlerGanz(false)
  }
  const neuLaden = zustand.loading && !!ergebnis && ergebnis.siedlung.id === sid
  const ausDateiLaeuftAnzeige = ausDateiLaeuft || neuLaden
  // Die Lage der Wohnung legt fuer alle denselben Ursprung der Welt fest
  // (E86). Nur wenn ihr Haus fehlt, faellt sie weg, sonst liesse sich die
  // Welt nicht bauen.
  const siedlung = useMemo(() => {
    if (!ergebnis) return null
    const s = ergebnis.siedlung
    const w = s.wohnung
    if (!w || s.gebaeude.some((g) => g.id === w.gebaeudeId)) return s
    return { ...s, wohnung: null }
  }, [ergebnis])
  const baue = teil.art === 'fertig' ? teil.teil.baueSiedlung : null
  // Stabil, damit Raum3D die Welt nur bei neuen Daten oder Farben neu baut.
  // Ohne Rahmen: nichts wird ausgeschnitten, die Wohnung ist die geplante.
  // Jede gebaute Welt merkt sich GEBAUT (E87, fuer eigeneWohnung).
  const welt = useMemo(() => (baue && siedlung ? weltBauer(baue, siedlung) : undefined), [baue, siedlung])

  const steuer = useRef<Raum3DSteuer>(null)
  const [ebene, setEbene] = useState<string | null>(null)

  // Sprungziele (E84), gemerkt zu der Welt, fuer die Raum3D sie gebaut hat:
  // eine neue Welt beginnt wieder bei "noch nicht gebaut" (Knopf aus).
  // Raum3D meldet sie in einem Effekt, also nach dem Setzen der Ref hier.
  // E87: dazu, ob die Umgebung (Stadt) gebaut werden konnte (stadtFehler).
  const [ziele, setZiele] = useState<{ fuer: unknown; liste: Sprungziel3D[]; ebenen: string[]; eigene: number | null; stadtFehler: string | null } | null>(null)
  const weltJetzt = useRef(welt)
  useLayoutEffect(() => {
    weltJetzt.current = welt
  })
  const zieleMelden = useCallback((liste: Sprungziel3D[], ebenen: string[]) => {
    const gebaut = weltJetzt.current ? GEBAUT.get(weltJetzt.current) : null
    setZiele({ fuer: weltJetzt.current, liste, ebenen, eigene: eigeneWohnungIndex(gebaut, liste), stadtFehler: stadtFehlerVon(gebaut) })
  }, [])
  const sprung = ziele && welt && ziele.fuer === welt ? ziele : null
  const stadtFehler = sprung?.stadtFehler ?? null
  // Offen fuer genau diese Welt: kommt eine neue, geht die Liste zu.
  const [listeFuer, setListeFuer] = useState<unknown>(null)
  const listeAuf = !!sprung && listeFuer === welt
  const listeZu = useCallback(() => setListeFuer(null), [])
  // Dialog "Leute" (E86).
  const [leuteAuf, setLeuteAuf] = useState(false)
  const leuteZu = useCallback(() => setLeuteAuf(false), [])
  const hingehen = useCallback((i: number) => {
    setListeFuer(null)
    steuer.current?.springen(i)
  }, [])

  // Die eigene Wohnung fuer die Zeile oben, nur beim Besitzer.
  const wohnung = besitzer ? (siedlung?.wohnung ?? null) : null
  const haus = wohnung ? siedlung?.gebaeude.find((g) => g.id === wohnung.gebaeudeId) : undefined
  const stock = wohnung ? (wohnung.geschoss === 0 ? t('siedlung.geschoss_eg') : t('siedlung.geschoss_n', { n: wohnung.geschoss })) : null
  // Unter dem Namen: beim Gehen das Stockwerk, sonst Haus und Stockwerk der
  // Wohnung (kurz, die Zeile ist am Handy schmal).
  const unterzeile = ausDateiLaeuftAnzeige
    ? t('siedlung.aus_datei_laeuft')
    : ebene
    ? t('siedlung.ebene_jetzt', { name: ebene })
    : wohnung && haus && stock
      ? t('siedlung.haus_stock', { haus: haus.name, stock })
      : siedlung && !besitzer
        ? t('siedlung.zu_gast')
        : null
  const bereit = Boolean(welt) && !!siedlung

  // Zusammen in 3D (E86): live, sobald ausser einem selbst noch jemand
  // dazugehoert; laesst sich die Liste nicht laden, trotzdem (der Kanal
  // laesst ohnehin nur Mitglieder hinein, Fehler zeigt Raum3D).
  const siedlungId = siedlung?.id ?? null
  const leute = useMemo(
    () => (mitglieder.data ?? []).filter((m) => m.user_id !== ich).map((m) => ({ uid: m.user_id, name: m.name, look: m.avatar3d })),
    [mitglieder.data, ich],
  )
  const mitAnderen = leute.length > 0 || !!mitglieder.error
  const live = useMemo<Raum3DLive | null>(
    () => (siedlungId && ich && mitAnderen ? { kanal: `siedlung:${siedlungId}`, uid: ich, leute } : null),
    [siedlungId, ich, mitAnderen, leute],
  )

  // E87: Dinge und Fahrzeuge, wo sie zuletzt standen: geladen, sobald die
  // Welt gebaut ist (einmal je Siedlung; nach einem Fehler beim naechsten
  // Bau wieder). Laden: alles steht, wie die Welt es baut; leer: ebenso;
  // Fehler: ein Hinweis in der Ansicht.
  const weltGebaut = !!sprung
  const [dinge, setDinge] = useState<{ fuer: string; liste: DingLage3D[] } | null>(null)
  const [dingeFehler, setDingeFehler] = useState<{ fuer: string; grund: string } | null>(null)
  const dingeGeladen = useRef<string | null>(null)
  useEffect(() => {
    if (!siedlungId || !weltGebaut || dingeGeladen.current === siedlungId) return
    let alive = true
    siedlungDinge(siedlungId).then(
      (liste) => {
        if (!alive) return
        dingeGeladen.current = siedlungId
        setDinge({ fuer: siedlungId, liste })
        setDingeFehler(null)
      },
      (err: unknown) => {
        const grund = err instanceof Error ? err.message : String(err)
        console.warn('[siedlung] Lagen der Dinge nicht geladen:', grund)
        if (alive) setDingeFehler({ fuer: siedlungId, grund })
      },
    )
    return () => {
      alive = false
    }
  }, [siedlungId, weltGebaut])
  const dingLagen = dinge && dinge.fuer === siedlungId ? dinge.liste : null
  // Speichern, entprellt je Ding; beim Verlassen sofort, was noch wartet.
  const [speicherFehler, setSpeicherFehler] = useState<{ fuer: string; grund: string } | null>(null)
  const speicherer = useRef<ReturnType<typeof dingSpeicherer> | null>(null)
  useEffect(() => {
    if (!siedlungId) return
    const sp = dingSpeicherer(
      (l) => siedlungDingSetzen(siedlungId, l),
      (grund) => setSpeicherFehler(grund === null ? null : { fuer: siedlungId, grund }),
    )
    speicherer.current = sp
    return () => {
      sp.beenden()
      if (speicherer.current === sp) speicherer.current = null
    }
  }, [siedlungId])
  const dingBewegt = useCallback((l: DingLage3D) => speicherer.current?.setzen(l), [])
  const seitenFehler =
    speicherFehler && speicherFehler.fuer === siedlungId
      ? t('siedlung.dinge_speichern_fehler', { grund: speicherFehler.grund })
      : dingeFehler && dingeFehler.fuer === siedlungId
        ? t('siedlung.dinge_laden_fehler', { grund: dingeFehler.grund })
        : null

  // E87: "Zu unserer Wohnung" (Besitzer, wenn die Welt sie kennt) und
  // "Eingerichtet ansehen" (wer im Umzug ist). Kann grundrissDarf nicht
  // fragen, fehlt der Knopf nur (Hinweis in der Konsole): er ist ein
  // Angebot, kein Zustand der Seite.
  const unsere = besitzer && sprung && sprung.eigene !== null ? sprung.eigene : null
  const gid = siedlung?.wohnung?.grundrissId ?? null
  const [darf, setDarf] = useState<{ gid: string; projectId: string } | null>(null)
  useEffect(() => {
    if (!gid) return
    let alive = true
    grundrissDarf(gid).then(
      (r) => {
        if (alive) setDarf(r && typeof r.projectId === 'string' && r.projectId ? { gid, projectId: r.projectId } : null)
      },
      (err: unknown) => {
        console.info('[siedlung] Eingerichtet ansehen geht nicht:', err instanceof Error ? err.message : err)
        if (alive) setDarf(null)
      },
    )
    return () => {
      alive = false
    }
  }, [gid])
  const eingerichtet = darf && darf.gid === gid ? darf : null

  // E87: "Aus Datei aktualisieren" (nur der Besitzer). Das Feld fuer die
  // Datei liegt ausserhalb der Kopfzeile: am Handy steht der Knopf im Blatt
  // "Mehr", das sich nach dem Tippen schliesst.
  async function ausDatei(f: File | undefined) {
    if (!f) return
    setAusDateiFehler(null)
    setAusDateiLaeuft(true)
    try {
      const text = await f.text().catch((err: unknown) => {
        throw new Error(t('siedlung.datei_fehler', { grund: err instanceof Error ? err.message : String(err) }))
      })
      const e = await ausDateiAktualisieren(text, sid, t, siedlungDateiLesen, siedlungImportieren)
      for (const m of e.toasts) toast(m.text, m.art)
      setAusDateiFehler(e.fehler)
      if (e.id !== null) {
        // Die neue Welt bauen: Daten neu laden (die Dinge auch, sobald sie steht).
        dingeGeladen.current = null
        if (e.id !== sid) nav(`/app/siedlung/${encodeURIComponent(e.id)}`, { replace: true })
        else zustand.reload()
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      console.warn('[siedlung] Aus Datei aktualisieren:', text)
      setAusDateiFehler(text)
      toast(text, 'error')
    } finally {
      setAusDateiLaeuft(false)
    }
  }
  // Waehrend die neue Siedlung laedt, bleibt die alte Welt stehen (kein
  // Laden ueber die ganze Flaeche); nur eine andere Siedlung wartet.
  const ladeAnzeige = zustand.loading && !neuLaden

  return (
    // Die Hoehe laesst der unteren Leiste (Handy) und der Suchzeile (Computer)
    // ihren Platz, wie im Chat.
    <div className="flex h-[calc(100dvh-var(--nav-h,6rem))] flex-col lg:h-[calc(100dvh-3rem-1px)]">
      <AppHeader
        title={siedlung?.name || t('siedlung.titel')}
        subtitle={unterzeile}
        back="/app"
        sticky={false}
        actions={
          siedlung ? (
            <>
              {/* Zuerst die Leute (E86): am Handy bleibt nur der erste Knopf
                  sichtbar, der Rest steht unter "Mehr". Mit der Zahl der
                  anderen; laesst sich die Liste nicht laden, ein Warnzeichen.
                  Namen an den Knoepfen erst, wo Platz ist (E87, geprueft bei
                  800 px quer und mit Seitenleiste ab 1024 px): Leute und Orte
                  ab xl, die langen ab 2xl, Aus Datei nur als Zeichen (der
                  Name steht im Titel und am Handy im Blatt Mehr). */}
              <Button
                size="sm"
                variant="outline"
                aria-label={t('siedlung.leute')}
                title={mitglieder.error ? t('siedlung.leute_fehler_kurz') : t('siedlung.leute_hilfe')}
                aria-haspopup="dialog"
                aria-expanded={leuteAuf}
                onClick={() => setLeuteAuf(true)}
              >
                <Users size={18} />
                <span className="hidden xl:inline">{t('siedlung.leute')}</span>
                {leute.length > 0 ? <span className="t-serial">{leute.length}</span> : null}
                {mitglieder.error ? <AlertTriangle size={15} className="text-danger" aria-hidden="true" /> : null}
              </Button>
              {/* E87: zur eigenen Wohnung in der Siedlung (leer, wie geplant). */}
              {unsere !== null ? (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={t('siedlung.zu_unserer_wohnung')}
                  title={t('siedlung.zu_unserer_wohnung_hilfe')}
                  onClick={() => steuer.current?.springen(unsere)}
                >
                  <House size={18} />
                  <span className="hidden 2xl:inline">{t('siedlung.zu_unserer_wohnung')}</span>
                </Button>
              ) : null}
              {/* E87: die eingerichtete Wohnung liegt im Umzug (Grundriss). */}
              {eingerichtet ? (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={t('siedlung.eingerichtet')}
                  title={t('siedlung.eingerichtet_hilfe')}
                  onClick={() => nav(eingerichtetPfad(eingerichtet.projectId, eingerichtet.gid))}
                >
                  <Sofa size={18} />
                  <span className="hidden 2xl:inline">{t('siedlung.eingerichtet')}</span>
                </Button>
              ) : null}
              {/* Orte (frueher Wohnungen): aus, bis die Welt gebaut ist. */}
              <Button
                size="sm"
                variant="outline"
                aria-label={t('siedlung.orte')}
                title={sprung ? t('siedlung.orte_hilfe') : t('siedlung.orte_laedt')}
                aria-haspopup="dialog"
                aria-expanded={listeAuf}
                disabled={!sprung}
                // welt ist eine Funktion: in eine Funktion verpackt, sonst
                // haelt React sie fuer eine Aenderungsvorschrift und ruft sie.
                onClick={() => setListeFuer(() => welt)}
              >
                <MapPin size={18} />
                <span className="hidden xl:inline">{t('siedlung.orte')}</span>
              </Button>
              {/* E87: nur der Besitzer: die Siedlung aus einer neuen Datei.
                  Selten gebraucht, darum zuletzt. */}
              {besitzer ? (
                <Button
                  size="sm"
                  variant="outline"
                  loading={ausDateiLaeuft}
                  aria-label={t('siedlung.aus_datei')}
                  title={t('siedlung.aus_datei_hilfe')}
                  onClick={() => datei.current?.click()}
                >
                  {ausDateiLaeuft ? null : <FileUp size={18} />}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      {besitzer ? (
        <input
          ref={datei}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void ausDatei(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      ) : null}
      {ausDateiFehler ? (
        // Fehler beim Aktualisieren: bleibt stehen, bis man ihn schliesst
        // (der Toast verschwindet nach ein paar Sekunden). Eine Zeile, damit
        // das Bild am Handy Platz behaelt; Antippen zeigt den ganzen Satz.
        <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-danger/30 bg-danger/8 py-1 pe-1.5 ps-3 text-sm text-ink">
          <AlertTriangle size={16} className="shrink-0 text-danger" aria-hidden="true" />
          <button
            type="button"
            dir="auto"
            aria-expanded={ausDateiFehlerGanz}
            title={ausDateiFehler}
            onClick={() => setAusDateiFehlerGanz((v) => !v)}
            className={cx('min-w-0 flex-1 text-start', ausDateiFehlerGanz ? 'break-words' : 'truncate')}
          >
            {ausDateiFehler}
          </button>
          <IconButton size="sm" label={t('aktion.schliessen')} onClick={() => setAusDateiFehler(null)}>
            <X size={16} />
          </IconButton>
        </div>
      ) : null}
      {sprung && listeAuf ? (
        <WohnungenBlatt ziele={sprung.liste} ebenen={sprung.ebenen} onWahl={hingehen} onClose={listeZu} />
      ) : null}
      {siedlung && ich ? (
        <SiedlungLeute
          open={leuteAuf}
          onClose={leuteZu}
          siedlungId={siedlung.id}
          siedlungName={siedlung.name}
          ich={ich}
          besitzer={besitzer}
          mitglieder={mitglieder}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        {ladeAnzeige ? (
          <Loading label={t('siedlung.ansicht_laedt')} />
        ) : zustand.error ? (
          <div className="p-4">
            <ErrorBox error={zustand.error} onRetry={zustand.reload} />
          </div>
        ) : !siedlung ? (
          <div className="p-4">
            <Empty
              zeichnung="keine"
              icon={<Building2 size={34} />}
              title={t('siedlung.nicht_gefunden')}
              action={
                <Button variant="outline" onClick={() => nav('/app')}>
                  {t('siedlung.zurueck_start')}
                </Button>
              }
            />
          </div>
        ) : teil.art === 'fehler' ? (
          <div className="p-4">
            <ErrorBox
              error={t('siedlung.3d_fehler', { fehler: teil.text })}
              onRetry={() => {
                setTeil({ art: 'laedt' })
                setVersuch((v) => v + 1)
              }}
            />
          </div>
        ) : !bereit ? (
          <Loading label={t('siedlung.ansicht_laedt')} />
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <Ansicht3D
                daten={OHNE_WOHNUNG}
                welt={welt}
                // Ohne Wohnung gibt es keine Rundumsicht, die etwas zeigt:
                // gleich am Hauseingang losgehen (E87).
                startGehen
                onEbene={setEbene}
                onSprungziele={zieleMelden}
                steuer={steuer}
                live={live}
                dingLagen={dingLagen}
                onDingBewegt={dingBewegt}
                seitenFehler={seitenFehler}
              />
            </div>
            {/* Pflichtangabe der Kartendaten (ODbL), unter dem Bild statt
                darauf. Davor (E87) der Hinweis, wenn die Umgebung fehlt. */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-line bg-surface px-3 py-1">
              {stadtFehler ? (
                <button
                  type="button"
                  data-stadt-fehler=""
                  title={t('siedlung.umgebung_fehler_grund', { grund: stadtFehler })}
                  aria-label={t('siedlung.umgebung_fehler_grund', { grund: stadtFehler })}
                  // Am Handy gibt es kein Ueberfahren: Antippen zeigt den Grund.
                  onClick={() => toast(t('siedlung.umgebung_fehler_grund', { grund: stadtFehler }), 'error')}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[0.6875rem] font-bold text-ink"
                >
                  <AlertTriangle size={12} className="shrink-0 text-warn" aria-hidden="true" />
                  <span dir="auto" className="truncate">
                    {t('siedlung.umgebung_fehler')}
                  </span>
                </button>
              ) : null}
              <p dir="ltr" className="text-[0.6875rem] text-muted">
                {OSM_HINWEIS}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------ Liste der Wohnungen (E84) */

/** Die Liste ueber der Seite: am Handy ein Blatt von unten, am Computer
 *  eine Leiste am Rand, damit das Bild daneben zu sehen bleibt. Sie
 *  entsteht bei jedem Oeffnen neu, die Suche beginnt also leer. Ohne
 *  Unschaerfe dahinter (kostet bei 3D Rechenzeit, wie Fenster3D). Tasten
 *  bleiben im Blatt, sonst ginge man mit den Pfeilen in 3D los. */
function WohnungenBlatt({
  ziele,
  ebenen,
  onWahl,
  onClose,
}: {
  ziele: Sprungziel3D[]
  ebenen: string[]
  onWahl: (index: number) => void
  onClose: () => void
}) {
  const { t } = useSprache()
  const [suche, setSuche] = useState('')
  const feld = useRef<HTMLInputElement>(null)
  const blatt = useRef<HTMLDivElement>(null)
  const zu = useRef(onClose)
  useLayoutEffect(() => {
    zu.current = onClose
  })
  useEffect(() => {
    // Esc auch dann, wenn der Fokus nicht im Blatt liegt.
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zu.current()
    }
    document.addEventListener('keydown', taste)
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Am Computer gleich ins Suchfeld; am Handy nicht, sonst deckt die
    // Tastatur die Liste zu.
    if (window.matchMedia('(pointer: fine)').matches) feld.current?.focus()
    else blatt.current?.focus()
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [])

  // Portal an body, wie Modal: sonst liegt das Blatt unter der Kopfzeile.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end">
      <div className="absolute inset-0 bg-black/45 lg:bg-black/20" aria-hidden="true" onClick={onClose} />
      <div
        ref={blatt}
        role="dialog"
        aria-modal="true"
        aria-label={t('siedlung.orte')}
        tabIndex={-1}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') onClose()
        }}
        className="animate-in relative flex max-h-[85dvh] w-full flex-col rounded-t-karte border border-b-0 border-line bg-surface shadow-dialog outline-none sm:max-w-lg lg:h-full lg:max-h-none lg:w-96 lg:max-w-none lg:rounded-none lg:border-y-0 lg:border-e-0"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <MapPin size={19} className="shrink-0 text-muted" />
          <h2 className="min-w-0 flex-1 truncate text-base font-bold">{t('siedlung.orte')}</h2>
          <IconButton size="sm" label={t('aktion.schliessen')} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              ref={feld}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder={t('siedlung.orte_suchen')}
              aria-label={t('siedlung.orte_suchen')}
              className="ps-10"
            />
          </div>
          <p className="t-sub mt-2">{t('siedlung.springen_hinweis')}</p>
        </div>
        <div className="scrollbar-thin safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <WohnungenListe ziele={ziele} ebenen={ebenen} suche={suche} onWahl={onWahl} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface Gruppe {
  /** Name der Ebene der Welt (Haus und Stockwerk, wie die Welt sie nennt). */
  titel: string | null
  /** i: Nummer in der ganzen Liste, fuer steuer.springen. */
  ziele: { i: number; name: string }[]
}

/** Teilt die Ziele in der gegebenen Reihenfolge in Gruppen: wechselt die
 *  Ebene, beginnt eine neue, mit dem Namen der Ebene als Ueberschrift. Aus
 *  den Namen wird nichts gelesen. Suche: jedes Wort muss im Namen stehen,
 *  gross oder klein ist egal. */
function gruppieren(ziele: Sprungziel3D[], ebenen: string[], suche: string): Gruppe[] {
  const woerter = suche.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const out: Gruppe[] = []
  let ebeneVorher: number | null = null
  ziele.forEach((z, i) => {
    const name = z.name.toLocaleLowerCase()
    if (!woerter.every((w) => name.includes(w))) return
    if (out.length === 0 || z.ebene !== ebeneVorher) {
      out.push({ titel: ebenen[z.ebene] ?? null, ziele: [] })
      ebeneVorher = z.ebene
    }
    out[out.length - 1].ziele.push({ i, name: z.name })
  })
  return out
}

/** Der Inhalt der Liste: ohne Ziele ein Hinweis, ohne Treffer ein anderer,
 *  sonst die Gruppen. Eigene Komponente, damit sie ohne Browser geprueft
 *  werden kann (scripts/siedlung-wohnungen-pruefen.mjs). */
export function WohnungenListe({
  ziele,
  ebenen,
  suche,
  onWahl,
}: {
  ziele: Sprungziel3D[]
  ebenen: string[]
  suche: string
  onWahl: (index: number) => void
}) {
  const { t } = useSprache()
  const gruppen = useMemo(() => gruppieren(ziele, ebenen, suche), [ziele, ebenen, suche])
  if (ziele.length === 0) {
    return (
      <p role="status" className="px-4 py-8 text-center text-muted">
        {t('siedlung.orte_leer')}
      </p>
    )
  }
  if (gruppen.length === 0) {
    return (
      <p role="status" className="px-4 py-8 text-center text-muted">
        {t('siedlung.orte_keine_treffer', { suche: suche.trim() })}
      </p>
    )
  }
  return (
    <div className="pb-2">
      {gruppen.map((g, gi) => (
        <section key={gi} aria-label={g.titel ?? undefined}>
          {g.titel ? (
            <h3 dir="auto" className="t-sub sticky top-0 z-10 border-b border-line bg-surface px-4 pb-1.5 pt-3 font-bold">
              {g.titel}
            </h3>
          ) : null}
          <ul>
            {g.ziele.map((z) => (
              <li key={z.i}>
                <button
                  type="button"
                  data-ziel={z.i}
                  aria-label={t('siedlung.springen_zu', { name: z.name === 'Start' ? t('siedlung.start') : z.name })}
                  onClick={() => onWahl(z.i)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start font-bold text-ink hover:bg-raised focus-visible:bg-raised focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                >
                  <DoorOpen size={18} className="shrink-0 text-muted" />
                  <span dir="auto" className="min-w-0 flex-1 truncate">
                    {z.name === 'Start' ? t('siedlung.start') : z.name}
                  </span>
                  <span className="t-sub hidden lg:inline">{t('siedlung.springen')}</span>
                  <ChevronRight size={18} className="spiegeln shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
