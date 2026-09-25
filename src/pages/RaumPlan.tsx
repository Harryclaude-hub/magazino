import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Boxes,
  DoorOpen,
  Grid3x3,
  Hand,
  Library,
  Minus,
  PanelTop,
  Plus,
  Ruler,
  Trash2,
  X,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  ErrorBox,
  Loading,
  SectionTitle,
  useToast,
} from '../components/ui'
import { Schnellansicht } from '../components/Schnellansicht'
import { BrettWahl } from '../components/raumplan/BrettWahl'
import { PlanFormular, type PlanWerte } from '../components/raumplan/PlanFormular'
import { Plan2D, QR_AB, type ZellTipp } from '../components/raumplan/Plan2D'
import { Plan3D } from '../components/raumplan/Plan3D'
import { PlanSeite, type SeitenTipp } from '../components/raumplan/PlanSeite'
import { RegalDialog } from '../components/raumplan/RegalDialog'
import { useProject } from './ProjectLayout'
import {
  aendereRegal,
  ladeRaumplan,
  ladeRegale,
  ladeZimmerKisten,
  legeRegalAn,
  loescheRaumplan,
  loescheRegal,
  raeumePlatz,
  setzePlatz,
  speichereRaumplan,
  type RegalWerte,
} from '../lib/api'
import { useKistenGroessenStand } from '../lib/groessen'
import { useSprache, type Lang } from '../lib/i18n'
import {
  anWand,
  baueRaster,
  findeKiste,
  kisteHoehe,
  passtDrauf,
  randSeite,
  rasterMasse,
  stapelAn,
  stapelDerZelle,
  stapelKey,
  zelleKey,
} from '../lib/raumplan'
import type { Item, Raumplan, Regal, TuerSeite } from '../lib/types'
import { cx } from '../lib/util'

/* Der Raumplan eines Zimmers.
 *
 * Das Zimmer ist ein Raster aus Zellen von raster_cm. Auf einer Zelle
 * steht ein Stapel Kisten, jede so hoch, wie sie wirklich ist (0021,
 * 0022), oder ein Regal mit Brettern, auf denen sich Kisten stapeln.
 * Drei Ansichten: von oben, schraeg, und von der Seite mit der Hoehe in
 * Zentimetern.
 *
 * Was hier vorab geprueft wird, prueft die Datenbank noch einmal. Die
 * Oberflaeche prueft, damit man den Grund liest, bevor man tippt; die
 * Datenbank prueft, weil zwei Leute gleichzeitig legen koennen. Lehnt
 * sie ab, kommt ihr Satz auf Deutsch oder Arabisch, und der Plan wird
 * neu geladen, damit man sieht, was wirklich steht.
 */

type Ansicht = '2d' | '3d' | 'seite'
type Modus = 'setzen' | 'umriss' | 'tuer' | 'regal'

const ZELLE_MIN = 44
const ZELLE_MAX = 200
const ZELLE_SCHRITT = 28

function meterText(cm: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'de-DE', {
    maximumFractionDigits: 2,
  }).format(cm / 100)
}

export default function RaumPlan() {
  const { project, tagById } = useProject()
  /* Der alte Raumplan ist nur noch zum Nachsehen da (Etappe 1). Die
   * Plaetze zieht Migration 0029 in den neuen Grundriss um; danach lehnt
   * die Datenbank jedes Schreiben ins alte Raster ab. Darum bietet die
   * Seite keinen Schreibweg mehr an, auch nicht fuer Bearbeiter. */
  const schreiben: boolean = false
  const { tagId = '' } = useParams()
  const { t, tn, lang } = useSprache()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { tabelle: groessen, fehler: groessenFehler } = useKistenGroessenStand()

  const zimmer = tagById(tagId)

  const [plan, setPlan] = useState<Raumplan | null>(null)
  const [kisten, setKisten] = useState<Item[]>([])
  const [regale, setRegale] = useState<Regal[]>([])
  const [laedt, setLaedt] = useState(true)
  /** Einmal fehlerfrei geladen. Erst dann heisst "kein Plan" wirklich,
   *  dass es keinen gibt, und nicht, dass das Netz weg war. */
  const [geladen, setGeladen] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const [ansicht, setAnsichtRoh] = useState<Ansicht>('2d')
  const [modus, setModusRoh] = useState<Modus>('setzen')

  /* Umriss, Tuer und Regale gibt es nur von oben. Wer schraeg oder von der
   * Seite schaut, setzt Kisten. Und wer den Modus verlaesst, legt die
   * Kiste aus der Hand: sonst laege sie unsichtbar darin, und der naechste
   * Tipp setzte sie. */
  function setAnsicht(a: Ansicht) {
    setAnsichtRoh(a)
    if (a !== '2d') setModusRoh('setzen')
  }
  function setModus(m: Modus) {
    setModusRoh(m)
    if (m !== 'setzen') setHand(null)
  }
  const [zelle, setZelle] = useState(72)
  /** Die Kiste, die als naechstes gesetzt wird. */
  const [hand, setHand] = useState<string | null>(null)
  /** Die angetippte oder gesuchte Kiste. */
  const [markiert, setMarkiert] = useState<string | null>(null)
  /** Eine angetippte Zelle ohne Kiste darauf, etwa ein Regal. */
  const [auswahl, setAuswahl] = useState<ZellTipp | null>(null)
  /** Welche Reihe die Seitenansicht zeigt. */
  const [reihe, setReihe] = useState(0)
  const [schnellId, setSchnellId] = useState<string | null>(null)
  const [formular, setFormular] = useState(false)
  const [loeschenOffen, setLoeschenOffen] = useState(false)
  const [regalDialog, setRegalDialog] = useState<{ regal: Regal | null; x: number; y: number } | null>(
    null,
  )
  const [regalWeg, setRegalWeg] = useState<Regal | null>(null)
  const [brettWahl, setBrettWahl] = useState<{ x: number; y: number; regal: Regal } | null>(null)
  const [busy, setBusy] = useState(false)
  /* Solange geschrieben wird, zaehlt kein weiterer Tipp. Ein Ref und kein
   * Zustand: zwei Tipper kurz hintereinander saehen sonst beide noch den
   * alten Zustand und setzten dieselbe Kiste zweimal. */
  const sperre = useRef(false)

  /* Kommt man von einer Kiste oder aus der Suche, soll man sofort sehen,
   * welche gemeint ist. */
  const hervor = params.get('kiste')
  const hervorGezeigt = useRef<string | null>(null)

  /* Ein anderes Zimmer faengt von vorn an. Steht vor dem Laden, damit
   * nicht kurz der Plan des vorigen Zimmers stehen bleibt. */
  useEffect(() => {
    setPlan(null)
    setKisten([])
    setRegale([])
    setGeladen(false)
    setHand(null)
    setMarkiert(null)
    setAuswahl(null)
    hervorGezeigt.current = null
  }, [tagId])

  const laden = useCallback(async () => {
    setLaedt(true)
    setFehler(null)
    try {
      const [p, k, r] = await Promise.all([
        ladeRaumplan(tagId),
        ladeZimmerKisten(project.id, tagId),
        ladeRegale(tagId),
      ])
      setPlan(p)
      setKisten(k)
      setRegale(r)
      setGeladen(true)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setLaedt(false)
    }
  }, [project.id, tagId])

  useEffect(() => {
    void laden()
  }, [laden])

  const raster = useMemo(
    () => (plan ? baueRaster(plan, regale, kisten, groessen) : null),
    [plan, regale, kisten, groessen],
  )

  const ohnePlatz = useMemo(() => kisten.filter((k) => k.plan_x === null), [kisten])
  const inHand = hand && schreiben ? (ohnePlatz.find((k) => k.id === hand) ?? null) : null
  const steht = raster ? kisten.some((k) => k.plan_x !== null) || regale.length > 0 : false

  /* Die gesuchte Kiste einmal zeigen: markieren, ihre Reihe in der
   * Seitenansicht waehlen und die Zelle in den sichtbaren Bereich holen. */
  useEffect(() => {
    if (!hervor || !geladen || !raster || hervorGezeigt.current === hervor) return
    hervorGezeigt.current = hervor
    setMarkiert(hervor)
    const kiste = kisten.find((k) => k.id === hervor)
    if (kiste && kiste.plan_x !== null && kiste.plan_y !== null) {
      setReihe(kiste.plan_y)
      const id = `zelle-${kiste.plan_x}-${kiste.plan_y}`
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ block: 'center', inline: 'center' }),
      )
    }
  }, [hervor, geladen, raster, kisten])

  function ersetze(neu: Item) {
    setKisten((prev) => prev.map((k) => (k.id === neu.id ? neu : k)))
  }

  function meldung(err: unknown) {
    toast(err instanceof Error ? err.message : String(err), 'error')
  }

  /** Ein Schreibvorgang mit Sperre. Scheitert er, wird neu geladen: was
   *  die Datenbank abgelehnt hat, steht vielleicht schon anders da, weil
   *  jemand anderes gleichzeitig gelegt hat. */
  async function mitSperre(fn: () => Promise<void>, neuLadenBeiFehler = true) {
    if (sperre.current) return
    sperre.current = true
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      meldung(err)
      if (neuLadenBeiFehler) await laden()
    } finally {
      sperre.current = false
      setBusy(false)
    }
  }

  /* ------------------------------------------------------- Plan aendern */

  async function planSpeichern(werte: PlanWerte & {
    gesperrt?: [number, number][]
    tuer_x?: number | null
    tuer_y?: number | null
    tuer_seite?: TuerSeite | null
  }) {
    const { spalten, reihen } = rasterMasse(werte)
    let gesperrt = werte.gesperrt ?? plan?.gesperrt ?? []
    let tuerX = werte.tuer_x !== undefined ? werte.tuer_x : (plan?.tuer_x ?? null)
    let tuerY = werte.tuer_y !== undefined ? werte.tuer_y : (plan?.tuer_y ?? null)
    let tuerSeite = werte.tuer_seite !== undefined ? werte.tuer_seite : (plan?.tuer_seite ?? null)

    /* Neue Zellgroesse: Umriss und Tuer ueber ihre Lage in Zentimetern auf
     * das neue Raster umrechnen. Eine neue Zelle ist gesperrt, wenn ihre
     * Mitte in einer alten gesperrten Zelle lag. Ohne das rutschten beide
     * still an eine andere Stelle. Kisten und Regale kann es hier nicht
     * geben: dann ist die Zellgroesse gesperrt (0022). */
    const rasterNeu = plan !== null && werte.raster_cm !== plan.raster_cm
    if (rasterNeu && plan) {
      const alt = plan.raster_cm
      const neu = werte.raster_cm
      const altGesperrt = new Set(gesperrt.map(([x, y]) => zelleKey(x, y)))
      const umgerechnet: [number, number][] = []
      for (let y = 0; y < reihen; y++) {
        for (let x = 0; x < spalten; x++) {
          const ax = Math.floor(((x + 0.5) * neu) / alt)
          const ay = Math.floor(((y + 0.5) * neu) / alt)
          if (altGesperrt.has(zelleKey(ax, ay))) umgerechnet.push([x, y])
        }
      }
      gesperrt = umgerechnet
      if (tuerX !== null && tuerY !== null) {
        tuerX = Math.min(spalten - 1, Math.floor(((tuerX + 0.5) * alt) / neu))
        tuerY = Math.min(reihen - 1, Math.floor(((tuerY + 0.5) * alt) / neu))
      }
    }
    const kleiner =
      plan !== null && (werte.breite_cm < plan.breite_cm || werte.tiefe_cm < plan.tiefe_cm)

    /* Wird das Zimmer kleiner, fallen gesperrte Zellen draussen weg, und
     * eine Tuer, die dann nicht mehr an einer Wand liegt, auch. Beides
     * wird gesagt, nicht still getan. */
    const vorher = gesperrt.length
    gesperrt = gesperrt.filter(([x, y]) => x < spalten && y < reihen)
    const gesperrtSet = new Set(gesperrt.map(([x, y]) => zelleKey(x, y)))
    let tuerWeg = false
    if (tuerX !== null && tuerY !== null && tuerSeite) {
      const gut =
        tuerX < spalten &&
        tuerY < reihen &&
        !gesperrtSet.has(zelleKey(tuerX, tuerY)) &&
        anWand(tuerX, tuerY, tuerSeite, spalten, reihen, gesperrtSet)
      if (!gut) {
        tuerX = null
        tuerY = null
        tuerSeite = null
        tuerWeg = true
      }
    }

    /* Kisten, die danach draussen stuenden, werden mit Nummer genannt.
     * Die Datenbank lehnt es ebenfalls ab, sagt aber nicht, welche. */
    const draussen = kisten.filter(
      (k) =>
        k.plan_x !== null &&
        k.plan_y !== null &&
        (k.plan_x >= spalten || k.plan_y >= reihen || gesperrtSet.has(zelleKey(k.plan_x, k.plan_y))),
    )
    if (draussen.length > 0) {
      toast(
        t('raumplan.kisten_draussen', {
          n: draussen.length,
          codes: draussen
            .slice(0, 5)
            .map((k) => k.code)
            .join(', '),
        }),
        'error',
      )
      return
    }

    await mitSperre(async () => {
      const neu = await speichereRaumplan(
        {
          tag_id: tagId,
          project_id: project.id,
          breite_cm: werte.breite_cm,
          tiefe_cm: werte.tiefe_cm,
          hoehe_cm: werte.hoehe_cm,
          raster_cm: werte.raster_cm,
          gesperrt,
          tuer_x: tuerX,
          tuer_y: tuerY,
          tuer_seite: tuerSeite,
        },
        // Neu anlegen nur, wenn es wirklich noch keinen Plan gibt.
        plan === null,
      )
      setPlan(neu)
      setFormular(false)
      toast(t('raumplan.gespeichert'), 'ok')
      if (rasterNeu && (neu.gesperrt.length > 0 || neu.tuer_x !== null)) {
        toast(t('raumplan.raster_umgerechnet'), 'info')
      } else if (kleiner && gesperrt.length < vorher) {
        toast(t('raumplan.umriss_angepasst', { n: vorher - gesperrt.length }), 'info')
      }
      if (tuerWeg) toast(t('raumplan.tuer_entfernt'), 'info')
    }, false)
  }

  /* ------------------------------------------------------ Zelle antippen */

  async function setzen(item: Item, x: number, y: number, z: number, regal: { id: string; boden: number } | null) {
    await mitSperre(async () => {
      const neu = await setzePlatz(item.id, x, y, z, regal)
      ersetze(neu)
      /* Die naechste Kiste kommt in die Hand, sichtbar in der Leiste ueber
       * dem Plan, mit "Loslassen" daneben. Nie still. */
      const rest = ohnePlatz.filter((k) => k.id !== neu.id)
      // Hat jemand waehrend des Speicherns eine andere Kiste genommen oder
      // losgelassen, bleibt es dabei.
      setHand((jetzt) => (jetzt === item.id ? (rest[0]?.id ?? null) : jetzt))
      setMarkiert(neu.id)
    })
  }

  function zelleGetippt({ x, y }: ZellTipp) {
    if (!plan || !raster) return
    if (sperre.current) {
      toast(t('raumplan.moment'), 'info')
      return
    }
    const key = zelleKey(x, y)
    const aus = raster.gesperrt.has(key)
    const regal = raster.regalAuf.get(key) ?? null
    const boden = raster.stapel.get(stapelKey(x, y, null)) ?? null

    if (modus === 'umriss' && schreiben && ansicht === '2d') {
      if (!aus && (boden || regal)) {
        toast(t(regal ? 'fehler.db.raumplan.regal_draussen' : 'raumplan.zelle_belegt'), 'info')
        return
      }
      const tuerHier = plan.tuer_x === x && plan.tuer_y === y
      void planSpeichern({
        breite_cm: plan.breite_cm,
        tiefe_cm: plan.tiefe_cm,
        hoehe_cm: plan.hoehe_cm,
        raster_cm: plan.raster_cm,
        gesperrt: aus
          ? plan.gesperrt.filter(([a, b]) => !(a === x && b === y))
          : [...plan.gesperrt, [x, y]],
        ...(tuerHier && !aus ? { tuer_x: null, tuer_y: null, tuer_seite: null } : {}),
      })
      return
    }

    if (modus === 'tuer' && schreiben && ansicht === '2d') {
      if (aus) {
        toast(t('raumplan.zelle_gesperrt'), 'info')
        return
      }
      if (regal) {
        toast(t('fehler.db.raumplan.regal_tuer'), 'info')
        return
      }
      const seite = randSeite(x, y, raster.spalten, raster.reihen, raster.gesperrt)
      if (!seite) {
        toast(t('raumplan.nur_rand'), 'info')
        return
      }
      void planSpeichern({
        breite_cm: plan.breite_cm,
        tiefe_cm: plan.tiefe_cm,
        hoehe_cm: plan.hoehe_cm,
        raster_cm: plan.raster_cm,
        tuer_x: x,
        tuer_y: y,
        tuer_seite: seite,
      })
      return
    }

    if (modus === 'regal' && schreiben && ansicht === '2d') {
      if (regal) {
        setRegalDialog({ regal, x: regal.x, y: regal.y })
        return
      }
      if (aus) {
        toast(t('raumplan.zelle_gesperrt'), 'info')
        return
      }
      if (boden) {
        toast(t('fehler.db.raumplan.regal_auf_kisten'), 'info')
        return
      }
      if (plan.tuer_x === x && plan.tuer_y === y) {
        toast(t('fehler.db.raumplan.regal_tuer'), 'info')
        return
      }
      setRegalDialog({ regal: null, x, y })
      return
    }

    // Kisten setzen, nur im Modus "Kisten setzen".
    if (inHand && schreiben && modus === 'setzen') {
      if (aus) {
        toast(t('raumplan.zelle_gesperrt'), 'info')
        return
      }
      if (regal) {
        setBrettWahl({ x, y, regal })
        return
      }
      const s = stapelAn(raster, plan, x, y, null, null)
      const h = kisteHoehe(inHand, groessen)
      if (!passtDrauf(s, h)) {
        toast(t('raumplan.passt_nicht', { h, frei: Math.max(0, s.grenze - s.oben) }), 'info')
        return
      }
      void setzen(inHand, x, y, s.kisten.length, null)
      return
    }

    // Ohne Kiste in der Hand: anschauen.
    if (regal) {
      setAuswahl({ x, y })
      setMarkiert(null)
      setReihe(y)
      return
    }
    /* Ist die markierte Kiste in dieser Zelle, bleibt sie markiert: wer
     * unten im Stapel eine Kiste gewaehlt hat und doppelt tippt, will
     * diese oeffnen, nicht die oberste. */
    if (boden?.kisten.some((k) => k.item.id === markiert)) {
      setAuswahl(null)
      setReihe(y)
      return
    }
    const oben = boden?.kisten[boden.kisten.length - 1]?.item ?? null
    setAuswahl(null)
    setMarkiert(oben?.id ?? null)
    if (oben) setReihe(y)
  }

  function zelleDoppelt({ x, y }: ZellTipp) {
    if (!raster) return
    const alle = stapelDerZelle(raster, x, y).flatMap((s) => s.kisten)
    // Die markierte Kiste, wenn sie hier steht, sonst die oberste.
    const ziel = alle.find((k) => k.item.id === markiert) ?? alle[alle.length - 1]
    if (ziel) setSchnellId(ziel.item.id)
  }

  function seiteGetippt(z: SeitenTipp) {
    if (z.item) {
      setMarkiert(z.item.id)
      setAuswahl(null)
      return
    }
    zelleGetippt({ x: z.x, y: z.y })
  }

  async function vomPlatz(item: Item) {
    await mitSperre(async () => {
      try {
        await raeumePlatz(item)
        toast(t('raumplan.vom_platz_ok'), 'ok')
      } finally {
        // Auch nach einem Fehler neu laden, sonst bliebe der Plan veraltet.
        await laden()
      }
    }, false)
  }

  /** Den Rest auf freie Plaetze am Boden stellen, Lage fuer Lage: erst
   *  jede freie Zelle einmal, dann obendrauf. Nicht auf die Tuer, nicht
   *  in Regale. Was nicht passt, bleibt liegen und wird gemeldet. */
  async function alleSetzen() {
    if (!plan || !raster || ohnePlatz.length === 0) return
    await mitSperre(async () => {
      const oben = new Map<string, { cm: number; n: number }>()
      const zellen: Array<[number, number]> = []
      for (let y = 0; y < raster.reihen; y++) {
        for (let x = 0; x < raster.spalten; x++) {
          const key = zelleKey(x, y)
          if (raster.gesperrt.has(key) || raster.regalAuf.has(key)) continue
          if (plan.tuer_x === x && plan.tuer_y === y) continue
          const s = raster.stapel.get(stapelKey(x, y, null))
          oben.set(key, { cm: s?.oben ?? 0, n: s?.kisten.length ?? 0 })
          zellen.push([x, y])
        }
      }
      let gesetzt = 0
      for (const kiste of ohnePlatz) {
        const h = kisteHoehe(kiste, groessen)
        // Die niedrigste Zelle, auf die sie noch passt.
        let ziel: [number, number] | null = null
        let tiefste = Infinity
        for (const [x, y] of zellen) {
          const o = oben.get(zelleKey(x, y))!
          if (o.cm + h <= plan.hoehe_cm && o.cm < tiefste) {
            tiefste = o.cm
            ziel = [x, y]
          }
        }
        if (!ziel) continue
        const o = oben.get(zelleKey(ziel[0], ziel[1]))!
        const neu = await setzePlatz(kiste.id, ziel[0], ziel[1], o.n, null)
        ersetze(neu)
        oben.set(zelleKey(ziel[0], ziel[1]), { cm: o.cm + h, n: o.n + 1 })
        gesetzt++
      }
      setHand(null)
      const rest = ohnePlatz.length - gesetzt
      toast(
        rest > 0
          ? t('raumplan.alle_gesetzt_rest', { n: gesetzt, rest })
          : t('raumplan.alle_gesetzt', { n: gesetzt }),
        rest > 0 ? 'info' : 'ok',
      )
    })
  }

  async function regalSpeichern(werte: RegalWerte) {
    if (!regalDialog) return
    const alt = regalDialog.regal
    await mitSperre(async () => {
      if (alt) {
        const belegt = kisten.some((k) => k.regal_id === alt.id)
        await aendereRegal(alt.id, belegt ? { name: werte.name } : werte)
      } else {
        await legeRegalAn(tagId, project.id, werte)
      }
      toast(t('raumplan.regal_gespeichert'), 'ok')
      setRegalDialog(null)
      await laden()
    }, false)
  }

  /* ---------------------------------------------------------- Anzeige */

  if (!zimmer || zimmer.kind !== 'room') {
    return (
      <>
        <AppHeader title={t('raumplan.titel')} back={`/app/p/${project.id}/bereiche`} />
        <Page>
          <ErrorBox error={t('raumplan.kein_zimmer')} />
        </Page>
      </>
    )
  }

  const markierteKiste = markiert ? (kisten.find((k) => k.id === markiert) ?? null) : null
  const fund = markiert && raster ? findeKiste(raster, markiert) : null
  const auswahlRegal = auswahl && raster ? (raster.regalAuf.get(zelleKey(auswahl.x, auswahl.y)) ?? null) : null
  const nurVonOben = ansicht !== '2d'

  return (
    <>
      <AppHeader
        title={zimmer.name}
        subtitle={t('raumplan.titel')}
        back={`/app/p/${project.id}/zimmer/${tagId}`}
      />
      <Page>
        {/* Hinweis: der Plan zieht in den Grundriss um, hier nur lesen. */}
        <p
          role="status"
          className="mb-3 rounded-2xl border-2 border-warn/40 bg-warn/10 px-4 py-3 text-[0.9375rem] font-bold"
        >
          {t('raumplan.zieht_um')}
        </p>
        {fehler ? <ErrorBox error={fehler} onRetry={() => void laden()} /> : null}
        {/* Nur beim ersten Laden. Beim Nachladen bleibt der Plan stehen,
            statt kurz zu verschwinden und wieder aufzutauchen. */}
        {laedt && !geladen ? <Loading /> : null}
        {/* Ohne Groessentabelle rechnet der Plan mit 40 cm je Kiste. Das
            steht da, statt still falsche Hoehen zu zeigen. */}
        {groessenFehler ? (
          <p className="mb-3 rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-sm font-bold text-warn">
            {t('raumplan.hoehen_geschaetzt')}
          </p>
        ) : null}

        {/* Kein Plan: anlegen, oder fuer Betrachter ein klarer Leersatz.
            Nach einem Ladefehler steht nur die Fehlermeldung da, sonst
            legte man einen Plan an, den es schon gibt. */}
        {geladen && !laedt && !fehler && !plan ? (
          schreiben ? (
            <PlanFormular
              werte={null}
              busy={busy}
              rasterFest={false}
              onSpeichern={planSpeichern}
              onAbbrechen={null}
            />
          ) : (
            <Card className="mb-3 p-5">
              <p className="t-name">{t('raumplan.nur_lesen_leer')}</p>
            </Card>
          )
        ) : null}

        {plan && raster ? (
          <>
            {formular && schreiben ? (
              <PlanFormular
                werte={plan}
                busy={busy}
                rasterFest={steht}
                onSpeichern={planSpeichern}
                onAbbrechen={() => setFormular(false)}
              />
            ) : (
              <Card className="mb-3 p-4">
                <p className="t-sub">
                  {t('raumplan.masse_zeile', {
                    breite: meterText(plan.breite_cm, lang),
                    tiefe: meterText(plan.tiefe_cm, lang),
                    hoehe: meterText(plan.hoehe_cm, lang),
                    raster: plan.raster_cm,
                    spalten: raster.spalten,
                    reihen: raster.reihen,
                  })}
                </p>
                {schreiben ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormular(true)}>
                      <Ruler size={16} /> {t('raumplan.masse_aendern')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setLoeschenOffen(true)}>
                      <Trash2 size={16} /> {t('raumplan.plan_loeschen')}
                    </Button>
                  </div>
                ) : null}
              </Card>
            )}

            {/* Ansicht und Zoom */}
            <div className="-mx-3 mb-3 flex flex-nowrap items-center gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
              <Chip active={ansicht === '2d'} onClick={() => setAnsicht('2d')}>
                <Grid3x3 size={16} /> {t('raumplan.ansicht_2d')}
              </Chip>
              <Chip active={ansicht === '3d'} onClick={() => setAnsicht('3d')}>
                <Boxes size={16} /> {t('raumplan.ansicht_3d')}
              </Chip>
              <Chip active={ansicht === 'seite'} onClick={() => setAnsicht('seite')}>
                <PanelTop size={16} /> {t('raumplan.ansicht_seite')}
              </Chip>
              <span className="mx-1 h-6 w-px shrink-0 bg-line" />
              <Chip onClick={() => setZelle((z) => Math.max(ZELLE_MIN, z - ZELLE_SCHRITT))}>
                <Minus size={16} /> {t('raumplan.kleiner')}
              </Chip>
              <Chip onClick={() => setZelle((z) => Math.min(ZELLE_MAX, z + ZELLE_SCHRITT))}>
                <Plus size={16} /> {t('raumplan.groesser')}
              </Chip>
            </div>

            {/* Was ein Tippen gerade tut. Umriss, Tuer und Regale nur von
                oben: schraeg und von der Seite traefe man die Zellen nicht
                sicher. */}
            {schreiben ? (
              <div className="-mx-3 mb-2 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                <Chip active={modus === 'setzen'} onClick={() => setModus('setzen')}>
                  <Hand size={16} /> {t('raumplan.modus_setzen')}
                </Chip>
                {!nurVonOben ? (
                  <>
                    <Chip active={modus === 'umriss'} onClick={() => setModus('umriss')}>
                      <Grid3x3 size={16} /> {t('raumplan.modus_umriss')}
                    </Chip>
                    <Chip active={modus === 'tuer'} onClick={() => setModus('tuer')}>
                      <DoorOpen size={16} /> {t('raumplan.modus_tuer')}
                    </Chip>
                    <Chip active={modus === 'regal'} onClick={() => setModus('regal')}>
                      <Library size={16} /> {t('raumplan.modus_regal')}
                    </Chip>
                  </>
                ) : null}
              </div>
            ) : null}
            {schreiben ? (
              <p className="t-sub mb-3">
                {nurVonOben && modus !== 'setzen'
                  ? t('raumplan.nur_von_oben')
                  : modus === 'setzen'
                    ? t('raumplan.setzen_hinweis')
                    : modus === 'umriss'
                      ? t('raumplan.umriss_hinweis')
                      : modus === 'tuer'
                        ? t('raumplan.tuer_hinweis')
                        : t('raumplan.regal_hinweis')}
              </p>
            ) : null}

            {/* Die Kiste in der Hand, sichtbar, mit dem Weg zurueck. */}
            {inHand && modus === 'setzen' ? (
              <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-paper px-4 py-3 shadow-sm">
                <Hand size={18} />
                <span className="t-name min-w-0 flex-1">
                  {t('raumplan.hand', { code: inHand.code })}
                  <span className="t-sub ms-2">
                    {t('raumplan.stapel_hoehe', { h: kisteHoehe(inHand, groessen) })}
                  </span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => setHand(null)}>
                  <X size={16} /> {t('raumplan.hand_weg')}
                </Button>
                <p className="t-sub w-full">{t('raumplan.hand_hinweis')}</p>
              </div>
            ) : null}

            {/* Die Reihe fuer die Seitenansicht. */}
            {ansicht === 'seite' ? (
              <div className="-mx-3 mb-2 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                {Array.from({ length: raster.reihen }, (_, y) => (
                  <Chip key={y} active={reihe === y} onClick={() => setReihe(y)}>
                    <span className="t-serial">{t('raumplan.seite_reihe', { n: y + 1 })}</span>
                  </Chip>
                ))}
              </div>
            ) : null}

            {/* Der Plan selbst. Er wird nie gespiegelt: eine Karte zeigt,
                wo etwas steht, auch im arabischen Satz. */}
            <div dir="ltr" className="mb-3 overflow-auto rounded-2xl border-2 border-line bg-paper p-3">
              {ansicht === '2d' ? (
                <Plan2D
                  plan={plan}
                  raster={raster}
                  zelle={zelle}
                  farbe={zimmer.color}
                  hervor={markiert}
                  auswahlZelle={auswahl}
                  tuerLabel={t('raumplan.tuer_hier')}
                  hoeheText={(h) => t('raumplan.stapel_hoehe', { h })}
                  abwarten={inHand !== null && modus === 'setzen'}
                  onTipp={zelleGetippt}
                  onDoppel={zelleDoppelt}
                />
              ) : ansicht === '3d' ? (
                <Plan3D
                  plan={plan}
                  raster={raster}
                  zelle={zelle}
                  farbe={zimmer.color}
                  hervor={markiert}
                  tuerLabel={t('raumplan.tuer_hier')}
                  abwarten={inHand !== null && modus === 'setzen'}
                  onTipp={zelleGetippt}
                  onDoppel={zelleDoppelt}
                />
              ) : (
                <PlanSeite
                  plan={plan}
                  raster={raster}
                  reihe={Math.min(reihe, raster.reihen - 1)}
                  zelle={zelle}
                  farbe={zimmer.color}
                  hervor={markiert}
                  tuerLabel={t('raumplan.tuer_hier')}
                  deckeLabel={t('raumplan.decke', { h: plan.hoehe_cm })}
                  abwarten={inHand !== null && modus === 'setzen'}
                  onTipp={seiteGetippt}
                  onDoppel={(z) => (z.item ? setSchnellId(z.item.id) : zelleDoppelt(z))}
                />
              )}
            </div>
            {ansicht === '2d' && zelle < QR_AB ? <p className="t-sub mb-3">{t('raumplan.qr_ab')}</p> : null}
            {ansicht === 'seite' ? <p className="t-sub mb-3">{t('raumplan.seite_hinweis')}</p> : null}

            {/* Die angetippte oder gesuchte Kiste: wo sie steht und in
                welcher Hoehe. */}
            {markierteKiste ? (
              <Card className="mb-3 space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="t-serial text-xl" dir="ltr">
                    {markierteKiste.code}
                  </span>
                  <span className="t-sub flex-1">
                    {fund
                      ? fund.stapel.regal
                        ? t('raumplan.platz_regal', {
                            regal: fund.stapel.regal.name || t('raumplan.regal_ohne_name'),
                            brett: fund.stapel.brett ?? 1,
                            z: fund.kiste.lage,
                            n: fund.stapel.kisten.length,
                          })
                        : t('raumplan.platz_boden', {
                            x: fund.stapel.x + 1,
                            y: fund.stapel.y + 1,
                            z: fund.kiste.lage,
                            n: fund.stapel.kisten.length,
                          })
                      : t('raumplan.kiste_ohne_platz')}
                  </span>
                </div>
                {fund ? (
                  <p className="t-name">
                    {t('raumplan.hoehe_bereich', {
                      von: Math.round(fund.kiste.unten),
                      bis: Math.round(fund.kiste.oben),
                    })}
                  </p>
                ) : null}
                {fund && fund.stapel.kisten.length > 1 ? (
                  <div>
                    <p className="t-sub mb-1.5">{t('raumplan.stapel_titel')}</p>
                    <div className="flex flex-wrap gap-2">
                      {[...fund.stapel.kisten].reverse().map((k) => (
                        <Chip
                          key={k.item.id}
                          active={k.item.id === markiert}
                          color={k.item.mark_color ?? zimmer.color}
                          onClick={() => setMarkiert(k.item.id)}
                        >
                          <span className="t-serial">{k.item.code}</span>
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" size="sm" onClick={() => setSchnellId(markierteKiste.id)}>
                    {t('raumplan.oeffnen')}
                  </Button>
                  {fund && ansicht !== 'seite' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReihe(fund.stapel.y)
                        setAnsicht('seite')
                      }}
                    >
                      <PanelTop size={16} /> {t('raumplan.seitenansicht')}
                    </Button>
                  ) : null}
                  {schreiben && fund ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={busy}
                      onClick={() => void vomPlatz(markierteKiste)}
                    >
                      {t('raumplan.vom_platz')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}

            {/* Ein angetipptes Regal: was auf welchem Brett dieser Zelle
                steht. */}
            {auswahlRegal && auswahl ? (
              <Card className="mb-3 space-y-3 p-4">
                <div>
                  <p className="t-name">{auswahlRegal.name || t('raumplan.regal_ohne_name')}</p>
                  <p className="t-sub">
                    {t('raumplan.regal_zeile', {
                      breite: auswahlRegal.breite,
                      tiefe: auswahlRegal.tiefe,
                      hoehe: auswahlRegal.hoehe_cm,
                      n: auswahlRegal.boeden_cm.length,
                    })}
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {auswahlRegal.boeden_cm
                    .map((h, i) => ({ h, n: i + 1 }))
                    .reverse()
                    .map(({ h, n }) => {
                      const s = stapelAn(raster, plan, auswahl.x, auswahl.y, auswahlRegal, n)
                      return (
                        <li key={n} className="flex flex-wrap items-center gap-2 py-2">
                          <span className="t-name">{t('raumplan.brett_n', { n })}</span>
                          <span className="t-sub">{t('raumplan.brett_hoehe', { h })}</span>
                          <span className="flex w-full flex-wrap gap-2">
                            {s.kisten.length === 0 ? (
                              <span className="t-sub">{t('raumplan.brett_leer')}</span>
                            ) : (
                              s.kisten.map((k) => (
                                <Chip
                                  key={k.item.id}
                                  color={k.item.mark_color ?? zimmer.color}
                                  onClick={() => {
                                    setMarkiert(k.item.id)
                                    setAuswahl(null)
                                  }}
                                >
                                  <span className="t-serial">{k.item.code}</span>
                                </Chip>
                              ))
                            )}
                          </span>
                        </li>
                      )
                    })}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {schreiben ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRegalDialog({ regal: auswahlRegal, x: auswahlRegal.x, y: auswahlRegal.y })
                      }
                    >
                      {t('raumplan.regal_bearbeiten')}
                    </Button>
                  ) : null}
                  {ansicht !== 'seite' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReihe(auswahl.y)
                        setAnsicht('seite')
                      }}
                    >
                      <PanelTop size={16} /> {t('raumplan.seitenansicht')}
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}

            {/* Kisten, die noch keinen Platz haben. Betrachter koennen
                nichts in die Hand nehmen, sie sehen nur die Nummern. */}
            <SectionTitle>
              {ohnePlatz.length > 0
                ? tn('raumplan.ohne_platz', ohnePlatz.length)
                : kisten.length > 0
                  ? t('raumplan.alle_im_plan')
                  : t('raumplan.keine_kisten')}
            </SectionTitle>
            {ohnePlatz.length > 0 ? (
              <Card className="mb-6 p-4">
                <div className="flex flex-wrap gap-2">
                  {ohnePlatz.map((k) =>
                    schreiben ? (
                      <Chip
                        key={k.id}
                        active={hand === k.id || markiert === k.id}
                        color={k.mark_color ?? zimmer.color}
                        onClick={() => {
                          setModus('setzen')
                          setHand(hand === k.id ? null : k.id)
                        }}
                      >
                        <span className="t-serial">{k.code}</span>
                      </Chip>
                    ) : (
                      <span
                        key={k.id}
                        className={cx(
                          't-serial inline-flex h-10 items-center rounded-full border-2 px-4',
                          markiert === k.id ? 'border-ink bg-ink text-paper' : 'border-line',
                        )}
                      >
                        {k.code}
                      </span>
                    ),
                  )}
                </div>
                {schreiben ? (
                  <Button
                    variant="soft"
                    size="lg"
                    full
                    className="mt-4 sm:w-auto"
                    loading={busy}
                    onClick={() => void alleSetzen()}
                  >
                    <Boxes size={20} /> {t('raumplan.alle_setzen')}
                  </Button>
                ) : null}
              </Card>
            ) : null}
          </>
        ) : null}

        <div className="h-6" />
      </Page>

      <Schnellansicht
        itemId={schnellId}
        offen={Boolean(schnellId)}
        onClose={() => setSchnellId(null)}
        onGeaendert={(neu) => ersetze(neu)}
      />

      <BrettWahl
        offen={brettWahl !== null && inHand !== null}
        regal={brettWahl?.regal ?? null}
        code={inHand?.code ?? ''}
        hoehe={inHand ? kisteHoehe(inHand, groessen) : 0}
        stapelAuf={(n) =>
          raster && plan && brettWahl
            ? stapelAn(raster, plan, brettWahl.x, brettWahl.y, brettWahl.regal, n)
            : {
                key: '',
                x: 0,
                y: 0,
                regal: null,
                brett: n,
                grund: 0,
                grenze: 0,
                kisten: [],
                oben: 0,
              }
        }
        onWahl={(n) => {
          const w = brettWahl
          setBrettWahl(null)
          if (!w || !inHand || !raster || !plan) return
          const s = stapelAn(raster, plan, w.x, w.y, w.regal, n)
          void setzen(inHand, w.x, w.y, s.kisten.length, { id: w.regal.id, boden: n })
        }}
        onClose={() => setBrettWahl(null)}
      />

      <RegalDialog
        offen={regalDialog !== null}
        regal={regalDialog?.regal ?? null}
        x={regalDialog?.x ?? 0}
        y={regalDialog?.y ?? 0}
        zimmerHoehe={plan?.hoehe_cm ?? 250}
        belegt={regalDialog?.regal ? kisten.some((k) => k.regal_id === regalDialog.regal?.id) : false}
        busy={busy}
        onSpeichern={regalSpeichern}
        onLoeschen={
          regalDialog?.regal
            ? () => {
                setRegalWeg(regalDialog.regal)
                setRegalDialog(null)
              }
            : null
        }
        onClose={() => setRegalDialog(null)}
      />

      <ConfirmDialog
        open={regalWeg !== null}
        title={t('raumplan.regal_loeschen')}
        body={t('raumplan.regal_loeschen_text')}
        confirmLabel={t('raumplan.regal_loeschen')}
        onClose={() => setRegalWeg(null)}
        onConfirm={async () => {
          const r = regalWeg
          setRegalWeg(null)
          if (!r) return
          await mitSperre(async () => {
            await loescheRegal(r.id)
            toast(t('raumplan.regal_geloescht'), 'ok')
            setAuswahl(null)
            await laden()
          }, false)
        }}
      />

      <ConfirmDialog
        open={loeschenOffen}
        title={t('raumplan.plan_loeschen_titel')}
        body={t('raumplan.plan_loeschen_text')}
        confirmLabel={t('aktion.loeschen')}
        onClose={() => setLoeschenOffen(false)}
        onConfirm={async () => {
          setLoeschenOffen(false)
          await mitSperre(async () => {
            await loescheRaumplan(tagId)
            toast(t('raumplan.plan_geloescht'), 'ok')
            setMarkiert(null)
            setAuswahl(null)
            setHand(null)
            if (hervor) {
              params.delete('kiste')
              setParams(params, { replace: true })
            }
            await laden()
          }, false)
        }}
      />
    </>
  )
}
