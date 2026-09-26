import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hourglass, LogOut, RefreshCw, ShieldX } from 'lucide-react'
import { Button, ErrorBox, Loading, Wordmark } from './ui'
import { SpracheWahl } from './SpracheToggle'
import { meineFreigabe, type Freigabe } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'

/* Freischaltung (0036): Ein neues Konto darf sich anmelden, sieht aber nur
 * diese Seite, bis ein Admin es freischaltet. Gesperrte Konten sehen einen
 * eigenen Satz. Die Datenbank laesst beide ohnehin nichts lesen oder
 * schreiben; diese Seite sagt nur freundlich, warum.
 *
 * Solange gewartet wird, fragt die Seite alle 20 Sekunden und beim
 * Zurueckkehren ins Fenster nach; ist das Konto frei, geht die App auf. */

const ALLE_MS = 20_000

export function FreigabeTor({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<Freigabe | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  const pruefen = useCallback(async () => {
    try {
      setStatus(await meineFreigabe())
      setFehler(null)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    setStatus(null)
    setFehler(null)
    void pruefen()
  }, [user?.id, pruefen])

  // Solange nicht frei: regelmaessig und beim Zurueckkommen nachfragen.
  useEffect(() => {
    if (status === 'frei') return
    const id = window.setInterval(() => void pruefen(), ALLE_MS)
    const sichtbar = () => {
      if (document.visibilityState === 'visible') void pruefen()
    }
    document.addEventListener('visibilitychange', sichtbar)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', sichtbar)
    }
  }, [status, pruefen])

  if (status === 'frei') return <>{children}</>
  if (status === null && !fehler) return <Loading label="Moment" />
  return <WarteSeite status={status} fehler={fehler} onNochmal={() => void pruefen()} />
}

function WarteSeite({ status, fehler, onNochmal }: { status: Freigabe | null; fehler: string | null; onNochmal: () => void }) {
  const { t } = useSprache()
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [pruefe, setPruefe] = useState(false)
  const gesperrt = status === 'gesperrt'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md rounded-karte border border-line bg-surface p-6 shadow-karte">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Wordmark size={30} />
          <SpracheWahl />
        </div>
        {fehler ? (
          <ErrorBox error={t('freigabe.fehler', { grund: fehler })} onRetry={onNochmal} />
        ) : (
          <>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-raised text-ink">
              {gesperrt ? <ShieldX size={28} /> : <Hourglass size={28} />}
            </div>
            <h1 className="t-name-lg">{t(gesperrt ? 'freigabe.gesperrt_titel' : 'freigabe.warten_titel')}</h1>
            <p className="mt-2 text-base leading-relaxed">{t(gesperrt ? 'freigabe.gesperrt_text' : 'freigabe.warten_text')}</p>
            {user?.email ? (
              <p className="t-sub mt-3 break-all" dir="ltr">
                {user.email}
              </p>
            ) : null}
          </>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {gesperrt ? null : (
            <Button
              variant="outline"
              loading={pruefe}
              onClick={async () => {
                setPruefe(true)
                onNochmal()
                window.setTimeout(() => setPruefe(false), 600)
              }}
            >
              <RefreshCw size={16} /> {t('freigabe.nochmal')}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut()
              nav('/login')
            }}
          >
            <LogOut size={16} className="spiegeln" /> {t('einstellungen.abmelden')}
          </Button>
        </div>
      </div>
    </div>
  )
}
