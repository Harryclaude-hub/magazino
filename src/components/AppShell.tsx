import { Children, Fragment, isValidElement, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, ScanLine } from 'lucide-react'
import { cx } from '../lib/util'
import { Avatar, Logo } from './ui'
import { emailAnzeige } from '../lib/konto'
import { displayNameOf, useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { ErklaerKnopf, Fuehrung } from './Fuehrung'
import { ProjektMenue } from './ProjektMenue'
import { HeaderAktionen, type KopfAktion } from './HeaderAktionen'
import { HinweiseInhalt, useHinweise } from './HinweiseGlocke'
import { ProfilInhalt } from './ProfilMenue'

/* ------------------------------------------------ Knopf Siedlung (E83)
 * Die Siedlung taucht im Programm nicht mehr auf (E104): kein Knopf in der
 * Kopfzeile. Der Merker und sein Schalter bleiben nur, weil die
 * Einstellungen ihn noch benutzen. */

const SIEDLUNG_KNOPF = 'kistly.siedlung.knopf'
const SIEDLUNG_EREIGNIS = 'kistly:siedlung-knopf'
/** Gilt, wenn der Browser keinen Speicher erlaubt: dann bis zum Neuladen. */
let siedlungOhneSpeicher: boolean | null = null

/** Ist der Knopf Siedlung an? Ohne eigene Wahl: an. */
export function siedlungKnopfAn(): boolean {
  try {
    const v = localStorage.getItem(SIEDLUNG_KNOPF)
    if (v !== null) return v !== '0'
  } catch {
    /* Speicher gesperrt: dann zaehlt die Wahl dieser Sitzung */
  }
  return siedlungOhneSpeicher ?? true
}

/** Schalter in den Einstellungen. Jede offene Kopfzeile folgt sofort. */
export function siedlungKnopfSetzen(an: boolean): void {
  siedlungOhneSpeicher = an
  try {
    localStorage.setItem(SIEDLUNG_KNOPF, an ? '1' : '0')
  } catch {
    // Ohne Speicher gilt die Wahl bis zum Neuladen; ein alter Wert darf
    // sie nicht ueberstimmen.
    try {
      localStorage.removeItem(SIEDLUNG_KNOPF)
    } catch {
      /* ganz gesperrt: siedlungOhneSpeicher traegt die Wahl */
    }
  }
  window.dispatchEvent(new Event(SIEDLUNG_EREIGNIS))
}

function siedlungKnopfBeobachten(melden: () => void): () => void {
  window.addEventListener(SIEDLUNG_EREIGNIS, melden)
  // Gleicher Schalter in einem anderen Tab.
  window.addEventListener('storage', melden)
  return () => {
    window.removeEventListener(SIEDLUNG_EREIGNIS, melden)
    window.removeEventListener('storage', melden)
  }
}

export function useSiedlungKnopf(): boolean {
  return useSyncExternalStore(siedlungKnopfBeobachten, siedlungKnopfAn)
}

/** Kopfzeile. Links immer das Magazino-Logo (Tipp fuehrt auf /app), rechts
 *  die Aktionsgruppe (HeaderAktionen): Scannen, Hinweise, Profil. Eine neue
 *  Funktion haengt einen Eintrag in `eintraege` an.
 *
 *  Aussehen wie bei iOS: Am Handy steht der Titel gross (Large Title) unter
 *  der Leiste und scrollt mit; erst wenn er hinter der Leiste verschwindet,
 *  erscheint er klein in der Mitte, und die Leiste wird milchglasartig mit
 *  feiner Unterkante (Glas in design/apple.css). Am Computer steht der Titel
 *  von Anfang an in der Leiste. Das Umschalten liest nur die Scrollhoehe und
 *  setzt zwei Merker; Inhalt und Knoepfe bleiben, wie sie sind. Titel, die
 *  keine Zeichenkette sind (das Logo), und Leisten, die nicht kleben
 *  (Zeichner), behalten die schlanke Form.
 *
 *  Die Knoepfe der Seite (actions) stehen am Computer links neben der
 *  Aktionsgruppe; am Handy liegen sie samt Erklaerung im Profil-Menue, damit
 *  die Leiste bei drei Symbolen bleibt. */
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
  const hinweise = useHinweise(user?.id)
  const [erklaerung, setErklaerung] = useState(false)
  const gross = sticky && typeof title === 'string'
  const kopf = useRef<HTMLElement>(null)
  const grosserTitel = useRef<HTMLDivElement>(null)
  const [gescrollt, setGescrollt] = useState(false)
  const [titelWeg, setTitelWeg] = useState(false)

  useEffect(() => {
    if (!sticky) return
    let frame = 0
    const lesen = () => {
      frame = 0
      setGescrollt(window.scrollY > 2)
      const el = grosserTitel.current
      const leiste = kopf.current?.offsetHeight ?? 0
      setTitelWeg(el ? el.getBoundingClientRect().bottom < leiste + 4 : false)
    }
    const beiScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(lesen)
    }
    lesen()
    window.addEventListener('scroll', beiScroll, { passive: true })
    window.addEventListener('resize', beiScroll)
    return () => {
      window.removeEventListener('scroll', beiScroll)
      window.removeEventListener('resize', beiScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [sticky])

  const seitenKnoepfe = einzeln(actions)
  // Die Liste der Aktionen. Neue Funktion: hier einen Eintrag anhaengen.
  const eintraege: KopfAktion[] = [
    { id: 'scannen', icon: <ScanLine size={19} />, label: t('kopf.scannen'), to: '/app/scan', tour: 'kopf-scannen' },
    {
      id: 'hinweise',
      icon: <Bell size={19} />,
      label: hinweise.summe > 0 ? t('kopf.hinweise_zaehler', { n: hinweise.summe }) : t('kopf.hinweise'),
      zaehler: hinweise.summe,
      blattTitel: t('kopf.hinweise'),
      blatt: (b) => <HinweiseInhalt s={hinweise} b={b} />,
      tour: 'kopf-hinweise',
    },
  ]
  if (showProfile) {
    eintraege.push({
      id: 'profil',
      icon: <Avatar name={displayNameOf(profile, emailAnzeige(user?.email) || '?')} size={36} />,
      label: t('kopf.profil'),
      ohneGrund: true,
      fest: true,
      tour: 'profil',
      blatt: (b) => <ProfilInhalt b={b} extra={seitenKnoepfe} onErklaerung={() => setErklaerung(true)} />,
    })
  }

  const breite = wide ? 'max-w-6xl lg:max-w-[1600px]' : 'max-w-5xl lg:max-w-6xl 2xl:max-w-7xl'
  return (
    <>
      <header
        ref={kopf}
        data-gescrollt={gescrollt ? 'ja' : 'nein'}
        data-titel={!gross || titelWeg ? 'ja' : 'nein'}
        className={cx(
          'kopf-leiste group/k no-print safe-top z-30 border-b border-transparent bg-paper transition-[border-color]',
          'data-[gescrollt=ja]:border-line',
          sticky && 'sticky top-0',
        )}
      >
        <div className={cx('mx-auto flex min-h-14 items-center gap-1.5 px-3 py-1.5 sm:gap-2 sm:px-5', breite)}>
          {back ? (
            <button
              data-tour="zurueck"
              onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
              aria-label={t('aktion.zurueck')}
              title={t('aktion.zurueck')}
              className="knopf -ms-1.5 flex h-11 shrink-0 items-center gap-0.5 rounded-full pe-1 ps-0.5 text-accent-text transition hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent sm:pe-2"
            >
              <ChevronLeft size={28} className="spiegeln stroke-[2.3]" aria-hidden="true" />
              <span className="hidden text-base font-medium sm:inline">{t('aktion.zurueck')}</span>
            </button>
          ) : null}
          {/* Erst zurueck, dann das Menue des Umzugs (E80). */}
          <ProjektMenue />
          {/* Das Logo ist immer da (E108). */}
          <Link
            to="/app"
            data-tour="kopf-logo"
            aria-label={t('kopf.logo')}
            title={t('kopf.logo')}
            className="kopf-logo knopf flex h-11 shrink-0 items-center gap-2 rounded-full pe-1 ps-0.5 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
          >
            <Logo size={28} className="rounded-[22%]" />
            <span className="hidden text-[1.05rem] font-bold tracking-[-0.02em] text-ink sm:inline" aria-hidden="true">
              Magazino
            </span>
          </Link>

          <div
            className={cx(
              'min-w-0 flex-1 transition-[opacity,visibility] duration-200 sm:ms-1',
              gross &&
                'max-lg:text-center max-lg:group-data-[titel=nein]/k:invisible max-lg:group-data-[titel=nein]/k:opacity-0',
            )}
          >
            <div className="t-name truncate">{title}</div>
            {subtitle ? (
              <div className={cx('truncate text-sm text-muted', gross && 'max-lg:hidden')}>{subtitle}</div>
            ) : null}
          </div>

          {/* Am Computer die Knoepfe der Seite und die Erklaerung links neben
              der Aktionsgruppe; am Handy liegen sie im Profil-Menue. */}
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            {seitenKnoepfe}
            <ErklaerKnopf />
          </div>
          <HeaderAktionen eintraege={eintraege} />
        </div>
      </header>
      {gross ? (
        <div className="no-print lg:hidden">
          <div ref={grosserTitel} className={cx('mx-auto px-4 pb-1.5 pt-0.5 sm:px-6', breite)}>
            <h1 className="t-gross">{title}</h1>
            {subtitle ? <p className="t-sub mt-1">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}
      {erklaerung ? <Fuehrung onClose={() => setErklaerung(false)} /> : null}
    </>
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
  /* Registerkarte wie in iOS: Symbol und kleine Beschriftung, die aktive
   * in Akzent mit etwas kraeftigerem Strich. Scannen (raised) ist die eine
   * Hauptaktion der Leiste und steht als Kapsel: getoent, wenn man woanders
   * ist, gefuellt, wenn man dort ist. */
  return (
    <Link
      to={to}
      data-tour={tour}
      aria-label={raised ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'nav-tab knopf relative flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-0.5 pt-1 text-[0.65rem] font-medium leading-tight transition-colors',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
        active || raised ? 'text-accent-text' : 'text-muted',
      )}
    >
      <span
        className={cx(
          'flex h-7 items-center justify-center transition-colors',
          raised
            ? cx('w-14 rounded-full [&_svg]:size-[22px]', active ? 'bg-accent text-accent-ink' : 'bg-tint')
            : cx('w-14', active && '[&_svg]:stroke-[2.1]'),
        )}
      >
        {icon}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
      {badge && badge > 0 ? (
        <span className="absolute right-[20%] top-0 min-w-5 rounded-full bg-danger px-1.5 text-[0.65rem] font-semibold leading-5 text-paper">
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
      // Fest am unteren Rand (E79): sticky klebte nur in seinem eigenen,
      // gleich hohen Behaelter und scrollte darum mit weg.
      className="tab-leiste no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper"
    >
      <div className="mx-auto flex max-w-xl items-stretch px-2 pt-1">{children}</div>
    </nav>
  )
}
