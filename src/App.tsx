import { FreigabeTor } from './components/Freigabe'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider, Loading, Wordmark } from './components/ui'
import { configError } from './lib/supabase'
import { SpracheProvider } from './lib/i18n'
import { LINK_BEIM_LADEN, useWiederherstellung } from './lib/linkstand'

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
const Admin = lazy(() => import('./pages/Admin'))
/* Die Siedlung (E83): eigener Bereich neben den Umzuegen. Beim Start der
 * App laedt davon nichts, weder Seite noch Daten noch three; erst der
 * Knopf oben rechts oeffnet sie. */
const Siedlungen = lazy(() => import('./pages/Siedlungen'))
const SiedlungAnsicht = lazy(() => import('./pages/SiedlungAnsicht'))

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
  // Angemeldet heisst noch nicht freigeschaltet (0036).
  return <FreigabeTor>{children}</FreigabeTor>
}

/* Solange ein Passwort-Link eingeloest, das neue Passwort aber noch nicht
 * gesetzt ist, fuehrt jede andere Seite zurueck zu Passwort neu. Sonst
 * waere der Link aus der Mail eine gewoehnliche Anmeldung. Der Merker lebt
 * nur im Speicher dieses Seitenaufrufs (src/lib/linkstand.ts). */
function WiederherstellungsWache({ children }: { children: ReactNode }) {
  const aktiv = useWiederherstellung()
  const loc = useLocation()
  if (aktiv && loc.pathname !== '/passwort-neu') return <Navigate to="/passwort-neu" replace />
  return <>{children}</>
}

/* Die Wurzel fuehrt zur Anmeldung. Landet ein Link aus einer Auth-Mail
 * hier (Supabase nimmt die Site URL, wenn die Zieladresse nicht in der
 * Liste der erlaubten Adressen steht), geht es mit allen Parametern zu
 * Passwort neu weiter, statt sie auf dem Weg zur Anmeldung zu verlieren. */
function Wurzel() {
  const loc = useLocation()
  if (LINK_BEIM_LADEN && (loc.search || loc.hash)) {
    return <Navigate to={{ pathname: '/passwort-neu', search: loc.search, hash: loc.hash }} replace />
  }
  return <Navigate to="/login" replace />
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
          <WiederherstellungsWache>
          <Routes>
            {/* Die Werbeseite (pages/Landing.tsx) ist abgeschaltet: nach aussen soll
                nichts verraten, was Fundkiste ist. Wer kommt, landet bei der Anmeldung. */}
            <Route path="/" element={<Wurzel />} />
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
              <Route path="admin" element={<Nachladen><Admin /></Nachladen>} />
              <Route path="siedlung" element={<Nachladen><Siedlungen /></Nachladen>} />
              <Route path="siedlung/:sid" element={<Nachladen><SiedlungAnsicht /></Nachladen>} />
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
          </WiederherstellungsWache>
          </ToastProvider>
        </AuthProvider>
      </SpracheProvider>
    </BrowserRouter>
  )
}
