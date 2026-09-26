import { memo, useMemo } from 'react'
import { OeffnungForm, PlanEbenen } from '../components/plan/PlanBild'
import { innenNormale, objektUmriss, type PlanTreffer } from '../components/plan/hilfe'
import { rasterLinien, type Ansicht } from '../components/plan/ansicht'
import type { Punkt } from '../lib/geometrie'
import { useSprache } from '../lib/i18n'
import type { Auswahl, Dok } from './dok'
import type { Vorschau } from './werkzeuge/typen'

/* Die Zeichenflaeche: Raster, der Plan (dieselben Ebenen wie PlanBild),
 * Masse an jeder Wand, Griffe am gewaehlten Raum und was das Werkzeug
 * gerade zeigen will. Nur Anzeige; Zeiger und Tasten verarbeitet der
 * Zeichner. Immer dir="ltr", nie gespiegelt.
 */

export type { Ansicht }

const NS = 'non-scaling-stroke' as const

/* Das Raster fuellt immer die ganze sichtbare Flaeche, auch links und
 * oberhalb von 0,0: kein fester Kasten, der beim Verschieben in einer
 * Ecke stehen bleibt. */
const Raster = memo(function Raster({ a, w, h }: { a: Ansicht; w: number; h: number }) {
  const x1 = a.x + w / a.s
  const y1 = a.y + h / a.s
  const { schritt, xs, ys } = rasterLinien(a, w, h)
  const grossAlle = schritt <= 50 ? 100 : schritt * 10
  const linien: { x?: number; y?: number; gross: boolean }[] = [
    ...xs.map((x) => ({ x, gross: x % grossAlle === 0 })),
    ...ys.map((y) => ({ y, gross: y % grossAlle === 0 })),
  ]
  const oben = a.y
  const links = a.x
  // Gezeichnet wird nur zwischen 0 und 50000 cm: davor leicht abgedunkelt,
  // das Raster laeuft trotzdem durch.
  const G = 50000
  const draussen: { x: number; y: number; w: number; h: number }[] = []
  if (a.x < 0) draussen.push({ x: a.x, y: a.y, w: Math.min(0, x1) - a.x, h: y1 - a.y })
  if (x1 > G) draussen.push({ x: Math.max(G, a.x), y: a.y, w: x1 - Math.max(G, a.x), h: y1 - a.y })
  const ix0 = Math.max(0, a.x)
  const ix1 = Math.min(G, x1)
  if (ix1 > ix0 && a.y < 0) draussen.push({ x: ix0, y: a.y, w: ix1 - ix0, h: Math.min(0, y1) - a.y })
  if (ix1 > ix0 && y1 > G) draussen.push({ x: ix0, y: Math.max(G, a.y), w: ix1 - ix0, h: y1 - Math.max(G, a.y) })
  return (
    <g style={{ stroke: 'var(--plan-linie)' }}>
      {draussen.map((r, i) =>
        r.w > 0 && r.h > 0 ? (
          <rect key={`d${i}`} x={r.x} y={r.y} width={r.w} height={r.h} stroke="none" style={{ fill: 'var(--plan-linie)' }} fillOpacity={0.06} />
        ) : null,
      )}
      {linien.map((l, i) =>
        l.x !== undefined ? (
          <line key={i} x1={l.x} y1={oben} x2={l.x} y2={y1} strokeWidth={1} strokeOpacity={l.gross ? 0.45 : 0.18} vectorEffect={NS} />
        ) : (
          <line key={i} x1={links} y1={l.y} x2={x1} y2={l.y} strokeWidth={1} strokeOpacity={l.gross ? 0.45 : 0.18} vectorEffect={NS} />
        ),
      )}
    </g>
  )
})

export interface WandMass {
  raumId: string
  kante: number
  p: Punkt
  winkel: number
  laenge: number
}

/** Masse an jeder Wand, innen an der Wand, lesbar gedreht. */
function wandMasse(dok: Dok, s: number): WandMass[] {
  const out: WandMass[] = []
  for (const r of dok.raeume) {
    const n = r.punkte.length
    for (let k = 0; k < n; k++) {
      const a = r.punkte[k]
      const b = r.punkte[(k + 1) % n]
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (l * s < 34) continue
      const [nx, ny] = innenNormale(a, b)
      const v = 6 + 12 / s
      let winkel = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
      if (winkel > 90.5 || winkel < -89.5) winkel += 180
      out.push({ raumId: r.id, kante: k, p: [(a[0] + b[0]) / 2 + nx * v, (a[1] + b[1]) / 2 + ny * v], winkel, laenge: Math.round(l) })
    }
  }
  return out
}

function alsTreffer(a: Auswahl): PlanTreffer | null {
  if (!a) return null
  if (a.art === 'kante' || a.art === 'ecke') return { art: 'raum', id: a.raumId }
  return a
}

export function Leinwand({
  dok,
  auswahl,
  hervor,
  ansicht,
  breite,
  hoehe,
  vorschau,
  onMass,
}: {
  dok: Dok
  auswahl: Auswahl
  hervor: string | null
  ansicht: Ansicht
  breite: number
  hoehe: number
  vorschau: Vorschau
  onMass: (m: WandMass) => void
}) {
  const { t } = useSprache()
  const s = ansicht.s
  const masse = useMemo(() => wandMasse(dok, s), [dok, s])
  const fs = 11 / s
  const griffRaum =
    auswahl?.art === 'raum' ? auswahl.id : auswahl && 'raumId' in auswahl ? auswahl.raumId : null
  const raum = griffRaum ? dok.raeume.find((r) => r.id === griffRaum) : null

  return (
    <svg
      viewBox={`${ansicht.x} ${ansicht.y} ${breite / s} ${hoehe / s}`}
      width={breite}
      height={hoehe}
      className="block select-none"
      role="img"
      aria-label={t('zeichner.leinwand')}
    >
      <Raster a={ansicht} w={breite} h={hoehe} />
      <PlanEbenen daten={dok} massstab={s} hervor={hervor} auswahl={alsTreffer(auswahl)} />

      {/* Masse an jeder Wand; anklickbar zum Eintippen */}
      <g>
        {masse.map((m) => (
          <text
            key={`${m.raumId}-${m.kante}`}
            x={m.p[0]}
            y={m.p[1]}
            transform={`rotate(${m.winkel} ${m.p[0]} ${m.p[1]})`}
            textAnchor="middle"
            dominantBaseline="middle"
            className="t-serial cursor-text"
            style={{ fill: 'var(--muted)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--plan-boden)' }}
            strokeWidth={3 / s}
            onPointerDown={(e) => {
              e.stopPropagation()
              onMass(m)
            }}
          >
            {m.laenge}
          </text>
        ))}
      </g>

      {/* Griffe am gewaehlten Raum (Klasse nur fuer design/plan.css) */}
      {raum ? (
        <g className="plan-auswahl-ebene">
          {auswahl?.art === 'kante' ? (
            <line
              x1={raum.punkte[auswahl.kante][0]}
              y1={raum.punkte[auswahl.kante][1]}
              x2={raum.punkte[(auswahl.kante + 1) % raum.punkte.length][0]}
              y2={raum.punkte[(auswahl.kante + 1) % raum.punkte.length][1]}
              style={{ stroke: 'var(--plan-auswahl)' }}
              strokeWidth={5}
              vectorEffect={NS}
            />
          ) : null}
          {raum.punkte.map((p, i) => {
            const an = auswahl?.art === 'ecke' && auswahl.ecke === i
            const g = (an ? 10 : 7) / s
            return (
              <rect
                key={i}
                x={p[0] - g / 2}
                y={p[1] - g / 2}
                width={g}
                height={g}
                style={{ fill: an ? 'var(--plan-auswahl)' : 'var(--surface)', stroke: 'var(--plan-auswahl)' }}
                strokeWidth={1.5}
                vectorEffect={NS}
              />
            )
          })}
        </g>
      ) : null}

      <VorschauEbene v={vorschau} s={s} />
    </svg>
  )
}

function VorschauEbene({ v, s }: { v: Vorschau; s: number }) {
  const fs = 12 / s
  const farbe = (art: string) =>
    art === 'falsch' ? 'var(--plan-hervor)' : art === 'mass' ? 'var(--plan-linie)' : 'var(--plan-auswahl)'
  return (
    <g>
      {v.flaechen?.map((f, i) => (
        <polygon
          key={i}
          points={f.punkte.map((p) => p.join(',')).join(' ')}
          style={{ fill: f.art === 'falsch' ? 'var(--plan-hervor)' : 'var(--plan-auswahl)', stroke: farbe(f.art) }}
          fillOpacity={0.14}
          strokeWidth={2}
          strokeDasharray="7 4"
          vectorEffect={NS}
        />
      ))}
      {v.linien?.map((l, i) => (
        <line
          key={i}
          x1={l.a[0]}
          y1={l.a[1]}
          x2={l.b[0]}
          y2={l.b[1]}
          style={{ stroke: farbe(l.art) }}
          strokeWidth={l.art === 'mass' ? 1.25 : 2.5}
          strokeDasharray={l.art === 'hilfe' || l.art === 'mass' ? '6 4' : undefined}
          vectorEffect={NS}
        />
      ))}
      {v.oeffnung ? <OeffnungForm raum={v.oeffnung.raum} o={v.oeffnung.o} geist={v.oeffnung.ok ? 'ok' : 'falsch'} /> : null}
      {v.objekt ? (
        <polygon
          points={objektUmriss(v.objekt.o).map((p) => p.join(',')).join(' ')}
          style={{
            fill: v.objekt.ok ? 'var(--plan-auswahl)' : 'var(--plan-hervor)',
            stroke: v.objekt.ok ? 'var(--plan-auswahl)' : 'var(--plan-hervor)',
          }}
          fillOpacity={0.22}
          strokeWidth={2}
          vectorEffect={NS}
        />
      ) : null}
      {v.kiste ? (
        <rect
          x={v.kiste.x - v.kiste.ex / 2}
          y={v.kiste.y - v.kiste.ey / 2}
          width={v.kiste.ex}
          height={v.kiste.ey}
          style={{
            fill: v.kiste.ok ? 'var(--plan-auswahl)' : 'var(--plan-hervor)',
            stroke: v.kiste.ok ? 'var(--plan-auswahl)' : 'var(--plan-hervor)',
          }}
          fillOpacity={0.25}
          strokeWidth={2}
          vectorEffect={NS}
        />
      ) : null}
      {v.punkte?.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={6 / s} fill="none" style={{ stroke: 'var(--plan-auswahl)' }} strokeWidth={2} vectorEffect={NS} />
      ))}
      {v.texte?.map((x, i) => (
        <text
          key={i}
          x={x.p[0]}
          y={x.p[1] - 8 / s}
          textAnchor="middle"
          className="t-serial"
          style={{ fill: 'var(--plan-auswahl)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--surface)' }}
          strokeWidth={3.5 / s}
          fontWeight={800}
        >
          {x.text}
        </text>
      ))}
    </g>
  )
}
