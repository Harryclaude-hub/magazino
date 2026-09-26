import { useMemo } from 'react'
import { useSprache } from '../../lib/i18n'
import { fachDecke, kisteUeberstand2, objektLokal, ueberstandCm } from '../../lib/geometrie'
import type { Objekt, PlanKiste } from '../../lib/types'
import { cx } from '../../lib/util'
import { kisteAusdehnung, spaltenBereich, stapelWurzel } from './hilfe'
import { objektName } from './lage'

/* Vorderansicht eines Regals oder Schranks in cm (z nach oben). Jedes Fach
 * (Ebene, Spalte) ist eine Kachel mit "44 bis 78 cm"; darin stehen die
 * Kisten, die in diesem Fach (oder oben auf dem Objekt) stehen. Ein Tipp
 * auf eine Kachel waehlt das Fach, wenn onFach gesetzt ist.
 *
 * Wie die Draufsicht nie gespiegelt: dir="ltr". Brettdicke 2 cm, Spalten
 * gleich breit mit 2 cm Teilern (BAUPLAN 2.2).
 *
 * Ragt eine Kiste in der Tiefe aus dem Fach (0033), sieht man das von
 * vorn nicht; sie bekommt dann einen gestrichelten Rand und "25 cm vor".
 * Gerechnet wird aus der Lage des Objekts, wenn sie bekannt ist (auch im
 * Zeichner vor dem Speichern), sonst gilt ueberstand_cm der Datenbank.
 */

type Form = Pick<Objekt, 'breite_cm' | 'hoehe_cm' | 'brett_cm' | 'spalten' | 'name' | 'art'> &
  Partial<Pick<Objekt, 'id' | 'x' | 'y' | 'drehung' | 'tiefe_cm'>>

export function FachAnsicht({
  objekt,
  kisten = [],
  hervor,
  auswahl,
  onFach,
  maxHoehe = '22rem',
  className,
}: {
  objekt: Form
  kisten?: PlanKiste[]
  hervor?: string | null
  auswahl?: { ebene: number; spalte: number } | null
  onFach?: (ebene: number, spalte: number) => void
  maxHoehe?: string
  className?: string
}) {
  const { t, lang } = useSprache()
  const B = objekt.breite_cm
  const H = objekt.hoehe_cm
  const brett = objekt.brett_cm ?? []

  /* Kisten dieses Objekts: die Kette endet in einem Fach oder oben drauf. */
  const eigene = useMemo(() => {
    if (!objekt.id) return []
    return kisten
      .filter((k) => {
        const w = stapelWurzel(k, kisten)
        return (w.unterlage_art === 'fach' || w.unterlage_art === 'objekt') && w.unterlage_objekt_id === objekt.id
      })
      .sort((a, b) => a.unten_cm - b.unten_cm)
  }, [kisten, objekt.id])

  const obenDrauf = eigene.reduce((m, k) => Math.max(m, k.oben_cm - H), 0)
  const skala = 34
  const x0 = -skala
  const y0 = -(H + Math.min(obenDrauf, 120) + 12)
  const w = B + skala + 8
  const h = -y0 + 10
  const fs = Math.max(6, Math.min(B, H) / 16)
  const schritt = H > 160 ? 50 : H > 60 ? 20 : 10

  const kacheln: { e: number; s: number; x0: number; x1: number; z0: number; z1: number }[] = []
  for (let e = 1; e <= brett.length; e++) {
    for (let s = 1; s <= Math.max(1, objekt.spalten); s++) {
      const [a, b] = spaltenBereich(objekt, s)
      kacheln.push({ e, s, x0: a, x1: b, z0: brett[e - 1], z1: fachDecke(objekt, e) })
    }
  }

  return (
    <div dir="ltr" className={cx('w-full', className)}>
      <svg
        viewBox={`${x0} ${y0} ${w} ${h}`}
        className="h-auto w-full select-none"
        style={{ maxHeight: maxHoehe }}
        role="img"
        aria-label={objektName(t, objekt)}
      >
        {/* Skala in cm */}
        {Array.from({ length: Math.floor(H / schritt) + 1 }, (_, i) => i * schritt).map((z) => (
          <g key={z}>
            <line x1={-6} y1={-z} x2={0} y2={-z} style={{ stroke: 'var(--plan-linie)' }} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={-9} y={-z} textAnchor="end" dominantBaseline="middle" className="t-serial" style={{ fill: 'var(--muted)', fontSize: fs }}>
              {z}
            </text>
          </g>
        ))}
        <line x1={x0} y1={0} x2={B + 8} y2={0} style={{ stroke: 'var(--plan-wand)' }} strokeWidth={2} vectorEffect="non-scaling-stroke" />

        {/* Korpus, Teiler, Bretter */}
        <rect x={0} y={-H} width={B} height={H} style={{ fill: 'var(--plan-objekt)', stroke: 'var(--plan-objekt-rand)' }} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {Array.from({ length: Math.max(0, objekt.spalten - 1) }, (_, i) => {
          const [, ende] = spaltenBereich(objekt, i + 1)
          return <rect key={i} x={ende} y={-H} width={2} height={H} style={{ fill: 'var(--plan-fach)' }} />
        })}
        {brett.map((b, i) => (
          <rect key={i} x={0} y={-b} width={B} height={Math.min(2, Math.max(1, b))} style={{ fill: 'var(--plan-fach)', stroke: 'var(--plan-objekt-rand)' }} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        ))}
        <rect x={0} y={-H} width={B} height={2} style={{ fill: 'var(--plan-fach)' }} />

        {/* Faecher als Kacheln */}
        {kacheln.map((k) => {
          const gewaehlt = auswahl?.ebene === k.e && auswahl?.spalte === k.s
          const hoch = k.z1 - k.z0
          return (
            <g
              key={`${k.e}-${k.s}`}
              onClick={onFach ? () => onFach(k.e, k.s) : undefined}
              className={onFach ? 'cursor-pointer' : undefined}
              role={onFach ? 'button' : undefined}
              aria-label={onFach ? t('plan.fach', { ebene: k.e, spalte: k.s }) : undefined}
            >
              <rect
                x={k.x0}
                y={-k.z1}
                width={Math.max(0, k.x1 - k.x0)}
                height={Math.max(0, hoch)}
                style={{
                  fill: gewaehlt ? 'var(--plan-auswahl)' : 'var(--plan-boden)',
                  stroke: gewaehlt ? 'var(--plan-auswahl)' : 'transparent',
                }}
                fillOpacity={gewaehlt ? 0.25 : 0.55}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {hoch > fs * 1.6 && k.x1 - k.x0 > fs * 5 ? (
                <text
                  x={(k.x0 + k.x1) / 2}
                  y={-k.z1 + fs * 1.1}
                  textAnchor="middle"
                  style={{
                    fill: 'var(--muted)',
                    fontSize: fs * 0.85,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    direction: lang === 'ar' ? 'rtl' : 'ltr',
                    unicodeBidi: 'isolate',
                  }}
                >
                  {t('plan.von_bis', { von: k.z0, bis: k.z1 })}
                </text>
              ) : null}
            </g>
          )
        })}

        {/* Kisten in der Vorderansicht */}
        {eigene.map((k) => {
          const [ex, ey] = kisteAusdehnung(k)
          const quer = objekt.drehung === 90 || objekt.drehung === 270
          const breite = quer ? ey : ex
          let mitte = B / 2
          if (objekt.x !== undefined && objekt.y !== undefined && objekt.drehung !== undefined) {
            mitte = objektLokal({ x: objekt.x, y: objekt.y, drehung: objekt.drehung }, k.platz_x, k.platz_y)[0]
          }
          const rot = k.id === hervor
          const hoehe = k.oben_cm - k.unten_cm
          let vor = k.ueberstand_cm ?? 0
          if (
            k.unterlage_art === 'fach' &&
            objekt.x !== undefined &&
            objekt.y !== undefined &&
            objekt.drehung !== undefined &&
            objekt.tiefe_cm !== undefined
          ) {
            vor = ueberstandCm(
              kisteUeberstand2(
                { x: objekt.x, y: objekt.y, drehung: objekt.drehung, tiefe_cm: objekt.tiefe_cm },
                k.platz_x,
                k.platz_y,
                { drehung: k.platz_drehung, laenge: k.laenge_cm, breite: k.breite_cm },
              ),
            )
          } else if (k.unterlage_art !== 'fach') {
            vor = 0
          }
          return (
            <g key={k.id}>
              <rect
                x={mitte - breite / 2}
                y={-k.oben_cm}
                width={breite}
                height={hoehe}
                rx={1}
                style={{
                  fill: rot ? 'var(--plan-hervor)' : (k.mark_color ?? k.room_color ?? 'var(--plan-objekt)'),
                  stroke: rot ? 'var(--plan-hervor)' : 'var(--plan-kiste-rand)',
                }}
                fillOpacity={rot ? 0.55 : 0.7}
                strokeWidth={rot ? 3 : vor > 0 ? 1.5 : 1}
                strokeDasharray={vor > 0 && !rot ? '4 3' : undefined}
                vectorEffect="non-scaling-stroke"
              >
                {vor > 0 ? <title>{t('plan.ragt_vor_lang', { code: k.code, cm: vor })}</title> : null}
              </rect>
              {vor > 0 && breite > fs * 3 && hoehe > fs * 2.4 ? (
                <text
                  x={mitte}
                  y={-k.unten_cm - fs * 0.35}
                  textAnchor="middle"
                  style={{
                    fill: 'var(--ink)',
                    fontSize: fs * 0.7,
                    fontWeight: 700,
                    direction: lang === 'ar' ? 'rtl' : 'ltr',
                    unicodeBidi: 'isolate',
                  }}
                >
                  {t('plan.ragt_vor', { cm: vor })}
                </text>
              ) : null}
              {breite > fs * 4 && hoehe > fs * 1.2 ? (
                <text
                  x={mitte}
                  y={-k.oben_cm + hoehe / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="t-serial"
                  style={{ fill: 'var(--ink)', fontSize: fs * 0.8 }}
                >
                  {k.code}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
