import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Boxes, MessageCircle, ScanLine, Search, User, Warehouse } from 'lucide-react'
import { BottomNav, NavTab } from '../components/AppShell'
import { LeistenSymbole, Seitenleiste, SuchKopf } from '../components/Seitenleiste'
import { useT } from '../lib/i18n'
import { countUnread, listMembers } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { getLastProject, setLastProject } from '../lib/lastProject'

/* Rahmen um alles, was hinter der Anmeldung liegt.
 * Die untere Leiste ist immer da, wie bei WhatsApp. Sie kennt den zuletzt
 * geoeffneten Umzug und springt direkt dorthin.
 */

interface AppShellValue {
  lastProject: string | null
  rememberProject: (id: string) => void
  unread: number
  refreshUnread: () => void
  clearUnread: () => void
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
  const [unread, setUnread] = useState(0)

  const rememberProject = useCallback((id: string) => {
    setLast((cur) => {
      if (cur === id) return cur
      setLastProject(id)
      return id
    })
  }, [])

  /* Ungelesene Nachrichten des zuletzt geoeffneten Umzugs. Genau eine
   * Stelle, an der gezaehlt wird, damit die Zahl nicht an zwei Orten
   * auseinanderlaeuft. */
  const refreshUnread = useCallback(() => {
    if (!user?.id || !lastProject) {
      setUnread(0)
      return
    }
    void (async () => {
      try {
        const members = await listMembers(lastProject)
        const me = members.find((m) => m.user_id === user.id)
        if (!me) {
          setUnread(0)
          return
        }
        setUnread(await countUnread(lastProject, me.last_read_at))
      } catch (err) {
        // Ein Zaehler ist kein Grund, die App anzuhalten. Sichtbar bleibt es
        // trotzdem in der Konsole.
        console.warn('[shell] Ungelesene nicht ermittelt:', err)
      }
    })()
  }, [user?.id, lastProject])

  useEffect(() => {
    refreshUnread()
  }, [refreshUnread])

  const inChat = loc.pathname.endsWith('/chat')

  useEffect(() => {
    if (!lastProject || !user?.id) return
    const ch = supabase
      .channel(`shell-unread-${lastProject}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${lastProject}`,
        },
        (payload) => {
          const m = payload.new as { sender_id: string | null }
          if (m.sender_id === user.id) return
          if (inChat) return
          setUnread((n) => n + 1)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [lastProject, user?.id, inChat])

  const value = useMemo<AppShellValue>(
    () => ({
      lastProject,
      rememberProject,
      unread,
      refreshUnread,
      clearUnread: () => setUnread(0),
    }),
    [lastProject, rememberProject, unread, refreshUnread],
  )

  const path = loc.pathname
  const inProject = path.startsWith('/app/p/')
  /* Ohne bekannten Umzug fuehren Kisten und Chat zur Uebersicht. Vorher
   * zeigten sie auf /app/kisten und /app/chat, und die gibt es nicht. */
  const itemsTo = lastProject ? `/app/p/${lastProject}/kisten` : '/app'
  const chatTo = lastProject ? `/app/p/${lastProject}/chat` : '/app'

  /* Umzug aus der Adresse, sonst der zuletzt geoeffnete. */
  const projektId = /^\/app\/p\/([^/]+)/.exec(path)?.[1] ?? lastProject
  const zimmerTo = projektId ? `/app/p/${projektId}/bereiche` : '/app'

  return (
    <Ctx.Provider value={value}>
      <div className="flex min-h-screen bg-paper">
        <Seitenleiste
          projektId={projektId}
          eintraege={[
            { to: '/app', icon: LeistenSymbole.umzuege, label: t('nav.umzuege'), active: path === '/app' },
            {
              to: itemsTo,
              icon: LeistenSymbole.kisten,
              label: t('nav.kisten'),
              active: inProject && path.includes('/kisten'),
            },
            {
              to: zimmerTo,
              icon: LeistenSymbole.zimmer,
              label: t('leiste.zimmer'),
              active: inProject && (path.includes('/bereiche') || path.includes('/zimmer/')),
            },
            { to: '/app/suche', icon: LeistenSymbole.suchen, label: t('nav.suchen'), active: path === '/app/suche' },
            {
              to: '/app/scan',
              icon: LeistenSymbole.scannen,
              label: t('nav.scannen'),
              active: path === '/app/scan' || path.endsWith('/scan'),
            },
            { to: chatTo, icon: LeistenSymbole.chat, label: t('nav.chat'), active: inChat, badge: unread },
            {
              to: '/app/einstellungen',
              icon: LeistenSymbole.profil,
              label: t('nav.profil'),
              active: path === '/app/einstellungen',
            },
          ]}
        />
      <div className="flex min-w-0 flex-1 flex-col">
        <SuchKopf />
        <div className="flex-1">
          <Outlet />
        </div>

        <div className="lg:hidden">
        <BottomNav>
          <NavTab
            to="/app"
            icon={<Warehouse size={21} />}
            label={t('nav.umzuege')}
            active={path === '/app'}
          />
          <NavTab
            to={itemsTo}
            icon={<Boxes size={21} />}
            label={t('nav.kisten')}
            active={inProject && path.includes('/kisten')}
          />
          <NavTab
            to="/app/scan"
            icon={<ScanLine size={26} />}
            label={t('nav.scannen')}
            active={path === '/app/scan' || path.endsWith('/scan')}
            raised
          />
          <NavTab
            to="/app/suche"
            icon={<Search size={21} />}
            label={t('nav.suchen')}
            active={path === '/app/suche'}
          />
          <NavTab
            to={chatTo}
            icon={<MessageCircle size={21} />}
            label={t('nav.chat')}
            active={inChat}
            badge={unread}
          />
          <NavTab
            to="/app/einstellungen"
            icon={<User size={21} />}
            label={t('nav.profil')}
            active={path === '/app/einstellungen'}
          />
        </BottomNav>
        </div>
      </div>
      </div>
    </Ctx.Provider>
  )
}
