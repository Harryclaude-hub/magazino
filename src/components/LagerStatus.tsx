import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { Button, Card, Chip, ErrorBox, useToast } from './ui'
import { lagerBetreten, lagerVerlassen, listZugang } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { cx, fmtDateTime, fmtTime, useAsync, useLocalState } from '../lib/util'
import type { Project } from '../lib/types'

/* "Im Lager" ganz oben auf dem Start: der erste und wichtigste Schritt am
 * Handy. Nicht eingetragen: ein grosser Knopf "Ich bin im Lager". Eingetragen:
 * "Du bist seit 14:05 im Lager" mit "Ich gehe". Bei mehreren Lagern waehlt man
 * oben das Lager; das zuletzt benutzte wird gemerkt. Eingetragen wird nur auf
 * Knopfdruck (lagerBetreten), nie beim blossen Oeffnen. Das Eintragen ueber
 * den Tuer-QR bleibt daneben moeglich. */

function istHeute(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}

export function LagerStatus({ projekte, name }: { projekte: Project[]; name?: string | null }) {
  const { t, tn } = useSprache()
  const toast = useToast()
  const { user } = useAuth()
  const [merker, setMerker] = useLocalState<{ pid: string }>('magazino.start.lager', { pid: '' })
  const lager = projekte.find((p) => p.id === merker.pid) ?? projekte[0]
  const pid = lager.id

  const drin = useAsync(() => listZugang(pid, true, 200), [pid])
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const meiner = (drin.data ?? []).find((z) => z.user_id === user?.id)
  const anzahl = drin.data?.length ?? 0

  function waehle(id: string) {
    setFehler(null)
    setMerker({ pid: id })
  }

  async function umschalten() {
    setFehler(null)
    setBusy(true)
    try {
      if (meiner) {
        await lagerVerlassen(pid)
        toast(t('lager.tuer_toast_aus'), 'ok')
      } else {
        await lagerBetreten(pid)
        toast(t('lager.tuer_toast_ein'), 'ok')
      }
      drin.reload()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const laedt = drin.loading && !drin.data

  return (
    <Card className="mb-5 p-5" data-tour="start-im-lager">
      {name ? <p className="t-sub mb-1">{t('umzuege.hallo_name', { name })}</p> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.375rem] font-black leading-tight tracking-tight">
            {laedt
              ? t('lager.st_prueft')
              : meiner
                ? t('lager.st_seit', { zeit: istHeute(meiner.rein_am) ? fmtTime(meiner.rein_am) : fmtDateTime(meiner.rein_am) })
                : t('lager.st_draussen')}
          </h1>
          <p className="t-sub mt-0.5">
            {projekte.length === 1 ? `${lager.name} · ` : ''}
            {drin.data ? (anzahl === 0 ? t('lager.st_niemand') : tn('lager.st_drin_n', anzahl)) : ''}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cx('mt-2 h-3 w-3 shrink-0 rounded-full', meiner ? 'bg-ok' : 'bg-muted/45')}
        />
      </div>

      {projekte.length > 1 ? (
        <div
          role="group"
          aria-label={t('lager.start_welches_lager')}
          className="-mx-5 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {projekte.map((p) => (
            <Chip key={p.id} active={p.id === pid} onClick={() => waehle(p.id)}>
              {p.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {drin.error ? (
        <div className="mt-3">
          <ErrorBox error={drin.error} onRetry={drin.reload} />
        </div>
      ) : (
        <Button
          size="lg"
          full
          variant={meiner ? 'outline' : 'primary'}
          loading={busy}
          disabled={laedt}
          onClick={() => void umschalten()}
          className="mt-4 min-h-16 text-xl"
        >
          {meiner ? <LogOut size={26} /> : <LogIn size={26} />}
          {t(meiner ? 'lager.st_ich_gehe' : 'lager.st_ich_bin_da')}
        </Button>
      )}
      {fehler ? (
        <div className="mt-3">
          <ErrorBox error={fehler} />
        </div>
      ) : null}
    </Card>
  )
}
