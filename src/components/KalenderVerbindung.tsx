import { useState } from 'react'
import { CalendarSync, Copy, Link2Off, RefreshCw } from 'lucide-react'
import { Button, ConfirmDialog, ErrorBox, Loading, Modal, useToast } from './ui'
import { kalenderAdresse, kalenderErneuern, kalenderTrennen, kalenderZeichen } from '../lib/api'
import { useT } from '../lib/i18n'

/* Kalender-Verbindung (E111): ein geheimer Link, den Apple, Google oder
 * Outlook abonnieren. Der Kalender holt die offenen Rueckgaben danach selbst
 * ab. Der Link wird hier angezeigt, kopiert, erneuert oder getrennt; die
 * Datenbank haelt das Zeichen (Migration 0064). */

/** Aus, bis geklaert ist, wie die Verbindung laufen soll (21.11.2026): der Knopf
 *  zeigt "Kommt bald". Datenbank 0064 und Funktion "kalender" sind noch nicht
 *  eingespielt; vor dem Einschalten beides live stellen. */
export const KALENDER_VERBINDUNG_AKTIV = false

export function KalenderVerbindung() {
  const t = useT()
  const toast = useToast()
  const [offen, setOffen] = useState(false)
  const [zeichen, setZeichen] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [frage, setFrage] = useState<'neu' | 'trennen' | null>(null)
  const [arbeitet, setArbeitet] = useState(false)

  async function oeffnen() {
    // Beim Oeffnen zuruecksetzen, dann den Link holen.
    setOffen(true)
    setZeichen(null)
    setFehler(null)
    setFrage(null)
    try {
      setZeichen(await kalenderZeichen())
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    }
  }

  const https = zeichen ? kalenderAdresse(zeichen) : ''
  const webcal = https.replace(/^https?:/, 'webcal:')
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(https)
      toast(t('lager.kal_kopiert'), 'ok')
    } catch {
      // Ohne Zugriff auf die Zwischenablage bleibt das Feld zum Markieren.
      toast(t('fehler.kopieren'), 'error')
    }
  }

  async function neu() {
    setFrage(null)
    setArbeitet(true)
    try {
      setZeichen(await kalenderErneuern())
      toast(t('lager.kal_neu_fertig'), 'ok')
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setArbeitet(false)
    }
  }

  async function trennen() {
    setFrage(null)
    setArbeitet(true)
    try {
      await kalenderTrennen()
      toast(t('lager.kal_getrennt'), 'ok')
      setOffen(false)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e))
    } finally {
      setArbeitet(false)
    }
  }

  if (!KALENDER_VERBINDUNG_AKTIV) {
    return (
      <Button variant="outline" full disabled aria-disabled="true">
        <CalendarSync size={18} /> {t('lager.kal_verbinden')}
        <span className="ms-2 rounded-full bg-tint px-2 py-0.5 text-xs font-semibold text-accent-text">{t('lager.kal_bald')}</span>
      </Button>
    )
  }

  return (
    <>
      <Button variant="outline" full onClick={() => void oeffnen()}>
        <CalendarSync size={18} /> {t('lager.kal_verbinden')}
      </Button>
      <Modal open={offen} onClose={() => setOffen(false)} title={t('lager.kal_titel_dialog')}>
        <div className="space-y-4">
          <p className="text-base text-ink/85">{t('lager.kal_erklaerung')}</p>
          {fehler ? <ErrorBox error={fehler} onRetry={() => void oeffnen()} /> : null}
          {!zeichen && !fehler ? <Loading label={t('lager.kal_laedt')} /> : null}
          {zeichen ? (
            <>
              <div className="flex flex-col gap-2">
                <a
                  href={webcal}
                  className="knopf inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 text-base font-semibold text-white"
                >
                  <CalendarSync size={18} aria-hidden="true" /> {t('lager.kal_apple')}
                </a>
                <a
                  href={google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="knopf inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-base font-semibold text-ink"
                >
                  <CalendarSync size={18} aria-hidden="true" /> {t('lager.kal_google')}
                </a>
              </div>
              <input
                readOnly
                value={https}
                aria-label={t('lager.kal_kopieren')}
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm text-ink"
              />
              <Button variant="outline" full onClick={() => void kopieren()}>
                <Copy size={18} /> {t('lager.kal_kopieren')}
              </Button>
              <p className="t-sub">{t('lager.kal_geheim')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" loading={arbeitet} onClick={() => setFrage('neu')}>
                  <RefreshCw size={16} /> {t('lager.kal_neu')}
                </Button>
                <Button variant="outline" loading={arbeitet} onClick={() => setFrage('trennen')}>
                  <Link2Off size={16} /> {t('lager.kal_trennen')}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
      <ConfirmDialog
        open={frage === 'neu'}
        title={t('lager.kal_neu_frage')}
        body={t('lager.kal_neu_text')}
        confirmLabel={t('lager.kal_neu')}
        onConfirm={() => void neu()}
        onClose={() => setFrage(null)}
        danger={false}
      />
      <ConfirmDialog
        open={frage === 'trennen'}
        title={t('lager.kal_trennen_frage')}
        body={t('lager.kal_trennen_text')}
        confirmLabel={t('lager.kal_trennen')}
        onConfirm={() => void trennen()}
        onClose={() => setFrage(null)}
      />
    </>
  )
}
