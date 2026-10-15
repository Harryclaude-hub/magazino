import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Input } from '../components/ui'
import { useAuth, type ResetAnfrage } from '../lib/auth'
import { useT } from '../lib/i18n'

/* Passwort vergessen.
 *
 * Nach dem Abschicken steht immer derselbe neutrale Satz da, ob es zur
 * Adresse ein Konto gibt oder nicht. Eigene Saetze gibt es nur fuer "zu
 * viele Versuche" und "keine Verbindung". Die Meldung des Servers selbst
 * erscheint nie, auch nicht der Admin-Hinweis zum Mail-Limit.
 *
 * Nochmal schicken geht erst nach 60 Sekunden. */
const WARTEN_MS = 60_000

export default function ResetRequest() {
  const { sendReset } = useAuth()
  const t = useT()
  const [email, setEmail] = useState('')
  const [ergebnis, setErgebnis] = useState<ResetAnfrage | null>(null)
  const [busy, setBusy] = useState(false)
  const [sperreBis, setSperreBis] = useState(0)
  const [jetzt, setJetzt] = useState(0)

  const rest = Math.max(0, Math.ceil((sperreBis - jetzt) / 1000))
  const gesperrt = rest > 0

  // Sekunden herunterzaehlen, nur solange gesperrt.
  useEffect(() => {
    if (!gesperrt) return
    const id = setInterval(() => setJetzt(Date.now()), 1000)
    return () => clearInterval(id)
  }, [gesperrt])

  async function schicken() {
    if (busy || gesperrt) return
    setBusy(true)
    try {
      const r = await sendReset(email)
      setErgebnis(r)
      // Ohne Verbindung ist nichts angekommen, dann gleich nochmal erlaubt.
      if (r !== 'keine_verbindung') {
        const nun = Date.now()
        setJetzt(nun)
        setSperreBis(nun + WARTEN_MS)
      }
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void schicken()
  }

  const knopfText = gesperrt ? t('konto.link_nochmal_warten', { s: rest }) : null

  return (
    <AuthShell
      title={t('konto.reset_titel')}
      subtitle={t('konto.reset_unter')}
      footer={
        <Link to="/login" className="inline-block">
          <Button type="button" variant="outline" size="lg">
            {t('konto.zurueck_anmeldung')}
          </Button>
        </Link>
      }
    >
      {ergebnis === 'verschickt' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ok/30 bg-ok/10 p-4" role="status">
            <p className="t-name">{t('konto.reset_unterwegs_titel')}</p>
            <p className="mt-1.5 text-base text-ink/80">{t('konto.reset_unterwegs_text')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            full
            loading={busy}
            disabled={gesperrt}
            onClick={() => void schicken()}
          >
            {knopfText ?? t('konto.link_nochmal')}
          </Button>
          <Button type="button" variant="ghost" size="md" full onClick={() => setErgebnis(null)}>
            {t('konto.andere_adresse')}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={t('konto.email')}>
            {/* Die Adresse bleibt in jeder Sprache von links nach rechts. */}
            <Input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('konto.email_platzhalter')}
            />
          </Field>
          {ergebnis === 'zu_viele' ? (
            <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4" role="alert">
              <p className="text-base text-ink/85">{t('konto.reset_zu_viele')}</p>
            </div>
          ) : null}
          {ergebnis === 'keine_verbindung' ? <ErrorBox error={t('konto.reset_keine_verbindung')} /> : null}
          <Button type="submit" full size="lg" loading={busy} disabled={gesperrt}>
            {knopfText ?? t('konto.link_schicken')}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
