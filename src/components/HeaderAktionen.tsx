import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useT } from '../lib/i18n'
import { cx } from '../lib/util'

/* Aktionsgruppe der Kopfzeile (rechts). Eine einfache Liste von Eintraegen:
 * Symbol, Beschriftung, Ziel oder Klick, optional Zaehler, optional ein
 * Blatt (Popover am Computer, Blatt von unten am Handy). Eine neue
 * Funktion haengt einfach einen Eintrag an die Liste in AppShell.tsx.
 *
 * Am schmalen Handy sind hoechstens MAX_HANDY Symbole sichtbar. Eintraege
 * mit fest: true bleiben immer (das Profil), die uebrigen fuellen die freien
 * Plaetze der Reihe nach. Der Rest bekommt max-sm:hidden und steht als Zeile
 * im Blatt der festen Eintraege (b.ueberlauf). Reine Optik und Bedienung,
 * keine Daten: die kommen von aussen. */

export const MAX_HANDY = 3

export interface KopfBlattInfo {
  /** Blatt schliessen (Fokus zurueck auf den Knopf). */
  zu: () => void
  /** Eintraege, die am schmalen Handy keinen Platz in der Leiste haben. */
  ueberlauf: KopfAktion[]
  /** Blatt eines anderen Eintrags oeffnen (fuer Zeilen im Ueberlauf). */
  oeffnen: (id: string) => void
}

export interface KopfAktion {
  id: string
  icon: ReactNode
  label: string
  /** Ziel in der App (Link). */
  to?: string
  onClick?: () => void
  /** Roter Zaehler am Knopf (0 oder leer: keiner). */
  zaehler?: number
  /** Auch am schmalen Handy immer sichtbar. */
  fest?: boolean
  /** Ohne graue Kapsel (das Profil zeigt sein rundes Bild selbst). */
  ohneGrund?: boolean
  /** Fuer die Fuehrung (data-tour). */
  tour?: string
  /** Inhalt des Blatts. Gesetzt: der Knopf oeffnet es. */
  blatt?: (b: KopfBlattInfo) => ReactNode
  /** Ueberschrift im Blatt (leer: keine Zeile, der Inhalt hat seine eigene). */
  blattTitel?: string
}

function breitBeobachten(melden: () => void): () => void {
  const mq = window.matchMedia('(min-width: 640px)')
  mq.addEventListener('change', melden)
  return () => mq.removeEventListener('change', melden)
}
function istBreit(): boolean {
  return window.matchMedia('(min-width: 640px)').matches
}
/** Computer (Popover) oder Handy (Blatt). */
function useBreit(): boolean {
  return useSyncExternalStore(breitBeobachten, istBreit, () => true)
}

const FOKUSSIERBAR =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** Blatt oder Popover. Liegt per Portal an body, weil die Kopfzeile
 *  backdrop-filter hat und ein fixed-Element sonst in ihre Hoehe sperrt. */
function KopfPanel({
  label,
  titel,
  anker,
  onZu,
  children,
}: {
  label: string
  titel?: string
  anker: HTMLElement | null
  onZu: () => void
  children: ReactNode
}) {
  const t = useT()
  const breit = useBreit()
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  useLayoutEffect(() => {
    if (!breit) return
    const messen = () => {
      const r = anker?.getBoundingClientRect()
      if (!r) return
      setPos({ top: Math.round(r.bottom + 8), right: Math.max(8, Math.round(window.innerWidth - r.right)) })
    }
    messen()
    window.addEventListener('resize', messen)
    return () => window.removeEventListener('resize', messen)
  }, [breit, anker])

  const zuRef = useRef(onZu)
  zuRef.current = onZu
  const bereit = !breit || pos !== null

  // Fokus ins Blatt (einmal, sobald es steht); Esc schliesst; Tab bleibt im Blatt.
  useEffect(() => {
    if (!bereit) return
    panel.current?.focus()
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        zuRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const liste = Array.from(panel.current.querySelectorAll<HTMLElement>(FOKUSSIERBAR)).filter(
        (el) => el.offsetParent !== null,
      )
      if (liste.length === 0) {
        e.preventDefault()
        return
      }
      const erst = liste[0]
      const letzt = liste[liste.length - 1]
      const aktiv = document.activeElement
      if (e.shiftKey && (aktiv === erst || aktiv === panel.current)) {
        e.preventDefault()
        letzt.focus()
      } else if (!e.shiftKey && aktiv === letzt) {
        e.preventDefault()
        erst.focus()
      }
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [bereit])

  if (!bereit) return null
  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('aktion.schliessen')}
        onClick={onZu}
        className={cx('absolute inset-0 cursor-default', breit ? 'bg-transparent' : 'd-schleier bg-[var(--schleier)] backdrop-blur-[3px]')}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={breit && pos ? { top: pos.top, right: pos.right, transformOrigin: 'top right' } : undefined}
        className={cx(
          'flex flex-col gap-2 overflow-y-auto overscroll-contain bg-paper p-3 outline-none',
          breit
            ? 'kopf-popover absolute max-h-[min(34rem,calc(100dvh-5rem))] w-[22rem] max-w-[calc(100vw-1rem)] rounded-[18px] shadow-dialog'
            : 'd-blatt safe-bottom absolute inset-x-0 bottom-0 max-h-[80dvh] rounded-t-[20px] shadow-dialog',
        )}
      >
        {!breit ? <span className="kopf-griff" aria-hidden="true" /> : null}
        {titel ? (
          <div className="flex items-center gap-2 px-1.5 pb-0.5">
            <h2 className="t-name-lg min-w-0 flex-1 truncate">{titel}</h2>
            <button
              type="button"
              onClick={onZu}
              aria-label={t('aktion.schliessen')}
              className="knopf flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-feld text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}

const KNOPF_KLASSE =
  'knopf relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent transition focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent'

function KopfKnopf({
  a,
  offen,
  setOffen,
  ueberlauf,
  versteckt,
}: {
  a: KopfAktion
  offen: boolean
  setOffen: (id: string | null) => void
  ueberlauf: KopfAktion[]
  versteckt: boolean
}) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null)
  const zaehler = a.zaehler && a.zaehler > 0 ? a.zaehler : 0
  // Nach dem Schliessen zurueck auf den Knopf, ausser die Seite wechselt.
  const zu = (fokus: boolean) => {
    setOffen(null)
    if (fokus) window.setTimeout(() => ref.current?.focus(), 0)
  }

  const inhalt = (
    <>
      <span
        className={cx(
          'flex items-center justify-center rounded-full',
          a.ohneGrund ? 'h-9 w-9' : 'h-9 w-9 bg-feld transition-[filter] group-hover/ak:brightness-[0.96]',
        )}
      >
        {a.icon}
      </span>
      {zaehler ? (
        <span
          aria-hidden="true"
          className="kopf-zaehler absolute -end-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-danger px-1 text-center text-[0.65rem] font-semibold leading-[1.15rem] text-paper ring-2 ring-paper"
        >
          {zaehler > 99 ? '99+' : zaehler}
        </span>
      ) : null}
    </>
  )
  const klasse = cx(KNOPF_KLASSE, 'group/ak', versteckt && 'max-sm:hidden')

  return (
    <>
      {a.to && !a.blatt ? (
        <Link
          ref={ref as Ref<HTMLAnchorElement>}
          to={a.to}
          data-tour={a.tour}
          aria-label={a.label}
          title={a.label}
          className={klasse}
        >
          {inhalt}
        </Link>
      ) : (
        <button
          ref={ref as Ref<HTMLButtonElement>}
          type="button"
          data-tour={a.tour}
          aria-label={a.label}
          title={a.label}
          aria-haspopup={a.blatt ? 'dialog' : undefined}
          aria-expanded={a.blatt ? offen : undefined}
          onClick={() => (a.blatt ? setOffen(offen ? null : a.id) : a.onClick?.())}
          className={klasse}
        >
          {inhalt}
        </button>
      )}
      {offen && a.blatt ? (
        <KopfPanel label={a.label} titel={a.blattTitel} anker={ref.current} onZu={() => zu(true)}>
          {a.blatt({ zu: () => zu(true), ueberlauf, oeffnen: (id) => setOffen(id) })}
        </KopfPanel>
      ) : null}
    </>
  )
}

export function HeaderAktionen({ eintraege }: { eintraege: KopfAktion[] }) {
  const { pathname } = useLocation()
  const [offen, setOffen] = useState<string | null>(null)

  // Seitenwechsel schliesst das Blatt.
  useEffect(() => {
    setOffen(null)
  }, [pathname])

  const festeAnzahl = eintraege.filter((e) => e.fest).length
  let frei = Math.max(0, MAX_HANDY - festeAnzahl)
  const imUeberlauf = new Set<string>()
  for (const e of eintraege) {
    if (e.fest) continue
    if (frei > 0) frei -= 1
    else imUeberlauf.add(e.id)
  }
  const ueberlauf = eintraege.filter((e) => imUeberlauf.has(e.id))

  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      {eintraege.map((a) => (
        <KopfKnopf
          key={a.id}
          a={a}
          offen={offen === a.id}
          setOffen={setOffen}
          ueberlauf={ueberlauf}
          versteckt={imUeberlauf.has(a.id)}
        />
      ))}
    </div>
  )
}
