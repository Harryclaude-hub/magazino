import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import {
  Archive,
  Check,
  CloudOff,
  DoorOpen,
  Library,
  Loader2,
  Maximize,
  MousePointer2,
  Package,
  PenLine,
  Redo2,
  Ruler,
  Scissors,
  Sofa,
  TriangleAlert,
  Undo2,
  AppWindow,
  X,
  ZoomIn,
  ZoomOut,
  Slash,
  SquareDashedBottom,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RectangleHorizontal,
  Plug,
} from 'lucide-react'
import { BereichDialog } from '../components/BereichDialog'
import { neuerBereich, type BereichEntwurf } from '../lib/bereich'
import { Button, CodeChip, Modal, useToast } from '../components/ui'
import { datenBox, kisteRechteck, raumTitel } from '../components/plan/hilfe'
import { dekoEbene } from '../components/plan/moebelArt'
import { moebelAnwenden } from '../components/plan/objektVerschieben'
import { GrundrissFehler, ladeGrundriss, listItems, platzRaeumen, platzSetzen, speichereGrundriss, speichereLinien, updateTag } from '../lib/api'
import {
  cmText,
  einrasten,
  kistenUeberlappen,
  laengeLesen,
  raeumeUeberlappen,
  unterlagenAn,
  type Punkt,
  type Rechteck,
  type Unterlage,
} from '../lib/geometrie'
import { useEigeneGroessen, useKistenGroessen } from '../lib/groessen'
import { useSprache } from '../lib/i18n'
import type { GrundrissAenderung, GrundrissDaten, Item, PlanKiste, SymbolArt } from '../lib/types'
import { cx } from '../lib/util'
import { useProject } from '../pages/ProjectLayout'
import { geloeschteMitKisten, istLeer, unterschied } from './diff'
import { gleicheLinien, kanteLaengeSetzen, kistenDraussen, loeschen, objektGedreht, type Auswahl, objektBox, objektSetzen, raumAendern, raumAn, umrissGeaendert, type Vorlage } from './dok'
import { Eigenschaften } from './Eigenschaften'
import { REGAL_STANDARD, SCHRANK_STANDARD } from './katalog'
import { Leinwand, type Ansicht, type WandMass } from './Leinwand'
import { einpassen, radArt, radFaktor, verschieben, zoomAm } from '../components/plan/ansicht'
import { Assistent, KistenListe, PlanSuche, RegalVorlage, UnterlagenWahl } from './Seitenteile'
import { REIHENFOLGE, TASTEN, tastenZeichen, WERKZEUGE } from './werkzeuge'
import { sperrSchluessel, zielAn } from './werkzeuge/auswahl'
import { KontextMenue, UmbenennenDialog, type MenueAktion } from './Menue'
import { raumStart } from './werkzeuge/raum'
import type { Aktion, KisteInHand, Kontext, Schritt, WerkzeugName } from './werkzeuge/typen'
import { zReducer, zStart } from './zustand'
import { woerterNachladen } from '../lib/i18n/woerter'
import { zeichnerWoerter } from '../lib/i18n/bausteine/zeichner'
import { Ueberlagerung3D, useWunschAngenommen } from '../components/plan3d/oeffnen'
import type { Treffer3D } from '../components/plan3d/motor'

// Die Saetze des Zeichners kommen mit seinem Code-Teil (siehe zeichner.ts).
woerterNachladen(zeichnerWoerter)

/* Der Zeichner am Computer (START 4.1, 5.4; BAUPLAN 5.2).
 *
 * Eigener Code-Teil: Grundriss.tsx laedt ihn mit lazy() nur, wenn
 * useZeichnen() (ab 1024 px und mit Maus) und canEdit gelten. Das Handy
 * laedt nichts davon.
 *
 * Aufbau: links Werkzeuge, Mitte Zeichenflaeche (dir="ltr"), rechts
 * Eigenschaften bzw. Assistent, unten Statusleiste. Jede abgeschlossene
 * Aktion wird sofort gespeichert (Unterschied zum letzten bestaetigten
 * Stand, grundriss_speichern); Rueckgaengig und Wiederholen gelten fuer die
 * Sitzung. Die Datenbank entscheidet: lehnt sie ab, steht ihr Satz in der
 * Leiste oben, und der Plan springt auf den letzten gespeicherten Stand.
 */

type Speicherstand = 'gespeichert' | 'speichert' | 'fehler' | 'veraltet'

type Frage =
  | { art: 'loeschen'; raumId: string; codes: string[] }
  | { art: 'senden'; codes: string[] }

interface UnterlageOffen {
  raumId: string
  x: number
  y: number
  drehung: 0 | 90
  liste: Unterlage[]
  wahl: number
}

interface Leiste {
  text: string
  kennung: string | null
  werte: Record<string, unknown>
}

const SYMBOL: Record<WerkzeugName, ReactNode> = {
  auswahl: <MousePointer2 size={19} />,
  raum: <PenLine size={19} />,
  teilen: <Scissors size={19} />,
  nische: <SquareDashedBottom size={19} />,
  tuer: <DoorOpen size={19} />,
  fenster: <AppWindow size={19} />,
  moebel: <Sofa size={19} />,
  regal: <Library size={19} />,
  schrank: <Archive size={19} />,
  kiste: <Package size={19} />,
  messen: <Ruler size={19} />,
  linie: <Slash size={19} strokeDasharray="4 3" />,
  strom: <Plug size={19} />,
}

/** Pfeiltasten ohne Auswahl: so viele Pixel verschiebt die Ansicht. */
const PFEIL_PX = 80
const PFEILE: Record<string, [number, number]> = {
  ArrowLeft: [1, 0],
  ArrowRight: [-1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
}
/** Ab so vielen Pixeln wird aus einem Klick auf leere Flaeche ein Ziehen. */
const ZIEHEN_PX = 4

export default function Zeichner({
  start,
  raumId,
  kisteId,
  onUngespeichert,
  kopf,
  kopfEnde,
  begehen = false,
  onBegehen,
}: {
  start: GrundrissDaten
  raumId: string | null
  kisteId: string | null
  /** Kopf der Seite (Zurueck, Grundrisse, Profil), steht vorne in der
   *  einen Leiste des Zeichners, damit oben nur eine schmale Zeile bleibt. */
  kopf?: ReactNode
  /** Rechts am Ende der Leiste (Erklaerung, Profil). */
  kopfEnde?: ReactNode
  /** Meldet, ob gerade etwas nicht gespeichert ist (fuer die Seite, falls
   *  der Zeichner beim Verkleinern des Fensters verschwindet). */
  onUngespeichert?: (ja: boolean) => void
  /** E87: mit ?begehen=1 geoeffnet: 3D gleich an und gleich begehen,
   *  einmal (gelesen beim Einbauen). */
  begehen?: boolean
  /** Der Wunsch begehen ist angenommen (die Seite vergisst ihn). */
  onBegehen?: () => void
}) {
  const { project, rooms, tags, reloadTags } = useProject()
  const { t, lang } = useSprache()
  const toast = useToast()
  /* Mehr Platz zum Zeichnen: Werkzeuge links schmal (nur Zeichen), rechte
   * Spalte ganz weg. Das Geraet merkt es sich. */
  const [schmal, setSchmal] = useMerker('kistly.zeichner.werkzeuge_schmal')
  const [rechtsZu, setRechtsZu] = useMerker('kistly.zeichner.rechts_zu')

  const [z, dispatch] = useReducer(zReducer, start, zStart)
  const [werkzeug, setWerkzeug] = useState<{ name: WerkzeugName; s: unknown }>({
    name: 'auswahl',
    s: WERKZEUGE.auswahl.start(),
  })
  const [ansicht, setAnsicht] = useState<Ansicht | null>(null)
  const [groesse, setGroesse] = useState<[number, number]>([0, 0])
  const [raster, setRaster] = useState<1 | 5 | 10>(5)
  const [winkel, setWinkel] = useState(true)
  // Alte Daten (Teppiche, Deko) werden weiter gezeigt, neue entstehen nicht.
  const teppiche = true
  const deko = true
  /** Umschalter 2D/3D: 3D liegt ueber der Zeichenflaeche und zeigt z.dok live. */
  const [drei, setDrei] = useState(begehen)
  // E87: begehen gilt nur fuer das erste 3D; zurueck auf 2D vergisst es.
  const [dreiGehen, setDreiGehen] = useState(begehen)
  useWunschAngenommen(begehen, onBegehen)
  const dreiAus = () => {
    setDrei(false)
    setDreiGehen(false)
  }
  const [zeigerCm, setZeigerCm] = useState<Punkt | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)
  const [leiste, setLeiste] = useState<Leiste | null>(null)
  const [status, setStatus] = useState<Speicherstand>('gespeichert')
  const [frage, setFrage] = useState<Frage | null>(null)
  const [massEingabe, setMassEingabe] = useState<(WandMass & { text: string }) | null>(null)
  const [unterlage, setUnterlage] = useState<UnterlageOffen | null>(null)
  const [unterlageBusy, setUnterlageBusy] = useState(false)
  const [unterlageFehler, setUnterlageFehler] = useState<string | null>(null)
  const [inHand, setInHand] = useState<KisteInHand | null>(null)
  const [letztePlatzierung, setLetztePlatzierung] = useState<{ id: string; code: string; vorher: PlanKiste | null } | null>(null)
  const [symbolArt] = useState<SymbolArt>('steckdose')
  /* Ziehen nur nach Freigabe (Rechtsklick > Verschieben / Groesse aendern):
   * sonst verschiebt man Raeume und Moebel zu leicht aus Versehen. */
  const [entsperrt, setEntsperrt] = useState<string | null>(null)
  const [menue, setMenue] = useState<{ x: number; y: number; ziel: NonNullable<Auswahl> } | null>(null)
  const [umbenennen, setUmbenennen] = useState<NonNullable<Auswahl> | null>(null)
  const [vorlagen, setVorlagen] = useState<{ moebel: Vorlage | null; regal: Vorlage; schrank: Vorlage }>(() => ({
    moebel: null,
    regal: { ...REGAL_STANDARD, name: '' },
    schrank: { ...SCHRANK_STANDARD, name: '' },
  }))
  const [bereich, setBereich] = useState<{ entwurf: BereichEntwurf; raumId: string } | null>(null)
  const [ohnePlatz, setOhnePlatz] = useState<Item[] | null>(null)
  const [ohnePlatzFehler, setOhnePlatzFehler] = useState<string | null>(null)
  const [ohnePlatzVersuch, setOhnePlatzVersuch] = useState(0)
  const [tick, setTick] = useState(0)
  /** Leertaste gedrueckt: Ziehen verschiebt die Ansicht (Hand als Zeiger). */
  const [hand, setHand] = useState(false)
  /** Die Ansicht wird gerade gezogen (Zeiger als greifende Hand). */
  const [gezogen, setGezogen] = useState(false)

  const flaeche = useRef<HTMLDivElement>(null)
  const laeuft = useRef(false)
  /** Raeume, deren Loeschen samt Kisten schon bestaetigt ist: vor dem
   *  Senden nicht noch einmal fragen. */
  const loeschenBestaetigt = useRef(new Set<string>())
  const leertaste = useRef(false)
  /** Laufendes Verschieben der Ansicht. warten: Klick, der erst ab
   *  ZIEHEN_PX Bewegung zum Verschieben wird. klick: Zeichen-Werkzeuge
   *  setzen ihren Punkt erst beim Loslassen, damit Ziehen auch mitten in
   *  einer Linie die Ansicht verschiebt. */
  const schieben = useRef<{ x: number; y: number; a: Ansicht; warten?: boolean; klick?: { p: Punkt; frei: boolean } } | null>(
    null,
  )

  const stufen = useKistenGroessen()
  const eigene = useEigeneGroessen(project.id)

  /* Namen der Katalog-Vorlagen in der jetzigen Sprache. */
  const vorlageFuer = useCallback(
    (name: WerkzeugName): Vorlage | null => {
      if (name === 'moebel') return vorlagen.moebel
      if (name === 'regal') return { ...vorlagen.regal, name: vorlagen.regal.name || t('zeichner.katalog.regal') }
      if (name === 'schrank') return { ...vorlagen.schrank, name: vorlagen.schrank.name || t('zeichner.katalog.kleiderschrank') }
      return null
    },
    [vorlagen, t],
  )

  const kontext: Kontext = {
    dok: z.dok,
    raster,
    winkel,
    massstab: ansicht?.s ?? 1,
    auswahl: z.auswahl,
    neueId: () => crypto.randomUUID(),
    vorlage: vorlageFuer(werkzeug.name),
    symbolArt,
    entsperrt,
    kiste: inHand,
    ohneDeko: !deko,
  }

  /* ---------------------------------------------------------- Ansicht */

  useLayoutEffect(() => {
    const el = flaeche.current
    if (!el) return
    const messen = () => setGroesse([el.clientWidth, el.clientHeight])
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const zielBox = useCallback(
    (was: 'alles' | { raumId: string } | Rechteck): Rechteck => {
      if (was !== 'alles' && 'x0' in was) return was
      const b = datenBox(z.dok, was === 'alles' ? null : was.raumId)
      return b ?? { x0: 0, y0: 0, x1: 1100, y1: 700 }
    },
    [z.dok],
  )

  const zeigen = useCallback(
    (was: 'alles' | { raumId: string } | Rechteck) => {
      if (groesse[0] === 0) return
      // 40 cm Luft um den Inhalt, dazu ein fester Rand in Pixeln.
      const b = zielBox(was)
      setAnsicht(einpassen({ x0: b.x0 - 40, y0: b.y0 - 40, x1: b.x1 + 40, y1: b.y1 + 40 }, groesse[0], groesse[1]))
    },
    [groesse, zielBox],
  )

  // Erste Ansicht, sobald die Flaeche gemessen ist.
  useEffect(() => {
    if (ansicht || groesse[0] === 0) return
    const kiste = kisteId ? z.dok.kisten.find((k) => k.id === kisteId) : null
    if (raumId && z.dok.raeume.some((r) => r.id === raumId)) {
      zeigen({ raumId })
      dispatch({ typ: 'waehlen', auswahl: kiste ? { art: 'kiste', id: kiste.id } : { art: 'raum', id: raumId } })
    } else if (kiste) {
      zeigen({ raumId: kiste.platz_raum_id })
    } else {
      zeigen('alles')
    }
  }, [ansicht, groesse, raumId, kisteId, z.dok, zeigen])

  /* Rad und Trackpad. Mausrad und Strg/Cmd+Rad (auch Pinch) zoomen am
   * Zeiger, Wischen mit zwei Fingern verschiebt. Nicht passiv, sonst
   * rollt die Seite mit. */
  useEffect(() => {
    const el = flaeche.current
    if (!el) return
    let trackpadBis = 0
    const rad = (e: WheelEvent) => {
      e.preventDefault()
      const jetzt = e.timeStamp
      const art = radArt(e, jetzt < trackpadBis)
      if (art === 'schieben') {
        trackpadBis = jetzt + 400
        const k = e.deltaMode === 1 ? 16 : 1
        const dx = e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX
        const dy = e.shiftKey && e.deltaX === 0 ? 0 : e.deltaY
        setAnsicht((a) => (a ? verschieben(a, -dx * k, -dy * k) : a))
        return
      }
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const f = radFaktor(e)
      setAnsicht((a) => (a ? zoomAm(a, f, mx, my) : a))
    }
    el.addEventListener('wheel', rad, { passive: false })
    return () => el.removeEventListener('wheel', rad)
  }, [])

  function zoomen(f: number) {
    setAnsicht((a) => (a ? zoomAm(a, f, groesse[0] / 2, groesse[1] / 2) : a))
  }

  /* -------------------------------------------------------- Werkzeuge */

  const wechseln = useCallback((wunsch: WerkzeugName, rechteck?: boolean) => {
    // Nur die Werkzeuge der Leiste (Moebel, Strom, Kiste gibt es hier nicht mehr).
    const name: WerkzeugName = REIHENFOLGE.includes(wunsch) ? wunsch : 'auswahl'
    setWerkzeug({ name, s: name === 'raum' ? raumStart(rechteck ? 'rechteck' : 'punkte') : WERKZEUGE[name].start() })
    setMassEingabe(null)
    if (name !== 'kiste') setUnterlage(null)
  }, [])

  const hinweisZeigen = useCallback((text: string) => {
    setHinweis(text)
  }, [])

  useEffect(() => {
    if (!hinweis) return
    const id = window.setTimeout(() => setHinweis(null), 4200)
    return () => window.clearTimeout(id)
  }, [hinweis])

  function unterlageOeffnen(a: Extract<Aktion, { typ: 'unterlage_waehlen' }>) {
    if (!inHand) return
    const liste = unterlagenAn(z.dok, a.raumId, a.x, a.y, { ...inHand, drehung: a.drehung })
    const erste = liste.findIndex((u) => u.passt)
    setUnterlageFehler(null)
    setUnterlage({ ...a, liste, wahl: erste >= 0 ? erste : 0 })
  }

  function ausfuehren(r: Schritt<unknown>, name: WerkzeugName) {
    setWerkzeug((w) => (w.name === name ? { ...w, s: r.s } : w))
    for (const a of r.aktionen ?? []) {
      switch (a.typ) {
        case 'aendern':
          setLeiste(null)
          dispatch({ typ: 'aendern', dok: a.dok, auswahl: a.auswahl })
          break
        case 'waehlen':
          dispatch({ typ: 'waehlen', auswahl: a.auswahl })
          break
        case 'hinweis':
          hinweisZeigen(t(a.schluessel, a.werte))
          break
        case 'loeschen_fragen':
          setFrage({ art: 'loeschen', raumId: a.raumId, codes: a.codes })
          break
        case 'unterlage_waehlen':
          unterlageOeffnen(a)
          break
        case 'werkzeug':
          wechseln(a.name)
          break
      }
    }
  }

  // Die Freigabe zum Ziehen endet, sobald etwas anderes gewaehlt ist (oder Esc).
  useEffect(() => {
    if (entsperrt && sperrSchluessel(z.auswahl) !== entsperrt) setEntsperrt(null)
  }, [z.auswahl, entsperrt])

  /** Was das Rechtsklick-Menue anbietet. Ecke und Kante zaehlen als Raum. */
  function menueAktionen(ziel: NonNullable<Auswahl>): MenueAktion[] {
    switch (ziel.art) {
      case 'raum':
      case 'kante':
      case 'ecke':
        return ['bearbeiten', 'umbenennen', 'eigenschaften', 'loeschen']
      case 'objekt':
        return ['verschieben', 'drehen', 'umbenennen', 'eigenschaften', 'loeschen']
      case 'oeffnung':
        return ['verschieben', 'eigenschaften', 'loeschen']
      case 'linie':
      case 'symbol':
        return ['verschieben', 'eigenschaften', 'loeschen']
      case 'kiste':
        return ['eigenschaften']
    }
  }

  function menueWahl(aktion: MenueAktion, ziel: NonNullable<Auswahl>) {
    setMenue(null)
    const raumZiel: NonNullable<Auswahl> = ziel.art === 'kante' || ziel.art === 'ecke' ? { art: 'raum', id: ziel.raumId } : ziel
    switch (aktion) {
      case 'bearbeiten':
      case 'verschieben':
        dispatch({ typ: 'waehlen', auswahl: raumZiel })
        setEntsperrt(sperrSchluessel(raumZiel))
        hinweisZeigen(t(raumZiel.art === 'raum' ? 'zeichner.menue.raum_frei' : 'zeichner.menue.frei'))
        return
      case 'eigenschaften':
        dispatch({ typ: 'waehlen', auswahl: raumZiel })
        setRechtsZu(false)
        return
      case 'umbenennen':
        setUmbenennen(raumZiel)
        return
      case 'drehen': {
        if (raumZiel.art !== 'objekt') return
        const o = z.dok.objekte.find((x) => x.id === raumZiel.id)
        if (o) dispatch({ typ: 'aendern', dok: objektSetzen(z.dok, objektGedreht(o, 1)), auswahl: raumZiel })
        return
      }
      case 'loeschen': {
        const r = WERKZEUGE.auswahl.taste({ ...kontext, auswahl: raumZiel }, 'Delete', 'Delete', false, werkzeug.s)
        if (r) ausfuehren(r, 'auswahl')
        return
      }
    }
  }

  /** Neuer Name: ein Raum mit Zimmer benennt das Zimmer um (ueberall im
   *  Umzug), sonst den Raum; ein Moebel seinen Namen. */
  async function umbenennenSpeichern(ziel: NonNullable<Auswahl>, name: string) {
    if (ziel.art === 'raum') {
      const r = z.dok.raeume.find((x) => x.id === ziel.id)
      if (!r) return
      if (r.tag_id) {
        await updateTag(r.tag_id, { name })
        await reloadTags()
        dispatch({ typ: 'aendern', dok: raumAendern(z.dok, r.id, { tag_name: name }), auswahl: ziel })
      } else {
        dispatch({ typ: 'aendern', dok: raumAendern(z.dok, r.id, { name }), auswahl: ziel })
      }
    } else if (ziel.art === 'objekt') {
      const o = z.dok.objekte.find((x) => x.id === ziel.id)
      if (o) dispatch({ typ: 'aendern', dok: objektSetzen(z.dok, { ...o, name }), auswahl: ziel })
    }
  }

  function aktuellerName(ziel: NonNullable<Auswahl>): string {
    if (ziel.art === 'raum') {
      const r = z.dok.raeume.find((x) => x.id === ziel.id)
      return r ? r.tag_name ?? r.name : ''
    }
    if (ziel.art === 'objekt') return z.dok.objekte.find((x) => x.id === ziel.id)?.name ?? ''
    return ''
  }

  /** Ein Moebel oder eine Kiste aus Suche oder Liste: waehlen und zeigen. */
  function objektZeigen(id: string) {
    const o = z.dok.objekte.find((x) => x.id === id)
    if (!o) return
    wechseln('auswahl')
    dispatch({ typ: 'waehlen', auswahl: { art: 'objekt', id } })
    zeigen(objektBox(o))
  }
  function kisteZeigen(id: string) {
    const k = z.dok.kisten.find((x) => x.id === id)
    if (!k) return
    wechseln('auswahl')
    dispatch({ typ: 'waehlen', auswahl: { art: 'kiste', id } })
    zeigen(kisteRechteck(k))
  }

  /* Klick in 3D (auch beim Begehen): wie ein Klick an derselben Stelle
   * im Plan, fuer die Werkzeuge, die etwas hinstellen (E66). */
  const stelltHin = werkzeug.name === 'regal' || werkzeug.name === 'schrank'
  function planTippen(x: number, y: number, treffer: Treffer3D | null) {
    if (werkzeug.name === 'auswahl') {
      // Auswaehlen in 3D: Moebel oder Kiste waehlen, rechts erscheinen ihre Eigenschaften.
      if (treffer?.kiste) dispatch({ typ: 'waehlen', auswahl: { art: 'kiste', id: treffer.kiste } })
      else if (treffer?.objekt) dispatch({ typ: 'waehlen', auswahl: { art: 'objekt', id: treffer.objekt } })
      else dispatch({ typ: 'waehlen', auswahl: null })
      setRechtsZu(false)
      return
    }
    if (!stelltHin) return
    const w = WERKZEUGE[werkzeug.name]
    ausfuehren(w.runter(kontext, { p: [x, y], frei: false }, werkzeug.s), werkzeug.name)
  }

  /* ------------------------------------------------------------ Zeiger */

  function cm(e: { clientX: number; clientY: number }): Punkt | null {
    const el = flaeche.current
    if (!el || !ansicht) return null
    const r = el.getBoundingClientRect()
    return [ansicht.x + (e.clientX - r.left) / ansicht.s, ansicht.y + (e.clientY - r.top) / ansicht.s]
  }

  function runter(e: React.PointerEvent<HTMLDivElement>) {
    // Bei offenem 3D gehoert der Zeiger der Kamera (siehe Ueberlagerung3D).
    if (!ansicht || drei) return
    if (e.button === 1 || (e.button === 0 && leertaste.current)) {
      e.preventDefault()
      schieben.current = { x: e.clientX, y: e.clientY, a: ansicht }
      setGezogen(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (e.button === 2) {
      if (werkzeug.name === 'auswahl') {
        // Rechtsklick: waehlen und das Menue oeffnen.
        const p = cm(e)
        const ziel = p ? zielAn(kontext, p) : null
        dispatch({ typ: 'waehlen', auswahl: ziel })
        const r = e.currentTarget.getBoundingClientRect()
        setMenue(ziel ? { x: e.clientX - r.left, y: e.clientY - r.top, ziel } : null)
        return
      }
      const w = WERKZEUGE[werkzeug.name]
      setWerkzeug((x) => ({ ...x, s: w.abbrechen(x.s).s }))
      return
    }
    setMenue(null)
    if (e.button !== 0) return
    setMassEingabe(null)
    const p = cm(e)
    if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (werkzeug.name !== 'auswahl') {
      // Zeichnen: Klick setzt den Punkt beim Loslassen, Ziehen verschiebt.
      schieben.current = { x: e.clientX, y: e.clientY, a: ansicht, warten: true, klick: { p, frei: e.shiftKey } }
      return
    }
    const w = WERKZEUGE[werkzeug.name]
    const r = w.runter(kontext, { p, frei: e.shiftKey }, werkzeug.s)
    ausfuehren(r, werkzeug.name)
    // Auswahl auf leerer Flaeche: Ziehen verschiebt die Ansicht.
    if (werkzeug.name === 'auswahl' && (r.s as { zug: unknown }).zug === null) {
      schieben.current = { x: e.clientX, y: e.clientY, a: ansicht, warten: true }
    }
  }

  function bewegen(e: React.PointerEvent<HTMLDivElement>) {
    if (drei) return
    const sc = schieben.current
    if (sc && sc.warten && Math.hypot(e.clientX - sc.x, e.clientY - sc.y) >= ZIEHEN_PX) {
      sc.warten = false
      setGezogen(true)
    }
    if (sc && !sc.warten) {
      setAnsicht(verschieben(sc.a, e.clientX - sc.x, e.clientY - sc.y))
      return
    }
    const p = cm(e)
    if (!p) return
    setZeigerCm(p)
    const w = WERKZEUGE[werkzeug.name]
    ausfuehren(w.bewegen(kontext, { p, frei: e.shiftKey }, werkzeug.s), werkzeug.name)
  }

  function hoch(e: React.PointerEvent<HTMLDivElement>) {
    if (drei) return
    const sc = schieben.current
    if (sc) {
      schieben.current = null
      setGezogen(false)
      if (!sc.warten) return
    }
    const p = cm(e)
    if (!p || e.button !== 0) return
    const w = WERKZEUGE[werkzeug.name]
    if (sc?.klick) {
      const r = w.runter(kontext, sc.klick, werkzeug.s)
      ausfuehren(r, werkzeug.name)
      ausfuehren(w.hoch(kontext, sc.klick, r.s), werkzeug.name)
      return
    }
    ausfuehren(w.hoch(kontext, { p, frei: e.shiftKey }, werkzeug.s), werkzeug.name)
  }

  function doppel(e: React.MouseEvent<HTMLDivElement>) {
    if (drei) return
    const p = cm(e)
    const w = WERKZEUGE[werkzeug.name]
    if (!p || !w.doppel) return
    ausfuehren(w.doppel(kontext, { p, frei: e.shiftKey }, werkzeug.s), werkzeug.name)
  }

  /* Zimmer-Chip auf einen Raum ziehen = zuordnen. */
  function fallenLassen(e: React.DragEvent<HTMLDivElement>) {
    const tagId = e.dataTransfer.getData('text/kistly-zimmer')
    const p = cm(e)
    if (!tagId || !p) return
    e.preventDefault()
    zimmerZuordnen(tagId, raumAn(z.dok, p)?.id ?? null)
  }

  function zimmerZuordnen(tagId: string, raumZiel: string | null) {
    const tag = rooms.find((r) => r.id === tagId)
    if (!tag) return
    if (!raumZiel) {
      hinweisZeigen(t('zeichner.zimmer_auf_raum'))
      return
    }
    dispatch({
      typ: 'aendern',
      dok: raumAendern(z.dok, raumZiel, { tag_id: tag.id, tag_name: tag.name, tag_short: tag.short, tag_color: tag.color }),
      auswahl: { art: 'raum', id: raumZiel },
    })
  }

  /* ------------------------------------------------------------ Tasten */

  const aktuell = useRef({ kontext, werkzeug, z, ausfuehren, wechseln, zeigen, frage, unterlage, massEingabe, bereich })
  useLayoutEffect(() => {
    aktuell.current = { kontext, werkzeug, z, ausfuehren, wechseln, zeigen, frage, unterlage, massEingabe, bereich }
  })

  useEffect(() => {
    const unten = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const ziel0 = e.target as HTMLElement | null
        if (!ziel0 || !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(ziel0.tagName)) {
          leertaste.current = true
          setHand(true)
        }
      }
      const ziel = e.target as HTMLElement | null
      if (ziel && (ziel.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName))) return
      const a = aktuell.current
      if (a.frage || a.bereich || document.querySelector('[role="dialog"]')) return
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.code === 'KeyZ') {
          e.preventDefault()
          dispatch({ typ: e.shiftKey ? 'vor' : 'zurueck' })
        } else if (e.code === 'KeyY') {
          e.preventDefault()
          dispatch({ typ: 'vor' })
        }
        return
      }
      if (e.altKey) return
      const w = WERKZEUGE[a.werkzeug.name]
      // Pfeiltasten ohne Auswahl verschieben die Ansicht (Umschalt: weiter).
      const pf = PFEILE[e.code]
      const r = pf && a.werkzeug.name === 'auswahl' && !a.z.auswahl ? null : w.taste(a.kontext, e.code, e.key, e.shiftKey, a.werkzeug.s)
      if (r) {
        e.preventDefault()
        a.ausfuehren(r, a.werkzeug.name)
        return
      }
      if (pf) {
        e.preventDefault()
        const px = PFEIL_PX * (e.shiftKey ? 4 : 1)
        setAnsicht((v) => (v ? verschieben(v, pf[0] * px, pf[1] * px) : v))
        return
      }
      if (e.code === 'Escape') {
        const ab = w.abbrechen(a.werkzeug.s)
        if (ab.etwas) setWerkzeug({ name: a.werkzeug.name, s: ab.s })
        else if (a.werkzeug.name !== 'auswahl') a.wechseln('auswahl')
        else dispatch({ typ: 'waehlen', auswahl: null })
        setUnterlage(null)
        return
      }
      if (e.code === 'Digit0' || e.code === 'Numpad0') {
        a.zeigen('alles')
        return
      }
      if (e.code === 'Space') {
        e.preventDefault()
        return
      }
      for (const name of REIHENFOLGE) {
        if (e.code === TASTEN[name]) {
          e.preventDefault()
          a.wechseln(name, name === 'raum' && e.shiftKey)
          return
        }
      }
    }
    const oben = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        leertaste.current = false
        setHand(false)
      }
    }
    window.addEventListener('keydown', unten)
    window.addEventListener('keyup', oben)
    return () => {
      window.removeEventListener('keydown', unten)
      window.removeEventListener('keyup', oben)
    }
  }, [])

  /* ------------------------------------------------------------ Speichern */

  const senden = useCallback(
    (a: GrundrissAenderung) => {
      laeuft.current = true
      setStatus('speichert')
      const gesendet = z.dok
      speichereGrundriss(z.basis.grundriss.id, z.version, a)
        .then(({ version, daten }) => {
          dispatch({ typ: 'gespeichert', gesendet, antwort: daten, version })
          setStatus('gespeichert')
        })
        .catch((err: unknown) => {
          if (err instanceof GrundrissFehler && err.kennung === 'veraltet') {
            setStatus('veraltet')
            return
          }
          if (err instanceof GrundrissFehler && err.kennung) {
            // Regel verletzt: nichts wurde uebernommen.
            dispatch({ typ: 'abgelehnt' })
            setLeiste({ text: err.message, kennung: err.kennung, werte: err.werte })
            setStatus('gespeichert')
            return
          }
          if (err instanceof GrundrissFehler && err.sqlstate && /^2[23]/.test(err.sqlstate)) {
            // Abgelehnt ohne kistly-Kennung (Pruefung einer Spalte, Wert
            // ungueltig): Nochmal braechte dasselbe, also wie eine Regel.
            dispatch({ typ: 'abgelehnt' })
            setLeiste({ text: t('zeichner.nicht_angenommen', { grund: err.message }), kennung: null, werte: {} })
            setStatus('gespeichert')
            return
          }
          // Netz oder Unbekanntes: Stand behalten, Nochmal anbieten.
          setLeiste({ text: err instanceof Error ? err.message : String(err), kennung: null, werte: {} })
          setStatus('fehler')
        })
        .finally(() => {
          laeuft.current = false
          setTick((n) => n + 1)
        })
    },
    [z.dok, z.basis, z.version, t],
  )

  /** Hilfslinien getrennt speichern (0034): ein update am Grundriss, die
   *  Version bleibt. Fehler kommen in die Leiste, Nochmal versucht es neu. */
  const sendenLinien = useCallback(() => {
    laeuft.current = true
    setStatus('speichert')
    speichereLinien(z.basis.grundriss.id, z.dok.grundriss.linien ?? [], z.dok.grundriss.symbole ?? [])
      .then(({ linien, symbole }) => {
        dispatch({ typ: 'linien_gespeichert', linien, symbole })
        setStatus('gespeichert')
      })
      .catch((err: unknown) => {
        setLeiste({ text: err instanceof Error ? err.message : String(err), kennung: null, werte: {} })
        setStatus('fehler')
      })
      .finally(() => {
        laeuft.current = false
        setTick((n) => n + 1)
      })
  }, [z.basis.grundriss.id, z.dok.grundriss.linien, z.dok.grundriss.symbole])

  useEffect(() => {
    if (laeuft.current || status === 'veraltet' || status === 'fehler' || frage) return
    const a = unterschied(z.basis, z.dok)
    if (istLeer(a)) {
      if (!gleicheLinien(z.basis, z.dok)) sendenLinien()
      return
    }
    // Vorab: Kisten, die nach einer Raum-Aenderung draussen stuenden. Nur
    // Raeume mit neuem Umriss; reines Verschieben nimmt die Kisten mit.
    const draussen = kistenDraussen(z.dok, umrissGeaendert(z.basis, z.dok))
    if (draussen.length) {
      dispatch({ typ: 'abgelehnt' })
      setLeiste({ text: t('grundriss.kisten_draussen_vorab', { codes: draussen.join(', ') }), kennung: 'kisten_draussen', werte: { code: draussen[0] } })
      return
    }
    // Wer den Raum schon im Loeschen-Dialog bestaetigt hat, wird nicht
    // ein zweites Mal gefragt.
    const mitKisten = geloeschteMitKisten(z.basis, a).filter((x) => !loeschenBestaetigt.current.has(x.raumId))
    if (mitKisten.length) {
      setFrage({ art: 'senden', codes: mitKisten.flatMap((x) => x.codes) })
      return
    }
    for (const id of a.raeume_loeschen ?? []) loeschenBestaetigt.current.delete(id)
    senden(a)
  }, [z.dok, z.basis, status, frage, tick, senden, sendenLinien, t])

  // Der Seite sagen, ob etwas nicht gespeichert ist.
  const ungespeichert = useMemo(
    () => status !== 'gespeichert' || !istLeer(unterschied(z.basis, z.dok)) || !gleicheLinien(z.basis, z.dok),
    [status, z.basis, z.dok],
  )
  useEffect(() => {
    onUngespeichert?.(ungespeichert)
  }, [ungespeichert, onUngespeichert])

  // Nicht Gespeichertes nicht still verlieren.
  useEffect(() => {
    if (status === 'gespeichert') return
    const warnen = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', warnen)
    return () => window.removeEventListener('beforeunload', warnen)
  }, [status])

  async function neuLaden() {
    try {
      const d = await ladeGrundriss(z.basis.grundriss.id)
      if (!d) {
        setLeiste({ text: t('fehler.db.grundriss.grundriss_fehlt'), kennung: 'grundriss_fehlt', werte: {} })
        return
      }
      dispatch({ typ: 'neu_geladen', daten: d })
      setStatus('gespeichert')
      setLeiste(null)
    } catch (err) {
      setLeiste({ text: err instanceof Error ? err.message : String(err), kennung: null, werte: {} })
    }
  }

  async function kistenNeu() {
    try {
      const d = await ladeGrundriss(z.basis.grundriss.id)
      if (d) dispatch({ typ: 'kisten', kisten: d.kisten })
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
    setOhnePlatzVersuch((v) => v + 1)
  }

  /* "Zeigen" in der Fehlerleiste: auf die genannte Kiste oder das Moebel. */
  function fehlerZeigen() {
    if (!leiste) return
    const code = typeof leiste.werte.code === 'string' ? leiste.werte.code : null
    const k = code ? z.dok.kisten.find((x) => x.code === code) : null
    if (k) {
      zeigen(kisteRechteck(k))
      dispatch({ typ: 'waehlen', auswahl: { art: 'kiste', id: k.id } })
      return
    }
    const name = typeof leiste.werte.name === 'string' ? leiste.werte.name : null
    const o = name ? z.dok.objekte.find((x) => x.name === name) : null
    if (o) {
      zeigen(objektBox(o))
      dispatch({ typ: 'waehlen', auswahl: { art: 'objekt', id: o.id } })
      return
    }
    const a = z.auswahl
    if (a && (a.art === 'raum' || 'raumId' in a)) zeigen({ raumId: a.art === 'raum' ? a.id : a.raumId })
    else zeigen('alles')
  }

  /* ------------------------------------------------------------ Kisten */

  useEffect(() => {
    if (werkzeug.name !== 'kiste') return
    let alive = true
    setOhnePlatzFehler(null)
    listItems(project.id, { ohnePlatz: true, kindNot: 'furniture', limit: 500 })
      .then((r) => alive && setOhnePlatz(r.rows))
      .catch((e: unknown) => alive && setOhnePlatzFehler(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [werkzeug.name, project.id, ohnePlatzVersuch])

  /* Masse einer Kiste ohne Platz, nur fuer den Geist (die Datenbank
   * rechnet selbst, kiste_masse): eigene Groesse, sonst Stufe mit eigener
   * Hoehe, sonst 60 x 40 x 40. */
  const masse = useCallback(
    (i: Item) => {
      const e = i.eigene_groesse_id ? eigene.liste?.find((g) => g.id === i.eigene_groesse_id) : null
      if (e) return { laenge_cm: e.laenge_cm, breite_cm: e.breite_cm, hoehe_cm: e.hoehe_cm }
      const g = stufen?.get(i.size)
      return {
        laenge_cm: g?.laenge_cm ?? 60,
        breite_cm: g?.breite_cm ?? 40,
        hoehe_cm: i.eigene_hoehe_cm ?? g?.hoehe_cm ?? 40,
      }
    },
    [eigene.liste, stufen],
  )

  async function hinstellen() {
    if (!unterlage || !inHand) return
    const u = unterlage.liste[unterlage.wahl]
    if (!u || !u.passt) return
    setUnterlageBusy(true)
    setUnterlageFehler(null)
    const vorher = z.dok.kisten.find((k) => k.id === inHand.id) ?? null
    try {
      await platzSetzen(inHand.id, {
        raum_id: unterlage.raumId,
        x: unterlage.x,
        y: unterlage.y,
        drehung: unterlage.drehung,
        unterlage: u.art,
        unterlage_item_id: u.itemId ?? null,
        unterlage_objekt_id: u.objektId ?? null,
        ebene: u.ebene ?? null,
        spalte: u.spalte ?? null,
      })
      toast(t('zeichner.kisten.steht', { code: inHand.code }), 'ok')
      setLetztePlatzierung({ id: inHand.id, code: inHand.code, vorher })
      setUnterlage(null)
      setInHand(null)
      await kistenNeu()
    } catch (err) {
      setUnterlageFehler(err instanceof Error ? err.message : String(err))
      void kistenNeu()
    } finally {
      setUnterlageBusy(false)
    }
  }

  async function platzZurueck() {
    const l = letztePlatzierung
    if (!l) return
    try {
      if (l.vorher) {
        const v = l.vorher
        await platzSetzen(l.id, {
          raum_id: v.platz_raum_id,
          x: v.platz_x,
          y: v.platz_y,
          drehung: v.platz_drehung,
          unterlage: v.unterlage_art,
          unterlage_item_id: v.unterlage_item_id,
          unterlage_objekt_id: v.unterlage_objekt_id,
          ebene: v.fach_ebene,
          spalte: v.fach_spalte,
        })
      } else {
        await platzRaeumen(l.id)
      }
      setLetztePlatzierung(null)
      await kistenNeu()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  async function vomPlatz(k: PlanKiste) {
    try {
      await platzRaeumen(k.id)
      toast(t('zeichner.kisten.vom_platz', { code: k.code }), 'ok')
      await kistenNeu()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  /* ------------------------------------------------------------ Anzeige */

  const w = WERKZEUGE[werkzeug.name]
  const vorschau = ansicht ? w.vorschau(kontext, werkzeug.s) : {}
  const anzeige = vorschau.dok ?? z.dok
  // Ausgeblendete Deko (E82) zeichnet die Leinwand nicht, auch nicht, was
  // auf ihr steht (dekoEbene); der Plan bleibt.
  const leinwandDok = useMemo(() => {
    if (deko) return anzeige
    const weg = dekoEbene(anzeige.objekte)
    return { ...anzeige, objekte: anzeige.objekte.filter((o) => !weg.has(o.id)) }
  }, [anzeige, deko])
  /* Nur Warnung (START 5.2, BAUPLAN 7.1 E12): sich ueberdeckende Raeume
   * speichert der Zeichner trotzdem. */
  const ueberlappend = useMemo(() => {
    const paare = raeumeUeberlappen(z.dok)
    const name = (id: string) => {
      const r = z.dok.raeume.find((x) => x.id === id)
      return r ? raumTitel(r) || t('plan.raum_ohne_name') : ''
    }
    return paare.map(([a, b]) => `${name(a)} / ${name(b)}`)
  }, [z.dok, t])
  const offeneZimmer = useMemo(() => {
    const belegt = new Set(z.dok.raeume.map((r) => r.tag_id).filter(Boolean))
    return rooms.filter((r) => !belegt.has(r.id))
  }, [rooms, z.dok.raeume])
  const unterlageUeberlappt = useMemo(() => {
    if (!unterlage || !inHand) return []
    const u = unterlage.liste[unterlage.wahl]
    if (!u) return []
    return kistenUeberlappen(z.dok, unterlage.raumId, unterlage.x, unterlage.y, { ...inHand, unten_cm: u.unten_cm }, unterlage.drehung)
  }, [unterlage, inHand, z.dok])

  const rechts = (() => {
    if (werkzeug.name === 'kiste') {
      if (unterlage && inHand) {
        return (
          <UnterlagenWahl
            dok={z.dok}
            code={inHand.code}
            liste={unterlage.liste}
            wahl={unterlage.wahl}
            onWahl={(i) => setUnterlage((u) => (u ? { ...u, wahl: i } : u))}
            ueberlappt={unterlageUeberlappt}
            busy={unterlageBusy}
            fehler={unterlageFehler}
            onSetzen={() => void hinstellen()}
            onAbbrechen={() => setUnterlage(null)}
          />
        )
      }
      return (
        <KistenListe
          liste={ohnePlatz}
          fehler={ohnePlatzFehler}
          nochmal={() => setOhnePlatzVersuch((v) => v + 1)}
          inHand={inHand}
          masse={masse}
          onNehmen={setInHand}
          platziert={z.dok.kisten}
          onAngelegt={(i) => {
            setOhnePlatzVersuch((v) => v + 1)
            setInHand({ id: i.id, code: i.code, ...masse(i) })
          }}
        />
      )
    }
    if (werkzeug.name === 'regal' || werkzeug.name === 'schrank') {
      const art = werkzeug.name
      return <RegalVorlage wert={vorlagen[art]} onAendern={(v) => setVorlagen((x) => ({ ...x, [art]: v }))} />
    }
    if (z.auswahl) {
      return (
        <Eigenschaften
          dok={z.dok}
          auswahl={z.auswahl}
          projectId={project.id}
          zimmer={rooms}
          aendern={(dok, auswahl) => {
            setLeiste(null)
            dispatch({ typ: 'aendern', dok, auswahl })
          }}
          hinweis={hinweisZeigen}
          loeschenFragen={(raumId, codes) => setFrage({ art: 'loeschen', raumId, codes })}
          neuesZimmer={(rid) => {
            const r = z.dok.raeume.find((x) => x.id === rid)
            setBereich({ entwurf: neuerBereich('room', tags.length, r ? raumTitel(r) : ''), raumId: rid })
          }}
          vomPlatz={(k) => void vomPlatz(k)}
        />
      )
    }
    return <Assistent dok={z.dok} onWerkzeug={wechseln} />
  })()

  const hilfe = t(`zeichner.hilfe.${werkzeug.name === 'raum' && (werkzeug.s as { modus?: string }).modus === 'rechteck' ? 'rechteck' : werkzeug.name}`)
  const cursor = gezogen ? 'cursor-grabbing' : hand ? 'cursor-grab' : werkzeug.name === 'auswahl' ? 'cursor-default' : 'cursor-crosshair'

  return (
    <div className="flex h-full min-h-0 flex-col bg-paper">
      {/* Kopfzeile des Zeichners */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface px-2 py-1">
        {kopf}
        {kopf ? <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" /> : null}
        <LeistenKnopf
          tour="z-links"
          label={t(schmal ? 'zeichner.werkzeuge_breit' : 'zeichner.werkzeuge_schmal')}
          onClick={() => setSchmal(!schmal)}
        >
          {schmal ? <PanelLeftOpen size={17} className="spiegeln" /> : <PanelLeftClose size={17} className="spiegeln" />}
        </LeistenKnopf>
        <LeistenKnopf tour="z-rueck" label={t('zeichner.zurueck_taste')} onClick={() => dispatch({ typ: 'zurueck' })} disabled={z.zurueck.length === 0}>
          <Undo2 size={17} className="spiegeln" />
        </LeistenKnopf>
        <LeistenKnopf tour="z-vor" label={t('zeichner.vor_taste')} onClick={() => dispatch({ typ: 'vor' })} disabled={z.vor.length === 0}>
          <Redo2 size={17} className="spiegeln" />
        </LeistenKnopf>
        <p data-tour="z-hilfe" className="t-sub min-w-0 flex-1 truncate px-1 text-sm" title={hilfe}>{hilfe}</p>
        {vorschau.eingabe ? (
          <span className="t-serial rounded-lg border-2 border-ink bg-paper px-2 py-1 text-base" aria-live="polite">
            {vorschau.eingabe}
          </span>
        ) : null}
        <div data-tour="z-ansicht" className="flex rounded-xl border-2 border-line p-0.5" role="group" aria-label={t('plan3d.umschalter')}>
          <button
            type="button"
            aria-pressed={!drei}
            onClick={dreiAus}
            className={cx('h-8 rounded-lg px-3 text-sm font-bold', !drei ? 'bg-ink text-paper' : 'text-ink hover:bg-raised')}
          >
            {t('plan3d.zwei_d')}
          </button>
          <button
            type="button"
            aria-pressed={drei}
            onClick={() => setDrei(true)}
            className={cx('h-8 rounded-lg px-3 text-sm font-bold', drei ? 'bg-ink text-paper' : 'text-ink hover:bg-raised')}
          >
            {t('plan3d.drei_d')}
          </button>
        </div>
        <span data-tour="z-speichern" className="flex">
          <SpeicherAnzeige status={status} onNochmal={() => { setStatus('gespeichert'); setLeiste(null) }} />
        </span>
        <LeistenKnopf
          tour="z-rechts"
          label={t(rechtsZu ? 'zeichner.spalte_zeigen' : 'zeichner.spalte_ausblenden')}
          onClick={() => setRechtsZu(!rechtsZu)}
        >
          {rechtsZu ? <PanelRightOpen size={17} className="spiegeln" /> : <PanelRightClose size={17} className="spiegeln" />}
        </LeistenKnopf>
        {kopfEnde}
      </div>

      {leiste ? (
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-danger/30 bg-danger/10 px-3 py-2" role="alert">
          <TriangleAlert size={18} className="shrink-0 text-danger" />
          <p className="min-w-0 flex-1 font-bold text-ink">{leiste.text}</p>
          {leiste.kennung ? (
            <Button size="sm" variant="outline" onClick={fehlerZeigen}>
              {t('grundriss.zeigen')}
            </Button>
          ) : null}
          <button className="rounded-lg p-1.5 text-muted hover:bg-raised" onClick={() => setLeiste(null)} aria-label={t('aktion.schliessen')}>
            <X size={16} />
          </button>
        </div>
      ) : null}

      {ueberlappend.length > 0 ? (
        <div className="flex items-center gap-2 border-b border-warn/40 bg-warn/10 px-3 py-1.5 text-sm font-bold text-warn">
          <TriangleAlert size={16} className="shrink-0" />
          {t('zeichner.raeume_ueberlappen', { paare: ueberlappend.join(', ') })}
        </div>
      ) : null}

      {offeneZimmer.length > 0 ? (
        <div data-tour="z-zimmer" className="flex items-center gap-2 overflow-x-auto border-b border-line bg-surface px-3 py-1.5 scrollbar-thin">
          <span className="shrink-0 text-sm font-bold text-muted">{t('zeichner.noch_nicht_gezeichnet')}</span>
          {offeneZimmer.map((r) => (
            <button
              key={r.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/kistly-zimmer', r.id)
                e.dataTransfer.effectAllowed = 'link'
              }}
              onClick={() => {
                const a = z.auswahl
                const ziel = a?.art === 'raum' ? a.id : a && 'raumId' in a ? a.raumId : null
                zimmerZuordnen(r.id, ziel)
              }}
              title={t('zeichner.zimmer_ziehen')}
              className="inline-flex h-8 shrink-0 cursor-grab items-center gap-1.5 rounded-full border-2 border-line bg-paper px-3 text-sm font-bold hover:border-ink/40"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              {r.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Werkzeuge */}
        <nav
          data-tour="z-werkzeuge"
          className={cx('flex shrink-0 flex-col gap-1 overflow-y-auto border-e border-line bg-surface p-1.5 scrollbar-thin', schmal ? 'w-14' : 'w-48')}
          aria-label={t('zeichner.werkzeuge')}
        >
          {REIHENFOLGE.map((name) => (
            <button data-tour={`z-w-${name}`}
              key={name}
              type="button"
              onClick={() => wechseln(name)}
              aria-pressed={werkzeug.name === name}
              title={schmal ? `${t(`zeichner.werkzeug.${name}`)} (${tastenZeichen(name)}): ${t(`zeichner.hilfe.${name}`)}` : t(`zeichner.hilfe.${name}`)}
              aria-label={t(`zeichner.werkzeug.${name}`)}
              className={cx(
                'flex min-h-9 items-center gap-2 rounded-xl text-start text-[0.9375rem] font-bold transition',
                schmal ? 'justify-center px-0' : 'px-2.5',
                werkzeug.name === name ? 'bg-ink text-paper' : 'text-ink hover:bg-raised',
              )}
            >
              <span className="shrink-0" style={name === 'tuer' ? { color: 'var(--plan-tuer)' } : name === 'fenster' ? { color: 'var(--plan-fenster)' } : undefined}>
                {SYMBOL[name]}
              </span>
              {schmal ? null : (
                <>
                  <span className="min-w-0 flex-1 truncate">{t(`zeichner.werkzeug.${name}`)}</span>
                  <kbd className="t-serial rounded border border-current/30 px-1 text-xs opacity-70">{tastenZeichen(name)}</kbd>
                </>
              )}
            </button>
          ))}
          <button data-tour="z-rechteck"
            type="button"
            onClick={() => wechseln('raum', true)}
            title={t('zeichner.werkzeug.rechteck')}
            aria-label={t('zeichner.werkzeug.rechteck')}
            className={cx(
              'flex min-h-9 items-center gap-2 rounded-xl text-start text-sm font-bold text-muted hover:bg-raised hover:text-ink',
              schmal ? 'justify-center px-0' : 'px-2.5',
            )}
          >
            {schmal ? (
              <RectangleHorizontal size={18} />
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate">{t('zeichner.werkzeug.rechteck')}</span>
                <kbd className="t-serial rounded border border-current/30 px-1 text-xs opacity-70">⇧R</kbd>
              </>
            )}
          </button>
        </nav>

        {/* Zeichenflaeche */}
        <div data-tour="z-flaeche"
          dir="ltr"
          ref={flaeche}
          className={cx('relative min-w-0 flex-1 overflow-hidden', cursor)}
          style={{ background: 'var(--plan-grund)', touchAction: 'none' }}
          onPointerDown={runter}
          onPointerMove={bewegen}
          onPointerUp={hoch}
          onPointerLeave={() => setZeigerCm(null)}
          onDoubleClick={doppel}
          onContextMenu={(e) => e.preventDefault()}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('text/kistly-zimmer')) e.preventDefault()
          }}
          onDrop={fallenLassen}
        >
          {ansicht && groesse[0] > 0 ? (
            <Leinwand
              dok={leinwandDok}
              auswahl={z.auswahl}
              hervor={kisteId}
              ansicht={ansicht}
              breite={groesse[0]}
              hoehe={groesse[1]}
              vorschau={vorschau}
              teppiche={teppiche}
              onMass={(m) => {
                if (werkzeug.name !== 'auswahl') return
                setMassEingabe({ ...m, text: String(m.laenge) })
                dispatch({ typ: 'waehlen', auswahl: { art: 'kante', raumId: m.raumId, kante: m.kante } })
              }}
            />
          ) : null}

          {massEingabe && ansicht ? (
            <form
              className="absolute z-10 flex items-center gap-1 rounded-xl border-2 border-ink bg-surface p-1 shadow-lg"
              style={{
                left: (massEingabe.p[0] - ansicht.x) * ansicht.s - 60,
                top: (massEingabe.p[1] - ansicht.y) * ansicht.s - 20,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                const v = laengeLesen(massEingabe.text)
                const neu = v ? kanteLaengeSetzen(z.dok, massEingabe.raumId, massEingabe.kante, v) : null
                if (neu) dispatch({ typ: 'aendern', dok: neu })
                else hinweisZeigen(t('zeichner.laenge_geht_nicht'))
                setMassEingabe(null)
              }}
            >
              <input
                autoFocus
                dir="ltr"
                value={massEingabe.text}
                onChange={(e) => setMassEingabe((m) => (m ? { ...m, text: e.target.value } : m))}
                onKeyDown={(e) => e.key === 'Escape' && setMassEingabe(null)}
                className="t-serial w-24 rounded-lg bg-paper px-2 py-1 text-base outline-none"
                aria-label={t('zeichner.eig.laenge')}
              />
              <button type="submit" className="rounded-lg bg-ink p-1.5 text-paper" aria-label={t('aktion.speichern')}>
                <Check size={16} />
              </button>
            </form>
          ) : null}

          {entsperrt ? (
            <div className="absolute inset-x-0 top-3 z-10 flex justify-center" onPointerDown={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 rounded-xl bg-ink px-3 py-1.5 text-sm font-bold text-paper shadow-lg">
                {t('zeichner.menue.band')}
                <button type="button" onClick={() => setEntsperrt(null)} className="rounded-lg bg-paper px-2 py-0.5 text-ink">
                  {t('zeichner.menue.fertig')}
                </button>
              </div>
            </div>
          ) : null}
          {menue ? (
            <KontextMenue
              x={menue.x}
              y={menue.y}
              aktionen={menueAktionen(menue.ziel)}
              onWahl={(a) => menueWahl(a, menue.ziel)}
              onClose={() => setMenue(null)}
            />
          ) : null}

          {drei ? (
            <Ueberlagerung3D
              daten={z.dok}
              hervor={z.auswahl?.art === 'kiste' ? z.auswahl.id : kisteId}
              onSchliessen={dreiAus}
              startGehen={dreiGehen}
              onTippen={stelltHin || werkzeug.name === 'auswahl' ? planTippen : undefined}
              markiert={z.auswahl?.art === 'objekt' ? z.auswahl.id : null}
              onObjektZiehen={(id, dx, dy) => {
                // Wie Ziehen in 2D: frei, nur das Raster gilt; die Datenbank prueft beim Speichern.
                const o = z.dok.objekte.find((x) => x.id === id)
                if (!o) return
                setLeiste(null)
                dispatch({
                  typ: 'aendern',
                  dok: objektSetzen(z.dok, { ...o, x: o.x + einrasten(dx, raster), y: o.y + einrasten(dy, raster) }),
                  auswahl: { art: 'objekt', id },
                })
              }}
              onMoebelSpeichern={async (liste) => {
                // E89: beim Begehen getragene Moebel in das Dokument, wie
                // Ziehen (objektSetzen nimmt mit, was darauf steht), in einem
                // Schritt; gespeichert wird wie immer. Ohne Einrasten: die
                // Mitte landet dort, wo sie in 3D stand (objektVerschieben.ts),
                // im Raum, in dem das Moebel jetzt ganz liegt.
                let dok = z.dok
                for (const neu of moebelAnwenden(dok.objekte, dok.raeume, liste)) dok = objektSetzen(dok, neu)
                if (dok === z.dok) return
                setLeiste(null)
                dispatch({ typ: 'aendern', dok, auswahl: z.auswahl })
              }}
            />
          ) : null}

          {z.dok.raeume.length === 0 && werkzeug.name === 'auswahl' ? (
            <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
              <p className="rounded-xl bg-surface/90 px-4 py-2 text-base font-bold shadow">{t('zeichner.leer_hinweis')}</p>
            </div>
          ) : null}

          {hinweis ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center" aria-live="polite">
              <p className="rounded-xl bg-ink px-4 py-2 text-base font-bold text-paper shadow-lg">{hinweis}</p>
            </div>
          ) : null}

          <div data-tour="z-zoom" className="absolute end-3 top-3 flex flex-col gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <Rund label={t('zeichner.zoom_rein')} onClick={() => zoomen(1.25)}>
              <ZoomIn size={18} />
            </Rund>
            <Rund label={t('zeichner.zoom_raus')} onClick={() => zoomen(0.8)}>
              <ZoomOut size={18} />
            </Rund>
            <Rund label={t('zeichner.alles_zeigen')} onClick={() => zeigen('alles')}>
              <Maximize size={18} />
            </Rund>
          </div>
        </div>

        {/* Rechte Spalte */}
        <aside
          data-tour="z-seite"
          hidden={rechtsZu}
          className="w-80 shrink-0 space-y-4 overflow-y-auto border-s border-line bg-surface p-4 scrollbar-thin"
        >
          <PlanSuche objekte={z.dok.objekte} kisten={z.dok.kisten} onObjekt={objektZeigen} onKiste={kisteZeigen} />
          {letztePlatzierung ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-paper p-2">
              <CodeChip code={letztePlatzierung.code} size="sm" />
              <span className="min-w-0 flex-1 text-sm">{t('zeichner.kisten.gesetzt')}</span>
              <Button size="sm" variant="ghost" onClick={() => void platzZurueck()}>
                <Undo2 size={15} className="spiegeln" /> {t('zeichner.zurueck')}
              </Button>
            </div>
          ) : null}
          {rechts}
        </aside>
      </div>

      {/* Statusleiste */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-surface px-3 py-1.5 text-sm">
        <span className="t-serial min-w-44 text-muted" dir="ltr">
          {zeigerCm ? `x ${cmText(Math.max(0, zeigerCm[0]), lang)}  y ${cmText(Math.max(0, zeigerCm[1]), lang)}` : ' '}
        </span>
        <span data-tour="z-raster" className="flex items-center gap-1">
          <span className="font-bold text-muted">{t('zeichner.raster')}</span>
          {([1, 5, 10] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRaster(r)}
              aria-pressed={raster === r}
              className={cx('t-serial rounded-md px-2 py-0.5', raster === r ? 'bg-ink text-paper' : 'hover:bg-raised')}
            >
              {r}
            </button>
          ))}
          <span className="text-muted">cm</span>
        </span>
        <button data-tour="z-winkel"
          type="button"
          onClick={() => setWinkel((v) => !v)}
          aria-pressed={winkel}
          className={cx('rounded-md px-2 py-0.5 font-bold', winkel ? 'bg-ink text-paper' : 'hover:bg-raised')}
        >
          {t('zeichner.winkel')}
        </button>
        <span className="t-serial text-muted">{ansicht ? `${Math.round(ansicht.s * 100)} %` : ''}</span>
        <span data-tour="z-tasten" className="t-sub ms-auto">{t('zeichner.tasten_hilfe')}</span>
      </div>

      {/* Dialoge */}
      <UmbenennenDialog
        offen={umbenennen !== null}
        start={umbenennen ? aktuellerName(umbenennen) : ''}
        onClose={() => setUmbenennen(null)}
        onSpeichern={async (name) => {
          if (umbenennen) await umbenennenSpeichern(umbenennen, name)
          setUmbenennen(null)
        }}
      />
      <Modal open={status === 'veraltet'} onClose={() => void neuLaden()} title={t('grundriss.veraltet_titel')}>
        <p className="text-base">{t('grundriss.veraltet')}</p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void neuLaden()}>{t('grundriss.neu_laden')}</Button>
        </div>
      </Modal>

      <Modal
        open={frage !== null}
        onClose={() => {
          if (frage?.art === 'senden') dispatch({ typ: 'abgelehnt' })
          setFrage(null)
        }}
        title={t('zeichner.frage_titel')}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                if (frage?.art === 'senden') dispatch({ typ: 'abgelehnt' })
                setFrage(null)
              }}
            >
              {t('aktion.abbrechen')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const f = frage
                setFrage(null)
                if (!f) return
                if (f.art === 'loeschen') {
                  loeschenBestaetigt.current.add(f.raumId)
                  dispatch({ typ: 'aendern', dok: loeschen(z.dok, { art: 'raum', id: f.raumId }), auswahl: null })
                } else {
                  senden(unterschied(z.basis, z.dok))
                }
              }}
            >
              {t('aktion.loeschen')}
            </Button>
          </>
        }
      >
        {frage ? (
          <p className="text-base">
            {t('zeichner.frage_kisten', { n: frage.codes.length, codes: frage.codes.slice(0, 8).join(', ') })}
          </p>
        ) : null}
      </Modal>

      <BereichDialog
        entwurf={bereich?.entwurf ?? null}
        projectId={project.id}
        tags={tags}
        onClose={() => setBereich(null)}
        onGespeichert={async (tag) => {
          const rid = bereich?.raumId
          await reloadTags()
          if (rid && z.dok.raeume.some((r) => r.id === rid)) {
            dispatch({
              typ: 'aendern',
              dok: raumAendern(z.dok, rid, { tag_id: tag.id, tag_name: tag.name, tag_short: tag.short, tag_color: tag.color }),
              auswahl: { art: 'raum', id: rid },
            })
          }
        }}
      />
    </div>
  )
}

function Rund({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-line bg-surface text-ink shadow-sm hover:border-ink/40"
    >
      {children}
    </button>
  )
}

function SpeicherAnzeige({ status, onNochmal }: { status: Speicherstand; onNochmal: () => void }) {
  const { t } = useSprache()
  if (status === 'speichert') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-muted" aria-live="polite">
        <Loader2 size={16} className="animate-spin" /> {t('grundriss.speichert')}
      </span>
    )
  }
  if (status === 'fehler' || status === 'veraltet') {
    return (
      <button type="button" onClick={onNochmal} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-danger hover:bg-danger/10">
        <CloudOff size={16} /> {t('grundriss.nicht_gespeichert')}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ok" aria-live="polite">
      <Check size={16} /> {t('grundriss.gespeichert')}
    </span>
  )
}

/** Kleiner Symbolknopf fuer die eine Leiste oben (duenn, damit die
 *  Zeichenflaeche Platz hat). */
function LeistenKnopf({
  label,
  onClick,
  disabled,
  tour,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  tour?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition hover:bg-raised disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/** Ein Schalter, den das Geraet sich merkt (localStorage, nur Bequemlichkeit). */
function useMerker(schluessel: string): [boolean, (v: boolean) => void] {
  const [wert, setWert] = useState(() => {
    try {
      return localStorage.getItem(schluessel) === '1'
    } catch {
      return false
    }
  })
  const setzen = useCallback(
    (v: boolean) => {
      setWert(v)
      try {
        if (v) localStorage.setItem(schluessel, '1')
        else localStorage.removeItem(schluessel)
      } catch {
        /* ohne Speicher gilt es bis zum Neuladen */
      }
    },
    [schluessel],
  )
  return [wert, setzen]
}
