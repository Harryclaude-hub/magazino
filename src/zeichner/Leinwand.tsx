import { memo, useMemo } from 'react'
import { OeffnungForm, PlanEbenen } from '../components/plan/PlanBild'
import { innenNormale, objektUmriss, type PlanTreffer } from '../components/plan/hilfe'
import { rasterLinien, type Ansicht } from '../components/plan/ansicht'
import type { Punkt } from '../lib/geometrie'
import { useSprache } from '../lib/i18n'
import type { Auswahl, Dok } from './dok'
import type { Messpunkt, MesspunktEnde } from './messpunkte'
import { textLage, type Vorschau } from './werkzeuge/typen'

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
  // Eine Hilfslinie markiert die Leinwand selbst (siehe unten).
  if (a.art === 'linie' || a.art === 'symbol') return null
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
  teppiche = true,
}: {
  dok: Dok
  auswahl: Auswahl
  hervor: string | null
  ansicht: Ansicht
  breite: number
  hoehe: number
  vorschau: Vorschau
  onMass: (m: WandMass) => void
  teppiche?: boolean
}) {
  const { t } = useSprache()
  const s = ansicht.s
  const masse = useMemo(() => wandMasse(dok, s), [dok, s])
  const fs = 11 / s
  const griffRaum =
    auswahl?.art === 'raum' ? auswahl.id : auswahl && 'raumId' in auswahl ? auswahl.raumId : null
  const raum = griffRaum ? dok.raeume.find((r) => r.id === griffRaum) : null
  const linie = auswahl?.art === 'linie' ? (dok.grundriss.linien ?? []).find((l) => l.id === auswahl.id) : null
  const symbol = auswahl?.art === 'symbol' ? (dok.grundriss.symbole ?? []).find((x) => x.id === auswahl.id) : null

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
      <PlanEbenen daten={dok} massstab={s} hervor={hervor} auswahl={alsTreffer(auswahl)} teppiche={teppiche} />

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

      {linie ? (
        <g className="plan-auswahl-ebene">
          <line
            x1={linie.a[0]}
            y1={linie.a[1]}
            x2={linie.b[0]}
            y2={linie.b[1]}
            style={{ stroke: 'var(--plan-auswahl)' }}
            strokeWidth={5}
            strokeOpacity={0.6}
            vectorEffect={NS}
          />
          {[linie.a, linie.b].map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={5 / s} style={{ fill: 'var(--surface)', stroke: 'var(--plan-auswahl)' }} strokeWidth={1.5} vectorEffect={NS} />
          ))}
        </g>
      ) : null}

      {symbol ? (
        <circle
          className="plan-auswahl-ebene"
          cx={symbol.x}
          cy={symbol.y}
          r={15 / s}
          fill="none"
          style={{ stroke: 'var(--plan-auswahl)' }}
          strokeWidth={2.5}
          vectorEffect={NS}
        />
      ) : null}

      <VorschauEbene v={vorschau} s={s} />
    </svg>
  )
}

/** Name eines Messpunkts fuer die Anzeige: "Tuer Bad, links", "Ecke".
 *  Stossen zwei Oeffnungen aneinander, stehen beide Enden da:
 *  "Tuer Bad, rechts / Fenster Bad, links". */
function messpunktName(t: (key: string, vars?: Record<string, string | number>) => string, m: Messpunkt): string {
  if (m.art === 'ecke') return t('zeichner.messen.ecke')
  return [m, ...(m.auch ?? [])].map((e) => endeName(t, e)).join(' / ')
}

function endeName(t: (key: string, vars?: Record<string, string | number>) => string, m: MesspunktEnde): string {
  const was =
    m.art === 'tuer' ? t('zeichner.werkzeug.tuer') : m.art === 'fenster' ? t('zeichner.werkzeug.fenster') : t('plan.durchgang')
  const ende = m.ende === 'rechts' ? t('zeichner.messen.rechts') : t('zeichner.messen.links')
  const name = m.raum ? t('zeichner.messen.punkt', { was, raum: m.raum, ende }) : t('zeichner.messen.punkt_ohne_raum', { was, ende })
  return m.gegenueber ? t('zeichner.messen.gegenueber', { name }) : name
}

function messFarbe(m: Messpunkt): string {
  return m.art === 'ecke' ? 'var(--plan-wand)' : m.art === 'fenster' ? 'var(--plan-fenster)' : 'var(--plan-tuer)'
}

/* Die Messpunkte der Wohnung beim Messen (E90): Ecken als kleine Quadrate
 * in der Wandfarbe, Enden von Tueren und Durchgaengen als Punkte in der
 * Tuerfarbe, Enden von Fenstern in der Fensterfarbe, die Gegenseite einer
 * Tuer hohl. Seit E93 sitzen sie auf der Innenkante der dunklen Wand (dort
 * wo die Wand endet), der helle Rand hebt sie von Wand und Boden ab.
 * Groessen in Bildpunkten, bei jedem Zoom gleich. Die Liste bleibt beim
 * Bewegen dieselbe (messpunkte.ts merkt sie sich), darum memo. */
const MesspunktEbene = memo(function MesspunktEbene({ alle, s }: { alle: Messpunkt[]; s: number }) {
  const r = 3.5 / s
  const q = 6.5 / s
  return (
    <g pointerEvents="none">
      {alle.map((m, i) =>
        m.art === 'ecke' ? (
          <rect
            key={i}
            x={m.p[0] - q / 2}
            y={m.p[1] - q / 2}
            width={q}
            height={q}
            style={{ fill: 'var(--plan-wand)', stroke: 'var(--surface)' }}
            strokeWidth={1.5}
            vectorEffect={NS}
          />
        ) : (
          <circle
            key={i}
            cx={m.p[0]}
            cy={m.p[1]}
            r={m.gegenueber ? r * 0.9 : r}
            style={m.gegenueber ? { fill: 'var(--surface)', stroke: messFarbe(m) } : { fill: messFarbe(m), stroke: 'var(--surface)' }}
            strokeWidth={m.gegenueber ? 2 : 1.5}
            vectorEffect={NS}
          />
        ),
      )}
    </g>
  )
})

/** Der Messpunkt unter dem Zeiger: Ring in der Auswahlfarbe und sein Name
 *  rechts oben daneben, bei einer halben Messung auf der Seite, die vom
 *  Anfang (von) wegzeigt, damit er nicht auf Linie und Zahl steht. Im
 *  Arabischen mit eigener Leserichtung. */
function MesspunktAn({ m, s, von }: { m: Messpunkt; s: number; von: Punkt | null }) {
  const { t, lang } = useSprache()
  const fs = 12 / s
  const rechts = !von || m.p[0] >= von[0]
  const unten = !!von && m.p[1] > von[1]
  const x = m.p[0] + ((rechts ? 1 : -1) * 11) / s
  const y = unten ? m.p[1] + 11 / s + fs * 0.8 : m.p[1] - 11 / s
  const rtl = lang === 'ar'
  // Text-Anker: im Arabischen (rtl) ist "end" das linke Ende der Zeile.
  const anker = rechts === rtl ? 'end' : 'start'
  return (
    <g pointerEvents="none" className="plan-auswahl-ebene">
      <circle cx={m.p[0]} cy={m.p[1]} r={9 / s} fill="none" style={{ stroke: 'var(--plan-auswahl)' }} strokeWidth={2.5} vectorEffect={NS} />
      <circle cx={m.p[0]} cy={m.p[1]} r={4.5 / s} style={{ fill: messFarbe(m), stroke: 'var(--surface)' }} strokeWidth={1.5} vectorEffect={NS} />
      <text
        x={x}
        y={y}
        direction={rtl ? 'rtl' : 'ltr'}
        textAnchor={anker}
        style={{ fill: 'var(--plan-auswahl)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--surface)', unicodeBidi: 'isolate' }}
        strokeWidth={3.5 / s}
        strokeLinejoin="round"
        fontWeight={800}
      >
        {messpunktName(t, m)}
      </text>
    </g>
  )
}

function VorschauEbene({ v, s }: { v: Vorschau; s: number }) {
  const { t, lang } = useSprache()
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
      {v.messpunkte ? <MesspunktEbene alle={v.messpunkte.alle} s={s} /> : null}
      {v.punkte?.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={6 / s} fill="none" style={{ stroke: 'var(--plan-auswahl)' }} strokeWidth={2} vectorEffect={NS} />
      ))}
      {v.messpunkte?.an ? <MesspunktAn m={v.messpunkte.an} s={s} von={v.messpunkte.von ?? null} /> : null}
      {v.texte?.map((x, i) => {
        // Entlang der Innenseite einer Wand in der Wand, sonst darueber.
        const l = textLage(x, s, fs)
        return (
          <text
            key={i}
            x={l.p[0]}
            y={l.p[1]}
            transform={l.winkel ? `rotate(${l.winkel} ${l.p[0]} ${l.p[1]})` : undefined}
            textAnchor="middle"
            dominantBaseline={l.mitte ? 'middle' : undefined}
            className="t-serial"
            // "Lichte 80": im Arabischen mit eigener Leserichtung (im style, weil
            // .t-serial sonst ltr erzwingt), die Zahl bleibt eine Zahl.
            style={{
              fill: 'var(--plan-auswahl)',
              fontSize: fs,
              paintOrder: 'stroke',
              stroke: 'var(--surface)',
              direction: x.lichte && lang === 'ar' ? 'rtl' : undefined,
            }}
            strokeWidth={3.5 / s}
            fontWeight={800}
          >
            {x.lichte ? `${t('zeichner.messen.lichte')} ${x.text}` : x.text}
          </text>
        )
      })}
    </g>
  )
}
