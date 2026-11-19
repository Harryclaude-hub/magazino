import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Boxes, History, ScanLine, Search, Warehouse } from 'lucide-react'
import { BottomNav, NavTab } from '../components/AppShell'
import { Seitenleiste, SuchKopf } from '../components/Seitenleiste'
import { useT } from '../lib/i18n'
import { adminWartende, istAdmin } from '../lib/api'
import { useAuth } from '../lib/auth'
import { getLastProject, setLastProject } from '../lib/lastProject'

/* Rahmen um alles, was hinter der Anmeldung liegt (E104).
 * Die untere Leiste ist immer da, mit genau fuenf Knoepfen: Start, Kisten,
 * Scannen, Suchen, Verlauf. Das Profil steht oben rechts in jeder
 * Kopfzeile, alles Weitere eines Lagers im Drei-Striche-Menue
 * (ProjektMenue). Sie kennt das zuletzt geoeffnete Lager und springt
 * direkt dorthin. Einen Chat gibt es nicht mehr, also auch keinen
 * Ungelesen-Punkt.
 */

interface AppShellValue {
  lastProject: string | null
  rememberProject: (id: string) => void
}

const Ctx = createContext<AppShellValue | null>(null)

export function useAppShell(): AppShellValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAppShell ausserhalb von AppLayout')
  return v
}

export default function AppLayout() {
  const { user } = useAuth()
  const t = useT()
  const loc = useLocation()
  const [lastProject, setLast] = useState<string | null>(() => getLastProject())
  /* Admin-Portal (0035): der Menuepunkt nur fuer Admins. Die Datenbank
   * prueft beim Laden selbst noch einmal. */
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (!user?.id) {
      setAdmin(false)
      return
    }
    let alive = true
    istAdmin()
      .then((ja) => alive && setAdmin(ja))
      .catch((err: unknown) => console.warn('[shell] Admin nicht geprueft:', err instanceof Error ? err.message : err))
    return () => {
      alive = false
    }
  }, [user?.id])
  // Wie viele Konten warten auf Freischaltung: Zahl am Menuepunkt.
  const [wartende, setWartende] = useState(0)
  const pfad = loc.pathname
  useEffect(() => {
    if (!admin) return
    let alive = true
    adminWartende()
      .then((n) => alive && setWartende(n))
      .catch((err: unknown) => console.warn('[shell] Wartende nicht gezaehlt:', err instanceof Error ? err.message : err))
    return () => {
      alive = false
    }
  }, [admin, pfad])

  const rememberProject = useCallback((id: string) => {
    setLast((cur) => {
      if (cur === id) return cur
      setLastProject(id)
      return id
    })
  }, [])

  const value = useMemo<AppShellValue>(() => ({ lastProject, rememberProject }), [lastProject, rememberProject])

  const path = loc.pathname
  const inProject = path.startsWith('/app/p/')
  /* Ohne bekanntes Lager fuehren Kisten und Verlauf zur Startseite. */
  const itemsTo = lastProject ? `/app/p/${lastProject}/kisten` : '/app'
  const verlaufTo = lastProject ? `/app/p/${lastProject}/verlauf` : '/app'

  /* Lager aus der Adresse, sonst das zuletzt geoeffnete. */
  const projektId = /^\/app\/p\/([^/]+)/.exec(path)?.[1] ?? lastProject

  return (
    <Ctx.Provider value={value}>
      <div className="flex min-h-screen bg-paper">
        <Seitenleiste projektId={projektId} admin={admin} wartende={wartende} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Im Grundriss zaehlt jede Zeile Platz: dort keine Suchleiste. */}
        {/\/grundriss(\/|$)/.test(path) ? null : <SuchKopf />}
        <div className="flex-1">
          <Outlet />
        </div>

        {/* Platzhalter so hoch wie die feste Leiste, damit nichts darunter
            verschwindet (Hoehe meldet die Leiste selbst als --nav-h). */}
        <div className="lg:hidden" style={{ height: 'var(--nav-h, 5.5rem)' }} aria-hidden="true" />
        <div className="lg:hidden">
        <BottomNav>
          <NavTab
            to="/app"
            icon={<Warehouse size={21} />}
            label={t('struktur.start')}
            tour="nav-umzuege"
            active={path === '/app' || path.startsWith('/app/bl/')}
          />
          <NavTab
            to={itemsTo}
            icon={<Boxes size={21} />}
            label={t('nav.kisten')}
            tour="nav-kisten"
            active={inProject && path.includes('/kisten')}
          />
          <NavTab
            to="/app/scan"
            icon={<ScanLine size={26} />}
            label={t('nav.scannen')}
            tour="nav-scannen"
            active={path === '/app/scan' || path.endsWith('/scan')}
            raised
          />
          <NavTab
            to="/app/suche"
            icon={<Search size={21} />}
            label={t('nav.suchen')}
            tour="nav-suchen"
            active={path === '/app/suche'}
          />
          <NavTab
            to={verlaufTo}
            icon={<History size={21} />}
            label={t('struktur.verlauf')}
            tour="nav-verlauf"
            active={inProject && path.endsWith('/verlauf')}
          />
        </BottomNav>
        </div>
      </div>
      </div>
    </Ctx.Provider>
  )
}
