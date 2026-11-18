import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, ErrorBox, Field, Input, Logo, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { getLastProject } from '../lib/lastProject'

/* Die Startseite ist absichtlich leer: Logo und Anmeldung, sonst nichts.
 * Konten gibt es nur vom Admin, darum fehlen Registrieren und Werbetext. */
function zielNachAnmeldung(from: string | null): string {
  if (from) return from
  const last = getLastProject()
  return last ? `/app/p/${last}` : '/app'
}

export default function Login() {
  const { signIn, session, ready } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const t = useT()
  const from = (loc.state as { from?: string } | null)?.from ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (ready && session) return <Navigate to={zielNachAnmeldung(from)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
      nav(zielNachAnmeldung(from), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="safe-top flex min-h-screen items-center justify-center bg-paper px-5 pb-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Logo size={88} />
          <span className="text-3xl font-black tracking-tight">Magazino</span>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={t('konto.email')}>
            <Input
              type="email"
              dir="ltr"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('konto.passwort')}>
            <PasswordInput
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <ErrorBox error={error} /> : null}
          <Button type="submit" full size="lg" loading={busy}>
            {t('konto.anmelden')}
          </Button>
        </form>
      </div>
    </main>
  )
}
