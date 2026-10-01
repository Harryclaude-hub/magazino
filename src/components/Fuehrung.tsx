import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleHelp, X } from 'lucide-react'
import { useSprache } from '../lib/i18n'
import { useIstDesktop, useZeichnen } from '../lib/desktop'
import { tourFuer, type TourSchritt } from '../lib/fuehrung'
import { cx } from '../lib/util'

/* Die Fuehrung: ein Knopf "Erklaerung" oben in jeder Kopfzeile, neben dem
 * Profil. Er zeigt Schritt fuer Schritt, was jeder Knopf der jetzigen
 * Seite tut, am Computer und am Handy, auf Deutsch und Arabisch.
 *
 * Welche Schritte es gibt, steht in lib/fuehrung.ts. Ein Schritt zeigt auf
 * ein Element mit data-tour="name". Gibt es davon mehrere, gilt das erste
 * sichtbare; ist keines sichtbar (etwa die Seitenleiste am Handy), wird
 * der Schritt still uebersprungen. So reicht eine Liste fuer beide Geraete.
 *
 * Arabisch: die Karte folgt der Leserichtung (dir der Seite), Pfeiltasten
 * und Pfeile tauschen die Seiten. Hervorhebung und Karte werden nie
 * gespiegelt, sie folgen nur dem Element. */

const RAND = 8
const KARTE_B = 360

/** Das erste sichtbare Element mit diesem Namen. */
function zielElement(name: string): HTMLElement | null {
  const liste = document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(name)}"]`)
  for (const el of liste) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el
  }
  return null
}

/** Schritte, die jetzt zeigbar sind: ohne Ziel oder mit sichtbarem Ziel. */
function zeigbar(liste: TourSchritt[]): TourSchritt[] {
  return liste.filter((s) => !s.ziel || zielElement(s.ziel) !== null)
}

export function ErklaerKnopf() {
  const { t } = useSprache()
  const [offen, setOffen] = useState(false)
  return (
    <>
      <button
        type="button"
        data-tour="erklaerung"
        onClick={() => setOffen(true)}
        aria-label={t('fuehrung.knopf')}
        title={t('fuehrung.knopf')}
        className="knopf flex h-10 shrink-0 items-center gap-1.5 rounded-knopf border-2 border-line bg-surface px-2.5 text-sm font-bold text-ink transition hover:border-ink/35 active:scale-95"
      >
        <CircleHelp size={18} />
        <span className="hidden sm:inline">{t('fuehrung.knopf')}</span>
      </button>
      {offen ? <Fuehrung onClose={() => setOffen(false)} /> : null}
    </>
  )
}

export function Fuehrung({ onClose }: { onClose: () => void }) {
  const { t, lang } = useSprache()
  const { pathname } = useLocation()
  const desktop = useIstDesktop()
  const zeichnen = useZeichnen()
  const rtl = lang === 'ar'

  // Die Liste wird beim Oeffnen einmal bestimmt (Seite und Geraet).
  const [schritte] = useState(() => zeigbar(tourFuer(pathname, { desktop, zeichnen })))
  const [nr, setNr] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [fenster, setFenster] = useState({ w: window.innerWidth, h: window.innerHeight })

  const schritt = schritte[nr] as TourSchritt | undefined
  const letzter = nr >= schritte.length - 1

  const weiter = useCallback(() => {
    if (letzter) onClose()
    else setNr((n) => n + 1)
  }, [letzter, onClose])
  const zurueck = useCallback(() => setNr((n) => Math.max(0, n - 1)), [])

  // Ziel ins Bild holen, dann messen; bei Rollen und Groessenwechsel neu messen.
  useLayoutEffect(() => {
    const ziel = schritt?.ziel ? zielElement(schritt.ziel) : null
    if (!ziel) {
      setRect(null)
      return
    }
    ziel.scrollIntoView({ block: 'center', inline: 'nearest' })
    const messen = () => {
      setRect(ziel.getBoundingClientRect())
      setFenster({ w: window.innerWidth, h: window.innerHeight })
    }
    messen()
    window.addEventListener('resize', messen)
    window.addEventListener('scroll', messen, true)
    return () => {
      window.removeEventListener('resize', messen)
      window.removeEventListener('scroll', messen, true)
    }
  }, [schritt])

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        weiter()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const vor = (e.key === 'ArrowRight') !== rtl
        if (vor) weiter()
        else zurueck()
      }
    }
    // Einfang-Phase: der Zeichner darunter bekommt die Tasten nicht.
    window.addEventListener('keydown', taste, true)
    return () => window.removeEventListener('keydown', taste, true)
  }, [weiter, zurueck, onClose, rtl])

  const karte = useMemo(() => {
    const b = Math.min(KARTE_B, fenster.w - 24)
    const schmal = fenster.w < 640
    if (!rect) return { stil: { left: (fenster.w - b) / 2, top: Math.max(24, fenster.h / 2 - 140), width: b } }
    if (schmal) {
      // Am Handy unten, ausser das Ziel liegt selbst in der unteren Haelfte.
      const unten = rect.top + rect.height / 2 < fenster.h / 2
      return { stil: unten ? { left: 12, right: 12, bottom: 16 } : { left: 12, right: 12, top: 16 } }
    }
    const mitte = rect.left + rect.width / 2
    const left = Math.min(Math.max(12, mitte - b / 2), fenster.w - b - 12)
    const platzUnten = fenster.h - rect.bottom
    if (platzUnten > 220) return { stil: { left, top: rect.bottom + RAND + 10, width: b } }
    if (rect.top > 220) return { stil: { left, bottom: fenster.h - rect.top + RAND + 10, width: b } }
    // Weder oben noch unten Platz (grosses Ziel): daneben oder in die Ecke.
    const rechts = fenster.w - rect.right > b + 24
    return { stil: { top: 16, width: b, ...(rechts ? { left: rect.right + 16 } : { left: 12 }) } }
  }, [rect, fenster])

  if (schritte.length === 0 || !schritt) return null

  const Vor = rtl ? ArrowLeft : ArrowRight
  const Rueck = rtl ? ArrowRight : ArrowLeft

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('fuehrung.knopf')} className="fixed inset-0 z-[100]">
      {/* Klicks ausserhalb der Karte tun nichts: erst lesen, dann weiter. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-4 ring-accent transition-all duration-200"
          style={{
            left: rect.left - RAND,
            top: rect.top - RAND,
            width: rect.width + RAND * 2,
            height: rect.height + RAND * 2,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
      )}
      <div
        dir={rtl ? 'rtl' : 'ltr'}
        className="absolute rounded-2xl border border-line bg-surface p-4 text-ink shadow-2xl"
        style={karte.stil}
      >
        <div className="mb-1 flex items-start gap-2">
          <h2 className="t-name min-w-0 flex-1">{t(`${schritt.s}.titel`)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('fuehrung.beenden')}
            title={t('fuehrung.beenden')}
            className="-me-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed">{t(`${schritt.s}.text`)}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="t-sub min-w-0 flex-1">
            {t('fuehrung.schritt', { a: nr + 1, b: schritte.length })}
          </span>
          <button
            type="button"
            onClick={zurueck}
            disabled={nr === 0}
            className="knopf flex h-10 items-center gap-1 rounded-knopf border-2 border-line px-3 text-sm font-bold disabled:opacity-40"
          >
            <Rueck size={16} />
            {t('fuehrung.zurueck')}
          </button>
          <button
            type="button"
            onClick={weiter}
            autoFocus
            className={cx('knopf flex h-10 items-center gap-1 rounded-knopf bg-accent px-3 text-sm font-bold text-accent-ink')}
          >
            {letzter ? t('fuehrung.fertig') : t('fuehrung.weiter')}
            {letzter ? null : <Vor size={16} />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
