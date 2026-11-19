import { useCallback, useEffect, useState } from 'react'
import { Laptop, LogOut, Smartphone, Tablet } from 'lucide-react'
import { Badge, Button, ConfirmDialog, ErrorBox, Loading, useToast } from './ui'
import { andereSitzungenBeenden, meineSitzungen, sitzungBeenden, type Sitzung } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'

/* Geraete im Profil: wo ist dieses Konto angemeldet? Jeder sieht nur seine
 * eigenen Geraete (die Datenbank prueft das, 0063). Einzelne oder alle anderen
 * lassen sich abmelden; ein abgemeldetes Geraet kann sich nicht mehr erneuern. */

interface GeraeteArt {
  name: string
  art: 'handy' | 'tablet' | 'computer'
}

/** Aus der Kennung des Browsers etwas Lesbares machen ("Chrome auf Windows"). */
export function geraetLesen(ua: string | null): GeraeteArt {
  const s = ua ?? ''
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'Browser'
  const system = /iPhone|iPad|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows'
    : /Mac OS X|Macintosh/.test(s) ? 'macOS' : /Linux|X11/.test(s) ? 'Linux' : ''
  const art: GeraeteArt['art'] = /iPad|Tablet/.test(s) || (/Android/.test(s) && !/Mobile/.test(s)) ? 'tablet'
    : /iPhone|Android|Mobile/.test(s) ? 'handy' : 'computer'
  return { name: system ? `${browser} auf ${system}` : browser, art }
}

/** Die Adresse nur grob zeigen: das letzte Stueck bleibt verborgen. */
function ipGrob(ip: string | null): string {
  if (!ip) return ''
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':...'
  return ip.split('.').slice(0, 3).join('.') + '.x'
}

function wann(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function Geraete() {
  const t = useT()
  const toast = useToast()
  const { signOut, user } = useAuth()
  const [liste, setListe] = useState<Sitzung[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [frage, setFrage] = useState<'alle' | null>(null)
  const [arbeitet, setArbeitet] = useState<string | null>(null)

  const laden = useCallback(async () => {
    try {
      setListe(await meineSitzungen())
      setFehler(null)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void laden()
  }, [laden, user?.id])

  async function abmelden(s: Sitzung) {
    setArbeitet(s.id)
    try {
      if (s.aktuell) {
        await signOut()
        return
      }
      await sitzungBeenden(s.id)
      toast(t('geraete.abgemeldet'), 'ok')
      await laden()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setArbeitet(null)
    }
  }

  async function alleAnderen() {
    setFrage(null)
    setArbeitet('alle')
    try {
      await andereSitzungenBeenden()
      toast(t('geraete.alle_abgemeldet'), 'ok')
      await laden()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setArbeitet(null)
    }
  }

  if (fehler && !liste) return <ErrorBox error={fehler} onRetry={laden} />
  if (!liste) return <Loading label={t('geraete.laedt')} />
  const andere = liste.filter((s) => !s.aktuell).length

  return (
    <div>
      <ul className="divide-y divide-line">
        {liste.map((s) => {
          const g = geraetLesen(s.geraet)
          const Symbol = g.art === 'handy' ? Smartphone : g.art === 'tablet' ? Tablet : Laptop
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <Symbol size={22} className="shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="t-name flex flex-wrap items-center gap-2">
                  <span className="break-words">{g.name}</span>
                  {s.aktuell ? <Badge>{t('geraete.dieses')}</Badge> : null}
                </p>
                <p className="t-sub">
                  {t('geraete.zuletzt', { wann: wann(s.zuletzt_aktiv) })}
                  {s.ip ? ` . ${ipGrob(s.ip)}` : ''}
                </p>
                <p className="t-sub">{t('geraete.seit', { wann: wann(s.angemeldet_seit) })}</p>
              </div>
              <Button
                variant="outline"
                size="md"
                loading={arbeitet === s.id}
                onClick={() => void abmelden(s)}
              >
                <LogOut size={16} /> {s.aktuell ? t('geraete.hier_abmelden') : t('geraete.abmelden')}
              </Button>
            </li>
          )
        })}
      </ul>
      {fehler ? <ErrorBox error={fehler} onRetry={laden} /> : null}
      {andere > 0 ? (
        <Button
          variant="danger"
          size="lg"
          className="mt-3 w-full justify-center sm:w-auto"
          loading={arbeitet === 'alle'}
          onClick={() => setFrage('alle')}
        >
          <LogOut size={18} /> {t('geraete.alle_anderen')}
        </Button>
      ) : (
        <p className="t-sub mt-3">{t('geraete.nur_dieses')}</p>
      )}
      <p className="t-sub mt-3">{t('geraete.hinweis')}</p>
      <ConfirmDialog
        open={frage === 'alle'}
        title={t('geraete.frage_titel')}
        body={t('geraete.frage_text', { n: andere })}
        confirmLabel={t('geraete.alle_anderen')}
        onConfirm={() => void alleAnderen()}
        onClose={() => setFrage(null)}
        danger
      />
    </div>
  )
}
