import type { ReactElement } from 'react'
import { QrCode } from '../ui'
import { stapelDerZelle, zelleKey, type Raster } from '../../lib/raumplan'
import type { Raumplan, TuerSeite } from '../../lib/types'
import { appUrl, contrastOn } from '../../lib/util'
import { useDoppeltipp } from './doppeltipp'

/* Der Raumplan von oben.
 *
 * Eine Zelle zeigt die oberste Kiste ihres Stapels, darunter die Hoehe
 * des Stapels in cm. Wie viele Kisten uebereinander stehen, steht in der
 * Nummernzeile und nicht auf dem QR-Code: ein Zaehler in der Ecke deckte
 * ein Suchmuster ab, und der Code liess sich nicht mehr scannen.
 *
 * Regale sind ein Rahmen ueber ihre Zellen. Auf jeder Regalzelle steht,
 * wie viele Kisten darauf sind.
 *
 * Die Karte wird nie gespiegelt: sie zeigt, wo etwas steht, auch im
 * arabischen Satz.
 */

/** Seitenlaenge einer Zelle in Zeichenkoordinaten. */
export const S = 100

/** Ab dieser Zellgroesse passt ein QR-Code hinein, den ein Telefon auch
 *  wirklich liest. Darunter steht nur die Nummer. */
export const QR_AB = 128

const QR_SEITE = 50

export interface ZellTipp {
  x: number
  y: number
}

export function Plan2D({
  plan,
  raster,
  zelle,
  farbe,
  hervor,
  auswahlZelle,
  tuerLabel,
  hoeheText,
  abwarten,
  markeFarbe = 'var(--ink)',
  onTipp,
  onDoppel,
}: {
  plan: Raumplan
  raster: Raster
  /** Bildpunkte je Zelle. */
  zelle: number
  /** Farbe des Zimmers, fuer Kisten ohne eigene Markierung. */
  farbe: string
  /** Die Kiste, die hervorgehoben wird: angetippt oder gesucht. */
  hervor: string | null
  /** Eine angetippte Zelle ohne Kiste, etwa ein Regal. */
  auswahlZelle: ZellTipp | null
  tuerLabel: string
  /** Die Stapelhoehe als Text in der Sprache der Seite, etwa "132 cm". */
  hoeheText: (cm: number) => string
  /** Liegt eine Kiste in der Hand, wartet der einfache Tipp auf einen
   *  moeglichen zweiten. Siehe useDoppeltipp. */
  abwarten: boolean
  /** Farbe des aeusseren Rands um die hervorgehobene Kiste. Im kleinen
   *  Plan der Suche rot, damit sie sich vom Rahmen eines Regals abhebt. */
  markeFarbe?: string
  onTipp: (z: ZellTipp) => void
  onDoppel: (z: ZellTipp) => void
}) {
  const tippen = useDoppeltipp<ZellTipp>((z) => zelleKey(z.x, z.y), onTipp, onDoppel, abwarten)
  const { spalten, reihen, gesperrt, regalAuf } = raster
  const zeigeQr = zelle >= QR_AB

  const zellen: ReactElement[] = []
  for (let y = 0; y < reihen; y++) {
    for (let x = 0; x < spalten; x++) {
      const key = zelleKey(x, y)
      const aus = gesperrt.has(key)
      const regal = regalAuf.get(key) ?? null
      const stapel = stapelDerZelle(raster, x, y)
      const boden = regal ? null : (stapel.find((s) => s.brett === null) ?? null)
      const oben = boden ? boden.kisten[boden.kisten.length - 1]?.item : undefined
      const imRegal = regal ? stapel.reduce((n, s) => n + s.kisten.length, 0) : 0
      const leuchtet =
        (hervor !== null && stapel.some((s) => s.kisten.some((k) => k.item.id === hervor))) ||
        (auswahlZelle?.x === x && auswahlZelle.y === y)

      const grund = aus
        ? 'var(--paper)'
        : regal
          ? 'var(--raised)'
          : oben
            ? (oben.mark_color ?? farbe)
            : 'var(--surface)'
      const schrift = oben && !aus ? contrastOn(grund) : 'var(--ink)'
      const px = x * S
      const py = y * S

      zellen.push(
        <g
          key={key}
          id={`zelle-${x}-${y}`}
          onClick={() => tippen({ x, y })}
          style={{ cursor: 'pointer' }}
        >
          <rect x={px} y={py} width={S} height={S} fill={grund} stroke="var(--muted)" strokeWidth={1.5} />

          {/* Gesperrt: deutlich schraffiert, auch im dunklen Modus. */}
          {aus ? (
            <g stroke="var(--muted)" strokeWidth={3} opacity={0.7}>
              <path d={`M${px} ${py + S * 0.5}L${px + S * 0.5} ${py}`} />
              <path d={`M${px} ${py + S}L${px + S} ${py}`} />
              <path d={`M${px + S * 0.5} ${py + S}L${px + S} ${py + S * 0.5}`} />
            </g>
          ) : null}

          {/* Regalzelle: waagrechte Striche wie Bretter, und die Zahl der
              Kisten darauf. */}
          {regal ? (
            <g pointerEvents="none">
              <g stroke="var(--muted)" strokeWidth={2} opacity={0.6}>
                <path d={`M${px + 10} ${py + 30}H${px + S - 10}`} />
                <path d={`M${px + 10} ${py + 55}H${px + S - 10}`} />
                <path d={`M${px + 10} ${py + 80}H${px + S - 10}`} />
              </g>
              {imRegal > 0 ? (
                <>
                  <circle cx={px + S - 22} cy={py + 22} r={15} fill="var(--ink)" />
                  <text
                    x={px + S - 22}
                    y={py + 27}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={900}
                    fill="var(--paper)"
                  >
                    {imRegal}
                  </text>
                </>
              ) : null}
              {/* Der Name unten, damit er nicht an die Zahl oben stoesst. */}
              {regal.x === x && regal.y === y ? (
                <text x={px + 8} y={py + S - 8} fontSize={13} fontWeight={800} fill="var(--ink)">
                  {(regal.name || '').slice(0, 11)}
                </text>
              ) : null}
            </g>
          ) : null}

          {oben && boden ? (
            <g pointerEvents="none">
              <text
                x={px + S / 2}
                y={zeigeQr ? py + 17 : py + S / 2 - 2}
                textAnchor="middle"
                fontSize={zeigeQr ? 13 : 14}
                fontWeight={800}
                fontFamily="ui-monospace, monospace"
                fill={schrift}
              >
                {oben.code}
                {boden.kisten.length > 1 ? ` ×${boden.kisten.length}` : ''}
              </text>
              {zeigeQr ? (
                <g transform={`translate(${px + (S - QR_SEITE) / 2} ${py + 24})`}>
                  <QrCode value={appUrl(`s/${oben.id}`)} size={QR_SEITE} />
                </g>
              ) : null}
              <text
                x={px + S / 2}
                y={zeigeQr ? py + S - 8 : py + S / 2 + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill={schrift}
                opacity={0.85}
              >
                {hoeheText(Math.round(boden.oben))}
              </text>
            </g>
          ) : null}

          {/* Hervorgehoben: doppelter Rand, aussen dunkel, innen hell. So
              faellt er auf jeder Kistenfarbe auf, auch im dunklen Modus. */}
          {leuchtet ? (
            <g pointerEvents="none">
              <rect x={px + 3} y={py + 3} width={S - 6} height={S - 6} fill="none" stroke={markeFarbe} strokeWidth={7} />
              <rect x={px + 8} y={py + 8} width={S - 16} height={S - 16} fill="none" stroke="var(--paper)" strokeWidth={3} />
            </g>
          ) : null}
        </g>,
      )
    }
  }

  return (
    <svg
      viewBox={`-4 -4 ${spalten * S + 8} ${reihen * S + 8}`}
      width={spalten * zelle + 8}
      height={reihen * zelle + 8}
      role="img"
      style={{ display: 'block' }}
    >
      {zellen}

      {/* Jedes Regal als ein Rahmen ueber seine Zellen. */}
      {[...new Set(raster.regalAuf.values())].map((r) => (
        <rect
          key={r.id}
          x={r.x * S + 2}
          y={r.y * S + 2}
          width={r.breite * S - 4}
          height={r.tiefe * S - 4}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={5}
          pointerEvents="none"
        />
      ))}

      {/* Der Rand des Zimmers, kraeftig. */}
      <rect
        x={0}
        y={0}
        width={spalten * S}
        height={reihen * S}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={4}
        pointerEvents="none"
      />

      {plan.tuer_x !== null && plan.tuer_y !== null && plan.tuer_seite ? (
        <TuerMarke
          x={plan.tuer_x}
          y={plan.tuer_y}
          seite={plan.tuer_seite}
          label={tuerLabel}
          frei={!raster.stapel.has(`${plan.tuer_x},${plan.tuer_y},0`)}
        />
      ) : null}
    </svg>
  )
}

/** Die Tuer als dicker roter Strich an der Wand der Zelle. Steht auf der
 *  Zelle eine Kiste, faellt die Beschriftung weg. */
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--danger)" strokeWidth={12} />
      {frei ? (
        <text
          x={px + S / 2}
          y={py + S / 2 + 6}
          textAnchor="middle"
          fontSize={17}
          fontWeight={900}
          fill="var(--danger)"
        >
          {label}
        </text>
      ) : null}
    </g>
  )
}
