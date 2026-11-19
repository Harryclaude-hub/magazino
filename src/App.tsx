import { FreigabeTor } from './components/Freigabe'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider, Loading, Wordmark } from './components/ui'
import { configError } from './lib/supabase'
import { SpracheProvider } from './lib/i18n'
import { LINK_BEIM_LADEN, useWiederherstellung } from './lib/linkstand'

import Login from './pages/Login'
import ResetRequest from './pages/ResetRequest'
import ResetConfirm from './pages/ResetConfirm'
import AppLayout from './pages/AppLayout'
import Dashboard from './pages/Dashboard'
import BlProjekt from './pages/BlProjekt'
import Verlauf from './pages/Verlauf'
import Settings from './pages/Settings'
import ScanHub from './pages/ScanHub'
import Suche from './pages/Suche'
import ProjectLayout from './pages/ProjectLayout'
import LagerHome from './pages/LagerHome'
import Tuer from './pages/Tuer'
import Bestand from './pages/Bestand'
import Ausleihen from './pages/Ausleihen'
import Items from './pages/Items'
import ItemDetail from './pages/ItemDetail'
import Labels from './pages/Labels'
import Groessen from './pages/Groessen'
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
/* Alte Adressen (Chat, Bereiche, Zimmer, Personen, Moebel, Export, Team,
 * Siedlung) gibt es nicht mehr. Alte QR-Codes und Links landen auf der
 * Startseite des Lagers statt im Leeren (E104). */
function ZumLager() {
  const { pid = '' } = useParams()
  return <Navigate to={`/app/p/${pid}`} replace />
}

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
  /* Startpasswort vom Admin: nichts anderes als die Einstellungen, bis die
   * Person ein eigenes Passwort gesetzt hat (dort faellt der Merker). Nur
   * eine Bequemlichkeits-Sperre der Oberflaeche, keine Datenbankregel. */
  if (
    session.user.user_metadata?.passwort_aendern === true &&
    loc.pathname.replace(/\/+$/, '') !== '/app/einstellungen'
  ) {
    return <Navigate to="/app/einstellungen" replace />
  }
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
                nichts verraten, was Magazino ist. Wer kommt, landet bei der Anmeldung. */}
            <Route path="/" element={<Wurzel />} />
            <Route path="/login" element={<Login />} />
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
              <Route path="siedlung" element={<Navigate to="/app" replace />} />
              <Route path="siedlung/*" element={<Navigate to="/app" replace />} />
              <Route path="bl/:blId" element={<BlProjekt />} />
              <Route path="scan" element={<ScanHub />} />
              <Route path="suche" element={<Suche />} />
              <Route path="p/:pid" element={<ProjectLayout />}>
                <Route index element={<LagerHome />} />
                <Route path="tuer" element={<Tuer />} />
                <Route path="bestand" element={<Bestand />} />
                <Route path="ausleihen" element={<Ausleihen />} />
                <Route path="bereiche" element={<ZumLager />} />
                <Route path="zimmer/:tagId" element={<ZumLager />} />
                {/* Alte Links auf den Raumplan fuehren in den Grundriss. */}
                <Route path="zimmer/:tagId/plan" element={<Nachladen><AlterPlanLink /></Nachladen>} />
                <Route path="grundriss" element={<Nachladen><GrundrissWeiche /></Nachladen>} />
                <Route path="grundriss/:gid" element={<Nachladen><Grundriss /></Nachladen>} />
                <Route path="person/:tagId" element={<ZumLager />} />
                <Route path="moebel" element={<ZumLager />} />
                <Route path="moebel/:id" element={<ZumLager />} />
                <Route path="kisten" element={<Items />} />
                <Route path="kisten/:iid" element={<ItemDetail />} />
                <Route path="kisten/:iid/platz" element={<Nachladen><PlatzWahl /></Nachladen>} />
                <Route path="etiketten" element={<Labels />} />
                <Route path="export" element={<ZumLager />} />
                <Route path="groessen" element={<Groessen />} />
                {/* E105: Scannen laeuft ueber den gemeinsamen Scanner (Kiste oder Lagertuer), nicht mehr ueber die Umzugs-Seite. */}
                <Route path="scan" element={<Navigate to="/app/scan" replace />} />
                <Route path="verlauf" element={<Verlauf />} />
                {/* Alte Adressen: Chat, Team, Siedlung und was es sonst nicht mehr gibt. */}
                <Route path="chat" element={<ZumLager />} />
                <Route path="team" element={<ZumLager />} />
                <Route path="einstellungen" element={<ProjectSettings />} />
                <Route path="*" element={<ZumLager />} />
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
