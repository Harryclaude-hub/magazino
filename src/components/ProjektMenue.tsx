import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight,
  Boxes,
  ChevronRight,
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
        className="knopf -ms-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent transition hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:hidden"
      >
        <Menu size={22} />
      </button>
      {/* An body gehaengt (E80): die Kopfzeile hat backdrop-blur, und das
          sperrt ein fixed-Element in ihre eigene Hoehe ein. */}
      {offen
        ? createPortal(
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label={t('struktur.menue')}>
          <button type="button" aria-label={t('aktion.schliessen')} className="d-schleier absolute inset-0 bg-[var(--schleier)] backdrop-blur-[3px]" onClick={() => setOffen(false)} />
          <nav className="d-seite safe-top safe-bottom absolute inset-y-0 start-0 flex w-[84%] max-w-xs flex-col overflow-y-auto overscroll-contain rounded-e-[20px] bg-paper shadow-dialog">
            <div className="flex items-center gap-2 px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1">
                <p className="t-sub">{t('struktur.menue')}</p>
                <p className="t-name-lg truncate">{projekt?.project.name ?? ''}</p>
              </div>
              <button
                type="button"
                onClick={() => setOffen(false)}
                aria-label={t('aktion.schliessen')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-feld text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 space-y-4 px-3 pb-3">
              <ul className="gruppe overflow-hidden rounded-[14px] bg-surface">
                {sichtbar.map((e) => (
                  <li key={e.to}>
                    <Link
                      to={e.to}
                      onClick={() => setOffen(false)}
                      aria-current={e.aktiv ? 'page' : undefined}
                      className={cx(
                        'flex min-h-12 items-center gap-3 px-3.5 py-2.5 text-base leading-tight transition-colors active:bg-feld',
                        e.aktiv ? 'bg-tint font-semibold text-accent-text' : 'font-medium text-ink',
                      )}
                    >
                      <span className="text-accent">{e.icon}</span>
                      <span className="min-w-0 flex-1">{e.label}</span>
                      <ChevronRight size={18} className="spiegeln shrink-0 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="gruppe overflow-hidden rounded-[14px] bg-surface">
                <li>
                  <Link
                    to="/app"
                    onClick={() => setOffen(false)}
                    className="flex min-h-12 items-center gap-3 px-3.5 py-2.5 text-base font-medium leading-tight text-ink transition-colors active:bg-feld"
                  >
                    <span className="text-accent">
                      <ArrowLeftRight size={20} />
                    </span>
                    <span className="min-w-0 flex-1">{t('umzuege.andere')}</span>
                    <ChevronRight size={18} className="spiegeln shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>,
            document.body,
          )
        : null}
    </>
  )
}
