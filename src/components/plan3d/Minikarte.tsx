import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Map as KarteIcon } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import { initials } from '../../lib/util'
import type { Karte3D, Pose3D, Sprungziel3D } from './vertrag3d'

/* Die Minikarte der Siedlung (E86), unten rechts in der 3D-Ansicht.
 *
 * Eine Ansicht von oben aus Welt3D.karte (Weltmeter, x nach Osten, z nach
 * Sueden, also Norden oben wie ein Plan): Haeuser mit Namen, Wege,
 * Strasse, Garten und Spielplatz. Dazu die eigene Stelle als Pfeil in
 * Blickrichtung und die anderen als Punkte mit Kuerzel; wer auf einem
 * anderen Stockwerk ist, steht blass. Oben steht das Stockwerk.
 *
 * Antippen eines Hauses fuehrt hin (Raum3D waehlt das Sprungziel, siehe
 * sprungImHaus); daneben passiert nichts. Mit Tasten geht es ueber die
 * Haeuser, die ein Ziel haben (Tab, dann Enter).
 *
 * Laeuft neben dem Bild her, ohne Raum3D neu zu zeichnen: die Lage kommt
 * ueber lage() (Refs in Raum3D) und wird hoechstens 5-mal je Sekunde
 * gelesen; neu gezeichnet wird nur die Karte und nur, wenn sich etwas
 * sichtbar bewegt hat. Eingeklappt bleibt nur ein runder Knopf, das merkt
 * sich das Geraet ('kistly.minikarte.zu').
 *
 * Die Karte wird nie gespiegelt, auch nicht im Arabischen (sie liegt im
 * 3D-Behaelter mit dir=ltr, Norden bleibt oben, Osten rechts). Namen
 * stehen, wie sie gespeichert sind.
 *
 * Die Rechnungen darunter sind ohne Browser pruefbar
 * (scripts/minikarte-pruefen.mjs). */

type P = [number, number]

/** Wo man steht und wo die anderen stehen; null ohne Begehen. */
export interface MinikarteLage {
  eigene: Pose3D | null
  andere: ReadonlyMap<string, Pose3D>
}

/** Eine Person fuer die Punkte: Name fuer das Kuerzel, Farbe wie die Figur. */
export interface MinikartePerson {
  uid: string
  name: string
  farbe: string
}

/** Hoechstens so oft je Sekunde wird die Lage gelesen. */
export const KARTE_TAKT_MS = 200
/** Schluessel im Speicher des Geraets: '1' heisst eingeklappt. */
export const KARTE_ZU_SCHLUESSEL = 'kistly.minikarte.zu'
/** Augenhoehe im Stehen (wie im Motor), um Stockwerke zu vergleichen. */
const AUGE_M = 1.64
/** Wer mehr als so viel hoeher oder tiefer steht, ist auf einem anderen Stockwerk. */
const STOCKWERK_M = 2
/** Ein Sprungziel gehoert zu einem Haus, wenn es hoechstens so weit vor dem
 *  Umriss liegt (Haustuer, Laubengang). */
export const HAUS_RAND_M = 4
/** Ein Meter Hoehenunterschied wiegt beim Waehlen des Ziels wie so viele
 *  Meter Weg (ein Stockwerk von 3 m also wie 12 m): das eigene Stockwerk
 *  gewinnt fast immer. */
const STOCKWERK_GEWICHT = 4
/** So weit neben einem Haus (in Bildpunkten) zaehlt ein Tippen noch. */
const TREFFER_PX = 10
/** Breite der Karte in Bildpunkten, bevor sie gemessen ist. */
const PX_START = 160

/* ----------------------------------------------------- reine Rechnungen */

/** Der Ausschnitt der Karte als Quadrat in Weltmetern (x, y = z oben
 *  links, seite) mit etwas Rand. null bei kaputtem oder leerem Rahmen. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenAusschnitt(rahmen: readonly number[] | null | undefined): { x: number; y: number; seite: number } | null {
  if (!Array.isArray(rahmen) || rahmen.length !== 4 || !rahmen.every((v) => typeof v === 'number' && Number.isFinite(v))) return null
  const x0 = Math.min(rahmen[0], rahmen[2])
  const x1 = Math.max(rahmen[0], rahmen[2])
  const z0 = Math.min(rahmen[1], rahmen[3])
  const z1 = Math.max(rahmen[1], rahmen[3])
  const roh = Math.max(x1 - x0, z1 - z0)
  if (!(roh >= 1)) return null
  const seite = roh * 1.08
  return { x: (x0 + x1) / 2 - seite / 2, y: (z0 + z1) / 2 - seite / 2, seite }
}

/** Liegt p im Vieleck (gerade-ungerade Regel)? */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function imPolygon(p: readonly [number, number], poly: readonly (readonly [number, number])[]): boolean {
  let drin = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) drin = !drin
  }
  return drin
}

/** Abstand von p zum Umriss in Metern, 0 innen. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function abstandZumUmriss(p: readonly [number, number], poly: readonly (readonly [number, number])[]): number {
  if (poly.length === 0) return Infinity
  if (poly.length >= 3 && imPolygon(p, poly)) return 0
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const l2 = dx * dx + dz * dz
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz)))
  }
  return best
}

function flaeche(poly: readonly (readonly [number, number])[]): number {
  let f = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    f += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(f) / 2
}

/** Welches Haus liegt an der Stelle p (Weltmeter)? Erst eines, in dem p
 *  liegt (bei mehreren das kleinste), sonst das naechste bis toleranz
 *  Meter daneben. null: keines. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function hausAn(karte: Karte3D, p: readonly [number, number], toleranz: number): number | null {
  let drin = -1
  let drinFlaeche = Infinity
  let nah = -1
  let nahAbstand = Infinity
  for (let i = 0; i < karte.haeuser.length; i++) {
    const h = karte.haeuser[i]
    if (!Array.isArray(h.punkte) || h.punkte.length < 3) continue
    const a = abstandZumUmriss(p, h.punkte)
    if (a === 0) {
      const f = flaeche(h.punkte)
      if (f < drinFlaeche) {
        drin = i
        drinFlaeche = f
      }
    } else if (a <= toleranz && a < nahAbstand) {
      nah = i
      nahAbstand = a
    }
  }
  if (drin >= 0) return drin
  return nah >= 0 ? nah : null
}

/** Das Sprungziel fuer ein angetipptes Haus: eines, das im Umriss oder
 *  bis HAUS_RAND_M davor liegt, moeglichst auf dem eigenen Stockwerk und
 *  nah an der Stelle p. augeY: eigene Augenhoehe in der Welt (beim
 *  Begehen), sonst null, dann zaehlt das unterste Stockwerk. ebenenY: Boden
 *  jeder Ebene der Welt (Index wie Sprungziel3D.ebene). Ein Stockwerk
 *  Unterschied wiegt wie 12 m Weg. null: das Haus hat kein Ziel. */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function sprungImHaus(
  haus: readonly (readonly [number, number])[],
  ziele: readonly Sprungziel3D[],
  ebenenY: readonly number[],
  p: readonly [number, number],
  augeY: number | null,
): number | null {
  const kandidaten: { i: number; y: number; weg: number }[] = []
  ziele.forEach((z, i) => {
    const y = ebenenY[z.ebene]
    if (!Number.isFinite(z.x) || !Number.isFinite(z.z) || typeof y !== 'number' || !Number.isFinite(y)) return
    if (abstandZumUmriss([z.x, z.z], haus) > HAUS_RAND_M) return
    kandidaten.push({ i, y, weg: Math.hypot(z.x - p[0], z.z - p[1]) })
  })
  if (kandidaten.length === 0) return null
  const bezug = augeY !== null && Number.isFinite(augeY) ? augeY : Math.min(...kandidaten.map((k) => k.y)) + AUGE_M
  let best = kandidaten[0]
  let bestWert = Infinity
  for (const k of kandidaten) {
    const wert = k.weg + STOCKWERK_GEWICHT * Math.abs(k.y + AUGE_M - bezug)
    if (wert < bestWert - 1e-9) {
      best = k
      bestWert = wert
    }
  }
  return best.i
}

/** Drehung des Pfeils in Grad (SVG, im Uhrzeigersinn) fuer die
 *  Blickrichtung gier (0 = nach -z, also nach Norden, oben). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function pfeilGrad(gier: number): number {
  if (!Number.isFinite(gier)) return 0
  const g = (-gier * 180) / Math.PI
  return Math.round((((g % 360) + 540) % 360) - 180)
}

/** Was die Karte zeichnet, gerundet: neu gezeichnet wird nur, wenn sich
 *  schluessel aendert (10 cm, 5 Grad, Stockwerk). */
export interface KartenStand {
  ich: { x: number; z: number; grad: number } | null
  andere: { uid: string; x: number; z: number; blass: boolean }[]
  schluessel: string
}

// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export function kartenStand(lage: MinikarteLage): KartenStand {
  const r = (v: number) => Math.round(v * 10) / 10
  const e = lage.eigene
  const ich = e && Number.isFinite(e.x) && Number.isFinite(e.z) ? { x: r(e.x), z: r(e.z), grad: Math.round(pfeilGrad(e.gier) / 5) * 5 } : null
  const andere: KartenStand['andere'] = []
  for (const [uid, p] of lage.andere) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) continue
    const blass = !!e && Number.isFinite(e.y) && Number.isFinite(p.y) && Math.abs(p.y - e.y) > STOCKWERK_M
    andere.push({ uid, x: r(p.x), z: r(p.z), blass })
  }
  andere.sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0))
  const schluessel = JSON.stringify([ich, andere])
  return { ich, andere, schluessel }
}

/** Eingeklappt? Ohne Speicher (privates Fenster): offen. */
function zuLesen(): boolean {
  try {
    return localStorage.getItem(KARTE_ZU_SCHLUESSEL) === '1'
  } catch {
    return false
  }
}

function zuMerken(zu: boolean) {
  try {
    if (zu) localStorage.setItem(KARTE_ZU_SCHLUESSEL, '1')
    else localStorage.removeItem(KARTE_ZU_SCHLUESSEL)
  } catch {
    /* ohne Speicher gilt es bis zum Neuladen */
  }
}

const FLAECHE_FARBE: Record<Karte3D['flaechen'][number]['art'], { fill: string; opacity: number }> = {
  garten: { fill: 'var(--ok)', opacity: 0.16 },
  weg: { fill: 'var(--plan-boden)', opacity: 1 },
  strasse: { fill: 'var(--plan-linie)', opacity: 0.85 },
  spielplatz: { fill: 'var(--plan-strom)', opacity: 0.35 },
}

const punkteText = (poly: readonly (readonly [number, number])[]) => poly.map((q) => `${q[0]},${q[1]}`).join(' ')

/* ------------------------------------------------------------ Ansicht */

export interface MinikarteProps {
  karte: Karte3D
  /** Liest die Lage (Refs); hoechstens alle KARTE_TAKT_MS gerufen. */
  lage: () => MinikarteLage
  /** Namen und Farben der anderen (fehlt jemand: '?' und grau). */
  leute: MinikartePerson[]
  /** Stockwerk beim Begehen (Name der Ebene), sonst null. */
  ebene: string | null
  /** Haeuser (Index in karte.haeuser) mit einem Ziel: nur sie sind mit
   *  Tasten erreichbar. Fehlt es, gelten alle. */
  springbar?: readonly boolean[]
  /** Ein Haus wurde angetippt, an der Stelle x, z (Weltmeter). */
  onHaus: (haus: number, x: number, z: number) => void
}

export default function Minikarte({ karte, lage, leute, ebene, springbar, onHaus }: MinikarteProps) {
  const { t } = useSprache()
  const [zu, setZu] = useState(zuLesen)
  const ausschnitt = useMemo(() => kartenAusschnitt(karte.rahmen), [karte])
  const lageRef = useRef(lage)
  useEffect(() => {
    lageRef.current = lage
  })
  const [stand, setStand] = useState<KartenStand>(() => kartenStand(lage()))
  useEffect(() => {
    if (zu) return
    const uhr = window.setInterval(() => {
      if (document.hidden) return
      const neu = kartenStand(lageRef.current())
      setStand((alt) => (alt.schluessel === neu.schluessel ? alt : neu))
    }, KARTE_TAKT_MS)
    return () => window.clearInterval(uhr)
  }, [zu])

  // Breite in Bildpunkten: Schrift, Punkte und Tippen bleiben gleich gross,
  // egal wie gross die Siedlung ist.
  const flaecheRef = useRef<SVGSVGElement>(null)
  const [px, setPx] = useState(PX_START)
  useEffect(() => {
    const el = flaecheRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width
      if (w > 0) setPx(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [zu])

  useEffect(() => {
    if (!ausschnitt) console.warn('[minikarte] Rahmen der Karte unbrauchbar, Karte bleibt weg')
  }, [ausschnitt])

  const leuteNach = useMemo(() => new Map(leute.map((l) => [l.uid, l])), [leute])
  // Haus mit dem Tastenfokus: dicker Rand, weil SVG-Gruppen keinen eigenen zeigen.
  const [fokus, setFokus] = useState<number | null>(null)

  if (!ausschnitt) return null

  if (zu) {
    return (
      <button
        type="button"
        aria-expanded={false}
        aria-label={t('siedlung.minikarte_auf')}
        title={t('siedlung.minikarte_auf')}
        onClick={() => {
          setZu(false)
          zuMerken(false)
          setStand(kartenStand(lageRef.current()))
        }}
        className="knopf flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-surface/95 text-ink shadow"
      >
        <KarteIcon size={18} />
      </button>
    )
  }

  const u = ausschnitt.seite / Math.max(40, px)
  const tippen = (e: { clientX: number; clientY: number; currentTarget: SVGSVGElement }) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    const x = ausschnitt.x + ((e.clientX - r.left) / r.width) * ausschnitt.seite
    const z = ausschnitt.y + ((e.clientY - r.top) / r.height) * ausschnitt.seite
    const haus = hausAn(karte, [x, z], TREFFER_PX * (ausschnitt.seite / r.width))
    if (haus !== null) onHaus(haus, x, z)
  }

  return (
    <div className="w-[132px] overflow-hidden rounded-2xl border-2 border-line bg-surface/95 shadow-lg sm:w-44 lg:w-52">
      <div className="flex items-center gap-1 border-b border-line ps-2 pe-0.5">
        <span dir="auto" className="min-w-0 flex-1 truncate py-1 text-xs font-bold text-ink" title={ebene ?? undefined}>
          {ebene ?? t('siedlung.minikarte')}
        </span>
        <button
          type="button"
          aria-expanded
          aria-label={t('siedlung.minikarte_zu')}
          title={t('siedlung.minikarte_zu')}
          onClick={() => {
            setZu(true)
            zuMerken(true)
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
        >
          <ChevronDown size={17} />
        </button>
      </div>
      <svg
        ref={flaecheRef}
        viewBox={`${ausschnitt.x} ${ausschnitt.y} ${ausschnitt.seite} ${ausschnitt.seite}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label={t('siedlung.minikarte_bild')}
        className="block aspect-square w-full cursor-pointer touch-manipulation select-none"
        onClick={tippen}
      >
        <rect x={ausschnitt.x} y={ausschnitt.y} width={ausschnitt.seite} height={ausschnitt.seite} fill="var(--plan-boden-draussen)" />
        {karte.flaechen.map((f, i) =>
          Array.isArray(f.punkte) && f.punkte.length >= 3 ? (
            <polygon key={`f${i}`} points={punkteText(f.punkte)} fill={FLAECHE_FARBE[f.art]?.fill ?? 'var(--plan-boden)'} fillOpacity={FLAECHE_FARBE[f.art]?.opacity ?? 1} />
          ) : null,
        )}
        {karte.haeuser.map((h, i) => {
          if (!Array.isArray(h.punkte) || h.punkte.length < 3) return null
          const ziel = springbar ? springbar[i] === true : true
          const mitte = mitteVon(h.punkte)
          const breitePx = breiteVon(h.punkte) / u
          const schrift = 9 * u
          // Der Name nur, wenn er ungefaehr ueber das Haus passt.
          const passt = h.name && h.name.length * 5.2 <= breitePx * 1.4
          return (
            <g
              key={`h${i}`}
              data-haus={i}
              role={ziel ? 'button' : undefined}
              tabIndex={ziel ? 0 : undefined}
              aria-label={ziel ? t('siedlung.springen_zu', { name: h.name || t('siedlung.haus') }) : undefined}
              onKeyDown={
                ziel
                  ? (e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      e.stopPropagation()
                      onHaus(i, mitte[0], mitte[1])
                    }
                  : undefined
              }
              onFocus={ziel ? () => setFokus(i) : undefined}
              onBlur={ziel ? () => setFokus((v) => (v === i ? null : v)) : undefined}
              className="outline-none"
            >
              <polygon
                points={punkteText(h.punkte)}
                fill="var(--plan-wand-3d)"
                stroke={fokus === i ? 'var(--ink)' : 'var(--plan-objekt-rand)'}
                strokeWidth={(fokus === i ? 3 : 1.2) * u}
                strokeLinejoin="round"
              />
              {passt ? (
                <text
                  x={mitte[0]}
                  y={mitte[1]}
                  fontSize={schrift}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--ink)"
                  stroke="var(--surface)"
                  strokeWidth={2.4 * u}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {h.name}
                </text>
              ) : null}
            </g>
          )
        })}
        {/* Norden oben, klein in der Ecke. */}
        <text
          x={ausschnitt.x + ausschnitt.seite - 10 * u}
          y={ausschnitt.y + 10 * u}
          fontSize={9 * u}
          fontWeight={800}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--muted)"
          pointerEvents="none"
        >
          {t('siedlung.norden')}
        </text>
        {stand.andere.map((a) => {
          const wer = leuteNach.get(a.uid)
          return (
            <g key={a.uid} data-person={a.uid} opacity={a.blass ? 0.45 : 1} pointerEvents="none">
              <circle cx={a.x} cy={a.z} r={8 * u} fill={wer?.farbe ?? 'var(--muted)'} stroke="var(--surface)" strokeWidth={1.5 * u} />
              <text x={a.x} y={a.z} fontSize={7.5 * u} fontWeight={800} textAnchor="middle" dominantBaseline="central" fill="#ffffff">
                {initials(wer?.name, '?').slice(0, 2)}
              </text>
              <title>{wer?.name || '?'}</title>
            </g>
          )
        })}
        {stand.ich ? (
          <g data-ich="" transform={`translate(${stand.ich.x} ${stand.ich.z}) rotate(${stand.ich.grad}) scale(${u})`} pointerEvents="none">
            <path d="M0,-10 L7,8 L0,4 L-7,8 Z" fill="var(--plan-hervor)" stroke="var(--surface)" strokeWidth={1.6} strokeLinejoin="round" />
            <title>{t('siedlung.minikarte_du')}</title>
          </g>
        ) : null}
      </svg>
    </div>
  )
}

function mitteVon(poly: readonly (readonly [number, number])[]): P {
  let x = 0
  let z = 0
  for (const q of poly) {
    x += q[0]
    z += q[1]
  }
  return [x / poly.length, z / poly.length]
}

function breiteVon(poly: readonly (readonly [number, number])[]): number {
  let lo = Infinity
  let hi = -Infinity
  for (const q of poly) {
    lo = Math.min(lo, q[0])
    hi = Math.max(hi, q[0])
  }
  return hi - lo
}
