import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, CircleHelp, Cog, LogOut, ShieldCheck } from 'lucide-react'
import { istAdmin } from '../lib/api'
import { displayNameOf, useAuth } from '../lib/auth'
import { emailAnzeige } from '../lib/konto'
import { useT } from '../lib/i18n'
import { Avatar } from './ui'
import { ThemeToggle } from './ThemeToggle'
import type { KopfBlattInfo } from './HeaderAktionen'

/* Profil-Menue der Kopfzeile: Name, Konto, Einstellungen, Admin (nur fuer
 * Admins), Darstellung, Abmelden. Am Handy kommen dazu die Eintraege, die in
 * der Leiste keinen Platz haben, die Knoepfe der Seite und die Erklaerung. */

/** Ob das Konto Admin ist, je Konto einmal gemerkt. Ein Fehler wird nicht
 *  gemerkt: beim naechsten Oeffnen wird neu gefragt. */
const adminMerker = new Map<string, boolean>()

function useIstAdmin(userId: string | undefined): boolean {
  const [admin, setAdmin] = useState<boolean>(() => (userId ? adminMerker.get(userId) ?? false : false))
  useEffect(() => {
    if (!userId) return
    const bekannt = adminMerker.get(userId)
    if (bekannt !== undefined) {
      setAdmin(bekannt)
      return
    }
    let lebt = true
    istAdmin()
      .then((a) => {
        adminMerker.set(userId, a)
        if (lebt) setAdmin(a)
      })
      .catch(() => undefined)
    return () => {
      lebt = false
    }
  }, [userId])
  return admin
}

const ZEILE =
  'flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-start text-base font-medium leading-tight text-ink transition-colors hover:bg-feld active:bg-feld focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'

function Zeile({ icon, children, to, onClick, gefahr }: { icon: ReactNode; children: ReactNode; to?: string; onClick?: () => void; gefahr?: boolean }) {
  const inhalt = (
    <>
      <span className={gefahr ? 'text-danger' : 'text-accent'}>{icon}</span>
      <span className={gefahr ? 'min-w-0 flex-1 text-danger' : 'min-w-0 flex-1'}>{children}</span>
      {to ? <ChevronRight size={18} className="spiegeln shrink-0 text-muted" aria-hidden="true" /> : null}
    </>
  )
  return to ? (
    <Link to={to} onClick={onClick} className={ZEILE}>
      {inhalt}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={ZEILE}>
      {inhalt}
    </button>
  )
}

export function ProfilInhalt({
  b,
  extra,
  onErklaerung,
}: {
  b: KopfBlattInfo
  /** Knoepfe der Seite, nur am schmalen Handy. */
  extra: ReactNode[]
  onErklaerung: () => void
}) {
  const t = useT()
  const nav = useNavigate()
  const { profile, user, signOut } = useAuth()
  const admin = useIstAdmin(user?.id)
  const [fehler, setFehler] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const konto = emailAnzeige(user?.email)
  const name = displayNameOf(profile, konto || '?')

  return (
    <>
      <div className="flex items-center gap-3 px-1.5 pb-1 pt-0.5">
        <Avatar name={name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="t-name-lg truncate">{name}</p>
          {konto && konto !== name ? <p className="truncate text-sm text-muted">{konto}</p> : null}
        </div>
      </div>

      <ul className="gruppe overflow-hidden rounded-[14px] bg-surface">
        <li>
          <Zeile icon={<Cog size={20} />} to="/app/einstellungen" onClick={b.zu}>
            {t('struktur.einstellungen')}
          </Zeile>
        </li>
        {admin ? (
          <li>
            <Zeile icon={<ShieldCheck size={20} />} to="/app/admin" onClick={b.zu}>
              {t('kopf.admin')}
            </Zeile>
          </li>
        ) : null}
        {b.ueberlauf.map((e) => (
          <li key={e.id} className="sm:hidden">
            <Zeile
              icon={e.icon}
              to={e.to && !e.blatt ? e.to : undefined}
              onClick={() => {
                if (e.blatt) b.oeffnen(e.id)
                else {
                  b.zu()
                  e.onClick?.()
                }
              }}
            >
              {e.label}
            </Zeile>
          </li>
        ))}
        <li className="sm:hidden">
          <Zeile
            icon={<CircleHelp size={20} />}
            onClick={() => {
              b.zu()
              onErklaerung()
            }}
          >
            {t('fuehrung.knopf')}
          </Zeile>
        </li>
        <li className="flex min-h-12 items-center gap-3 px-3.5 py-1">
          <span className="min-w-0 flex-1 text-base font-medium text-ink">{t('kopf.darstellung_zeile')}</span>
          <ThemeToggle withLabel />
        </li>
      </ul>

      {extra.length > 0 ? (
        <div
          // Wie das Blatt "Mehr" frueher: Zeichen mit Namen (.kopf-menue in index.css).
          onClickCapture={() => window.setTimeout(b.zu, 0)}
          className="kopf-menue flex flex-col gap-2 sm:hidden"
        >
          {extra}
        </div>
      ) : null}

      <ul className="gruppe overflow-hidden rounded-[14px] bg-surface">
        <li>
          <Zeile
            icon={<LogOut size={20} className="spiegeln" />}
            gefahr
            onClick={async () => {
              if (laeuft) return
              setLaeuft(true)
              setFehler(false)
              try {
                await signOut()
                b.zu()
                nav('/')
              } catch {
                setFehler(true)
              } finally {
                setLaeuft(false)
              }
            }}
          >
            {t('einstellungen.abmelden')}
          </Zeile>
        </li>
      </ul>
      {fehler ? (
        <p role="alert" className="px-2 text-sm text-danger">
          {t('kopf.abmelden_fehler')}
        </p>
      ) : null}
    </>
  )
}
