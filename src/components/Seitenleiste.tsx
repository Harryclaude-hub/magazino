import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  DoorOpen,
  LayoutDashboard,
  MessageCircle,
  ScanLine,
  Search,
  User,
  Warehouse,
} from 'lucide-react'
import { cx } from '../lib/util'
import { useT } from '../lib/i18n'
import { listProjects } from '../lib/api'
import type { Project } from '../lib/types'

/* Linke Leiste am Computer (ab 1024 px). Sie ersetzt dort die untere
 * Leiste. Eingeklappt zeigt sie nur Symbole; der Zustand bleibt im Browser
 * gemerkt. Oben steht der aktuelle Umzug mit Wechsler. */

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
  eintraege,
  projektId,
}: {
  eintraege: LeistenEintrag[]
  projektId: string | null
}) {
  const t = useT()
  const nav = useNavigate()
  const [zu, setZu] = useState(gemerktEingeklappt)
  const [projekte, setProjekte] = useState<Project[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    listProjects()
      .then((l) => alive && setProjekte(l.map((x) => x.project)))
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
        'no-print sticky top-0 hidden h-screen shrink-0 flex-col border-e border-line bg-surface lg:flex',
        zu ? 'w-[4.5rem]' : 'w-60',
      )}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-4">
        {!zu ? (
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
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
                className="h-10 w-full truncate rounded-xl border-2 border-line bg-paper px-2 text-sm font-bold text-ink"
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
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-raised hover:text-ink',
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
              'relative flex min-h-11 items-center gap-3 rounded-xl px-3 font-bold transition',
              e.active ? 'bg-ink text-paper' : 'text-muted hover:bg-raised hover:text-ink',
              zu && 'justify-center px-0',
            )}
          >
            <span className="shrink-0">{e.icon}</span>
            {!zu ? <span className="truncate">{e.label}</span> : null}
            {e.badge && e.badge > 0 ? (
              <span
                className={cx(
                  'min-w-5 rounded-full bg-danger px-1.5 text-center text-[0.6875rem] font-black leading-5 text-paper',
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
    <div className="no-print hidden border-b border-line bg-surface/80 lg:block">
      <form
        data-tour="suchkopf"
        className="mx-auto flex h-12 max-w-[1600px] items-center gap-2 px-5"
        onSubmit={(e) => {
          e.preventDefault()
          const s = q.trim()
          nav(s ? `/app/suche?q=${encodeURIComponent(s)}` : '/app/suche')
          feld.current?.blur()
        }}
      >
        <Search size={18} className="shrink-0 text-muted" />
        <input
          ref={feld}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('leiste.suche_platzhalter')}
          aria-label={t('nav.suchen')}
          className="h-9 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        <kbd className="rounded-md border border-line px-1.5 text-xs font-bold text-muted">/</kbd>
      </form>
    </div>
  )
}

export const LeistenSymbole = {
  umzuege: <Warehouse size={20} />,
  kisten: <Boxes size={20} />,
  zimmer: <DoorOpen size={20} />,
  grundriss: <LayoutDashboard size={20} />,
  suchen: <Search size={20} />,
  scannen: <ScanLine size={20} />,
  chat: <MessageCircle size={20} />,
  profil: <User size={20} />,
}
