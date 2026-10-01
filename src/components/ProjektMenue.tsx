import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight,
  Armchair,
  Boxes,
  Cog,
  DoorOpen,
  FileDown,
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  Printer,
  Users,
  X,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { cx } from '../lib/util'
import { useProjektOptional } from '../pages/ProjectLayout'

/* Drei-Striche-Menue eines Umzugs am Handy (E78).
 *
 * Unten stehen immer dieselben fuenf Knoepfe. Alles, was zu einem Umzug
 * gehoert und sonst als Kacheln und Knoepfe auf der Seite stand (Zimmer,
 * Grundriss, Moebel, Etiketten, Ausgabe, Team, Einstellungen), liegt hier:
 * oben links in der Kopfzeile, eine Hand weit. Am Computer gibt es die
 * Seitenleiste, dort bleibt der Knopf weg.
 */
export function ProjektMenue() {
  const t = useT()
  const { pathname } = useLocation()
  const projekt = useProjektOptional()
  const [offen, setOffen] = useState(false)
  const pid = /^\/app\/p\/([^/]+)/.exec(pathname)?.[1] ?? null

  // Beim Wechsel der Seite zu, mit Esc zu.
  useEffect(() => {
    setOffen(false)
  }, [pathname])
  useEffect(() => {
    if (!offen) return
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false)
    }
    window.addEventListener('keydown', taste)
    return () => window.removeEventListener('keydown', taste)
  }, [offen])

  if (!pid) return null
  const base = `/app/p/${pid}`
  const eintraege: { to: string; icon: ReactNode; label: string; aktiv: boolean; nurBearbeiter?: boolean }[] = [
    { to: base, icon: <Home size={20} />, label: t('nav.uebersicht'), aktiv: pathname === base },
    { to: `${base}/kisten?neu=1`, icon: <Plus size={20} />, label: t('umzuege.kiste_anlegen'), aktiv: false, nurBearbeiter: true },
    { to: `${base}/kisten`, icon: <Boxes size={20} />, label: t('umzuege.alle_kisten'), aktiv: pathname.startsWith(`${base}/kisten`) },
    { to: `${base}/bereiche`, icon: <DoorOpen size={20} />, label: t('begriff.bereiche'), aktiv: pathname.startsWith(`${base}/bereiche`) || pathname.includes('/zimmer/') || pathname.includes('/person/') },
    { to: `${base}/grundriss`, icon: <LayoutDashboard size={20} />, label: t('grundriss.titel'), aktiv: pathname.startsWith(`${base}/grundriss`) },
    { to: `${base}/moebel`, icon: <Armchair size={20} />, label: t('moebel.titel'), aktiv: pathname.startsWith(`${base}/moebel`) },
    { to: `${base}/etiketten`, icon: <Printer size={20} />, label: t('umzuege.etiketten'), aktiv: pathname.startsWith(`${base}/etiketten`) },
    { to: `${base}/export`, icon: <FileDown size={20} />, label: t('ausgabe.titel'), aktiv: pathname.startsWith(`${base}/export`) },
    { to: `${base}/team`, icon: <Users size={20} />, label: t('umzuege.team'), aktiv: pathname.startsWith(`${base}/team`) },
    { to: `${base}/einstellungen`, icon: <Cog size={20} />, label: t('umzuege.einstellen'), aktiv: pathname.startsWith(`${base}/einstellungen`) },
  ]
  const sichtbar = eintraege.filter((e) => !e.nurBearbeiter || projekt?.canEdit)

  return (
    <>
      <button
        type="button"
        data-tour="umzug-menue"
        onClick={() => setOffen(true)}
        aria-label={t('menue.umzug')}
        title={t('menue.umzug')}
        aria-expanded={offen}
        className="knopf -ms-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-knopf border-2 border-transparent text-ink transition hover:border-line hover:bg-raised lg:hidden"
      >
        <Menu size={22} />
      </button>
      {/* An body gehaengt (E80): die Kopfzeile hat backdrop-blur, und das
          sperrt ein fixed-Element in ihre eigene Hoehe ein. */}
      {offen
        ? createPortal(
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label={t('menue.umzug')}>
          <button type="button" aria-label={t('aktion.schliessen')} className="absolute inset-0 bg-black/40" onClick={() => setOffen(false)} />
          <nav className="safe-top absolute inset-y-0 start-0 flex w-[84%] max-w-xs flex-col overflow-y-auto border-e border-line bg-surface shadow-dialog">
            <div className="flex items-center gap-2 border-b-2 border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="t-sub">{t('menue.umzug')}</p>
                <p className="t-name truncate">{projekt?.project.name ?? ''}</p>
              </div>
              <button
                type="button"
                onClick={() => setOffen(false)}
                aria-label={t('aktion.schliessen')}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-knopf hover:bg-raised"
              >
                <X size={20} />
              </button>
            </div>
            <ul className="flex-1 p-2">
              {sichtbar.map((e) => (
                <li key={e.to}>
                  <Link
                    to={e.to}
                    onClick={() => setOffen(false)}
                    aria-current={e.aktiv ? 'page' : undefined}
                    className={cx(
                      'flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold leading-tight',
                      e.aktiv ? 'bg-ink text-paper' : 'text-ink hover:bg-raised',
                    )}
                  >
                    {e.icon}
                    <span className="min-w-0 flex-1">{e.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t-2 border-line p-2">
              <Link
                to="/app"
                onClick={() => setOffen(false)}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-base font-bold leading-tight text-ink hover:bg-raised"
              >
                <ArrowLeftRight size={20} />
                <span className="min-w-0 flex-1">{t('umzuege.andere')}</span>
              </Link>
            </div>
          </nav>
        </div>,
            document.body,
          )
        : null}
    </>
  )
}
