import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  HandHelping,
  History,
  KeyRound,
  LayoutDashboard,
  Package,
  Printer,
  ScanLine,
  Search,
  ShieldCheck,
  User,
  Warehouse,
} from 'lucide-react'
import { cx } from '../lib/util'
import { useT } from '../lib/i18n'
import { listProjects, type ProjectWithStats } from '../lib/api'

/* Linke Leiste am Computer (ab 1024 px). Sie ersetzt dort die untere
 * Leiste. Eingeklappt zeigt sie nur Symbole; der Zustand bleibt im Browser
 * gemerkt. Oben steht das aktuelle Lager mit Wechsler. */

const MERKEN = 'kistly.leiste'

function gemerktEingeklappt(): boolean {
  try {
    return localStorage.getItem(MERKEN) === 'zu'
  } catch {
    return false
  }
}

export interface LeistenEintrag {
  to: string
  icon: ReactNode
  label: string
  active: boolean
  badge?: number
  /** Name fuer die Fuehrung (data-tour). */
  tour?: string
}

export function Seitenleiste({
  projektId,
  admin,
  wartende,
}: {
  projektId: string | null
  admin: boolean
  /** Konten, die auf Freischaltung warten (Zahl am Admin-Punkt). */
  wartende: number
}) {
  const t = useT()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [zu, setZu] = useState(gemerktEingeklappt)
  const [zeilen, setZeilen] = useState<ProjectWithStats[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const projekte = useMemo(() => (zeilen ? zeilen.map((x) => x.project) : null), [zeilen])
  const darfBearbeiten = useMemo(() => {
    const r = zeilen?.find((x) => x.project.id === projektId)?.role
    return r === 'owner' || r === 'editor'
  }, [zeilen, projektId])

  /* Start, dann alles eines Lagers, dann Scannen, Profil, Admin. Mehr gibt
   * es nicht (E104). */
  const eintraege = useMemo<LeistenEintrag[]>(() => {
    const out: LeistenEintrag[] = [
      { to: '/app', icon: <Warehouse size={20} />, label: t('struktur.start'), active: pathname === '/app' || pathname.startsWith('/app/bl/'), tour: 'nav-umzuege' },
    ]
    if (projektId) {
      const base = `/app/p/${projektId}`
      const hier = (p: string) => pathname.startsWith(`${base}/${p}`)
      out.push(
        { to: `${base}/tuer`, icon: <KeyRound size={20} />, label: t('lager.nav_tuer'), active: hier('tuer'), tour: 'nav-tuer' },
        { to: `${base}/bestand`, icon: <Package size={20} />, label: t('lager.nav_bestand'), active: hier('bestand'), tour: 'nav-bestand' },
        { to: `${base}/ausleihen`, icon: <HandHelping size={20} />, label: t('lager.nav_ausleihen'), active: hier('ausleihen'), tour: 'nav-ausleihen' },
        { to: `${base}/kisten`, icon: <Boxes size={20} />, label: t('nav.kisten'), active: hier('kisten'), tour: 'nav-kisten' },
        { to: `${base}/grundriss`, icon: <LayoutDashboard size={20} />, label: t('leiste.grundriss'), active: hier('grundriss'), tour: 'nav-grundriss' },
        { to: `${base}/verlauf`, icon: <History size={20} />, label: t('struktur.verlauf'), active: hier('verlauf'), tour: 'nav-verlauf' },
      )
      if (darfBearbeiten) {
        out.push({ to: `${base}/etiketten`, icon: <Printer size={20} />, label: t('umzuege.etiketten'), active: hier('etiketten'), tour: 'nav-etiketten' })
      }
    }
    out.push(
      { to: '/app/scan', icon: <ScanLine size={20} />, label: t('nav.scannen'), active: pathname === '/app/scan' || pathname.endsWith('/scan'), tour: 'nav-scannen' },
      { to: '/app/einstellungen', icon: <User size={20} />, label: t('nav.profil'), active: pathname === '/app/einstellungen', tour: 'nav-profil' },
    )
    if (admin) {
      out.push({ to: '/app/admin', icon: <ShieldCheck size={20} />, label: t('admin.nav'), active: pathname === '/app/admin', badge: wartende, tour: 'nav-admin' })
    }
    return out
  }, [t, pathname, projektId, darfBearbeiten, admin, wartende])

  useEffect(() => {
    let alive = true
    listProjects()
      .then((l) => alive && setZeilen(l))
      .catch((e: unknown) => alive && setFehler(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [projektId])

  const umschalten = () => {
    setZu((v) => {
      try {
        localStorage.setItem(MERKEN, v ? 'auf' : 'zu')
      } catch {
        /* nur Bequemlichkeit, ohne Speicher bleibt die Leiste offen */
      }
      return !v
    })
  }

  return (
    <aside
      data-tour="leiste"
      className={cx(
        'seitenleiste no-print sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-[var(--seitenleiste)] lg:flex',
        zu ? 'w-[4.5rem]' : 'w-60',
      )}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-4">
        {!zu ? (
          <div className="min-w-0 flex-1">
            <label className="mb-1 block px-1 text-xs font-semibold text-muted">
              {t('leiste.umzug')}
            </label>
            {fehler ? (
              <p className="text-xs text-danger" title={fehler}>
                {t('leiste.umzuege_fehler')}
              </p>
            ) : projekte === null ? (
              <div className="h-10 animate-pulse rounded-xl bg-raised" />
            ) : projekte.length === 0 ? (
              <p className="text-sm text-muted">{t('leiste.keine_umzuege')}</p>
            ) : (
              <select
                data-tour="leiste-umzug"
                value={projektId ?? ''}
                onChange={(e) => e.target.value && nav(`/app/p/${e.target.value}`)}
                className="feld-auswahl h-10 w-full appearance-none truncate rounded-[10px] border-0 bg-feld ps-3 pe-8 text-sm font-semibold text-ink"
              >
                {projektId ? null : <option value="">{t('leiste.umzug_waehlen')}</option>}
                {projekte.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}
        <button
          data-tour="leiste-klappen"
          onClick={umschalten}
          aria-label={t(zu ? 'leiste.aufklappen' : 'leiste.einklappen')}
          title={t(zu ? 'leiste.aufklappen' : 'leiste.einklappen')}
          className={cx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-feld hover:text-ink',
            zu && 'mx-auto',
          )}
        >
          {zu ? <ChevronsRight size={20} className="spiegeln" /> : <ChevronsLeft size={20} className="spiegeln" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {eintraege.map((e) => (
          <Link
            key={e.label}
            to={e.to}
            data-tour={e.tour}
            title={zu ? e.label : undefined}
            aria-label={e.label}
            aria-current={e.active ? 'page' : undefined}
            className={cx(
              'relative flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-[0.9375rem] transition',
              e.active ? 'bg-tint font-semibold text-accent-text' : 'font-medium text-ink hover:bg-feld',
              zu && 'justify-center px-0',
            )}
          >
            <span className={cx('shrink-0', !e.active && 'text-accent')}>{e.icon}</span>
            {!zu ? <span className="truncate">{e.label}</span> : null}
            {e.badge && e.badge > 0 ? (
              <span
                className={cx(
                  'min-w-5 rounded-full bg-danger px-1.5 text-center text-[0.6875rem] font-semibold leading-5 text-paper',
                  zu ? 'absolute end-1 top-0.5' : 'ms-auto',
                )}
              >
                {e.badge > 99 ? '99+' : e.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

/** Schmale Kopfzeile am Computer mit der globalen Suche. Die Taste `/`
 *  springt ins Feld, solange man nicht gerade in einem anderen Feld tippt. */
export function SuchKopf() {
  const t = useT()
  const nav = useNavigate()
  const feld = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const ziel = e.target as HTMLElement | null
      if (ziel && (ziel.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ziel.tagName))) return
      e.preventDefault()
      feld.current?.focus()
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [])

  return (
    <div className="no-print hidden border-b border-line bg-paper lg:block">
      <form
        data-tour="suchkopf"
        className="mx-auto flex h-14 max-w-[1600px] items-center px-5"
        onSubmit={(e) => {
          e.preventDefault()
          const s = q.trim()
          nav(s ? `/app/suche?q=${encodeURIComponent(s)}` : '/app/suche')
          feld.current?.blur()
        }}
      >
        <div className="flex h-9 w-full max-w-xl items-center gap-2 rounded-[10px] bg-feld px-3 transition focus-within:ring-[3px] focus-within:ring-accent/25">
          <Search size={17} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={feld}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('leiste.suche_platzhalter')}
            aria-label={t('nav.suchen')}
            className="h-9 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="rounded-md bg-surface px-1.5 text-xs font-semibold text-muted shadow-[0_0_0_0.5px_var(--line)]">/</kbd>
        </div>
      </form>
    </div>
  )
}
