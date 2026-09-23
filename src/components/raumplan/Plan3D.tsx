import type { ReactElement } from 'react'
import { stapelDerZelle, zelleKey, type Raster } from '../../lib/raumplan'
import type { Raumplan } from '../../lib/types'
import { contrastOn } from '../../lib/util'
import { useDoppeltipp } from './doppeltipp'
import type { ZellTipp } from './Plan2D'

/* Der Raumplan schraeg von oben.
 *
 * Jede Kiste ist so hoch, wie sie wirklich ist, im selben Massstab wie
 * der Boden: eine Zellkante von raster_cm ist so lang wie der Weg von
 * einer Ecke der Raute zur naechsten. Regalbretter sind flache Platten
 * in ihrer Hoehe.
 *
 * Gezeichnet wird von hinten nach vorn und in jeder Zelle von unten nach
 * oben, damit Vorderes Hinteres verdeckt und nicht umgekehrt. Steht die
 * gesuchte Kiste unten im Stapel, werden die Kisten darueber
 * durchsichtig, sonst saehe man sie nicht.
 */

const ISO_B = 80
const ISO_T = 40
/** So lang ist eine Zellkante auf dem Bildschirm, in Zeichenpunkten. */
const KANTE = Math.hypot(ISO_B / 2, ISO_T / 2)

/** Dunkler mischen, fuer die beiden Seiten eines Klotzes. Eine Farbe, die
 *  sich nicht lesen laesst, bleibt, wie sie ist. */
function dunkler(hex: string, anteil: number): string {
  const roh = hex.replace('#', '')
  const voll = roh.length === 3 ? roh.split('').map((z) => z + z).join('') : roh
  if (voll.length !== 6) return hex
  const zahl = Number.parseInt(voll, 16)
  if (Number.isNaN(zahl)) return hex
  const r = Math.round(((zahl >> 16) & 255) * (1 - anteil))
  const g = Math.round(((zahl >> 8) & 255) * (1 - anteil))
  const b = Math.round((zahl & 255) * (1 - anteil))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function raute(px: number, py: number): string {
  return [
    `${px},${py}`,
    `${px + ISO_B / 2},${py + ISO_T / 2}`,
    `${px},${py + ISO_T}`,
    `${px - ISO_B / 2},${py + ISO_T / 2}`,
  ].join(' ')
}

export function Plan3D({
  plan,
  raster,
  zelle,
  farbe,
  hervor,
  tuerLabel,
  abwarten,
  onTipp,
  onDoppel,
}: {
  plan: Raumplan
  raster: Raster
  zelle: number
  farbe: string
  hervor: string | null
  tuerLabel: string
  abwarten: boolean
  onTipp: (z: ZellTipp) => void
  onDoppel: (z: ZellTipp) => void
}) {
  const tippen = useDoppeltipp<ZellTipp>((z) => zelleKey(z.x, z.y), onTipp, onDoppel, abwarten)
  const { spalten, reihen, gesperrt, regalAuf } = raster
  const pxProCm = KANTE / plan.raster_cm

  function lage(x: number, y: number, cm: number): { px: number; py: number } {
    return {
      px: (x - y) * (ISO_B / 2),
      py: (x + y) * (ISO_T / 2) - cm * pxProCm,
    }
  }

  const reihenfolge: Array<[number, number]> = []
  for (let y = 0; y < reihen; y++) for (let x = 0; x < spalten; x++) reihenfolge.push([x, y])
  reihenfolge.sort((a, b) => a[0] + a[1] - (b[0] + b[1]))

  let hoechste = 0
  for (const s of raster.stapel.values()) hoechste = Math.max(hoechste, s.oben)
  for (const r of regalAuf.values()) hoechste = Math.max(hoechste, r.hoehe_cm)

  const teile: ReactElement[] = []
  for (const [x, y] of reihenfolge) {
    const key = zelleKey(x, y)
    if (gesperrt.has(key)) continue
    const { px, py } = lage(x, y, 0)
    const tuerHier = plan.tuer_x === x && plan.tuer_y === y
    const regal = regalAuf.get(key) ?? null

    teile.push(
      <polygon
        key={`b${key}`}
        points={raute(px, py)}
        fill={tuerHier ? 'var(--danger)' : regal ? 'var(--raised)' : 'var(--surface)'}
        stroke="var(--muted)"
        strokeWidth={1.5}
        onClick={() => tippen({ x, y })}
        style={{ cursor: 'pointer' }}
      />,
    )
    if (tuerHier) {
      teile.push(
        <text
          key={`t${key}`}
          x={px}
          y={py + ISO_T / 2 + 5}
          textAnchor="middle"
          fontSize={14}
          fontWeight={900}
          fill="var(--paper)"
          pointerEvents="none"
        >
          {tuerLabel}
        </text>,
      )
    }

    /* Alles, was in dieser Zelle steht, nach Unterkante sortiert:
     * Bretter und Kisten. */
    const dinge: Array<{ unten: number; el: ReactElement }> = []

    if (regal) {
      regal.boeden_cm.forEach((h, i) => {
        if (h === 0) return
        const { px: bx, py: by } = lage(x, y, h)
        dinge.push({
          unten: h - 0.01,
          el: (
            <polygon
              key={`r${key}-${i}`}
              points={raute(bx, by)}
              fill="var(--muted)"
              fillOpacity={0.35}
              stroke="var(--ink)"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          ),
        })
      })
    }

    const zellStapel = stapelDerZelle(raster, x, y)
    for (const s of zellStapel) {
      const tiefste = hervor ? s.kisten.findIndex((k) => k.item.id === hervor) : -1
      s.kisten.forEach((k, i) => {
        const grund = k.item.mark_color ?? farbe
        const hoehe = (k.oben - k.unten) * pxProCm
        const { px: bx, py: by } = lage(x, y, k.oben)
        const leuchtet = k.item.id === hervor
        // Ueber der gesuchten Kiste wird es durchsichtig.
        const blass = tiefste >= 0 && i > tiefste
        const obersteImStapel = i === s.kisten.length - 1
        dinge.push({
          unten: k.unten,
          el: (
            <g
              key={k.item.id}
              onClick={() => tippen({ x, y })}
              style={{ cursor: 'pointer' }}
              opacity={blass ? 0.3 : 1}
            >
              <polygon
                points={[
                  `${bx - ISO_B / 2},${by + ISO_T / 2}`,
                  `${bx},${by + ISO_T}`,
                  `${bx},${by + ISO_T + hoehe}`,
                  `${bx - ISO_B / 2},${by + ISO_T / 2 + hoehe}`,
                ].join(' ')}
                fill={dunkler(grund, 0.32)}
                stroke="var(--line)"
                strokeWidth={1.5}
              />
              <polygon
                points={[
                  `${bx + ISO_B / 2},${by + ISO_T / 2}`,
                  `${bx},${by + ISO_T}`,
                  `${bx},${by + ISO_T + hoehe}`,
                  `${bx + ISO_B / 2},${by + ISO_T / 2 + hoehe}`,
                ].join(' ')}
                fill={dunkler(grund, 0.18)}
                stroke="var(--line)"
                strokeWidth={1.5}
              />
              <polygon
                points={raute(bx, by)}
                fill={grund}
                stroke={leuchtet ? 'var(--ink)' : 'var(--line)'}
                strokeWidth={leuchtet ? 6 : 1.5}
              />
              {obersteImStapel || leuchtet ? (
                <text
                  x={bx}
                  y={by + ISO_T / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={800}
                  fontFamily="ui-monospace, monospace"
                  fill={contrastOn(grund)}
                  pointerEvents="none"
                >
                  {k.item.code}
                </text>
              ) : null}
            </g>
          ),
        })
      })
    }

    dinge.sort((a, b) => a.unten - b.unten)
    for (const d of dinge) teile.push(d.el)
  }

  const minPx = -(reihen - 1) * (ISO_B / 2) - ISO_B / 2 - 10
  const maxPx = (spalten - 1) * (ISO_B / 2) + ISO_B / 2 + 10
  const minPy = -hoechste * pxProCm - 10
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
      {teile}
    </svg>
  )
}
