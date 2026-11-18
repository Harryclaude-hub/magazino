import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Boxes, Cog, DoorClosed, HandHelping, LayoutDashboard, MessageCircle, Package, Users } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { IconButton } from '../components/ui'
import { useProject } from './ProjectLayout'
import { listAusleihen, listBestand, listZugang } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { istKnapp } from '../lib/lager'
import { cx, fmtDateTime, useAsync, type AsyncState } from '../lib/util'

/** Eine Kachel. Der Zustand der Zahl dahinter ist laedt, Fehler oder Wert,
 *  getrennt je Kachel, damit eine Panne nicht die ganze Seite lahmlegt. */
function Kachel({
  to,
  icon,
  titel,
  status,
  ton = 'normal',
  gross,
  badge,
}: {
  to: string
  icon: ReactNode
  titel: string
  status?: ReactNode
  ton?: 'normal' | 'warn' | 'danger' | 'ok'
  gross?: boolean
  badge?: number
}) {
  return (
    <Link
      to={to}
      className={cx(
        'relative flex flex-col justify-between rounded-karte border border-line bg-surface p-4 shadow-karte transition active:scale-[0.98] hover:border-ink/25',
        gross ? 'col-span-2 min-h-32' : 'min-h-28',
      )}
    >
      <span className="text-muted">{icon}</span>
      <span className="mt-3 block">
        <span className="t-name-lg block break-words">{titel}</span>
        {status ? (
          <span
            className={cx(
              'mt-0.5 block text-base font-bold',
              ton === 'warn' && 'text-warn',
              ton === 'danger' && 'text-danger',
              ton === 'ok' && 'text-ok',
              ton === 'normal' && 'text-muted',
            )}
          >
            {status}
          </span>
        ) : null}
      </span>
      {badge && badge > 0 ? (
        <span className="absolute end-3 top-3 min-w-6 rounded-full bg-danger px-1.5 text-center text-sm font-black leading-6 text-paper">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

/** Wert einer Kachel: Punkte beim Laden, kurzer Fehlertext, sonst der Satz. */
function Wert<T>({ z, kurz, fehler, zeige }: { z: AsyncState<T>; kurz: string; fehler: string; zeige: (d: T) => ReactNode }) {
  if (z.error) return <span title={z.error}>{fehler}</span>
  if (z.data === null) return <span aria-label={kurz}>...</span>
  return <>{zeige(z.data)}</>
}

/* Startseite eines Lagers (E103). */
export default function LagerHome() {
  const { project, members, unread } = useProject()
  const { user } = useAuth()
  const { t, tn } = useSprache()
  const nav = useNavigate()
  const pid = project.id
  const base = `/app/p/${pid}`

  const hatPasswortBand = user?.user_metadata?.passwort_aendern === true

  const drin = useAsync(() => listZugang(pid, true, 200), [pid])
  const bestand = useAsync(() => listBestand(pid), [pid])
  const ausleihen = useAsync(() => listAusleihen(pid, true), [pid])

  const ladenText = t('zustand.laedt')
  const fehlerText = t('lager.home_fehler')

  return (
    <>
      <AppHeader
        title={project.name}
        subtitle={project.note ?? tn('begriff.mitglieder_anzahl', members.length)}
        back="/app"
        actions={
          <IconButton label={t('umzuege.einstellen')} onClick={() => nav(`${base}/einstellungen`)}>
            <Cog size={20} />
          </IconButton>
        }
      />

      {hatPasswortBand ? (
        <div role="status" className="border-b border-warn/40 bg-warn/12">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5">
            <p className="min-w-0 flex-1 text-base font-bold">{t('lager.band_passwort')}</p>
            <Link
              to="/app/einstellungen"
              className="knopf inline-flex min-h-10 items-center rounded-knopf bg-ink px-4 text-[0.9375rem] font-bold text-paper"
            >
              {t('lager.band_passwort_knopf')}
            </Link>
          </div>
        </div>
      ) : null}

      <Page>
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3">
          <Kachel
            gross
            to={`${base}/tuer`}
            icon={<DoorClosed size={28} />}
            titel={t('lager.nav_tuer')}
            ton={(drin.data ?? []).some((z) => z.user_id === user?.id) ? 'ok' : 'normal'}
            status={
              <Wert
                z={drin}
                kurz={ladenText}
                fehler={fehlerText}
                zeige={(d) => {
                  const meiner = d.find((z) => z.user_id === user?.id)
                  return meiner ? t('lager.home_drin', { zeit: fmtDateTime(meiner.rein_am) }) : t('lager.home_nicht_drin')
                }}
              />
            }
          />
          <Kachel
            to={`${base}/bestand`}
            icon={<Package size={26} />}
            titel={t('lager.nav_bestand')}
            ton={(bestand.data ?? []).some(istKnapp) ? 'warn' : 'normal'}
            status={
              <Wert
                z={bestand}
                kurz={ladenText}
                fehler={fehlerText}
                zeige={(d) => {
                  const n = d.filter(istKnapp).length
                  return n > 0 ? t('lager.home_knapp', { n }) : t('lager.home_alles_da')
                }}
              />
            }
          />
          <Kachel
            to={`${base}/ausleihen`}
            icon={<HandHelping size={26} />}
            titel={t('lager.nav_ausleihen')}
            ton={
              (ausleihen.data ?? []).some((a) => a.user_id === user?.id && new Date(a.faellig_am).getTime() < Date.now())
                ? 'danger'
                : 'normal'
            }
            status={
              <Wert
                z={ausleihen}
                kurz={ladenText}
                fehler={fehlerText}
                zeige={(d) => {
                  const meine = d.filter((a) => a.user_id === user?.id)
                  const spaet = meine.filter((a) => new Date(a.faellig_am).getTime() < Date.now()).length
                  if (meine.length === 0) return t('lager.home_nichts_offen')
                  return spaet > 0
                    ? `${t('lager.home_offen', { n: meine.length })}, ${t('lager.home_ueberfaellig', { n: spaet })}`
                    : t('lager.home_offen', { n: meine.length })
                }}
              />
            }
          />
          <Kachel to={`${base}/kisten`} icon={<Boxes size={26} />} titel={t('nav.kisten')} />
          <Kachel to={`${base}/grundriss`} icon={<LayoutDashboard size={26} />} titel={t('grundriss.titel')} />
          <Kachel to={`${base}/chat`} icon={<MessageCircle size={26} />} titel={t('nav.chat')} badge={unread} />
          <Kachel to={`${base}/team`} icon={<Users size={26} />} titel={t('umzuege.team')} />
        </div>
        <div className="h-6" />
      </Page>
    </>
  )
}
