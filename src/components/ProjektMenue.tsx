import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  Cog,
  HandHelping,
  History,
  Home,
  KeyRound,
  LayoutDashboard,
  Menu,
  Package,
  Printer,
  X,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { cx } from '../lib/util'
import { useProjektOptional } from '../pages/ProjectLayout'

/* Drei-Striche-Menue eines Lagers am Handy (E78, E104).
 *
 * Unten stehen immer dieselben fuenf Knoepfe. Alles, was zu einem Lager
 * gehoert (Tuer, Bestand, Ausleihen, Kisten, Grundriss, Verlauf, Etiketten,
 * Einstellungen), liegt hier:
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
  const hier = (p: string) => pathname.startsWith(`${base}/${p}`)
  const eintraege: { to: string; icon: ReactNode; label: string; aktiv: boolean; nurBearbeiter?: boolean }[] = [
    { to: base, icon: <Home size={20} />, label: t('struktur.start'), aktiv: pathname === base },
    { to: `${base}/tuer`, icon: <KeyRound size={20} />, label: t('lager.nav_tuer'), aktiv: hier('tuer') },
    { to: `${base}/bestand`, icon: <Package size={20} />, label: t('lager.nav_bestand'), aktiv: hier('bestand') },
    { to: `${base}/ausleihen`, icon: <HandHelping size={20} />, label: t('lager.nav_ausleihen'), aktiv: hier('ausleihen') },
    { to: `${base}/kisten`, icon: <Boxes size={20} />, label: t('nav.kisten'), aktiv: hier('kisten') },
    { to: `${base}/grundriss`, icon: <LayoutDashboard size={20} />, label: t('grundriss.titel'), aktiv: hier('grundriss') },
    { to: `${base}/verlauf`, icon: <History size={20} />, label: t('struktur.verlauf'), aktiv: hier('verlauf') },
    { to: `${base}/etiketten`, icon: <Printer size={20} />, label: t('umzuege.etiketten'), aktiv: hier('etiketten'), nurBearbeiter: true },
    { to: `${base}/einstellungen`, icon: <Cog size={20} />, label: t('struktur.einstellungen'), aktiv: hier('einstellungen') },
  ]
  const sichtbar = eintraege.filter((e) => !e.nurBearbeiter || projekt?.canEdit)

  return (
    <>
      <button
        type="button"
        data-tour="umzug-menue"
        onClick={() => setOffen(true)}
        aria-label={t('struktur.menue')}
        title={t('struktur.menue')}
        aria-expanded={offen}
        className="knopf -ms-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-knopf border-2 border-transparent text-ink transition hover:border-line hover:bg-raised lg:hidden"
      >
        <Menu size={22} />
      </button>
      {/* An body gehaengt (E80): die Kopfzeile hat backdrop-blur, und das
          sperrt ein fixed-Element in ihre eigene Hoehe ein. */}
      {offen
        ? createPortal(
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label={t('struktur.menue')}>
          <button type="button" aria-label={t('aktion.schliessen')} className="absolute inset-0 bg-black/40" onClick={() => setOffen(false)} />
          <nav className="safe-top absolute inset-y-0 start-0 flex w-[84%] max-w-xs flex-col overflow-y-auto border-e border-line bg-surface shadow-dialog">
            <div className="flex items-center gap-2 border-b-2 border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="t-sub">{t('struktur.menue')}</p>
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
