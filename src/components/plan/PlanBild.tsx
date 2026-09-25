import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { useSprache } from '../../lib/i18n'
import { cmText, wandStuecke, type Punkt } from '../../lib/geometrie'
import type { GrundrissDaten, Objekt, Oeffnung, PlanKiste, Raum } from '../../lib/types'
import { cx } from '../../lib/util'
import {
  datenBox,
  flaecheQm,
  innenNormale,
  innenPunkt,
  kisteAusdehnung,
  objektUmriss,
  oeffnungPunkte,
  punkteBox,
  raumTitel,
  trefferAn,
  type PlanTreffer,
} from './hilfe'
import { objektName } from './lage'

/* Die Draufsicht eines Grundrisses als SVG in Zentimetern.
 *
 * Gemeinsamer Baustein fuer Handy, Kistenseite, Suche und Zeichner. Der
 * Zeichner benutzt nur die Ebenen (PlanEbenen) und legt seine Griffe
 * darueber; alle anderen nehmen PlanBild mit fertigem Ausschnitt.
 *
 * Plaene werden nie gespiegelt: die Zeichnung steht immer in dir="ltr",
 * auch im arabischen Satz. Farben kommen nur aus den Variablen --plan-*
 * (index.css), Tuer immer orange, Fenster immer blau. Striche, die nicht
 * mitwachsen sollen, haben vector-effect non-scaling-stroke; Schrift
 * wird aus dem Massstab gerechnet, damit sie bei jedem Zoom gleich gross
 * bleibt.
 */

const WAND = 12
const NS = 'non-scaling-stroke' as const

/** Pixel je Zentimeter, daraus die Schriftgroesse in cm. */
function px(massstab: number, n: number): number {
  return n / Math.max(massstab, 0.0001)
}

/* ------------------------------------------------------------- Ebenen */

const BodenEbene = memo(function BodenEbene({ raeume }: { raeume: Raum[] }) {
  return (
    <g>
      {raeume.map((r) => (
        <polygon
          key={r.id}
          points={r.punkte.map((p) => p.join(',')).join(' ')}
          style={{
            fill: r.bodenfarbe ?? (r.art === 'draussen' ? 'var(--plan-boden-draussen)' : 'var(--plan-boden)'),
          }}
        />
      ))}
    </g>
  )
})

/** Wandfarbe als 4-cm-Streifen innen an der Wand. Die Wand selbst bleibt
 *  --plan-wand, damit der Kontrast im Hellen und Dunklen haelt. */
const WandFarbEbene = memo(function WandFarbEbene({ raeume }: { raeume: Raum[] }) {
  const striche: { key: string; a: Punkt; b: Punkt; farbe: string }[] = []
  for (const r of raeume) {
    const n = r.punkte.length
    r.wandfarben?.forEach((farbe, k) => {
      if (!farbe || k >= n) return
      const a = r.punkte[k]
      const b = r.punkte[(k + 1) % n]
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (l < 20) return
      const [nx, ny] = innenNormale(a, b)
      const rx = (b[0] - a[0]) / l
      const ry = (b[1] - a[1]) / l
      const v = WAND / 2 + 2
      striche.push({
        key: `${r.id}-${k}`,
        a: [a[0] + nx * v + rx * v, a[1] + ny * v + ry * v],
        b: [b[0] + nx * v - rx * v, b[1] + ny * v - ry * v],
        farbe,
      })
    })
  }
  return (
    <g>
      {striche.map((s) => (
        <line key={s.key} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.farbe} strokeWidth={4} />
      ))}
    </g>
  )
})

const WandEbene = memo(function WandEbene({ raeume, oeffnungen }: { raeume: Raum[]; oeffnungen: Oeffnung[] }) {
  const stuecke = useMemo(() => wandStuecke(raeume, oeffnungen), [raeume, oeffnungen])
  return (
    <g style={{ stroke: 'var(--plan-wand)' }} strokeWidth={WAND} strokeLinecap="square">
      {stuecke.map((s, i) => (
        <line key={i} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} />
      ))}
    </g>
  )
})

const OeffnungEbene = memo(function OeffnungEbene({
  raeume,
  oeffnungen,
}: {
  raeume: Raum[]
  oeffnungen: Oeffnung[]
}) {
  return (
    <g fill="none">
      {oeffnungen.map((o) => {
        const r = raeume.find((x) => x.id === o.raum_id)
        if (!r) return null
        return <OeffnungForm key={o.id} raum={r} o={o} />
      })}
    </g>
  )
})

/** Eine Tuer (Blatt und Viertelbogen, orange) oder ein Fenster
 *  (Doppellinie, blau). Auch fuer den Geist im Zeichner. */
export function OeffnungForm({ raum, o, geist }: { raum: Pick<Raum, 'punkte'>; o: Oeffnung; geist?: 'ok' | 'falsch' }) {
  const s = oeffnungPunkte(raum, o)
  if (!s) return null
  const [a, b] = s
  const n = raum.punkte.length
  const [nx, ny] = innenNormale(raum.punkte[o.kante], raum.punkte[(o.kante + 1) % n])
  const farbe = geist === 'falsch' ? 'var(--plan-hervor)' : o.art === 'tuer' ? 'var(--plan-tuer)' : 'var(--plan-fenster)'
  const deckel = (
    <polygon
      points={[
        [a[0] + nx * (WAND / 2 + 0.5), a[1] + ny * (WAND / 2 + 0.5)],
        [b[0] + nx * (WAND / 2 + 0.5), b[1] + ny * (WAND / 2 + 0.5)],
        [b[0] - nx * (WAND / 2 + 0.5), b[1] - ny * (WAND / 2 + 0.5)],
        [a[0] - nx * (WAND / 2 + 0.5), a[1] - ny * (WAND / 2 + 0.5)],
      ]
        .map((p) => p.join(','))
        .join(' ')}
      style={{ fill: geist ? 'transparent' : 'var(--plan-boden)' }}
    />
  )
  if (o.art === 'fenster') {
    const v = 3.5
    return (
      <g style={{ stroke: farbe }} opacity={geist ? 0.85 : 1}>
        {deckel}
        <line x1={a[0] + nx * v} y1={a[1] + ny * v} x2={b[0] + nx * v} y2={b[1] + ny * v} strokeWidth={2} vectorEffect={NS} />
        <line x1={a[0] - nx * v} y1={a[1] - ny * v} x2={b[0] - nx * v} y2={b[1] - ny * v} strokeWidth={2} vectorEffect={NS} />
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={1} vectorEffect={NS} />
      </g>
    )
  }
  // Tuer: Angel am Anfang (links) oder Ende (rechts), Blatt nach innen oder aussen.
  const angel = o.anschlag === 'rechts' ? b : a
  const gegen = o.anschlag === 'rechts' ? a : b
  const seite = o.aufschlag === 'aussen' ? -1 : 1
  const blatt: Punkt = [angel[0] + nx * seite * o.breite_cm, angel[1] + ny * seite * o.breite_cm]
  const kreuz = (blatt[0] - angel[0]) * (gegen[1] - angel[1]) - (blatt[1] - angel[1]) * (gegen[0] - angel[0])
  const bogen = `M ${blatt[0]} ${blatt[1]} A ${o.breite_cm} ${o.breite_cm} 0 0 ${kreuz > 0 ? 1 : 0} ${gegen[0]} ${gegen[1]}`
  return (
    <g style={{ stroke: farbe }} opacity={geist ? 0.85 : 1}>
      {deckel}
      <line x1={angel[0]} y1={angel[1]} x2={blatt[0]} y2={blatt[1]} strokeWidth={2.5} vectorEffect={NS} />
      <path d={bogen} strokeWidth={1.25} vectorEffect={NS} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={1.25} vectorEffect={NS} strokeDasharray="4 3" />
      {/* Nur um die Richtung zu zeigen, falls das Blatt zu klein ist. */}
      <circle cx={angel[0]} cy={angel[1]} r={2.5} style={{ fill: farbe }} stroke="none" />
    </g>
  )
}

const ObjektEbene = memo(function ObjektEbene({ objekte, massstab }: { objekte: Objekt[]; massstab: number }) {
  const { t } = useSprache()
  return (
    <g>
      {objekte.map((o) => {
        const umriss = objektUmriss(o)
        const fs = px(massstab, 11)
        const mitte = innenPunkt(umriss)
        // Beschriftung nur, wenn sie in den Rahmen passt (grob: 0,6 Schriftbreiten je Zeichen).
        const rahmen = punkteBox(umriss)
        const name = objektName(t, o)
        const passt =
          (rahmen.x1 - rahmen.x0) * massstab > Math.max(name.length, 9) * 11 * 0.62 + 6 &&
          (rahmen.y1 - rahmen.y0) * massstab > 30
        const teiler: [Punkt, Punkt][] = []
        if (o.art !== 'moebel' && o.spalten > 1) {
          for (let s = 1; s < o.spalten; s++) {
            const lx = (s * (o.breite_cm + 2)) / o.spalten - 1
            teiler.push([objektPunkt(o, lx, 0), objektPunkt(o, lx, o.tiefe_cm)])
          }
        }
        return (
          <g key={o.id}>
            <polygon
              points={umriss.map((p) => p.join(',')).join(' ')}
              style={{ fill: o.farbe ?? 'var(--plan-objekt)', stroke: 'var(--plan-objekt-rand)' }}
              strokeWidth={1.5}
              vectorEffect={NS}
            />
            {o.art !== 'moebel' ? (
              // Regal und Schrank: die Vorderkante doppelt, damit man sieht, wo man hineingreift.
              <line
                x1={objektPunkt(o, 0, o.tiefe_cm - 3)[0]}
                y1={objektPunkt(o, 0, o.tiefe_cm - 3)[1]}
                x2={objektPunkt(o, o.breite_cm, o.tiefe_cm - 3)[0]}
                y2={objektPunkt(o, o.breite_cm, o.tiefe_cm - 3)[1]}
                style={{ stroke: 'var(--plan-objekt-rand)' }}
                strokeWidth={1}
                vectorEffect={NS}
              />
            ) : null}
            {teiler.map(([a, b], i) => (
              <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: 'var(--plan-objekt-rand)' }} strokeWidth={1} vectorEffect={NS} />
            ))}
            {passt ? (
              <text
                x={mitte[0]}
                y={mitte[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: 'var(--ink)', fontSize: fs }}
                fontWeight={700}
              >
                <tspan x={mitte[0]} dy={-fs * 0.6}>
                  {name}
                </tspan>
                <tspan x={mitte[0]} dy={fs * 1.2} className="t-serial" style={{ fontSize: fs * 0.9 }}>
                  {o.breite_cm} x {o.tiefe_cm}
                </tspan>
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
})

function objektPunkt(o: Objekt, lx: number, ly: number): Punkt {
  switch (o.drehung) {
    case 0:
      return [o.x + lx, o.y + ly]
    case 90:
      return [o.x - ly, o.y + lx]
    case 180:
      return [o.x - lx, o.y - ly]
    default:
      return [o.x + ly, o.y - lx]
  }
}

const KistenEbene = memo(function KistenEbene({ kisten, massstab }: { kisten: PlanKiste[]; massstab: number }) {
  const { t } = useSprache()
  const sortiert = useMemo(() => [...kisten].sort((a, b) => a.unten_cm - b.unten_cm), [kisten])
  const oben = useMemo(() => {
    const drauf = new Set(kisten.filter((k) => k.unterlage_art === 'kiste').map((k) => k.unterlage_item_id))
    return new Set(kisten.filter((k) => !drauf.has(k.id)).map((k) => k.id))
  }, [kisten])
  return (
    <g>
      {sortiert.map((k) => {
        const [ex, ey] = kisteAusdehnung(k)
        const farbe = k.mark_color ?? k.room_color ?? 'var(--plan-objekt)'
        const fs = px(massstab, 10.5)
        const passt = ex * massstab > 46 && ey * massstab > 16
        return (
          <g key={k.id}>
            <rect
              x={k.platz_x - ex / 2}
              y={k.platz_y - ey / 2}
              width={ex}
              height={ey}
              rx={1.5}
              style={{ fill: farbe, stroke: 'var(--plan-kiste-rand)' }}
              fillOpacity={0.62}
              strokeWidth={1.1}
              vectorEffect={NS}
            />
            {passt && oben.has(k.id) ? (
              <text
                x={k.platz_x}
                y={k.platz_y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="t-serial"
                style={{ fill: 'var(--ink)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--plan-boden)' }}
                strokeWidth={px(massstab, 2.5)}
              >
                {k.code}
                {k.nr > 1 && ey * massstab > 30 ? (
                  <tspan x={k.platz_x} dy={fs * 1.15} style={{ fontSize: fs * 0.85 }} fontWeight={700}>
                    {t('plan.stapel', { n: k.nr })}
                  </tspan>
                ) : null}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
})

const BeschriftungEbene = memo(function BeschriftungEbene({ raeume, massstab }: { raeume: Raum[]; massstab: number }) {
  const { t, lang } = useSprache()
  return (
    <g>
      {raeume.map((r) => {
        const [x, y] = innenPunkt(r.punkte)
        const fs = px(massstab, 13)
        const qm = flaecheQm(r.punkte)
        const qmText = lang === 'ar' ? String(qm) : String(qm).replace('.', ',')
        const titel = raumTitel(r) || t('plan.raum_ohne_name')
        return (
          <text
            key={r.id}
            x={x}
            y={y}
            textAnchor="middle"
            style={{ fill: 'var(--ink)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--plan-boden)' }}
            strokeWidth={px(massstab, 3)}
            strokeLinejoin="round"
          >
            <tspan x={x} dy={-fs * 0.3} fontWeight={800}>
              {titel}
            </tspan>
            {/* Masse in Monoschrift; im Arabischen mit eigener Leserichtung,
                sonst zerfaellt "12 م²" im links-nach-rechts-Plan. */}
            <tspan
              x={x}
              dy={fs * 1.2}
              style={{ fontSize: fs * 0.82, fontFamily: 'var(--font-mono)', direction: lang === 'ar' ? 'rtl' : 'ltr', unicodeBidi: 'isolate' }}
              fontWeight={600}
            >
              {t('plan.m2', { n: qmText })} · {cmText(r.hoehe_cm, lang)}
            </tspan>
          </text>
        )
      })}
    </g>
  )
})

/** Rahmen fuer "hier ist es" (rot) und die Auswahl (violett). */
function Markierung({
  daten,
  ziel,
  farbe,
  massstab,
  ring,
}: {
  daten: GrundrissDaten
  ziel: PlanTreffer
  farbe: string
  massstab: number
  ring?: boolean
}) {
  const breite = 3
  if (ziel.art === 'kiste') {
    const k = daten.kisten.find((x) => x.id === ziel.id)
    if (!k) return null
    const [ex, ey] = kisteAusdehnung(k)
    const r = Math.max(ex, ey) / 2 + px(massstab, 12)
    return (
      <g style={{ stroke: farbe }} fill="none">
        <rect
          x={k.platz_x - ex / 2}
          y={k.platz_y - ey / 2}
          width={ex}
          height={ey}
          rx={1.5}
          strokeWidth={breite}
          vectorEffect={NS}
          style={{ fill: farbe }}
          fillOpacity={0.28}
        />
        {ring ? <circle cx={k.platz_x} cy={k.platz_y} r={r} strokeWidth={2.5} vectorEffect={NS} /> : null}
      </g>
    )
  }
  if (ziel.art === 'objekt') {
    const o = daten.objekte.find((x) => x.id === ziel.id)
    if (!o) return null
    return (
      <polygon
        points={objektUmriss(o).map((p) => p.join(',')).join(' ')}
        fill="none"
        style={{ stroke: farbe }}
        strokeWidth={breite}
        vectorEffect={NS}
      />
    )
  }
  if (ziel.art === 'oeffnung') {
    const o = daten.oeffnungen.find((x) => x.id === ziel.id)
    const r = o ? daten.raeume.find((x) => x.id === o.raum_id) : null
    const s = o && r ? oeffnungPunkte(r, o) : null
    if (!s) return null
    return <line x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} style={{ stroke: farbe }} strokeWidth={WAND + 6} strokeOpacity={0.45} />
  }
  const r = daten.raeume.find((x) => x.id === ziel.id)
  if (!r) return null
  return (
    <polygon
      points={r.punkte.map((p) => p.join(',')).join(' ')}
      fill="none"
      style={{ stroke: farbe }}
      strokeWidth={breite}
      vectorEffect={NS}
      strokeDasharray="8 5"
    />
  )
}

export interface PlanEbenenProps {
  daten: GrundrissDaten
  /** Pixel je Zentimeter. */
  massstab: number
  /** Item-Id der gesuchten Kiste (oder eines Moebel-Eintrags): rot. */
  hervor?: string | null
  auswahl?: PlanTreffer | null
  kisten?: boolean
  beschriftung?: boolean
}

/** Alle Ebenen ohne eigenes svg, fuer PlanBild und den Zeichner. */
export function PlanEbenen({ daten, massstab, hervor, auswahl, kisten = true, beschriftung = true }: PlanEbenenProps) {
  const hervorZiel = useMemo<PlanTreffer | null>(() => {
    if (!hervor) return null
    if (daten.kisten.some((k) => k.id === hervor)) return { art: 'kiste', id: hervor }
    const o = daten.objekte.find((x) => x.item_id === hervor)
    return o ? { art: 'objekt', id: o.id } : null
  }, [daten.kisten, daten.objekte, hervor])
  return (
    <g>
      <BodenEbene raeume={daten.raeume} />
      <WandFarbEbene raeume={daten.raeume} />
      <ObjektEbene objekte={daten.objekte} massstab={massstab} />
      {kisten ? <KistenEbene kisten={daten.kisten} massstab={massstab} /> : null}
      <WandEbene raeume={daten.raeume} oeffnungen={daten.oeffnungen} />
      <OeffnungEbene raeume={daten.raeume} oeffnungen={daten.oeffnungen} />
      {beschriftung ? <BeschriftungEbene raeume={daten.raeume} massstab={massstab} /> : null}
      {auswahl ? <Markierung daten={daten} ziel={auswahl} farbe="var(--plan-auswahl)" massstab={massstab} /> : null}
      {hervorZiel ? <Markierung daten={daten} ziel={hervorZiel} farbe="var(--plan-hervor)" massstab={massstab} ring /> : null}
    </g>
  )
}

export interface PlanBildProps {
  daten: GrundrissDaten
  ausschnitt?: { raumId: string } | 'alles'
  hervor?: string | null
  auswahl?: PlanTreffer | null
  ebenen?: { kisten?: boolean; beschriftung?: boolean }
  onTipp?: (p: Punkt, treffer: PlanTreffer | null) => void
  /** Hoechstens so hoch (CSS), die Breite folgt dem Platz. */
  maxHoehe?: string
  className?: string
  label?: string
  /** Zwei-Finger-Zoom und Verschieben mit einem Finger (Handy). Nur dann
   *  gilt touch-action: none, und nur auf dieser Flaeche; ein Tipp nach
   *  einer Geste setzt nichts. */
  zoomen?: boolean
  /** Zusaetzliche Zeichnung in Plan-cm ueber allen Ebenen (Geist beim
   *  Platzieren). Bekommt den Massstab in Pixel je cm. */
  zusatz?: (massstab: number) => ReactNode
}

/** Ab so vielen Pixeln Bewegung ist es eine Geste, kein Tipp. */
const GESTE_PX = 8
const ZOOM_MAX = 8

type Ansicht = { z: number; cx: number; cy: number }

/** Fertige Draufsicht mit Rahmen um den Ausschnitt. */
export function PlanBild({
  daten,
  ausschnitt = 'alles',
  hervor,
  auswahl,
  ebenen,
  onTipp,
  maxHoehe = '70vh',
  className,
  label,
  zoomen = false,
  zusatz,
}: PlanBildProps) {
  const { t } = useSprache()
  const huelle = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [groesse, setGroesse] = useState<[number, number]>([0, 0])
  const [ansicht, setAnsicht] = useState<Ansicht | null>(null)
  /* Laufende Geste: Zeiger, Startabstand, Startansicht, ob schon bewegt. */
  const zeiger = useRef(new Map<number, { x: number; y: number }>())
  const geste = useRef<{ bewegt: boolean; start: Ansicht; abstand: number; mitte: [number, number] } | null>(null)

  const box = useMemo(() => {
    const b = datenBox(daten, ausschnitt === 'alles' ? null : ausschnitt.raumId) ?? { x0: 0, y0: 0, x1: 400, y1: 300 }
    const rand = Math.max(40, Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.04)
    return { x: b.x0 - rand, y: b.y0 - rand, w: b.x1 - b.x0 + 2 * rand, h: b.y1 - b.y0 + 2 * rand }
  }, [daten, ausschnitt])

  /* Neuer Ausschnitt: wieder ganz zeigen. */
  const boxSchluessel = `${box.x},${box.y},${box.w},${box.h}`
  useEffect(() => setAnsicht(null), [boxSchluessel])

  useLayoutEffect(() => {
    const el = huelle.current
    if (!el) return
    const messen = () => setGroesse([el.clientWidth, el.clientHeight])
    messen()
    const ro = new ResizeObserver(messen)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* Sichtbarer Ausschnitt: bei Zoom kleiner, um die Mitte, nie ueber den
   * Rand der Box hinaus. */
  const sicht = useMemo(() => {
    if (!ansicht || ansicht.z <= 1) return box
    const w = box.w / ansicht.z
    const h = box.h / ansicht.z
    const x = Math.min(Math.max(ansicht.cx - w / 2, box.x), box.x + box.w - w)
    const y = Math.min(Math.max(ansicht.cy - h / 2, box.y), box.y + box.h - h)
    return { x, y, w, h }
  }, [ansicht, box])

  const massstab =
    groesse[0] > 0 ? Math.min(groesse[0] / sicht.w, (groesse[1] || Infinity) / sicht.h) : 0.5

  /** Bildschirmpunkt in Plan-cm (ohne Runden). */
  function inPlan(clientX: number, clientY: number): [number, number] | null {
    if (!svg.current) return null
    const m = svg.current.getScreenCTM()
    if (!m) return null
    const pt = svg.current.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const q = pt.matrixTransform(m.inverse())
    return [q.x, q.y]
  }

  function tippen(clientX: number, clientY: number) {
    if (!onTipp) return
    const q = inPlan(clientX, clientY)
    if (!q) return
    const p: Punkt = [Math.round(q[0]), Math.round(q[1])]
    onTipp(p, trefferAn(daten, p, px(massstab, 10), ebenen?.kisten !== false))
  }

  /** Die Ansicht, wie sie gerade zu sehen ist (Mitte nach dem Begrenzen). */
  function jetzigeAnsicht(): Ansicht {
    return { z: ansicht?.z ?? 1, cx: sicht.x + sicht.w / 2, cy: sicht.y + sicht.h / 2 }
  }

  /** cm je Bildschirmpixel bei Zoom 1 und die Mitte der Flaeche am
   *  Bildschirm. preserveAspectRatio meet: die knappere Richtung zaehlt. */
  function flaeche(): { basis: number; sx: number; sy: number } {
    const r = huelle.current?.getBoundingClientRect()
    const w = Math.max(1, r?.width ?? 1)
    const h = Math.max(1, r?.height ?? 1)
    return { basis: Math.max(box.w / w, box.h / h), sx: (r?.left ?? 0) + w / 2, sy: (r?.top ?? 0) + h / 2 }
  }

  function runter(e: ReactPointerEvent<SVGSVGElement>) {
    if (!zoomen) return
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const punkte = [...zeiger.current.values()]
    if (punkte.length === 1) {
      geste.current = { bewegt: false, start: jetzigeAnsicht(), abstand: 0, mitte: [e.clientX, e.clientY] }
    } else if (punkte.length === 2) {
      const [a, b] = punkte
      geste.current = {
        bewegt: true,
        start: jetzigeAnsicht(),
        abstand: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mitte: [(a.x + b.x) / 2, (a.y + b.y) / 2],
      }
    }
  }

  function bewegen(e: ReactPointerEvent<SVGSVGElement>) {
    if (!zoomen || !zeiger.current.has(e.pointerId) || !geste.current) return
    zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = geste.current
    const punkte = [...zeiger.current.values()]
    const { basis, sx, sy } = flaeche()
    if (punkte.length >= 2) {
      const [a, b] = punkte
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const z = Math.min(ZOOM_MAX, Math.max(1, (g.start.z * d) / g.abstand))
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      // Der Planpunkt, der zu Beginn zwischen den Fingern lag, bleibt zwischen den Fingern.
      const p0x = g.start.cx + (g.mitte[0] - sx) * (basis / g.start.z)
      const p0y = g.start.cy + (g.mitte[1] - sy) * (basis / g.start.z)
      setAnsicht({ z, cx: p0x - (mx - sx) * (basis / z), cy: p0y - (my - sy) * (basis / z) })
      return
    }
    const dx = e.clientX - g.mitte[0]
    const dy = e.clientY - g.mitte[1]
    if (!g.bewegt && Math.hypot(dx, dy) < GESTE_PX) return
    g.bewegt = true
    if (g.start.z <= 1) return
    const k = basis / g.start.z
    setAnsicht({ z: g.start.z, cx: g.start.cx - dx * k, cy: g.start.cy - dy * k })
  }

  function hoch(e: ReactPointerEvent<SVGSVGElement>) {
    if (!zoomen) {
      tippen(e.clientX, e.clientY)
      return
    }
    const warGeste = geste.current?.bewegt ?? true
    zeiger.current.delete(e.pointerId)
    if (zeiger.current.size === 0) {
      geste.current = null
      if (!warGeste) tippen(e.clientX, e.clientY)
    } else if (geste.current) {
      // Ein Finger bleibt: ab hier weiter verschieben, nie mehr tippen.
      const [rest] = [...zeiger.current.values()]
      geste.current = { bewegt: true, start: jetzigeAnsicht(), abstand: 0, mitte: [rest.x, rest.y] }
    }
  }

  function abbrechen(e: ReactPointerEvent<SVGSVGElement>) {
    zeiger.current.delete(e.pointerId)
    if (zeiger.current.size === 0) geste.current = null
  }

  const mitGesten = zoomen || Boolean(onTipp)

  return (
    <div
      dir="ltr"
      ref={huelle}
      className={cx('relative w-full overflow-hidden rounded-2xl border border-line', className)}
      style={{ aspectRatio: `${box.w} / ${box.h}`, maxHeight: maxHoehe, background: 'var(--plan-grund)' }}
    >
      <svg
        ref={svg}
        viewBox={`${sicht.x} ${sicht.y} ${sicht.w} ${sicht.h}`}
        className={cx('absolute inset-0 h-full w-full select-none', onTipp && 'cursor-pointer')}
        style={zoomen ? { touchAction: 'none' } : undefined}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={label}
        onPointerDown={zoomen ? runter : undefined}
        onPointerMove={zoomen ? bewegen : undefined}
        onPointerUp={mitGesten ? hoch : undefined}
        onPointerCancel={zoomen ? abbrechen : undefined}
      >
        <PlanEbenen
          daten={daten}
          massstab={massstab}
          hervor={hervor}
          auswahl={auswahl}
          kisten={ebenen?.kisten}
          beschriftung={ebenen?.beschriftung}
        />
        {zusatz ? zusatz(massstab) : null}
      </svg>
      {zoomen && ansicht && ansicht.z > 1.01 ? (
        <button
          type="button"
          onClick={() => setAnsicht(null)}
          className="absolute end-2 top-2 flex h-11 items-center rounded-xl border-2 border-line bg-surface px-3 text-sm font-bold text-ink shadow-sm transition active:scale-95"
        >
          {t('plan.zoom_zurueck')}
        </button>
      ) : null}
    </div>
  )
}

/** Kleine Legende: Tuer, Fenster, gesuchte Kiste. */
export function PlanLegende({ mitKiste = true }: { mitKiste?: boolean }) {
  const { t } = useSprache()
  const eintrag = (farbe: string, text: string) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-5 rounded-full" style={{ background: farbe }} />
      {text}
    </span>
  )
  return (
    <div className="t-sub flex flex-wrap gap-x-4 gap-y-1">
      {eintrag('var(--plan-tuer)', t('plan.tuer'))}
      {eintrag('var(--plan-fenster)', t('plan.fenster'))}
      {mitKiste ? eintrag('var(--plan-hervor)', t('plan.legende_hier')) : null}
    </div>
  )
}
