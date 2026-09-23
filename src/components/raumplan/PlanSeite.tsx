import type { ReactElement } from 'react'
import { stapelDerZelle, zelleKey, type Raster } from '../../lib/raumplan'
import type { Item, Raumplan } from '../../lib/types'
import { contrastOn } from '../../lib/util'
import { useDoppeltipp } from './doppeltipp'

/* Eine Reihe des Zimmers von vorn gesehen, massstabsgetreu.
 *
 * Links die Hoehe in Zentimetern, unten der Boden, oben die Decke. Jede
 * Kiste steht als Rechteck in ihrer echten Hoehe, Regale mit ihren
 * Brettern. Hier sieht man, wo etwas in der Hoehe steht: "Brett 3, 85
 * bis 120 cm" wird zu einem Kasten auf Brusthoehe.
 *
 * Breite und Hoehe haben denselben Massstab: eine Zelle ist raster_cm
 * breit.
 */

export interface SeitenTipp {
  x: number
  y: number
  item: Item | null
}

const RAND_LINKS = 46
const RAND_OBEN = 26
const RAND_UNTEN = 44

export function PlanSeite({
  plan,
  raster,
  reihe,
  zelle,
  farbe,
  hervor,
  tuerLabel,
  deckeLabel,
  abwarten,
  onTipp,
  onDoppel,
}: {
  plan: Raumplan
  raster: Raster
  /** Welche Reihe (y) gezeigt wird. */
  reihe: number
  zelle: number
  farbe: string
  hervor: string | null
  tuerLabel: string
  deckeLabel: string
  /** Liegt eine Kiste in der Hand, wartet der einfache Tipp auf einen
   *  moeglichen zweiten, wie in der Karte von oben. */
  abwarten: boolean
  onTipp: (z: SeitenTipp) => void
  onDoppel: (z: SeitenTipp) => void
}) {
  const tippen = useDoppeltipp<SeitenTipp>(
    (z) => (z.item ? z.item.id : zelleKey(z.x, z.y)),
    onTipp,
    onDoppel,
    abwarten,
  )
  const { spalten, gesperrt, regalAuf } = raster
  const pxProCm = zelle / plan.raster_cm
  const innenH = plan.hoehe_cm * pxProCm
  const breite = RAND_LINKS + spalten * zelle + 8
  const hoehe = RAND_OBEN + innenH + RAND_UNTEN
  const boden = RAND_OBEN + innenH
  const yVon = (cm: number) => boden - cm * pxProCm

  const teile: ReactElement[] = []

  // Skala: alle 50 cm, bei sehr kleinem Massstab alle 100 cm.
  const schritt = pxProCm * 50 < 18 ? 100 : 50
  for (let cm = 0; cm <= plan.hoehe_cm; cm += schritt) {
    teile.push(
      <g key={`s${cm}`} pointerEvents="none">
        <line
          x1={RAND_LINKS - 6}
          x2={RAND_LINKS + spalten * zelle}
          y1={yVon(cm)}
          y2={yVon(cm)}
          stroke="var(--line)"
          strokeWidth={1}
        />
        <text
          x={RAND_LINKS - 9}
          y={yVon(cm) + 4}
          textAnchor="end"
          fontSize={11}
          fontWeight={700}
          fill="var(--muted)"
        >
          {cm}
        </text>
      </g>,
    )
  }

  for (let x = 0; x < spalten; x++) {
    const key = zelleKey(x, reihe)
    const links = RAND_LINKS + x * zelle

    // Die Spalte selbst ist antippbar, auch wenn nichts darin steht.
    teile.push(
      <rect
        key={`c${key}`}
        x={links}
        y={RAND_OBEN}
        width={zelle}
        height={innenH}
        fill={gesperrt.has(key) ? 'var(--raised)' : 'transparent'}
        onClick={() => tippen({ x, y: reihe, item: null })}
        style={{ cursor: 'pointer' }}
      />,
    )
    if (gesperrt.has(key)) continue

    const regal = regalAuf.get(key) ?? null
    if (regal) {
      // Pfosten an beiden Seiten und ein Strich je Brett.
      teile.push(
        <g key={`r${key}`} pointerEvents="none" stroke="var(--ink)">
          <line x1={links + 2} x2={links + 2} y1={boden} y2={yVon(regal.hoehe_cm)} strokeWidth={3} />
          <line
            x1={links + zelle - 2}
            x2={links + zelle - 2}
            y1={boden}
            y2={yVon(regal.hoehe_cm)}
            strokeWidth={3}
          />
          {regal.boeden_cm.map((h) => (
            <line key={h} x1={links + 2} x2={links + zelle - 2} y1={yVon(h)} y2={yVon(h)} strokeWidth={3} />
          ))}
        </g>,
      )
      if (regal.x === x && regal.name) {
        teile.push(
          <text
            key={`rn${key}`}
            x={links + 4}
            y={yVon(regal.hoehe_cm) - 5}
            fontSize={11}
            fontWeight={800}
            fill="var(--ink)"
            pointerEvents="none"
          >
            {regal.name.slice(0, 14)}
          </text>,
        )
      }
    }

    for (const s of stapelDerZelle(raster, x, reihe)) {
      for (const k of s.kisten) {
        const grund = k.item.mark_color ?? farbe
        const oben = yVon(k.oben)
        const h = (k.oben - k.unten) * pxProCm
        const leuchtet = k.item.id === hervor
        teile.push(
          <g
            key={k.item.id}
            onClick={() => tippen({ x, y: reihe, item: k.item })}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={links + 6}
              y={oben}
              width={zelle - 12}
              height={Math.max(2, h - 1)}
              fill={grund}
              stroke={leuchtet ? 'var(--ink)' : 'var(--line)'}
              strokeWidth={leuchtet ? 5 : 1.5}
            />
            {leuchtet ? (
              <rect
                x={links + 10}
                y={oben + 4}
                width={Math.max(0, zelle - 20)}
                height={Math.max(0, h - 9)}
                fill="none"
                stroke="var(--paper)"
                strokeWidth={2}
                pointerEvents="none"
              />
            ) : null}
            {h >= 15 && zelle >= 56 ? (
              <text
                x={links + zelle / 2}
                y={oben + Math.min(h / 2 + 4, 16)}
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
          </g>,
        )
      }
    }

    // Platznummer unter dem Boden, wie in der Karte von oben (ab 1).
    teile.push(
      <text
        key={`n${key}`}
        x={links + zelle / 2}
        y={boden + 16}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="var(--muted)"
        pointerEvents="none"
      >
        {x + 1}
      </text>,
    )
  }

  // Die Tuer, wenn sie in dieser Reihe liegt: ein roter Strich unter dem
  // Boden der Spalte.
  if (plan.tuer_y === reihe && plan.tuer_x !== null) {
    const links = RAND_LINKS + plan.tuer_x * zelle
    teile.push(
      <g key="tuer" pointerEvents="none">
        <line x1={links + 4} x2={links + zelle - 4} y1={boden + 24} y2={boden + 24} stroke="var(--danger)" strokeWidth={6} />
        <text x={links + zelle / 2} y={boden + 39} textAnchor="middle" fontSize={11} fontWeight={900} fill="var(--danger)">
          {tuerLabel}
        </text>
      </g>,
    )
  }

  return (
    <svg
      viewBox={`0 0 ${breite} ${hoehe}`}
      width={breite}
      height={hoehe}
      role="img"
      style={{ display: 'block' }}
    >
      {/* Decke gestrichelt, Boden kraeftig. */}
      <line
        x1={RAND_LINKS}
        x2={RAND_LINKS + spalten * zelle}
        y1={RAND_OBEN}
        y2={RAND_OBEN}
        stroke="var(--ink)"
        strokeWidth={2}
        strokeDasharray="8 6"
      />
      <text x={RAND_LINKS} y={RAND_OBEN - 8} fontSize={11} fontWeight={800} fill="var(--muted)">
        {deckeLabel}
      </text>
      {teile}
      <line
        x1={RAND_LINKS}
        x2={RAND_LINKS + spalten * zelle}
        y1={boden}
        y2={boden}
        stroke="var(--ink)"
        strokeWidth={4}
      />
    </svg>
  )
}
