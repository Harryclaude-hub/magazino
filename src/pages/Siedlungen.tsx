import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Building2, Upload } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Button, Card, ErrorBox, Skelett, useToast } from '../components/ui'
import { listSiedlungen, SiedlungStadtFehler, siedlungImportieren } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { siedlungWoerter } from '../lib/i18n/bausteine/siedlung'
import { woerterNachladen } from '../lib/i18n/woerter'
import { siedlungDateiLesen, type SiedlungDatei } from '../lib/siedlungImport'
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
 * ist. Erst ohne beides kommt das Laden aus der Datei.
 *
 * E87b: Scheitert beim ersten Laden nur die Umgebung (SiedlungStadtFehler),
 * ist die Siedlung trotzdem gespeichert: die Seite geht in sie hinein, und
 * der Satz steht dort als Zeile (Zustand der Navigation, hinweis), dazu
 * ein Toast. Sonst blieb hier "Noch keine Siedlung" stehen, und jeder neue
 * Versuch legte ohne Wohnung in der Datei eine weitere an. */

/** Ergebnis des ersten Ladens (E87b): id der gespeicherten Siedlung oder
 *  null, die Toasts der Reihe nach, hinweis fuer die Seite der Siedlung
 *  (nur Umgebung gescheitert) und fehler fuer diese Seite. */
export interface ErstesLadenErgebnis {
  id: string | null
  toasts: { text: string; art: 'ok' | 'error' }[]
  hinweis: string | null
  fehler: string | null
}

/** Das erste Laden aus der Datei, ohne Browser pruefbar (E87b): wie
 *  ausDateiAktualisieren in SiedlungAnsicht.tsx, aber ohne Ziel (die
 *  Datenbank sucht die eigene Siedlung mit derselben Wohnung). */
// eslint-disable-next-line react/only-export-components -- reine Rechnung, eigene Pruefung
export async function ersteSiedlungLaden(
  text: string,
  t: (k: string, v?: Record<string, string | number>) => string,
  lesen: (text: string) => SiedlungDatei,
  importieren: (d: SiedlungDatei) => Promise<{ siedlung: { id: string }; deko: 'ok' | 'keine' | { fehler: string } }>,
): Promise<ErstesLadenErgebnis> {
  const toasts: ErstesLadenErgebnis['toasts'] = []
  try {
    const r = await importieren(lesen(text))
    toasts.push({ text: t('siedlung.geladen'), art: 'ok' })
    if (r.deko === 'ok') toasts.push({ text: t('siedlung.deko_ok'), art: 'ok' })
    else if (r.deko !== 'keine') toasts.push({ text: t('siedlung.deko_fehler', { grund: r.deko.fehler }), art: 'error' })
    return { id: r.siedlung.id, toasts, hinweis: null, fehler: null }
  } catch (err) {
    if (err instanceof SiedlungStadtFehler) {
      console.warn('[siedlung] Erstes Laden: Umgebung nicht gespeichert:', err.message)
      toasts.push({ text: err.message, art: 'error' })
      return { id: err.siedlung.id, toasts, hinweis: err.message, fehler: null }
    }
    const grund = err instanceof Error ? err.message : String(err)
    console.warn('[siedlung] Erstes Laden:', grund)
    return { id: null, toasts, hinweis: null, fehler: grund }
  }
}

export default function Siedlungen() {
  const { t } = useSprache()
  const { user } = useAuth()
  const toast = useToast()
  const liste = useAsync(listSiedlungen, [])
  const datei = useRef<HTMLInputElement>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [fertig, setFertig] = useState<{ id: string; hinweis: string | null } | null>(null)
  async function laden(f: File | undefined) {
    if (!f) return
    setFehler(null)
    setLaeuft(true)
    try {
      const text = await f.text().catch((err: unknown) => {
        throw new Error(t('siedlung.datei_fehler', { grund: err instanceof Error ? err.message : String(err) }))
      })
      const e = await ersteSiedlungLaden(text, t, siedlungDateiLesen, siedlungImportieren)
      for (const m of e.toasts) toast(m.text, m.art)
      if (e.id !== null) setFertig({ id: e.id, hinweis: e.hinweis })
      else setFehler(e.fehler)
    } catch (err) {
      const grund = err instanceof Error ? err.message : String(err)
      console.warn('[siedlung] Erstes Laden:', grund)
      setFehler(grund)
    } finally {
      setLaeuft(false)
    }
  }

  // Mit hinweis (nur die Umgebung scheiterte): die Seite der Siedlung zeigt
  // ihn als Zeile (SiedlungAnsicht, hinweisAus).
  if (fertig) return <Navigate to={`/app/siedlung/${fertig.id}`} replace state={fertig.hinweis ? { hinweis: fertig.hinweis } : undefined} />
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
