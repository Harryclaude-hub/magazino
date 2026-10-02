import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Building2, Upload } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Button, Card, ErrorBox, Skelett, useToast } from '../components/ui'
import { listSiedlungen, siedlungImportieren } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { siedlungWoerter } from '../lib/i18n/bausteine/siedlung'
import { woerterNachladen } from '../lib/i18n/woerter'
import { siedlungDateiLesen } from '../lib/siedlungImport'
import { useAsync } from '../lib/util'

// Die Saetze der Siedlung kommen erst mit dieser Seite (siehe siedlung.ts).
woerterNachladen(siedlungWoerter)

/* Die Siedlung (E83, E85): eigener Bereich neben den Umzuegen, erreichbar
 * ueber den Knopf oben rechts. Es gibt genau eine Siedlung: ist sie da,
 * geht es sofort in die 3D-Ansicht. Ist noch keine da, laedt man sie
 * einmal aus einer Datei (siedlungImport.ts); die App traegt sie mit dem
 * eigenen Konto ein, ohne Befehle in der Datenbank. Neue Siedlungen anlegen
 * gibt es hier bewusst nicht. Laden, Fehler und leer sind drei Zustaende.
 *
 * E86: Die Liste enthaelt auch Siedlungen, in die man eingeladen ist. Die
 * eigene geht vor; hat man keine, geht es in die, in die man eingeladen
 * ist. Erst ohne beides kommt das Laden aus der Datei. */

export default function Siedlungen() {
  const { t } = useSprache()
  const { user } = useAuth()
  const toast = useToast()
  const liste = useAsync(listSiedlungen, [])
  const datei = useRef<HTMLInputElement>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [fertig, setFertig] = useState<string | null>(null)
  async function laden(f: File | undefined) {
    if (!f) return
    setFehler(null)
    setLaeuft(true)
    try {
      const inhalt = siedlungDateiLesen(await f.text())
      const r = await siedlungImportieren(inhalt)
      toast(t('siedlung.geladen'), 'ok')
      if (r.deko === 'ok') toast(t('siedlung.deko_ok'), 'ok')
      else if (r.deko !== 'keine') toast(t('siedlung.deko_fehler', { grund: r.deko.fehler }), 'error')
      setFertig(r.siedlung.id)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setLaeuft(false)
    }
  }

  if (fertig) return <Navigate to={`/app/siedlung/${fertig}`} replace />
  const erste = liste.data?.find((x) => x.owner_id === user?.id) ?? liste.data?.[0]
  if (!liste.loading && !liste.error && erste) return <Navigate to={`/app/siedlung/${erste.id}`} replace />

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader title={t('siedlung.titel')} back="/app" />
      <Page>
        {liste.loading ? (
          <Skelett label={t('siedlung.laedt')} anzahl={1} />
        ) : liste.error ? (
          <ErrorBox error={liste.error} onRetry={liste.reload} />
        ) : (
          <Card className="mx-auto max-w-xl p-6 text-center">
            <Building2 size={40} className="mx-auto text-muted" />
            <h1 className="mt-3 text-2xl font-black tracking-tight">{t('siedlung.leer_titel')}</h1>
            <p className="t-sub mx-auto mt-2 max-w-md">{t('siedlung.laden_hinweis')}</p>
            <input
              ref={datei}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                void laden(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button size="lg" className="mt-5" loading={laeuft} onClick={() => datei.current?.click()}>
              <Upload size={20} /> {laeuft ? t('siedlung.laden_laeuft') : t('siedlung.laden')}
            </Button>
            {fehler ? (
              <div className="mt-4 text-start">
                <ErrorBox error={fehler} />
              </div>
            ) : null}
          </Card>
        )}
      </Page>
    </div>
  )
}
