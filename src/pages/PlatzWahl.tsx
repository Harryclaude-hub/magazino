import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
/* Keine Symbole, die auch der Zeichner-Teil benutzt (Check, Plus, RotateCw):
 * sonst zieht der Bundler einen gemeinsamen Teil aus dem Hauptbuendel,
 * und beim Start laedt eine Datei mehr (gemessen, Etappe 3). */
import { ChevronRight, CircleCheck, DoorOpen, RotateCwSquare, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { insel, lageOrt, lageSatz } from '../components/plan/lage'
import { PlanBild } from '../components/plan/PlanBild'
import { UnterlageWahl, unterlageSchluessel } from '../components/plan/UnterlageWahl'
import { Button, CodeChip, Empty, ErrorBox, Input, Loading, Spinner, useToast } from '../components/ui'
import { getItem, ladeGrundriss, ladeGrundrisse, ladeKisteLage, ladeRaeumeDesUmzugs, platzSetzen } from '../lib/api'
import {
  einrasten,
  kistenUeberlappen,
  laengeLesen,
  punktImPolygon,
  unterlagenAn,
  zuUmriss,
  type Punkt,
} from '../lib/geometrie'
import { useEigeneGroessen, useKistenGroessen } from '../lib/groessen'
import { useSprache } from '../lib/i18n'
import { platzWoerter } from '../lib/i18n/bausteine/platz'
import { woerterNachladen } from '../lib/i18n/woerter'
import type { Grundriss, GrundrissDaten, Item, KisteLage, RaumEintrag } from '../lib/types'
import { cx } from '../lib/util'
import { useProject } from './ProjectLayout'

/* Kiste platzieren am Handy (START 5.7, BAUPLAN 5.3). Ein eigener
 * Vollbild-Ablauf mit grossen Knoepfen, als eigener Code-Teil geladen:
 *
 *   1. Zimmer waehlen (entfaellt, wenn genau eines passt)
 *   2. Draufsicht nur zum Lesen; ein Tipp setzt die Mitte der Kiste, auf
 *      5 cm gerundet. Feineinstellung mit -10, -1, +1, +10 cm und
 *      Zahlenfeldern, Drehen.
 *   3. Unterlage: Boden, eine Kiste dort, das Moebel dort, oder Regal bzw.
 *      Schrank und das Fach. Die erste passende ist vorgewaehlt.
 *   4. Hier hinstellen. Die Datenbank prueft (platz_setzen); lehnt sie ab,
 *      steht ihr Grund in einfachen Worten da, der Plan laedt neu und die
 *      Stelle bleibt.
 *
 * Im Normalfall vier Tipps: "Platz waehlen", Stelle, (Unterlage), Speichern.
 * Gerechnet wird hier nur zur Vorschau (lib/geometrie.ts), die Datenbank
 * entscheidet. Der Status der Kiste bleibt unberuehrt.
 *
 * Adresse: kisten/:iid/platz, location.state { zurueck?: Pfad ab /app/,
 * reihe?: Kisten nacheinander }. Die zuletzt benutzten Stellen je Raum
 * stehen in sessionStorage (nur Bequemlichkeit).
 */

woerterNachladen(platzWoerter)

interface Zustand {
  zurueck?: string
  reihe?: string[]
}

type Laden =
  | { art: 'laedt' }
  | { art: 'fehler'; text: string }
  | { art: 'da'; item: Item; raeume: RaumEintrag[]; grundrisse: Grundriss[]; lage: KisteLage | null }

type RaumLaden = { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'da'; daten: GrundrissDaten }

const LETZTE_MAX = 4

function letzteLesen(raumId: string): Punkt[] {
  try {
    const roh: unknown = JSON.parse(sessionStorage.getItem(`kistly.platz.${raumId}`) ?? '[]')
    if (!Array.isArray(roh)) return []
    return roh
      .filter((p): p is Punkt => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isInteger(v)))
      .slice(0, LETZTE_MAX)
  } catch {
    return []
  }
}

function letzteMerken(raumId: string, p: Punkt) {
  try {
    const neu = [p, ...letzteLesen(raumId).filter((q) => q[0] !== p[0] || q[1] !== p[1])].slice(0, LETZTE_MAX)
    sessionStorage.setItem(`kistly.platz.${raumId}`, JSON.stringify(neu))
  } catch {
    /* nur Bequemlichkeit: ohne Speicher gibt es keine Vorschlaege */
  }
}

function fehlerText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export default function PlatzWahl() {
  const { iid = '' } = useParams()
  /* Jede Kiste der Reihe beginnt frisch. */
  return <Ablauf key={iid} iid={iid} />
}

function Ablauf({ iid }: { iid: string }) {
  const { project, canEdit, tagById } = useProject()
  const { t } = useSprache()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const zustand = (loc.state ?? null) as Zustand | null
  const zurueck =
    typeof zustand?.zurueck === 'string' && zustand.zurueck.startsWith('/app/')
      ? zustand.zurueck
      : `/app/p/${project.id}/kisten/${iid}`
  const reihe = Array.isArray(zustand?.reihe) ? zustand.reihe.filter((x): x is string => typeof x === 'string') : []
  const stelleInReihe = reihe.indexOf(iid)
  const rest = stelleInReihe >= 0 ? reihe.slice(stelleInReihe + 1) : reihe.filter((x) => x !== iid)

  const [laden, setLaden] = useState<Laden>({ art: 'laedt' })
  const [versuch, setVersuch] = useState(0)
  const [schritt, setSchritt] = useState<'zimmer' | 'stelle'>('zimmer')
  const [raumId, setRaumId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLaden({ art: 'laedt' })
    Promise.all([getItem(iid), ladeRaeumeDesUmzugs(project.id), ladeGrundrisse(project.id), ladeKisteLage(iid)])
      .then(([item, raeume, grundrisse, lage]) => {
        if (!alive) return
        setLaden({ art: 'da', item, raeume, grundrisse, lage })
        /* Vorwahl: der Raum des jetzigen Platzes, sonst der Raum des
         * Zimmers der Kiste (erster Grundriss zuerst). Passt genau einer,
         * geht das Zimmer gleich auf. */
        const ordnung = new Map(grundrisse.map((g, i) => [g.id, i]))
        const aktuell = lage?.art === 'kiste' ? lage.raum.id : null
        const passend = aktuell
          ? raeume.filter((r) => r.id === aktuell)
          : raeume
              .filter((r) => r.tag_id !== null && r.tag_id === item.room_id)
              .sort((a, b) => (ordnung.get(a.grundriss_id) ?? 99) - (ordnung.get(b.grundriss_id) ?? 99))
        setRaumId(passend[0]?.id ?? null)
        setSchritt(passend.length === 1 ? 'stelle' : 'zimmer')
      })
      .catch((err: unknown) => alive && setLaden({ art: 'fehler', text: fehlerText(err) }))
    return () => {
      alive = false
    }
  }, [iid, project.id, versuch])

  const kopf = (
    <AppHeader
      title={t('platz.titel')}
      subtitle={laden.art === 'da' ? <span className="t-serial">{laden.item.code}</span> : undefined}
      back={zurueck}
    />
  )

  if (laden.art === 'laedt') {
    return (
      <>
        {kopf}
        <Page>
          <Loading label={t('platz.laedt')} />
        </Page>
      </>
    )
  }
  if (laden.art === 'fehler') {
    return (
      <>
        {kopf}
        <Page>
          <ErrorBox error={laden.text} onRetry={() => setVersuch((v) => v + 1)} />
        </Page>
      </>
    )
  }

  const { item, raeume, grundrisse, lage } = laden

  if (item.kind === 'furniture') {
    return (
      <>
        {kopf}
        <Page>
          <Empty
            title={t('platz.moebel')}
            hint={t('platz.moebel_hinweis')}
            action={
              <Link to={`/app/p/${project.id}/grundriss?kiste=${item.id}`}>
                <Button>{t('lage.grundriss_oeffnen')}</Button>
              </Link>
            }
          />
        </Page>
      </>
    )
  }

  if (raeume.length === 0) {
    return (
      <>
        {kopf}
        <Page>
          <Empty
            icon={<DoorOpen size={34} />}
            title={t('platz.nicht_gezeichnet')}
            hint={t('platz.nicht_gezeichnet_hinweis')}
            action={
              <Button variant="outline" onClick={() => nav(zurueck)}>
                {t('platz.spaeter')}
              </Button>
            }
          />
        </Page>
      </>
    )
  }

  const raum = raumId ? (raeume.find((r) => r.id === raumId) ?? null) : null
  const raumName = (r: RaumEintrag) =>
    (r.tag_id ? tagById(r.tag_id)?.name : '')?.trim() || r.name.trim() || t('plan.raum_ohne_name')

  return (
    <>
      {kopf}
      {stelleInReihe >= 0 && reihe.length > 1 ? (
        <p className="t-sub mx-auto max-w-5xl px-3 pt-3 sm:px-5">
          {t('platz.reihe', { nr: stelleInReihe + 1, n: reihe.length })}
        </p>
      ) : null}
      {schritt === 'zimmer' || !raum ? (
        <Page>
          <ZimmerWahl
            raeume={raeume}
            grundrisse={grundrisse}
            vorwahl={raumId}
            name={raumName}
            farbe={(r) => (r.tag_id ? (tagById(r.tag_id)?.color ?? null) : null)}
            onWahl={(id) => {
              setRaumId(id)
              setSchritt('stelle')
            }}
          />
        </Page>
      ) : (
        <Stelle
          key={raum.id}
          item={item}
          lage={lage}
          raum={raum}
          raumName={raumName(raum)}
          mehrereRaeume={raeume.length > 1}
          canEdit={canEdit}
          gehoertIn={
            item.room_id && raum.tag_id !== item.room_id ? (tagById(item.room_id)?.name ?? null) : null
          }
          rest={rest}
          onAnderesZimmer={() => setSchritt('zimmer')}
          onGespeichert={(satz) => {
            toast(t('platz.gespeichert', { code: insel(item.code), satz }), 'ok')
            // Zurueck, woher man kam; ohne Verlauf auf den Pfad.
            if (zustand?.zurueck && window.history.length > 1) nav(-1)
            else nav(zurueck, { replace: true })
          }}
          onNaechste={() =>
            nav(`/app/p/${project.id}/kisten/${rest[0]}/platz`, { replace: true, state: { zurueck, reihe } })
          }
          onFertig={() => {
            if (zustand?.zurueck && window.history.length > 1) nav(-1)
            else nav(zurueck, { replace: true })
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------ 1. Zimmer waehlen */

function ZimmerWahl({
  raeume,
  grundrisse,
  vorwahl,
  name,
  farbe,
  onWahl,
}: {
  raeume: RaumEintrag[]
  grundrisse: Grundriss[]
  vorwahl: string | null
  name: (r: RaumEintrag) => string
  farbe: (r: RaumEintrag) => string | null
  onWahl: (id: string) => void
}) {
  const { t } = useSprache()
  /* Nach Grundriss gruppiert, in der Reihenfolge der Reiter. */
  const gruppen = useMemo(() => {
    const ordnung = new Map(grundrisse.map((g, i) => [g.id, i]))
    const map = new Map<string, { name: string; raeume: RaumEintrag[] }>()
    for (const r of raeume) {
      const g = map.get(r.grundriss_id) ?? { name: r.grundriss_name, raeume: [] }
      g.raeume.push(r)
      map.set(r.grundriss_id, g)
    }
    return [...map.entries()].sort((a, b) => (ordnung.get(a[0]) ?? 99) - (ordnung.get(b[0]) ?? 99)).map(([, g]) => g)
  }, [raeume, grundrisse])

  return (
    <div className="space-y-5">
      <h1 className="t-name-lg">{t('platz.zimmer_waehlen')}</h1>
      {gruppen.map((g) => (
        <section key={g.name} className="space-y-2">
          {gruppen.length > 1 ? <h2 className="text-sm font-black uppercase tracking-wider text-muted">{g.name}</h2> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {g.raeume.map((r) => {
              const f = farbe(r)
              const an = r.id === vorwahl
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onWahl(r.id)}
                  className={cx(
                    'flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-start transition active:scale-[0.99]',
                    an ? 'border-ink bg-raised' : 'border-line bg-surface hover:border-ink/35',
                  )}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-line"
                    style={{ background: f ?? 'var(--plan-boden)' }}
                    aria-hidden
                  />
                  <span className="t-name min-w-0 flex-1 break-words">{name(r)}</span>
                  <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/* ------------------------------------------- 2. bis 4. Stelle, Unterlage */

function Stelle({
  item,
  lage,
  raum,
  raumName,
  mehrereRaeume,
  canEdit,
  gehoertIn,
  rest,
  onAnderesZimmer,
  onGespeichert,
  onNaechste,
  onFertig,
}: {
  item: Item
  lage: KisteLage | null
  raum: RaumEintrag
  raumName: string
  mehrereRaeume: boolean
  canEdit: boolean
  gehoertIn: string | null
  rest: string[]
  onAnderesZimmer: () => void
  /** Bekommt den fertigen Satz, wo die Kiste jetzt steht. */
  onGespeichert: (satz: string) => void
  onNaechste: () => void
  onFertig: () => void
}) {
  const { t } = useSprache()
  const { project } = useProject()
  const stufen = useKistenGroessen()
  const eigene = useEigeneGroessen(item.eigene_groesse_id ? project.id : null)

  const [planStand, setPlanStand] = useState<RaumLaden>({ art: 'laedt' })
  const [planVersuch, setPlanVersuch] = useState(0)
  const aktuell = lage?.art === 'kiste' && lage.raum.id === raum.id ? lage : null
  const [punkt, setPunkt] = useState<Punkt | null>(aktuell ? [aktuell.platz_x, aktuell.platz_y] : null)
  const [drehung, setDrehung] = useState<0 | 90>(aktuell?.drehung ?? 0)
  /* Die Unterlage, auf der die Kiste jetzt steht (bzw. die zuletzt
   * gewaehlte): sie gewinnt, solange es sie an der Stelle gibt. */
  const jetzigeUnterlage = aktuell
    ? `${aktuell.unterlage_art}-${aktuell.unterlage_item_id ?? aktuell.objekt?.id ?? ''}-${aktuell.fach_ebene ?? ''}-${aktuell.fach_spalte ?? ''}`
    : null
  const bevorzugt = useRef<string | null>(jetzigeUnterlage)
  const [wahl, setWahl] = useState<string | null>(jetzigeUnterlage)
  const [fein, setFein] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState<string | null>(null)
  const [letzte, setLetzte] = useState<Punkt[]>(() => letzteLesen(raum.id))

  /* Nach einer Ablehnung laedt der Plan neu (planVersuch); die Stelle und
   * die Wahl bleiben stehen. Die alten Daten bleiben sichtbar, bis die
   * neuen da sind. */
  const hatDaten = useRef(false)
  useEffect(() => {
    let alive = true
    if (!hatDaten.current) setPlanStand({ art: 'laedt' })
    ladeGrundriss(raum.grundriss_id, raum.id)
      .then((d) => {
        if (!alive) return
        if (!d) {
          // Leerer Text: den Raum gibt es nicht mehr (Satz beim Zeigen).
          setPlanStand({ art: 'fehler', text: '' })
          return
        }
        hatDaten.current = true
        setPlanStand({ art: 'da', daten: d })
      })
      .catch((err: unknown) => alive && setPlanStand({ art: 'fehler', text: fehlerText(err) }))
    return () => {
      alive = false
    }
  }, [raum.grundriss_id, raum.id, planVersuch])

  const daten = planStand.art === 'da' ? planStand.daten : null
  const planRaum = daten?.raeume.find((r) => r.id === raum.id) ?? null

  /* Der Satz mit der Spaltenzahl des Regals aus dem Plan, damit er die
   * Spalte nennt wie Kistenseite und Suche. Steht das Regal in einem
   * anderen Grundriss, entscheidet lageSatz ohne sie. */
  function satzVon(l: KisteLage): string {
    const objektId = l.art === 'kiste' ? l.objekt?.id : null
    const spalten = objektId ? (daten?.objekte.find((o) => o.id === objektId)?.spalten ?? null) : null
    return lageSatz(l, t, spalten)
  }

  /* Masse nur fuer Vorschau und Auswahl (die Datenbank rechnet selbst,
   * kiste_masse): steht die Kiste im Plan, von dort; sonst eigene Groesse,
   * Stufe mit eigener Hoehe, zuletzt 60 x 40 x 40. */
  const masse = useMemo(() => {
    const k = daten?.kisten.find((x) => x.id === item.id)
    if (k) return { laenge_cm: k.laenge_cm, breite_cm: k.breite_cm, hoehe_cm: k.hoehe_cm }
    if (lage?.art === 'kiste') return { laenge_cm: lage.laenge_cm, breite_cm: lage.breite_cm, hoehe_cm: lage.hoehe_cm }
    const e = item.eigene_groesse_id ? eigene.liste?.find((g) => g.id === item.eigene_groesse_id) : null
    if (e) return { laenge_cm: e.laenge_cm, breite_cm: e.breite_cm, hoehe_cm: e.hoehe_cm }
    const g = stufen?.get(item.size)
    return {
      laenge_cm: g?.laenge_cm ?? 60,
      breite_cm: g?.breite_cm ?? 40,
      hoehe_cm: item.eigene_hoehe_cm ?? g?.hoehe_cm ?? 40,
    }
  }, [daten, lage, item, eigene.liste, stufen])

  const rahmen = useMemo(() => {
    const p = planRaum?.punkte ?? []
    if (p.length === 0) return null
    return {
      x0: Math.min(...p.map((q) => q[0])),
      y0: Math.min(...p.map((q) => q[1])),
      x1: Math.max(...p.map((q) => q[0])),
      y1: Math.max(...p.map((q) => q[1])),
    }
  }, [planRaum])

  const drinnen = Boolean(punkt && planRaum && punktImPolygon(zuUmriss(planRaum.punkte), punkt[0], punkt[1]))

  const liste = useMemo(() => {
    if (!daten || !punkt || !drinnen) return []
    return unterlagenAn(daten, raum.id, punkt[0], punkt[1], { id: item.id, ...masse, drehung })
  }, [daten, punkt, drinnen, raum.id, item.id, masse, drehung])

  /* Die Wahl bleibt, solange es sie an dieser Stelle gibt und sie passt;
   * sonst die bevorzugte, sonst die erste passende. */
  useEffect(() => {
    const gilt = (s: string | null) => s !== null && liste.some((u) => u.passt && unterlageSchluessel(u) === s)
    setWahl((w) => {
      if (gilt(w)) return w
      if (gilt(bevorzugt.current)) return bevorzugt.current
      const erste = liste.find((u) => u.passt)
      return erste ? unterlageSchluessel(erste) : null
    })
  }, [liste])

  function waehlen(s: string) {
    bevorzugt.current = s
    setWahl(s)
  }

  const gewaehlt = liste.find((u) => unterlageSchluessel(u) === wahl) ?? null
  const ueberlappt =
    daten && punkt && gewaehlt
      ? kistenUeberlappen(daten, raum.id, punkt[0], punkt[1], { id: item.id, ...masse, unten_cm: gewaehlt.unten_cm }, drehung)
      : []

  function setzen(p: Punkt) {
    setFehler(null)
    setErfolg(null)
    setPunkt([Math.round(p[0]), Math.round(p[1])])
  }

  function schieben(achse: 0 | 1, n: number) {
    if (!punkt) return
    const neu: Punkt = [punkt[0], punkt[1]]
    neu[achse] = Math.max(0, Math.min(50000, neu[achse] + n))
    setzen(neu)
  }

  async function speichern() {
    if (!punkt || !gewaehlt || !gewaehlt.passt || !drinnen) return
    setBusy(true)
    setFehler(null)
    try {
      const neu = await platzSetzen(item.id, {
        raum_id: raum.id,
        x: punkt[0],
        y: punkt[1],
        drehung,
        unterlage: gewaehlt.art,
        unterlage_item_id: gewaehlt.itemId ?? null,
        unterlage_objekt_id: gewaehlt.objektId ?? null,
        ebene: gewaehlt.ebene ?? null,
        spalte: gewaehlt.spalte ?? null,
      })
      letzteMerken(raum.id, punkt)
      setLetzte(letzteLesen(raum.id))
      if (rest.length > 0) {
        // In der Reihe: hier bleiben, Erfolg zeigen, weiter mit der naechsten.
        setErfolg(t('platz.gespeichert', { code: insel(item.code), satz: satzVon(neu) }))
        setPlanVersuch((v) => v + 1)
      } else {
        onGespeichert(satzVon(neu))
      }
    } catch (err) {
      /* Die Datenbank sagt, warum nicht. Plan neu laden, Stelle bleibt. */
      setFehler(fehlerText(err))
      setPlanVersuch((v) => v + 1)
    } finally {
      setBusy(false)
    }
  }

  const [ex, ey] = drehung === 90 ? [masse.breite_cm, masse.laenge_cm] : [masse.laenge_cm, masse.breite_cm]

  return (
    <>
      <Page className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="t-name-lg min-w-[10rem] flex-1">{raumName}</h1>
          {mehrereRaeume ? (
            <Button variant="outline" size="sm" className="min-h-11" onClick={onAnderesZimmer}>
              <DoorOpen size={17} /> {t('platz.anderes_zimmer')}
            </Button>
          ) : null}
        </div>

        {lage?.art === 'kiste' ? (
          <p className="t-sub">
            {t('platz.jetzt', { satz: t('suche.ort_zeile', { ort: lageOrt(lage, t), satz: satzVon(lage) }) })}
          </p>
        ) : null}
        {gehoertIn ? (
          <p className="rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-[0.9375rem] font-bold text-warn">
            {t('lage.gehoert_in', { zimmer: gehoertIn })}
          </p>
        ) : null}
        {!canEdit ? <p className="rounded-xl bg-raised px-3 py-2 text-base">{t('platz.nur_ansehen')}</p> : null}

        {planStand.art === 'laedt' ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 rounded-2xl border border-line text-muted">
            <Spinner /> {t('platz.raum_laedt')}
          </div>
        ) : planStand.art === 'fehler' ? (
          <ErrorBox error={planStand.text || t('grundriss.fehlt')} onRetry={() => setPlanVersuch((v) => v + 1)} />
        ) : daten ? (
          <>
            {canEdit ? (
              <div>
                <p className="t-name">{punkt ? t('platz.stelle', { x: rahmen ? punkt[0] - rahmen.x0 : punkt[0], y: rahmen ? punkt[1] - rahmen.y0 : punkt[1] }) : t('platz.tippen')}</p>
                <p className="t-sub">{t('platz.tippen_hinweis')}</p>
              </div>
            ) : null}
            <PlanBild
              daten={daten}
              ausschnitt={{ raumId: raum.id }}
              hervor={canEdit ? null : item.id}
              maxHoehe="58vh"
              label={t('platz.plan_label')}
              zoomen
              onTipp={
                canEdit
                  ? (p) =>
                      // Auf 5 cm ab der Raum-Ecke, wie die Zahlen, die die Seite zeigt.
                      setzen(
                        rahmen
                          ? [rahmen.x0 + einrasten(p[0] - rahmen.x0, 5), rahmen.y0 + einrasten(p[1] - rahmen.y0, 5)]
                          : [einrasten(p[0], 5), einrasten(p[1], 5)],
                      )
                  : undefined
              }
              zusatz={
                punkt && canEdit
                  ? () => (
                      <g pointerEvents="none">
                        <rect
                          x={punkt[0] - ex / 2}
                          y={punkt[1] - ey / 2}
                          width={ex}
                          height={ey}
                          rx={1.5}
                          style={{
                            fill: drinnen ? 'var(--plan-hervor)' : 'var(--plan-warnung)',
                            stroke: drinnen ? 'var(--plan-hervor)' : 'var(--plan-warnung)',
                          }}
                          fillOpacity={0.3}
                          strokeWidth={2.5}
                          strokeDasharray="6 4"
                          vectorEffect="non-scaling-stroke"
                        />
                        <line x1={punkt[0] - 8} y1={punkt[1]} x2={punkt[0] + 8} y2={punkt[1]} style={{ stroke: 'var(--plan-hervor)' }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                        <line x1={punkt[0]} y1={punkt[1] - 8} x2={punkt[0]} y2={punkt[1] + 8} style={{ stroke: 'var(--plan-hervor)' }} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                      </g>
                    )
                  : undefined
              }
            />

            {canEdit ? (
              <>
                {punkt && !drinnen ? (
                  <p className="rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-[0.9375rem] font-bold text-warn">
                    {t('platz.draussen')}
                  </p>
                ) : null}

                {letzte.length > 0 ? (
                  <div>
                    <p className="t-sub mb-1.5">{t('platz.letzte')}</p>
                    <div className="flex flex-wrap gap-2">
                      {letzte.map((p) => (
                        <button
                          key={`${p[0]}-${p[1]}`}
                          type="button"
                          onClick={() => setzen(p)}
                          className="t-serial inline-flex h-11 items-center rounded-full border-2 border-line bg-surface px-4 text-[0.9375rem] transition hover:border-ink/35 active:scale-95"
                          dir="ltr"
                        >
                          {rahmen ? p[0] - rahmen.x0 : p[0]} / {rahmen ? p[1] - rahmen.y0 : p[1]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-sub basis-full">
                    {t('platz.masse', { masse: t('groessen.eigene_masse', { l: masse.laenge_cm, b: masse.breite_cm, h: masse.hoehe_cm }) })}
                  </span>
                  <Button data-tour="platz-drehen" variant="outline" className="min-h-12" onClick={() => setDrehung((d) => (d === 0 ? 90 : 0))}>
                    <RotateCwSquare size={18} /> {t('platz.drehen')}
                  </Button>
                  <Button data-tour="platz-fein"
                    variant="outline"
                    className="min-h-12"
                    aria-expanded={fein}
                    onClick={() => setFein((f) => !f)}
                  >
                    <SlidersHorizontal size={18} /> {t('platz.feineinstellung')}
                  </Button>
                </div>

                {fein ? (
                  <div className="space-y-3 rounded-2xl border-2 border-line bg-surface p-3">
                    <Achse
                      label={t('platz.von_links')}
                      wert={punkt && rahmen ? punkt[0] - rahmen.x0 : null}
                      onSchieben={(n) => schieben(0, n)}
                      onWert={(v) => {
                        if (!rahmen) return
                        const y = punkt ? punkt[1] : Math.round((rahmen.y0 + rahmen.y1) / 2)
                        setzen([rahmen.x0 + v, y])
                      }}
                    />
                    <Achse
                      label={t('platz.von_oben')}
                      wert={punkt && rahmen ? punkt[1] - rahmen.y0 : null}
                      onSchieben={(n) => schieben(1, n)}
                      onWert={(v) => {
                        if (!rahmen) return
                        const x = punkt ? punkt[0] : Math.round((rahmen.x0 + rahmen.x1) / 2)
                        setzen([x, rahmen.y0 + v])
                      }}
                    />
                  </div>
                ) : null}

                <section className="space-y-2">
                  <h2 className="text-[0.9375rem] font-black uppercase tracking-wider text-muted">
                    {t('platz.unterlage_titel')}
                  </h2>
                  {punkt && drinnen ? (
                    <UnterlageWahl daten={daten} liste={liste} wahl={wahl} onWahl={waehlen} />
                  ) : (
                    <p className="t-sub">{t('platz.unterlage_leer')}</p>
                  )}
                </section>

                {ueberlappt.length > 0 ? (
                  <p className="rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-[0.9375rem] font-bold text-warn">
                    {t('platz.ueberlappt', { codes: ueberlappt.map(insel).join(', ') })}
                  </p>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {fehler ? <ErrorBox error={fehler} /> : null}
        {/* Luft, damit die feste Leiste nichts verdeckt */}
        <div className="h-4" />
      </Page>

      {canEdit && daten ? (
        <div
          className="no-print sticky z-30 border-t-2 border-line bg-paper/95 px-3 py-3 backdrop-blur"
          style={{ bottom: 'var(--nav-h, 0px)' }}
        >
          <div className="mx-auto max-w-5xl">
            {erfolg ? (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-base font-bold text-ok">
                  <CircleCheck size={20} className="mt-0.5 shrink-0" /> <span className="min-w-0">{erfolg}</span>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" className="flex-1 justify-center" onClick={onFertig}>
                    {t('aktion.fertig')}
                  </Button>
                  <Button size="lg" className="flex-[2] justify-center" onClick={onNaechste}>
                    {t('platz.naechste', { n: rest.length })}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Die Ablehnung auch hier, direkt ueber dem Knopf: unten auf
                 * der Seite sieht man sie am Handy nicht. */}
                {fehler ? (
                  <p role="alert" className="flex items-start gap-2 text-[0.9375rem] font-bold text-danger">
                    <TriangleAlert size={20} className="mt-0.5 shrink-0" /> <span className="min-w-0">{fehler}</span>
                  </p>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="hidden shrink-0 sm:block">
                    <CodeChip code={item.code} size="sm" />
                  </span>
                  <Button data-tour="platz-speichern"
                    size="lg"
                    full
                    className="sm:w-auto sm:flex-1"
                    loading={busy}
                    disabled={!punkt || !drinnen || !gewaehlt || !gewaehlt.passt}
                    onClick={() => void speichern()}
                  >
                    <CircleCheck size={22} /> {t('platz.speichern')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

/** Eine Richtung der Feineinstellung: Zahlenfeld und -10, -1, +1, +10. */
function Achse({
  label,
  wert,
  onSchieben,
  onWert,
}: {
  label: string
  wert: number | null
  onSchieben: (n: number) => void
  onWert: (v: number) => void
}) {
  const { t } = useSprache()
  const [text, setText] = useState(wert === null ? '' : String(wert))
  const [falsch, setFalsch] = useState(false)
  /* Aendert sich die Stelle von aussen (Tipp, Knopf), folgt das Feld. */
  useEffect(() => {
    setText(wert === null ? '' : String(wert))
    setFalsch(false)
  }, [wert])

  function uebernehmen() {
    if (!text.trim()) return
    const v = laengeLesen(text)
    if (v === null) {
      setFalsch(true)
      return
    }
    setFalsch(false)
    if (v !== wert) onWert(v)
  }

  const knopf = (n: number) => (
    <button
      key={n}
      type="button"
      disabled={wert === null}
      onClick={() => onSchieben(n)}
      aria-label={t('platz.schieben', { achse: label, n: n > 0 ? `+${n}` : String(n) })}
      className="t-serial flex h-12 min-w-11 items-center justify-center rounded-xl border-2 border-line bg-surface px-1.5 text-base font-bold transition hover:border-ink/35 active:scale-95 disabled:opacity-40"
      dir="ltr"
    >
      {/* Rechenzeichen minus (U+2212), kein Gedankenstrich. */}
      {n < 0 ? `\u2212${Math.abs(n)}` : `+${n}`}
    </button>
  )

  return (
    <div>
      <label className="t-sub mb-1 block">{label}</label>
      <div className="flex items-center gap-1.5" dir="ltr">
        {knopf(-10)}
        {knopf(-1)}
        <div className="w-20 shrink-0">
          <Input
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={uebernehmen}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                uebernehmen()
              }
            }}
            aria-label={label}
            aria-invalid={falsch}
            className="t-serial h-12 px-1 text-center"
          />
        </div>
        {knopf(1)}
        {knopf(10)}
      </div>
      {falsch ? <p className="mt-1 text-sm font-bold text-danger">{t('platz.zahl_falsch')}</p> : null}
    </div>
  )
}
