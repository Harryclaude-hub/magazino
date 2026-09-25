import { useSprache } from '../../lib/i18n'
import type { Objekt, PlanKiste } from '../../lib/types'
import { cx } from '../../lib/util'
import { kisteAusdehnung, objektUmriss, punkteBox } from './hilfe'
import { objektName } from './lage'

/* Seitenansicht eines Stapels (Blick von vorne, x nach rechts, z nach
 * oben): Boden oder Objekt als Sockel, die Kisten mit ihrer Hoehe, oben
 * gestrichelt die Grenze (Decke, Fachdecke). So sieht man auf einen
 * Blick, in welcher Hoehe die gesuchte Kiste steht.
 */
export function StapelSeite({
  kisten,
  objekt,
  grenze,
  unten = 0,
  hervor,
  maxHoehe = '16rem',
  className,
}: {
  /** Die Kisten des Stapels, von unten nach oben (stapelVon). */
  kisten: PlanKiste[]
  /** Das Moebel darunter, wenn der Stapel oben auf einem steht. */
  objekt?: Objekt | null
  /** Oberste erlaubte Hoehe (Raumdecke oder Fachdecke). */
  grenze: number
  /** Hoehe der untersten Flaeche (0 am Boden, Brett im Fach). */
  unten?: number
  hervor?: string | null
  maxHoehe?: string
  className?: string
}) {
  const { t } = useSprache()
  if (kisten.length === 0) return null
  let x0 = Infinity
  let x1 = -Infinity
  for (const k of kisten) {
    const [ex] = kisteAusdehnung(k)
    x0 = Math.min(x0, k.platz_x - ex / 2)
    x1 = Math.max(x1, k.platz_x + ex / 2)
  }
  const sockel = objekt ? punkteBox(objektUmriss(objekt)) : null
  if (sockel) {
    x0 = Math.min(x0, sockel.x0)
    x1 = Math.max(x1, sockel.x1)
  }
  const breite = x1 - x0
  const rand = Math.max(24, breite * 0.25)
  const zUnten = unten - 8
  const zOben = grenze + 10
  const vb = { x: x0 - rand, y: -zOben, w: breite + 2 * rand, h: zOben - zUnten }
  const fs = Math.max(5, Math.min(vb.w, vb.h) / 18)

  return (
    <div dir="ltr" className={cx('w-full', className)}>
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="h-auto w-full select-none"
        style={{ maxHeight: maxHoehe }}
        role="img"
        aria-label={t('plan.stapel_seite')}
      >
        {/* Unterkante: Boden oder Brett */}
        <line x1={vb.x} y1={-unten} x2={vb.x + vb.w} y2={-unten} style={{ stroke: 'var(--plan-wand)' }} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        {/* Grenze gestrichelt */}
        <line x1={vb.x} y1={-grenze} x2={vb.x + vb.w} y2={-grenze} style={{ stroke: 'var(--plan-linie)' }} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        <text x={vb.x + 4} y={-grenze - fs * 0.4} className="t-serial" style={{ fill: 'var(--muted)', fontSize: fs * 0.8 }}>
          {grenze}
        </text>

        {objekt && sockel ? (
          <g>
            <rect
              x={sockel.x0}
              y={-objekt.hoehe_cm}
              width={sockel.x1 - sockel.x0}
              height={objekt.hoehe_cm - unten}
              style={{ fill: 'var(--plan-objekt)', stroke: 'var(--plan-objekt-rand)' }}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={(sockel.x0 + sockel.x1) / 2}
              y={-objekt.hoehe_cm / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: 'var(--ink)', fontSize: fs * 0.85 }}
              fontWeight={700}
            >
              {objektName(t, objekt)}
            </text>
          </g>
        ) : null}

        {kisten.map((k) => {
          const [ex] = kisteAusdehnung(k)
          const rot = k.id === hervor
          const hoehe = k.oben_cm - k.unten_cm
          return (
            <g key={k.id}>
              <rect
                x={k.platz_x - ex / 2}
                y={-k.oben_cm}
                width={ex}
                height={hoehe}
                rx={1}
                style={{
                  fill: rot ? 'var(--plan-hervor)' : (k.mark_color ?? k.room_color ?? 'var(--plan-objekt)'),
                  stroke: rot ? 'var(--plan-hervor)' : 'var(--plan-kiste-rand)',
                }}
                fillOpacity={rot ? 0.55 : 0.7}
                strokeWidth={rot ? 3 : 1}
                vectorEffect="non-scaling-stroke"
              />
              {hoehe > fs * 1.1 ? (
                <text
                  x={k.platz_x}
                  y={-k.oben_cm + hoehe / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="t-serial"
                  style={{ fill: 'var(--ink)', fontSize: fs * 0.8 }}
                >
                  {k.code}
                </text>
              ) : null}
              <text
                x={k.platz_x + ex / 2 + 3}
                y={-k.oben_cm + fs * 0.35}
                className="t-serial"
                style={{ fill: 'var(--muted)', fontSize: fs * 0.7 }}
              >
                {k.oben_cm}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
