import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Ruler, RotateCcw, X } from 'lucide-react'
import type { Punkt } from '../../lib/geometrie'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten } from '../../lib/types'
import { cx } from '../../lib/util'
import { messpunkte, schnellMasse, wandSeite, type Messpunkt } from '../../zeichner/messpunkte'
import { cmZahl, textLage } from '../../zeichner/werkzeuge/typen'
import { Button } from '../ui'
import {
  GROSS_START,
  grossModus,
  grossTippen,
  messAbstand,
  messDurchgang,
  messLichte,
  messungNeu,
  punktName,
  schnellOeffnung,
  schnellUebersicht,
  type GrossModus,
  type GrossZustand,
  type HandyMessung,
} from './handyMessen'
import { PlanBild } from './PlanBild'
import { SchnellListe, TippDetails } from './PlanDetails'

/* Der Grundriss gross (E94): Karam will den Plan am Handy ganz sehen,
 * Dinge antippen und messen. Eine Ebene ueber allem (Portal an body,
 * fixed, die ganze Hoehe h-dvh, mit den Raendern des Geraets), die Seite
 * darunter rollt nicht mit.
 *
 * Oben eine Leiste: Schliessen, Name des Plans und der Schalter
 * "Ansehen | Messen". Darunter fuellt der Plan den ganzen Rest
 * (PlanBild fuellen), mit Zwei-Finger-Zoom, Verschieben und "Ganz zeigen"
 * wie unter dem Plan, hochkant wie quer.
 *
 *  Ansehen  ein Tipp zeigt, was dort ist, als Blatt von unten
 *           (PlanDetails.tsx); das Angetippte bleibt markiert.
 *  Messen   alle Messpunkte als kleine Marken (am Bildschirm immer gleich
 *           gross), Tipp 1 = A, Tipp 2 = B, Tipp 3 beginnt neu
 *           (handyMessen.ts). Linie und Zahl stehen im Plan und gross in
 *           der Leiste, mit den Namen von A und B wie im Zeichner: der
 *           Finger liegt auf dem Plan. Ist A ein Ende einer Oeffnung und B
 *           noch nicht gesetzt, stehen ihre Schnellmasse in Plan und
 *           Leiste. "Neu" loescht die Messung.
 *
 * Wer sie oeffnet, bestimmt die Seite (Grundriss.tsx, ?ansicht=gross in
 * der Adresse: Zurueck am Handy schliesst sie). Jedes Oeffnen beginnt mit
 * Ansehen, ohne Auswahl und ohne Messung (GROSS_START). Escape schliesst
 * erst ein offenes Blatt, dann die Ansicht. Solange sie offen ist, ist die
 * Seite darunter inert (Tab, Vorleser und Klicks bleiben in der Ebene),
 * beim Schliessen steht der Fokus wieder dort, wo er vorher war ("Gross
 * ansehen").
 *
 * Quer mit wenig Hoehe (Handy quer) steht das Blatt neben dem Plan wie ab
 * md: unter dem Plan bliebe ihm zwischen Leiste und Rand kaum Platz.
 *
 * Der Plan bleibt links nach rechts (PlanBild), Leiste und Blatt folgen
 * der Sprache, Zahlen stehen links nach rechts. Laedt aus dem Zeichner nur
 * reine Rechnung (messpunkte.ts, cmZahl und textLage aus typen.ts), nie
 * Zeichner.tsx oder die Leinwand.
 */

export interface PlanGrossProps {
  daten: GrundrissDaten
  /** Der offene Umzug (Weg zur Moebelseite, Links zur Kiste). */
  projektId: string
  /** Die gesuchte Kiste (rot), wie unter dem Plan. */
  hervor: string | null
  /** Der Raum aus der Adresse: markiert, solange nichts angetippt ist. */
  raumId: string | null
  onZu(): void
  /** "Moebelseite oeffnen": der Pfad in der App. */
  onSeite(pfad: string): void
}

/** Die grosse Ansicht als Ebene ueber der ganzen App. */
export function PlanGross(props: PlanGrossProps) {
  /* Solange die Ansicht offen ist, rollt die Seite darunter nicht und ist
   * inert: Tab und Umschalt+Tab bleiben in der Ebene (sie haengt per Portal
   * an body, neben #root), Vorleser lesen nur sie. Beim Schliessen kommt
   * der Fokus dorthin zurueck, wo er vorher war (der Knopf "Gross
   * ansehen"). Als Layout-Effekt, damit der Fokus gemerkt ist, bevor
   * GrossAnsicht ihn auf das X setzt. */
  useLayoutEffect(() => {
    const fokus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.getElementById('root')
    const rollen = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    root?.setAttribute('inert', '')
    return () => {
      document.body.style.overflow = rollen
      root?.removeAttribute('inert')
      if (fokus?.isConnected) fokus.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(<GrossAnsicht {...props} />, document.body)
}

/** Inhalt der grossen Ansicht ohne Portal. start: der Anfangszustand
 *  (Standard GROSS_START; die Pruefung rendert damit andere Zustaende). */
export function GrossAnsicht({
  daten,
  projektId,
  hervor,
  raumId,
  onZu,
  onSeite,
  start = GROSS_START,
}: PlanGrossProps & { start?: GrossZustand }) {
  const { t, dir } = useSprache()
  const [z, setZ] = useState<GrossZustand>(start)
  const zuRef = useRef(onZu)
  useEffect(() => {
    zuRef.current = onZu
  })
  // Beim Oeffnen steht der Fokus in der Ebene (auf dem X), nicht auf dem
  // Knopf darunter: Tastatur und Vorleser sind gleich in der Ansicht.
  const zuKnopf = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    zuKnopf.current?.focus({ preventScroll: true })
  }, [])
  const tippRef = useRef(z.tipp)
  useEffect(() => {
    tippRef.current = z.tipp
  })

  // Escape (Computer): erst das Blatt, dann die Ansicht.
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (tippRef.current) setZ((v) => ({ ...v, tipp: null }))
      else zuRef.current()
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [])

  const raumAuswahl = raumId && daten.raeume.some((r) => r.id === raumId) ? { art: 'raum' as const, id: raumId } : null
  const auswahl = z.modus === 'ansehen' ? (z.tipp ?? raumAuswahl) : null
  // Beim Ansehen einer Tuer oder eines Fensters stehen ihre Schnellmasse
  // auch im Plan: so sieht man, welches Ende links ist.
  const oeffnungId = z.modus === 'ansehen' && z.tipp?.art === 'oeffnung' ? z.tipp.id : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={daten.grundriss.name}
      dir={dir}
      data-plan-gross={z.modus}
      className="fixed inset-0 z-50 flex h-dvh flex-col overscroll-none bg-paper text-ink"
      style={{ paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}
    >
      <header className="safe-top shrink-0 border-b border-line bg-paper">
        <div className="flex items-center gap-2 px-2 py-2 [@media(max-height:30rem)]:py-1">
          <button
            ref={zuKnopf}
            type="button"
            onClick={onZu}
            aria-label={t('grundriss.gross_zu')}
            title={t('grundriss.gross_zu')}
            data-gross-zu=""
            className="knopf flex h-11 w-11 shrink-0 items-center justify-center rounded-knopf border-2 border-ink/12 bg-surface text-ink hover:border-ink/35"
          >
            <X size={22} />
          </button>
          <h2 dir="auto" className="line-clamp-2 min-w-0 flex-1 break-words text-sm leading-tight font-black sm:text-base">
            {daten.grundriss.name}
          </h2>
          <ModusSchalter modus={z.modus} onModus={(m) => setZ((v) => grossModus(v, m))} />
        </div>
        {z.modus === 'messen' ? (
          <MessLeiste daten={daten} messung={z.messung} onNeu={() => setZ(messungNeu)} />
        ) : (
          <p className="t-sub px-3 pb-2 [@media(max-height:30rem)]:hidden">{t('grundriss.antippen')}</p>
        )}
      </header>
      {/* Plan und Blatt in einer Spalte (ab md und quer mit wenig Hoehe
          nebeneinander, BLATT_KLASSEN): das Blatt nimmt sich unten
          hoechstens die Haelfte, der Plan rueckt darueber zusammen und
          zeigt denselben Ausschnitt, kleiner. So bleibt das Angetippte zu
          sehen und markiert. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row [@media(orientation:landscape)_and_(max-height:30rem)]:flex-row">
        <div className="relative min-h-0 min-w-0 flex-1">
          <PlanBild
            fuellen
            daten={daten}
            ausschnitt="alles"
            hervor={hervor}
            auswahl={auswahl}
            label={daten.grundriss.name}
            zoomen
            onTipp={(p, treffer, massstab) => setZ((v) => grossTippen(v, daten, p, treffer, massstab))}
            zusatz={
              z.modus === 'messen'
                ? (s) => <MessZeichnung daten={daten} messung={z.messung} s={s} />
                : oeffnungId
                  ? (s) => <SchnellZeichnung daten={daten} oeffnungId={oeffnungId} s={s} />
                  : undefined
            }
          />
        </div>
        {z.modus === 'ansehen' ? (
          <TippDetails
            daten={daten}
            tipp={z.tipp}
            projektId={projektId}
            hervor={hervor}
            form="blatt"
            onZu={() => setZ((v) => ({ ...v, tipp: null }))}
            onSeite={onSeite}
          />
        ) : null}
      </div>
    </div>
  )
}

/** "Ansehen | Messen": zwei Knoepfe, der gewaehlte dunkel (aria-pressed). */
function ModusSchalter({ modus, onModus }: { modus: GrossModus; onModus(m: GrossModus): void }) {
  const { t } = useSprache()
  const knopf = (m: GrossModus, symbol: ReactNode, text: string) => (
    <button
      type="button"
      aria-pressed={modus === m}
      data-modus={m}
      onClick={() => onModus(m)}
      className={cx(
        'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-bold transition',
        modus === m ? 'bg-ink text-paper' : 'text-ink hover:bg-raised',
      )}
    >
      {symbol}
      {text}
    </button>
  )
  return (
    <div role="group" aria-label={t('grundriss.modus')} className="flex shrink-0 rounded-xl border-2 border-line bg-surface p-0.5">
      {/* Die Symbole erst ab 420 px Breite: schmaler braucht der Name den Platz. */}
      {knopf('ansehen', <Eye size={17} className="hidden shrink-0 min-[420px]:block" />, t('grundriss.modus_ansehen'))}
      {knopf('messen', <Ruler size={17} className="hidden shrink-0 min-[420px]:block" />, t('grundriss.modus_messen'))}
    </div>
  )
}

/** Kleines A oder B vor einem Namen, wie im Plan. */
function Marke({ text }: { text: 'A' | 'B' }) {
  return (
    <span
      dir="ltr"
      aria-hidden="true"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-black text-paper"
      style={{ background: 'var(--plan-auswahl)' }}
    >
      {text}
    </span>
  )
}

/** Die Leiste beim Messen: der Abstand gross (mit "Lichte", wenn beide
 *  Punkte die Enden derselben Oeffnung sind; bei einer Tuer heisst das
 *  "Maueroeffnung", daneben steht, was fuer Moebel frei ist), die Namen
 *  von A und B, die Schnellmasse einer Oeffnung, solange nur A steht, und
 *  "Neu". */
export function MessLeiste({ daten, messung, onNeu }: { daten: GrundrissDaten; messung: HandyMessung; onNeu(): void }) {
  const { t } = useSprache()
  const abstand = messAbstand(messung)
  const lichte = messLichte(messung)
  const durchgang = messDurchgang(daten, messung)
  const oeffnung = schnellOeffnung(messung)
  const schnell = oeffnung ? schnellUebersicht(daten, oeffnung) : null
  return (
    <div data-mess-leiste="" aria-live="polite" className="px-3 pb-2 [@media(max-height:30rem)]:pb-1">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {!messung.a ? (
            <p className="t-sub">{t('grundriss.messen_start')}</p>
          ) : (
            <>
              {abstand !== null ? (
                <p className="flex flex-wrap items-baseline gap-x-2 leading-tight">
                  <span className="text-sm font-bold text-muted">
                    {durchgang !== null ? t('plan.messen.maueroeffnung') : lichte ? t('plan.messen.lichte') : t('grundriss.messen_abstand')}
                  </span>
                  <span dir="ltr" data-mess-zahl={cmZahl(abstand)} className="t-serial text-3xl [@media(max-height:30rem)]:text-2xl">
                    {cmZahl(abstand)} cm
                  </span>
                  {durchgang !== null ? (
                    <span data-mess-durchgang={cmZahl(durchgang)} className="inline-flex items-baseline gap-1 text-sm font-bold">
                      <span className="text-muted">{t('plan.messen.durchgang')}</span>
                      <span dir="ltr" className="t-serial text-lg whitespace-nowrap">
                        {cmZahl(durchgang)} cm
                      </span>
                    </span>
                  ) : null}
                </p>
              ) : null}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm font-semibold">
                <span data-mess-a="" className="inline-flex min-w-0 items-center gap-1.5">
                  <Marke text="A" />
                  <span dir="auto" className="min-w-0">
                    {punktName(t, messung.aPunkt)}
                  </span>
                </span>
                {messung.b ? (
                  <span data-mess-b="" className="inline-flex min-w-0 items-center gap-1.5">
                    <Marke text="B" />
                    <span dir="auto" className="min-w-0">
                      {punktName(t, messung.bPunkt)}
                    </span>
                  </span>
                ) : (
                  <span className="t-sub font-normal">{t('grundriss.messen_b')}</span>
                )}
              </p>
            </>
          )}
        </div>
        {messung.a ? (
          <Button variant="outline" onClick={onNeu} aria-label={t('grundriss.messen_neu')} title={t('grundriss.messen_neu')} data-mess-neu="" className="min-h-11 shrink-0 px-3">
            <RotateCcw size={18} className="shrink-0" />
            {t('aktion.neu')}
          </Button>
        ) : null}
      </div>
      {schnell ? <SchnellListe u={schnell} kompakt /> : null}
    </div>
  )
}

const NS = 'non-scaling-stroke' as const

function messFarbe(m: Messpunkt): string {
  return m.art === 'ecke' ? 'var(--plan-wand)' : m.art === 'fenster' ? 'var(--plan-fenster)' : 'var(--plan-tuer)'
}

/** Alle Messpunkte als kleine Marken wie im Zeichner, etwas groesser fuer
 *  den Finger: Ecken als Quadrate in der Wandfarbe, Enden von Tueren und
 *  Durchgaengen als Punkte in der Tuerfarbe, von Fenstern in der
 *  Fensterfarbe, die andere Wandseite hohl. Am Bildschirm immer gleich
 *  gross (s Bildpunkte je cm). */
const MessMarken = memo(function MessMarken({ alle, s }: { alle: Messpunkt[]; s: number }) {
  const r = 4.5 / s
  const q = 8 / s
  return (
    <g data-mess-marken={alle.length}>
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

/** Text im Plan mit hellem Rand, damit er auf Wand und Boden lesbar ist. */
function PlanText({ p, weg, s, text, rtl }: { p: Punkt; weg?: Punkt; s: number; text: string; rtl?: boolean }) {
  const fs = 13 / s
  const l = textLage(weg ? { p, weg } : { p }, s, fs)
  return (
    <text
      x={l.p[0]}
      y={l.p[1]}
      transform={l.winkel ? `rotate(${l.winkel} ${l.p[0]} ${l.p[1]})` : undefined}
      textAnchor="middle"
      dominantBaseline={l.mitte ? 'middle' : undefined}
      className="t-serial"
      style={{ fill: 'var(--plan-auswahl)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--surface)', direction: rtl ? 'rtl' : undefined }}
      strokeWidth={3.5 / s}
      fontWeight={800}
    >
      {text}
    </text>
  )
}

/** Punkt A oder B im Plan: Ring in der Auswahlfarbe und der Buchstabe,
 *  auf der Seite, die vom anderen Punkt (gegen) wegzeigt, damit er nicht
 *  auf Linie und Zahl steht; allein rechts oben. */
function PunktMarke({ p, text, s, gegen }: { p: Punkt; text: 'A' | 'B'; s: number; gegen: Punkt | null }) {
  const fs = 13 / s
  const dx = gegen ? p[0] - gegen[0] : 0
  const dy = gegen ? p[1] - gegen[1] : 0
  const l = Math.hypot(dx, dy)
  const weg = l > 0.5 ? { x: p[0] + (dx / l) * (18 / s), y: p[1] + (dy / l) * (18 / s) } : null
  return (
    <g data-mess-punkt={text}>
      <circle cx={p[0]} cy={p[1]} r={10 / s} fill="none" style={{ stroke: 'var(--plan-auswahl)' }} strokeWidth={2.5} vectorEffect={NS} />
      <circle cx={p[0]} cy={p[1]} r={3.5 / s} style={{ fill: 'var(--plan-auswahl)', stroke: 'var(--surface)' }} strokeWidth={1.5} vectorEffect={NS} />
      <text
        x={weg ? weg.x : p[0] + 12 / s}
        y={weg ? weg.y : p[1] - 12 / s}
        textAnchor={weg ? 'middle' : 'start'}
        dominantBaseline={weg ? 'middle' : undefined}
        style={{ fill: 'var(--plan-auswahl)', fontSize: fs, paintOrder: 'stroke', stroke: 'var(--surface)' }}
        strokeWidth={3.5 / s}
        strokeLinejoin="round"
        fontWeight={900}
      >
        {text}
      </text>
    </g>
  )
}

/** Die Schnellmasse einer Oeffnung im Plan (wie im Zeichner 36 Bildpunkte
 *  vor der Innenseite der Wand): gestrichelte Linien mit kurzen
 *  Hilfsstrichen zur Wand und ihre Zahlen. Beim Messen an A, beim Ansehen
 *  an der angetippten Tuer oder dem Fenster (dort steht im Blatt "links
 *  bis zur Ecke": hier sieht man, welches Ende das ist). */
export function SchnellZeichnung({ daten, oeffnungId, s }: { daten: GrundrissDaten; oeffnungId: string; s: number }) {
  const { t, lang } = useSprache()
  const schnell = schnellMasse(daten, oeffnungId, 36 / s)
  // Bei einer Tuer ist die Breite die Maueroeffnung (E88), nicht die Lichte.
  const breite = daten.oeffnungen.find((o) => o.id === oeffnungId)?.art === 'tuer' ? t('plan.messen.maueroeffnung') : t('plan.messen.lichte')
  return (
    <g pointerEvents="none" data-schnell-zeichnung={oeffnungId}>
      {schnell.map((m, i) => (
        <g key={i} data-schnell-linie={m.art + (m.gegenueber ? '-gegen' : '')} style={{ stroke: 'var(--plan-linie)' }}>
          <line x1={m.a[0]} y1={m.a[1]} x2={m.b[0]} y2={m.b[1]} strokeWidth={1.5} strokeDasharray="6 4" vectorEffect={NS} />
          <line x1={m.wandA[0]} y1={m.wandA[1]} x2={m.a[0]} y2={m.a[1]} strokeWidth={1.25} vectorEffect={NS} />
          <line x1={m.wandB[0]} y1={m.wandB[1]} x2={m.b[0]} y2={m.b[1]} strokeWidth={1.25} vectorEffect={NS} />
        </g>
      ))}
      {schnell.map((m, i) => {
        const text = m.art === 'breite' ? `${breite} ${cmZahl(m.laenge)}` : cmZahl(m.laenge)
        // Die Zahl nur, wenn sie auf ihre Linie passt (grob 0,62 Schriftbreiten
        // je Zeichen); sonst stuende sie auf den anderen. In der Leiste stehen
        // alle, und naeher herangezoomt auch im Plan.
        if (m.laenge * s < text.length * 13 * 0.62 + 6) return null
        return <PlanText key={`t${i}`} p={[(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2]} s={s} text={text} rtl={m.art === 'breite' && lang === 'ar'} />
      })}
    </g>
  )
}

/** Was beim Messen im Plan steht (ueber allen Ebenen, in Plan-cm, s
 *  Bildpunkte je cm): Marken, Schnellmasse einer Oeffnung an A (wie im
 *  Zeichner 36 Bildpunkte vor der Innenseite der Wand), Linie und Zahl
 *  von A nach B (entlang der Innenseite einer Wand steht die Zahl in der
 *  Wand, wie im Zeichner), A und B. */
export function MessZeichnung({ daten, messung, s }: { daten: GrundrissDaten; messung: HandyMessung; s: number }) {
  const { t, lang } = useSprache()
  const alle = messpunkte(daten)
  const oeffnung = schnellOeffnung(messung)
  const { a, b } = messung
  const abstand = messAbstand(messung)
  const lichte = messLichte(messung)
  // Die Lichte einer Tuer ist die Maueroeffnung (E88), wie in der Leiste.
  const lichteWort = messDurchgang(daten, messung) !== null ? t('plan.messen.maueroeffnung') : t('plan.messen.lichte')
  const weg = a && b ? wandSeite(daten.raeume, a, b) : null
  return (
    <g pointerEvents="none" data-mess-zeichnung="">
      <MessMarken alle={alle} s={s} />
      {oeffnung ? <SchnellZeichnung daten={daten} oeffnungId={oeffnung} s={s} /> : null}
      {a && b && abstand !== null ? (
        <>
          <line
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            style={{ stroke: 'var(--plan-auswahl)' }}
            strokeWidth={2.5}
            strokeDasharray="7 4"
            vectorEffect={NS}
          />
          <PlanText
            p={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]}
            weg={weg ?? undefined}
            s={s}
            text={lichte ? `${lichteWort} ${cmZahl(abstand)}` : cmZahl(abstand)}
            rtl={lichte && lang === 'ar'}
          />
        </>
      ) : null}
      {a ? <PunktMarke p={a} text="A" s={s} gegen={b} /> : null}
      {b ? <PunktMarke p={b} text="B" s={s} gegen={a} /> : null}
    </g>
  )
}
