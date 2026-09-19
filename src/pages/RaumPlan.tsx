import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Boxes, DoorOpen, Grid3x3, Hand, Minus, Plus, Ruler, Trash2 } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  ErrorBox,
  Field,
  Input,
  Loading,
  QrCode,
  SectionTitle,
  useToast,
} from '../components/ui'
import { Schnellansicht } from '../components/Schnellansicht'
import { useProject } from './ProjectLayout'
import {
  ladeRaumplan,
  ladeZimmerKisten,
  loescheRaumplan,
  raeumePlatz,
  setzePlatz,
  speichereRaumplan,
} from '../lib/api'
import { useSprache } from '../lib/i18n'
import type { Item, Raumplan, TuerSeite } from '../lib/types'
import { appUrl, contrastOn } from '../lib/util'

/* Der Raumplan eines Zimmers.
 *
 * Das Zimmer ist ein Raster. Eine Zelle ist raster_cm breit und tief,
 * eine Kiste belegt genau eine Zelle, und Kisten stapeln sich
 * uebereinander wie Bauklotze. Das ist absichtlich grob: auf dem Telefon
 * trifft niemand einen Zentimeter, und beim Ausladen zaehlt nicht der
 * Zentimeter, sondern die Ecke.
 *
 * Was hier geprueft wird, prueft die Datenbank noch einmal (Migration
 * 0017). Die Oberflaeche prueft, damit man den Grund vorher liest; die
 * Datenbank prueft, weil zwei Leute gleichzeitig legen koennen.
 */

/** Eine Lage rechnet mit 40 cm Kistenhoehe. Dieselbe Zahl steht in
 *  Migration 0017 in items_plan_pruefen. Aendert sich eine, muss die
 *  andere im selben Arbeitsgang mit. */
const LAGE_CM = 40

/** Wie gross eine Zelle auf dem Bildschirm ist, in Bildpunkten. */
const ZELLE_MIN = 44
const ZELLE_MAX = 200
const ZELLE_SCHRITT = 28

/** Ab dieser Zellgroesse passt ein QR-Code hinein, den ein Telefon auch
 *  wirklich liest. Darunter steht nur die Nummer: ein QR-Code mit 30
 *  Bildpunkten sieht aus wie einer, laesst sich aber nicht scannen. */
const QR_AB = 128

/** Seitenlaenge einer Zelle in Zeichenkoordinaten der Ansicht von oben. */
const S = 100

/** So viel von der Zelle nimmt der QR-Code ein. */
const QR_SEITE = 58

/* Schraege Ansicht: Breite, Hoehe und Lagenhoehe einer Zelle. */
const ISO_B = 80
const ISO_T = 40
const ISO_H = 48

type Modus = 'setzen' | 'umriss' | 'tuer'

interface Raster {
  spalten: number
  reihen: number
  ebenen: number
  gesperrt: Set<string>
  /** Schluessel "x,y", Kisten von unten nach oben. */
  stapel: Map<string, Item[]>
}

function schluessel(x: number, y: number): string {
  return `${x},${y}`
}

/** Mischt eine Farbe zu Schwarz hin, damit die drei Seiten eines Klotzes
 *  verschieden hell sind. Kommt eine Farbe in einer Form daher, die sich
 *  nicht lesen laesst, bleibt sie, wie sie ist. */
function dunkler(hex: string, anteil: number): string {
  const roh = hex.replace('#', '')
  const voll =
    roh.length === 3
      ? roh
          .split('')
          .map((z) => z + z)
          .join('')
      : roh
  if (voll.length !== 6) return hex
  const zahl = Number.parseInt(voll, 16)
  if (Number.isNaN(zahl)) return hex
  const r = Math.round(((zahl >> 16) & 255) * (1 - anteil))
  const g = Math.round(((zahl >> 8) & 255) * (1 - anteil))
  const b = Math.round((zahl & 255) * (1 - anteil))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** An welcher Wand liegt diese Zelle. null heisst: mitten im Zimmer. */
function randSeite(x: number, y: number, spalten: number, reihen: number): TuerSeite | null {
  const abstaende: Array<[TuerSeite, number]> = [
    ['west', x],
    ['ost', spalten - 1 - x],
    ['nord', y],
    ['sued', reihen - 1 - y],
  ]
  abstaende.sort((a, b) => a[1] - b[1])
  return abstaende[0][1] === 0 ? abstaende[0][0] : null
}

export default function RaumPlan() {
  const { project, tagById, canEdit } = useProject()
  const { tagId = '' } = useParams()
  const { t, tn } = useSprache()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const zimmer = tagById(tagId)

  const [plan, setPlan] = useState<Raumplan | null>(null)
  const [kisten, setKisten] = useState<Item[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  const [ansicht, setAnsicht] = useState<'2d' | '3d'>('2d')
  const [modus, setModus] = useState<Modus>('setzen')
  const [zelle, setZelle] = useState(72)
  /** Die Kiste, die als naechstes gesetzt wird. */
  const [hand, setHand] = useState<string | null>(null)
  /** Die angetippte Kiste im Plan. */
  const [markiert, setMarkiert] = useState<string | null>(null)
  const [schnellId, setSchnellId] = useState<string | null>(null)
  const [formular, setFormular] = useState(false)
  const [loeschenOffen, setLoeschenOffen] = useState(false)
  const [busy, setBusy] = useState(false)

  /* Kommt man von einer Kiste her, soll man sofort sehen, welche gemeint
   * ist. Das ist der Rueckweg zu "zeig mir, wo sie steht". */
  const hervor = params.get('kiste')

  const laden = useCallback(async () => {
    setLaedt(true)
    setFehler(null)
    try {
      const [p, k] = await Promise.all([
        ladeRaumplan(tagId),
        ladeZimmerKisten(project.id, tagId),
      ])
      setPlan(p)
      setKisten(k)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setLaedt(false)
    }
  }, [project.id, tagId])

  useEffect(() => {
    void laden()
  }, [laden])

  const raster = useMemo<Raster | null>(() => {
    if (!plan) return null
    const spalten = Math.ceil(plan.breite_cm / plan.raster_cm)
    const reihen = Math.ceil(plan.tiefe_cm / plan.raster_cm)
    const ebenen = Math.max(1, Math.floor(plan.hoehe_cm / LAGE_CM))
    const gesperrt = new Set(plan.gesperrt.map(([x, y]) => schluessel(x, y)))
    const stapel = new Map<string, Item[]>()
    for (const k of kisten) {
      if (k.plan_x === null || k.plan_y === null || k.plan_z === null) continue
      const key = schluessel(k.plan_x, k.plan_y)
      const liste = stapel.get(key) ?? []
      liste.push(k)
      stapel.set(key, liste)
    }
    for (const liste of stapel.values()) liste.sort((a, b) => (a.plan_z ?? 0) - (b.plan_z ?? 0))
    return { spalten, reihen, ebenen, gesperrt, stapel }
  }, [plan, kisten])

  const ohnePlatz = useMemo(() => kisten.filter((k) => k.plan_x === null), [kisten])

  /* Die Kiste, die gerade in der Hand ist, kann inzwischen gesetzt sein.
   * Dann ist die Hand leer, nicht falsch gefuellt. */
  const inHand = hand ? (ohnePlatz.find((k) => k.id === hand) ?? null) : null

  function ersetze(neu: Item) {
    setKisten((prev) => prev.map((k) => (k.id === neu.id ? neu : k)))
  }

  /* ------------------------------------------------------- Plan aendern */

  async function planSpeichern(werte: {
    breite_cm: number
    tiefe_cm: number
    hoehe_cm: number
    raster_cm: number
    gesperrt?: [number, number][]
    tuer_x?: number | null
    tuer_y?: number | null
    tuer_seite?: TuerSeite | null
  }) {
    const spalten = Math.ceil(werte.breite_cm / werte.raster_cm)
    const reihen = Math.ceil(werte.tiefe_cm / werte.raster_cm)
    const ebenen = Math.max(1, Math.floor(werte.hoehe_cm / LAGE_CM))
    /* Wird das Zimmer kleiner, stuenden Kisten ausserhalb. Die Datenbank
     * merkt das nicht, weil sie den Platz nur beim Schreiben der Kiste
     * prueft. Also hier, und mit Namen statt mit einer Zahl. */
    const draussen = kisten.filter(
      (k) =>
        k.plan_x !== null &&
        (k.plan_x >= spalten || (k.plan_y ?? 0) >= reihen || (k.plan_z ?? 0) >= ebenen),
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
    setBusy(true)
    try {
      const neu = await speichereRaumplan({
        tag_id: tagId,
        project_id: project.id,
        breite_cm: werte.breite_cm,
        tiefe_cm: werte.tiefe_cm,
        hoehe_cm: werte.hoehe_cm,
        raster_cm: werte.raster_cm,
        gesperrt: werte.gesperrt ?? plan?.gesperrt ?? [],
        tuer_x: werte.tuer_x !== undefined ? werte.tuer_x : (plan?.tuer_x ?? null),
        tuer_y: werte.tuer_y !== undefined ? werte.tuer_y : (plan?.tuer_y ?? null),
        tuer_seite: werte.tuer_seite !== undefined ? werte.tuer_seite : (plan?.tuer_seite ?? null),
      })
      setPlan(neu)
      setFormular(false)
      toast(t('raumplan.gespeichert'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------ Zelle antippen */

  async function zelleGetippt(x: number, y: number) {
    if (!plan || !raster) return
    const key = schluessel(x, y)
    const liste = raster.stapel.get(key) ?? []

    if (modus === 'umriss' && canEdit) {
      const drin = raster.gesperrt.has(key)
      if (!drin && liste.length > 0) {
        toast(t('raumplan.zelle_belegt'), 'info')
        return
      }
      if (
        !drin &&
        plan.tuer_x === x &&
        plan.tuer_y === y
      ) {
        await planSpeichern({
          breite_cm: plan.breite_cm,
          tiefe_cm: plan.tiefe_cm,
          hoehe_cm: plan.hoehe_cm,
          raster_cm: plan.raster_cm,
          gesperrt: [...plan.gesperrt, [x, y]],
          tuer_x: null,
          tuer_y: null,
          tuer_seite: null,
        })
        return
      }
      await planSpeichern({
        breite_cm: plan.breite_cm,
        tiefe_cm: plan.tiefe_cm,
        hoehe_cm: plan.hoehe_cm,
        raster_cm: plan.raster_cm,
        gesperrt: drin
          ? plan.gesperrt.filter(([a, b]) => !(a === x && b === y))
          : [...plan.gesperrt, [x, y]],
      })
      return
    }

    if (modus === 'tuer' && canEdit) {
      if (raster.gesperrt.has(key)) {
        toast(t('raumplan.zelle_gesperrt'), 'info')
        return
      }
      const seite = randSeite(x, y, raster.spalten, raster.reihen)
      if (!seite) {
        toast(t('raumplan.nur_rand'), 'info')
        return
      }
      await planSpeichern({
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

    // Kisten setzen
    if (inHand && canEdit) {
      if (raster.gesperrt.has(key)) {
        toast(t('raumplan.zelle_gesperrt'), 'info')
        return
      }
      if (liste.length >= raster.ebenen) {
        toast(t('raumplan.zu_hoch'), 'info')
        return
      }
      try {
        const neu = await setzePlatz(inHand.id, x, y, liste.length)
        ersetze(neu)
        // Gleich die naechste in die Hand, sonst tippt man sich tot.
        const rest = ohnePlatz.filter((k) => k.id !== neu.id)
        setHand(rest[0]?.id ?? null)
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
      }
      return
    }

    const oben = liste[liste.length - 1]
    setMarkiert(oben ? oben.id : null)
  }

  function zelleDoppelt(x: number, y: number) {
    if (!raster) return
    const liste = raster.stapel.get(schluessel(x, y)) ?? []
    const oben = liste[liste.length - 1]
    if (oben) setSchnellId(oben.id)
  }

  async function vomPlatz(item: Item) {
    setBusy(true)
    try {
      await raeumePlatz(item)
      setMarkiert(null)
      await laden()
      toast(t('raumplan.vom_platz_ok'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  /** Den Rest der Reihe nach auf die freien Plaetze stellen. Von unten
   *  nach oben, Zelle fuer Zelle. Was nicht mehr hineinpasst, bleibt
   *  liegen und wird gemeldet, statt still zu verschwinden. */
  async function alleSetzen() {
    if (!raster || ohnePlatz.length === 0) return
    setBusy(true)
    let gesetzt = 0
    const hoehen = new Map<string, number>()
    for (const [key, liste] of raster.stapel) hoehen.set(key, liste.length)
    try {
      const warteschlange = [...ohnePlatz]
      for (let z = 0; z < raster.ebenen && warteschlange.length > 0; z++) {
        for (let y = 0; y < raster.reihen && warteschlange.length > 0; y++) {
          for (let x = 0; x < raster.spalten && warteschlange.length > 0; x++) {
            const key = schluessel(x, y)
            if (raster.gesperrt.has(key)) continue
            if ((hoehen.get(key) ?? 0) !== z) continue
            const kiste = warteschlange.shift()
            if (!kiste) break
            const neu = await setzePlatz(kiste.id, x, y, z)
            ersetze(neu)
            hoehen.set(key, z + 1)
            gesetzt++
          }
        }
      }
      const rest = ohnePlatz.length - gesetzt
      toast(
        rest > 0
          ? t('raumplan.alle_gesetzt_rest', { n: gesetzt, rest })
          : t('raumplan.alle_gesetzt', { n: gesetzt }),
        rest > 0 ? 'info' : 'ok',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
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

  return (
    <>
      <AppHeader
        title={zimmer.name}
        subtitle={t('raumplan.titel')}
        back={`/app/p/${project.id}/zimmer/${tagId}`}
      />
      <Page>
        {fehler ? <ErrorBox error={fehler} onRetry={() => void laden()} /> : null}
        {laedt ? <Loading /> : null}

        {!laedt && !plan ? (
          <PlanFormular
            werte={null}
            busy={busy}
            canEdit={canEdit}
            onSpeichern={planSpeichern}
            onAbbrechen={null}
          />
        ) : null}

        {!laedt && plan && raster ? (
          <>
            {formular ? (
              <PlanFormular
                werte={plan}
                busy={busy}
                canEdit={canEdit}
                onSpeichern={planSpeichern}
                onAbbrechen={() => setFormular(false)}
              />
            ) : (
              <Card className="mb-3 p-4">
                <p className="t-sub">
                  {t('raumplan.masse_zeile', {
                    breite: (plan.breite_cm / 100).toFixed(2).replace(/0$/, ''),
                    tiefe: (plan.tiefe_cm / 100).toFixed(2).replace(/0$/, ''),
                    hoehe: (plan.hoehe_cm / 100).toFixed(2).replace(/0$/, ''),
                    raster: plan.raster_cm,
                    spalten: raster.spalten,
                    reihen: raster.reihen,
                    ebenen: raster.ebenen,
                  })}
                </p>
                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormular(true)}>
                      <Ruler size={16} /> {t('raumplan.masse_aendern')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setLoeschenOffen(true)}>
                      <Trash2 size={16} /> {t('raumplan.plan_loeschen')}
                    </Button>
                  </div>
                ) : (
                  <p className="t-sub mt-2">{t('raumplan.nur_lesen')}</p>
                )}
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
              <span className="mx-1 h-6 w-px shrink-0 bg-line" />
              <Chip onClick={() => setZelle((z) => Math.max(ZELLE_MIN, z - ZELLE_SCHRITT))}>
                <Minus size={16} /> {t('raumplan.kleiner')}
              </Chip>
              <Chip onClick={() => setZelle((z) => Math.min(ZELLE_MAX, z + ZELLE_SCHRITT))}>
                <Plus size={16} /> {t('raumplan.groesser')}
              </Chip>
            </div>

            {/* Was ein Tippen gerade tut */}
            {canEdit ? (
              <div className="-mx-3 mb-2 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
                <Chip active={modus === 'setzen'} onClick={() => setModus('setzen')}>
                  <Hand size={16} /> {t('raumplan.modus_setzen')}
                </Chip>
                <Chip active={modus === 'umriss'} onClick={() => setModus('umriss')}>
                  <Grid3x3 size={16} /> {t('raumplan.modus_umriss')}
                </Chip>
                <Chip active={modus === 'tuer'} onClick={() => setModus('tuer')}>
                  <DoorOpen size={16} /> {t('raumplan.modus_tuer')}
                </Chip>
              </div>
            ) : null}
            {canEdit ? (
              <p className="t-sub mb-3">
                {modus === 'setzen'
                  ? t('raumplan.setzen_hinweis')
                  : modus === 'umriss'
                    ? t('raumplan.umriss_hinweis')
                    : t('raumplan.tuer_hinweis')}
              </p>
            ) : null}

            {/* Der Plan selbst. Er wird nie gespiegelt: eine Karte zeigt,
                wo etwas steht, auch im arabischen Satz. */}
            <div
              dir="ltr"
              className="mb-3 overflow-auto rounded-2xl border-2 border-line bg-paper p-3"
            >
              {ansicht === '2d' ? (
                <Plan2D
                  plan={plan}
                  raster={raster}
                  zelle={zelle}
                  farbe={zimmer.color}
                  hervor={hervor}
                  markiert={markiert}
                  tuerLabel={t('raumplan.tuer_hier')}
                  onZelle={(x, y) => void zelleGetippt(x, y)}
                  onDoppel={zelleDoppelt}
                  doppelAn={!inHand}
                />
              ) : (
                <Plan3D
                  plan={plan}
                  raster={raster}
                  zelle={zelle}
                  farbe={zimmer.color}
                  hervor={hervor}
                  markiert={markiert}
                  tuerLabel={t('raumplan.tuer_hier')}
                  onZelle={(x, y) => void zelleGetippt(x, y)}
                  onDoppel={zelleDoppelt}
                  doppelAn={!inHand}
                />
              )}
            </div>
            {ansicht === '2d' && zelle < QR_AB ? (
              <p className="t-sub mb-3">{t('raumplan.qr_ab')}</p>
            ) : null}

            {/* Die angetippte Kiste */}
            {markierteKiste ? (
              <Card className="mb-3 flex flex-wrap items-center gap-3 p-4">
                <span className="t-serial text-xl">{markierteKiste.code}</span>
                {markierteKiste.plan_x !== null ? (
                  <span className="t-sub">
                    {t('raumplan.platz_von', {
                      x: markierteKiste.plan_x + 1,
                      y: (markierteKiste.plan_y ?? 0) + 1,
                      z: (markierteKiste.plan_z ?? 0) + 1,
                    })}
                  </span>
                ) : null}
                <span className="flex-1" />
                <Button variant="soft" size="sm" onClick={() => setSchnellId(markierteKiste.id)}>
                  {t('raumplan.oeffnen')}
                </Button>
                {canEdit && markierteKiste.plan_x !== null ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busy}
                    onClick={() => void vomPlatz(markierteKiste)}
                  >
                    {t('raumplan.vom_platz')}
                  </Button>
                ) : null}
              </Card>
            ) : null}

            {/* Kisten, die noch keinen Platz haben */}
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
                  {ohnePlatz.map((k) => (
                    <Chip
                      key={k.id}
                      active={hand === k.id}
                      color={k.mark_color ?? zimmer.color}
                      onClick={() => setHand(hand === k.id ? null : k.id)}
                    >
                      <span className="t-serial">{k.code}</span>
                    </Chip>
                  ))}
                </div>
                {canEdit ? (
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

      <ConfirmDialog
        open={loeschenOffen}
        title={t('raumplan.plan_loeschen_titel')}
        body={t('raumplan.plan_loeschen_text')}
        confirmLabel={t('aktion.loeschen')}
        onClose={() => setLoeschenOffen(false)}
        onConfirm={async () => {
          try {
            await loescheRaumplan(tagId)
            toast(t('raumplan.plan_geloescht'), 'ok')
            setLoeschenOffen(false)
            if (hervor) {
              params.delete('kiste')
              setParams(params, { replace: true })
            }
            await laden()
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}

/* ===================================================== Maße eingeben */

function PlanFormular({
  werte,
  busy,
  canEdit,
  onSpeichern,
  onAbbrechen,
}: {
  werte: Raumplan | null
  busy: boolean
  canEdit: boolean
  onSpeichern: (v: {
    breite_cm: number
    tiefe_cm: number
    hoehe_cm: number
    raster_cm: number
  }) => Promise<void>
  onAbbrechen: (() => void) | null
}) {
  const { t } = useSprache()
  const [breite, setBreite] = useState(String((werte?.breite_cm ?? 400) / 100))
  const [tiefe, setTiefe] = useState(String((werte?.tiefe_cm ?? 400) / 100))
  const [hoehe, setHoehe] = useState(String((werte?.hoehe_cm ?? 250) / 100))
  const [raster, setRaster] = useState(String(werte?.raster_cm ?? 50))

  function meterInCm(v: string, ersatz: number): number {
    const zahl = Number.parseFloat(v.replace(',', '.'))
    if (!Number.isFinite(zahl)) return ersatz
    return Math.round(zahl * 100)
  }

  if (!canEdit) {
    return (
      <Card className="mb-3 p-5">
        <p className="t-sub">{t('raumplan.nur_lesen')}</p>
      </Card>
    )
  }

  return (
    <Card className="mb-4 space-y-4 p-5">
      <div>
        <p className="t-name">{t('raumplan.einrichten_titel')}</p>
        <p className="t-sub mt-1.5">{t('raumplan.einrichten_text')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('raumplan.breite')}>
          <Input
            inputMode="decimal"
            value={breite}
            onChange={(e) => setBreite(e.target.value)}
            className="t-serial"
          />
        </Field>
        <Field label={t('raumplan.tiefe')}>
          <Input
            inputMode="decimal"
            value={tiefe}
            onChange={(e) => setTiefe(e.target.value)}
            className="t-serial"
          />
        </Field>
        <Field label={t('raumplan.hoehe')}>
          <Input
            inputMode="decimal"
            value={hoehe}
            onChange={(e) => setHoehe(e.target.value)}
            className="t-serial"
          />
        </Field>
      </div>
      <Field label={t('raumplan.raster')} hint={t('raumplan.raster_hinweis')}>
        <Input
          inputMode="numeric"
          value={raster}
          onChange={(e) => setRaster(e.target.value)}
          className="t-serial"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          loading={busy}
          onClick={() =>
            void onSpeichern({
              breite_cm: meterInCm(breite, 400),
              tiefe_cm: meterInCm(tiefe, 400),
              hoehe_cm: meterInCm(hoehe, 250),
              raster_cm: Math.round(Number.parseFloat(raster.replace(',', '.'))) || 50,
            })
          }
        >
          {werte ? t('aktion.speichern') : t('raumplan.anlegen')}
        </Button>
        {onAbbrechen ? (
          <Button variant="ghost" size="lg" onClick={onAbbrechen}>
            {t('aktion.abbrechen')}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

/* ================================================== Doppeltippen merken */

/** Zwei Tipper auf dieselbe Zelle innerhalb dieser Zeit sind ein
 *  Doppeltipp. Auf dem Telefon gibt es kein dblclick, auf das man sich
 *  verlassen koennte. */
const DOPPEL_MS = 400

function useDoppeltipp(
  onZelle: (x: number, y: number) => void,
  onDoppel: (x: number, y: number) => void,
  doppelAn: boolean,
) {
  const letzter = useRef<{ key: string; zeit: number } | null>(null)
  return (x: number, y: number) => {
    const key = schluessel(x, y)
    const jetzt = Date.now()
    if (doppelAn && letzter.current?.key === key && jetzt - letzter.current.zeit < DOPPEL_MS) {
      letzter.current = null
      onDoppel(x, y)
      return
    }
    letzter.current = { key, zeit: jetzt }
    onZelle(x, y)
  }
}

interface AnsichtProps {
  plan: Raumplan
  raster: Raster
  zelle: number
  farbe: string
  hervor: string | null
  markiert: string | null
  tuerLabel: string
  onZelle: (x: number, y: number) => void
  onDoppel: (x: number, y: number) => void
  doppelAn: boolean
}

/* ======================================================= Von oben (2D) */

function Plan2D({
  plan,
  raster,
  zelle,
  farbe,
  hervor,
  markiert,
  tuerLabel,
  onZelle,
  onDoppel,
  doppelAn,
}: AnsichtProps) {
  const tippen = useDoppeltipp(onZelle, onDoppel, doppelAn)
  const { spalten, reihen, gesperrt, stapel } = raster
  const zeigeQr = zelle >= QR_AB

  const zellen: ReactElement[] = []
  for (let y = 0; y < reihen; y++) {
    for (let x = 0; x < spalten; x++) {
      const key = schluessel(x, y)
      const liste = stapel.get(key) ?? []
      const oben = liste[liste.length - 1]
      const aus = gesperrt.has(key)
      const grund = aus ? 'var(--paper)' : oben ? (oben.mark_color ?? farbe) : 'var(--surface)'
      const schrift = oben && !aus ? contrastOn(grund) : 'var(--muted)'
      const leuchtet = oben && (oben.id === hervor || oben.id === markiert)
      zellen.push(
        <g key={key} onClick={() => tippen(x, y)} style={{ cursor: 'pointer' }}>
          <rect
            x={x * S}
            y={y * S}
            width={S}
            height={S}
            fill={grund}
            stroke="var(--line)"
            strokeWidth={2}
          />
          {leuchtet ? (
            <rect
              x={x * S + 4}
              y={y * S + 4}
              width={S - 8}
              height={S - 8}
              fill="none"
              stroke="var(--danger)"
              strokeWidth={6}
            />
          ) : null}
          {aus ? (
            <path
              d={`M${x * S} ${y * S + S}L${x * S + S} ${y * S}`}
              stroke="var(--line)"
              strokeWidth={3}
            />
          ) : null}
          {oben ? (
            <>
              <text
                x={x * S + S / 2}
                y={zeigeQr ? y * S + 19 : y * S + S / 2 + 5}
                textAnchor="middle"
                fontSize={14}
                fontWeight={800}
                fontFamily="ui-monospace, monospace"
                fill={schrift}
              >
                {oben.code}
              </text>
              {/* Der QR-Code steckt als eigenes Bild in der Zelle. Er
                  zeigt auf dieselbe Adresse wie das Etikett, damit ein
                  Scan hier und ein Scan am Karton dasselbe tun. */}
              {zeigeQr ? (
                <g transform={`translate(${x * S + (S - QR_SEITE) / 2} ${y * S + 28})`}>
                  <QrCode value={appUrl(`s/${oben.id}`)} size={QR_SEITE} />
                </g>
              ) : null}
              {/* Wie viele Kisten hier uebereinander stehen. Unten
                  links, weil oben die Nummer steht. */}
              {liste.length > 1 ? (
                <>
                  <circle cx={x * S + 17} cy={y * S + S - 17} r={13} fill="var(--ink)" />
                  <text
                    x={x * S + 17}
                    y={y * S + S - 12}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={900}
                    fill="var(--paper)"
                  >
                    {liste.length}
                  </text>
                </>
              ) : null}
            </>
          ) : null}
        </g>,
      )
    }
  }

  return (
    <svg
      viewBox={`0 0 ${spalten * S} ${reihen * S}`}
      width={spalten * zelle}
      height={reihen * zelle}
      role="img"
      style={{ display: 'block' }}
    >
      {zellen}
      {plan.tuer_x !== null && plan.tuer_y !== null && plan.tuer_seite ? (
        <TuerMarke
          x={plan.tuer_x}
          y={plan.tuer_y}
          seite={plan.tuer_seite}
          label={tuerLabel}
          frei={!stapel.has(schluessel(plan.tuer_x, plan.tuer_y))}
        />
      ) : null}
    </svg>
  )
}

/** Die Tuer als dicker Strich an der Wand der Zelle. Steht auf der
 *  Zelle eine Kiste, faellt die Beschriftung weg: der Strich allein ist
 *  eindeutig, zwei Schriften uebereinander sind es nicht. */
function TuerMarke({
  x,
  y,
  seite,
  label,
  frei,
}: {
  x: number
  y: number
  seite: TuerSeite
  label: string
  frei: boolean
}) {
  const px = x * S
  const py = y * S
  const linien: Record<TuerSeite, [number, number, number, number]> = {
    nord: [px + 8, py + 4, px + S - 8, py + 4],
    sued: [px + 8, py + S - 4, px + S - 8, py + S - 4],
    west: [px + 4, py + 8, px + 4, py + S - 8],
    ost: [px + S - 4, py + 8, px + S - 4, py + S - 8],
  }
  const [x1, y1, x2, y2] = linien[seite]
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--danger)" strokeWidth={10} />
      {frei ? (
        <text
          x={px + S / 2}
          y={py + S / 2 + 5}
          textAnchor="middle"
          fontSize={15}
          fontWeight={800}
          fill="var(--danger)"
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}

/* ========================================================= Schräg (3D) */

function Plan3D({
  plan,
  raster,
  zelle,
  farbe,
  hervor,
  markiert,
  tuerLabel,
  onZelle,
  onDoppel,
  doppelAn,
}: AnsichtProps) {
  const tippen = useDoppeltipp(onZelle, onDoppel, doppelAn)
  const { spalten, reihen, gesperrt, stapel } = raster

  function lage(x: number, y: number, z: number): { px: number; py: number } {
    return {
      px: (x - y) * (ISO_B / 2),
      py: (x + y) * (ISO_T / 2) - z * ISO_H,
    }
  }

  function raute(px: number, py: number): string {
    return [
      `${px},${py}`,
      `${px + ISO_B / 2},${py + ISO_T / 2}`,
      `${px},${py + ISO_T}`,
      `${px - ISO_B / 2},${py + ISO_T / 2}`,
    ].join(' ')
  }

  const boden: ReactElement[] = []
  const kloetze: ReactElement[] = []
  const reihenfolge: Array<[number, number]> = []
  for (let y = 0; y < reihen; y++) for (let x = 0; x < spalten; x++) reihenfolge.push([x, y])
  reihenfolge.sort((a, b) => a[0] + a[1] - (b[0] + b[1]))

  let maxZ = 0
  for (const liste of stapel.values()) maxZ = Math.max(maxZ, liste.length)

  for (const [x, y] of reihenfolge) {
    const key = schluessel(x, y)
    if (gesperrt.has(key)) continue
    const { px, py } = lage(x, y, 0)
    const tuerHier = plan.tuer_x === x && plan.tuer_y === y
    boden.push(
      <polygon
        key={`b${key}`}
        points={raute(px, py)}
        fill={tuerHier ? 'var(--danger)' : 'var(--surface)'}
        stroke="var(--line)"
        strokeWidth={2}
        onClick={() => tippen(x, y)}
        style={{ cursor: 'pointer' }}
      />,
    )
    if (tuerHier) {
      boden.push(
        <text
          key={`t${key}`}
          x={px}
          y={py + ISO_T / 2 + 5}
          textAnchor="middle"
          fontSize={14}
          fontWeight={800}
          fill="#ffffff"
          pointerEvents="none"
        >
          {tuerLabel}
        </text>,
      )
    }

    const liste = stapel.get(key) ?? []
    liste.forEach((k, z) => {
      const grund = k.mark_color ?? farbe
      const { px: bx, py: by } = lage(x, y, z)
      const deckelY = by - ISO_H
      const leuchtet = k.id === hervor || k.id === markiert
      const oben = z === liste.length - 1
      kloetze.push(
        <g
          key={k.id}
          onClick={() => tippen(x, y)}
          style={{ cursor: 'pointer' }}
        >
          {/* linke Seite */}
          <polygon
            points={[
              `${bx - ISO_B / 2},${deckelY + ISO_T / 2}`,
              `${bx},${deckelY + ISO_T}`,
              `${bx},${deckelY + ISO_T + ISO_H}`,
              `${bx - ISO_B / 2},${deckelY + ISO_T / 2 + ISO_H}`,
            ].join(' ')}
            fill={dunkler(grund, 0.32)}
            stroke="var(--line)"
            strokeWidth={1.5}
          />
          {/* rechte Seite */}
          <polygon
            points={[
              `${bx + ISO_B / 2},${deckelY + ISO_T / 2}`,
              `${bx},${deckelY + ISO_T}`,
              `${bx},${deckelY + ISO_T + ISO_H}`,
              `${bx + ISO_B / 2},${deckelY + ISO_T / 2 + ISO_H}`,
            ].join(' ')}
            fill={dunkler(grund, 0.18)}
            stroke="var(--line)"
            strokeWidth={1.5}
          />
          {/* Deckel */}
          <polygon
            points={raute(bx, deckelY)}
            fill={grund}
            stroke={leuchtet ? 'var(--danger)' : 'var(--line)'}
            strokeWidth={leuchtet ? 5 : 1.5}
          />
          {oben ? (
            <text
              x={bx}
              y={deckelY + ISO_T / 2 + 4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={800}
              fontFamily="ui-monospace, monospace"
              fill={contrastOn(grund)}
              pointerEvents="none"
            >
              {k.code}
            </text>
          ) : null}
        </g>,
      )
    })
  }

  const minPx = -(reihen - 1) * (ISO_B / 2) - ISO_B / 2 - 10
  const maxPx = (spalten - 1) * (ISO_B / 2) + ISO_B / 2 + 10
  const minPy = -maxZ * ISO_H - ISO_H - 10
  const maxPy = (spalten - 1 + reihen - 1) * (ISO_T / 2) + ISO_T + 10
  const breite = maxPx - minPx
  const hoehe = maxPy - minPy
  const massstab = zelle / ISO_B

  return (
    <svg
      viewBox={`${minPx} ${minPy} ${breite} ${hoehe}`}
      width={breite * massstab}
      height={hoehe * massstab}
      role="img"
      style={{ display: 'block' }}
    >
      {boden}
      {kloetze}
    </svg>
  )
}
