import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { cx } from '../lib/util'
import { Avatar } from './ui'
import { displayNameOf, useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { ErklaerKnopf } from './Fuehrung'
import { ProjektMenue } from './ProjektMenue'

/** Kopfzeile. Rechts steht immer das eigene Profil, so wie bei den grossen
 *  Messengern. Zusaetzliche Knoepfe kommen links daneben. */
export function AppHeader({
  title,
  subtitle,
  back,
  actions,
  sticky = true,
  showProfile = true,
  wide,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: string | true
  actions?: ReactNode
  sticky?: boolean
  showProfile?: boolean
  /** Gleich breit wie eine Seite mit Page wide (bis 1600 px). */
  wide?: boolean
}) {
  const nav = useNavigate()
  const { profile, user } = useAuth()
  const t = useT()
  return (
    <header
      className={cx(
        'no-print safe-top z-30 border-b border-line bg-paper/95 backdrop-blur',
        sticky && 'sticky top-0',
      )}
    >
      <div
        className={cx(
          'mx-auto flex min-h-16 items-center gap-2 px-3 py-2 sm:px-5',
          wide ? 'max-w-6xl lg:max-w-[1600px]' : 'max-w-5xl lg:max-w-6xl 2xl:max-w-7xl',
        )}
      >
        <ProjektMenue />
        {back ? (
          <button
            data-tour="zurueck"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            aria-label={t('aktion.zurueck')}
            title={t('aktion.zurueck')}
            className="knopf -ms-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-knopf border-2 border-transparent text-ink transition hover:border-line hover:bg-raised"
          >
            <ArrowLeft size={22} className="spiegeln" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="t-name truncate">{title}</div>
          {subtitle ? <div className="truncate text-sm text-muted">{subtitle}</div> : null}
        </div>

        {/* Am Computer alle Knoepfe nebeneinander. Am Handy (E76) nur der
            erste, der Rest samt Erklaerung im Menue "Mehr": so bleibt die
            Kopfzeile ruhig und gleichmaessig. */}
        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {actions}
          <ErklaerKnopf />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <KopfHandy actions={actions} />
          {showProfile ? (
            <Link
              data-tour="profil"
              to="/app/einstellungen"
              aria-label={t('kopf.profil')}
              title={t('kopf.profil')}
              className="ms-0.5 rounded-full ring-2 ring-transparent transition hover:ring-line active:scale-95"
            >
              <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={40} />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  )
}

/** Knoepfe einer Kopfzeile einzeln, auch wenn sie in einem Fragment stehen. */
function einzeln(knoten: ReactNode): ReactNode[] {
  const out: ReactNode[] = []
  for (const k of Children.toArray(knoten)) {
    if (isValidElement<{ children?: ReactNode }>(k) && k.type === Fragment) out.push(...einzeln(k.props.children))
    else out.push(k)
  }
  return out
}

/** Kopfzeile am Handy: hoechstens ein Knopf sichtbar, der Rest und die
 *  Erklaerung im Menue. Im Menue steht neben jedem Zeichen sein Name
 *  (aus aria-label, siehe .kopf-menue in index.css). */
function KopfHandy({ actions }: { actions: ReactNode }) {
  const t = useT()
  const knoepfe = einzeln(actions)
  const [offen, setOffen] = useState(false)
  const huelle = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!offen) return
    const weg = (e: Event) => {
      if (huelle.current && !huelle.current.contains(e.target as Node)) setOffen(false)
    }
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false)
    }
    document.addEventListener('pointerdown', weg)
    document.addEventListener('keydown', taste)
    return () => {
      document.removeEventListener('pointerdown', weg)
      document.removeEventListener('keydown', taste)
    }
  }, [offen])
  if (knoepfe.length <= 1) {
    return (
      <>
        {knoepfe}
        <ErklaerKnopf />
      </>
    )
  }
  return (
    <>
      {knoepfe[0]}
      <div ref={huelle} className="relative">
        <button
          type="button"
          aria-label={t('kopf.mehr')}
          title={t('kopf.mehr')}
          aria-expanded={offen}
          onClick={() => setOffen((v) => !v)}
          className="knopf flex h-10 w-10 items-center justify-center rounded-knopf border-2 border-ink/12 bg-surface text-ink transition hover:bg-raised"
        >
          <MoreHorizontal size={20} />
        </button>
        {offen ? (
          <div
            role="menu"
            // Nach dem Tippen auf einen Eintrag schliessen; der Eintrag selbst
            // hat dann schon gehandelt.
            onClickCapture={() => window.setTimeout(() => setOffen(false), 0)}
            className="kopf-menue absolute end-0 top-full z-40 mt-2 flex w-64 max-w-[calc(100vw-1.5rem)] flex-col gap-1 rounded-karte border border-line bg-surface p-2 shadow-dialog"
          >
            {knoepfe.slice(1)}
            <ErklaerKnopf />
          </div>
        ) : null}
      </div>
    </>
  )
}

export function Page({
  children,
  className,
  wide,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <main
      className={cx(
        'mx-auto w-full px-3 py-4 sm:px-5 sm:py-6',
        wide ? 'max-w-6xl lg:max-w-[1600px]' : 'max-w-5xl lg:max-w-6xl 2xl:max-w-7xl',
        className,
      )}
    >
      {children}
    </main>
  )
}

export function NavTab({
  to,
  icon,
  label,
  active,
  badge,
  raised,
  tour,
}: {
  to: string
  icon: ReactNode
  label: string
  active: boolean
  badge?: number
  raised?: boolean
  /** Name fuer die Fuehrung (data-tour). */
  tour?: string
}) {
  if (raised) {
    return (
      <Link
        to={to}
        data-tour={tour}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className="relative flex flex-1 flex-col items-center gap-1 py-1.5 text-[0.6875rem] font-bold text-ink"
      >
        <span
          className={cx(
            'flex h-14 w-14 -translate-y-3 items-center justify-center rounded-karte ring-4 ring-paper transition active:scale-95',
            active ? 'bg-accent text-accent-ink' : 'bg-ink text-paper',
          )}
        >
          {icon}
        </span>
        <span className="-mt-2.5">{label}</span>
      </Link>
    )
  }
  return (
    <Link
      to={to}
      data-tour={tour}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[0.6875rem] font-bold transition',
        active ? 'text-ink' : 'text-muted hover:text-ink',
      )}
    >
      <span
        className={cx(
          'flex h-9 min-w-[3.25rem] items-center justify-center rounded-full transition',
          active && 'bg-ink text-paper',
        )}
      >
        {icon}
      </span>
      {label}
      {badge && badge > 0 ? (
        <span className="absolute right-[20%] top-0 min-w-5 rounded-full bg-danger px-1.5 text-[0.6875rem] font-black leading-5 text-paper">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

export function BottomNav({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  /* Die Leiste meldet ihre eigene Hoehe als --nav-h. Seiten, die den
   * ganzen Bildschirm fuellen (der Chat), rechnen damit, statt eine feste
   * Zahl zu raten. Vorher stand im Chat 5.5rem, die Leiste war aber 6rem
   * hoch, und die Eingabezeile lag neun Pixel unter der Leiste. */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const melden = () => {
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`)
    }
    melden()
    const beobachter = new ResizeObserver(melden)
    beobachter.observe(el)
    return () => {
      beobachter.disconnect()
      document.documentElement.style.removeProperty('--nav-h')
    }
  }, [])

  return (
    <nav
      ref={ref}
      className="no-print safe-bottom sticky bottom-0 z-40 border-t-2 border-line bg-paper/98 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-end px-2 pt-2">{children}</div>
    </nav>
  )
}
