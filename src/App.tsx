import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider, Loading, Wordmark } from './components/ui'
import { configError } from './lib/supabase'
import { SpracheProvider } from './lib/i18n'

import Login from './pages/Login'
import Register from './pages/Register'
import ResetRequest from './pages/ResetRequest'
import ResetConfirm from './pages/ResetConfirm'
import AppLayout from './pages/AppLayout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import ScanHub from './pages/ScanHub'
import Suche from './pages/Suche'
import ProjectLayout from './pages/ProjectLayout'
import ProjectHome from './pages/ProjectHome'
import Areas from './pages/Areas'
import AreaDetail from './pages/AreaDetail'
import Items from './pages/Items'
import ItemDetail from './pages/ItemDetail'
import Furniture from './pages/Furniture'
import FurnitureDetail from './pages/FurnitureDetail'
import Labels from './pages/Labels'
import Export from './pages/Export'
import Groessen from './pages/Groessen'
import ScanPage from './pages/ScanPage'
import Chat from './pages/Chat'
import Team from './pages/Team'
import ProjectSettings from './pages/ProjectSettings'
import ScanResolve from './pages/ScanResolve'
import NotFound from './pages/NotFound'

/* Der Grundriss laedt als eigener Teil, erst wenn ihn jemand oeffnet. Der
 * Zeichner darin ist noch einmal ein eigener Teil (nur am Computer). */
const Grundriss = lazy(() => import('./pages/Grundriss'))
const GrundrissWeiche = lazy(() => import('./pages/Grundriss').then((m) => ({ default: m.GrundrissWeiche })))
const AlterPlanLink = lazy(() => import('./pages/Grundriss').then((m) => ({ default: m.AlterPlanLink })))
/* Kiste platzieren am Handy: eigener Teil, erst beim Oeffnen geladen. */
const PlatzWahl = lazy(() => import('./pages/PlatzWahl'))

function Nachladen({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

/* Solange die Sitzung noch geprueft wird, wird nicht auf die Anmeldung
 * umgeleitet. Sonst fliegt man beim Start kurz raus, obwohl man angemeldet
 * ist, und genau das soll nie passieren. */
function Gate({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <Loading label="Moment" />
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  return <>{children}</>
}

function SetupHint() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <Wordmark size={40} />
      <h1 className="text-xl font-bold">Konfiguration fehlt</h1>
      <p className="text-sm text-muted">{configError}</p>
      <pre className="w-full overflow-x-auto rounded-xl bg-raised p-4 text-left text-xs">
        {`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_VAPID_PUBLIC_KEY=B...`}
      </pre>
    </div>
  )
}

export default function App() {
  if (configError) return <SetupHint />
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SpracheProvider>
        <AuthProvider>
          <ToastProvider>
          <Routes>
            {/* Die Werbeseite (pages/Landing.tsx) ist abgeschaltet: nach aussen soll
                nichts verraten, was Kistly ist. Wer kommt, landet bei der Anmeldung. */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registrieren" element={<Register />} />
            <Route path="/passwort-vergessen" element={<ResetRequest />} />
            <Route path="/passwort-neu" element={<ResetConfirm />} />
            <Route
              path="/s/:itemId"
              element={
                <Gate>
                  <ScanResolve />
                </Gate>
              }
            />

            <Route
              path="/app"
              element={
                <Gate>
                  <AppLayout />
                </Gate>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="einstellungen" element={<Settings />} />
              <Route path="scan" element={<ScanHub />} />
              <Route path="suche" element={<Suche />} />
              <Route path="p/:pid" element={<ProjectLayout />}>
                <Route index element={<ProjectHome />} />
                <Route path="bereiche" element={<Areas />} />
                {/* Eigene Seiten. Zimmer und Person teilen sich eine Datei,
                    sie sind in der Datenbank dieselbe Tabelle. */}
                <Route path="zimmer/:tagId" element={<AreaDetail kind="room" />} />
                {/* Alte Links auf den Raumplan fuehren in den Grundriss. */}
                <Route path="zimmer/:tagId/plan" element={<Nachladen><AlterPlanLink /></Nachladen>} />
                <Route path="grundriss" element={<Nachladen><GrundrissWeiche /></Nachladen>} />
                <Route path="grundriss/:gid" element={<Nachladen><Grundriss /></Nachladen>} />
                <Route path="person/:tagId" element={<AreaDetail kind="person" />} />
                <Route path="moebel" element={<Furniture />} />
                <Route path="moebel/:id" element={<FurnitureDetail />} />
                <Route path="kisten" element={<Items />} />
                <Route path="kisten/:iid" element={<ItemDetail />} />
                <Route path="kisten/:iid/platz" element={<Nachladen><PlatzWahl /></Nachladen>} />
                <Route path="etiketten" element={<Labels />} />
                <Route path="export" element={<Export />} />
                <Route path="groessen" element={<Groessen />} />
                <Route path="scan" element={<ScanPage />} />
                <Route path="chat" element={<Chat />} />
                <Route path="team" element={<Team />} />
                <Route path="einstellungen" element={<ProjectSettings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </ToastProvider>
        </AuthProvider>
      </SpracheProvider>
    </BrowserRouter>
  )
}
