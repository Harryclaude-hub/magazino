import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Monitor, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { ErklaerKnopf } from '../components/Fuehrung'
import { displayNameOf, useAuth } from '../lib/auth'
import { FachAnsicht } from '../components/plan/FachAnsicht'
import { raumTitel, type PlanTreffer } from '../components/plan/hilfe'
import { PlanBild, PlanLegende } from '../components/plan/PlanBild'
import {
  Avatar,
  Button,
  Chip,
  CodeChip,
  ConfirmDialog,
  Empty,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Loading,
  Modal,
  useToast,
} from '../components/ui'
import {
  aendereGrundriss,
  grundrissKistenZahl,
  grundrissSicherstellen,
  ladeGrundriss,
  ladeGrundrisse,
  ladeKisteLage,
  ladeRaeumeDesUmzugs,
  legeGrundrissAn,
  loescheGrundriss,
} from '../lib/api'
import { useZeichnen } from '../lib/desktop'
import { Knopf3D } from '../components/plan3d/oeffnen'
import { useSprache } from '../lib/i18n'
import type { Grundriss as GrundrissTyp, GrundrissDaten } from '../lib/types'
import { cx, useAsync } from '../lib/util'
import { useProject } from './ProjectLayout'

/* Der Grundriss eines Umzugs (START 4.1, BAUPLAN 5.2).
 *
 * Oben die Reiter der Grundrisse (neue Wohnung, alte Wohnung, Keller,
 * Lager). Am Computer mit Maus und Bearbeiter-Rechten laedt der Zeichner
 * als eigener Code-Teil; sonst (Handy, Betrachter) die Draufsicht zum
 * Anschauen mit dem Satz "Zeichnen geht am Computer". Das Handy laedt
 * keinen Zeichner-Code.
 *
 * Adresse: grundriss/:gid?raum=<raumId>&kiste=<itemId>. raum zoomt auf den
 * Raum, kiste hebt die Kiste rot hervor (nie in die Hand nehmen).
 *
 * E87: &begehen=1 (aus der Siedlung, "Eingerichtet ansehen") oeffnet 3D
 * gleich und beginnt das Begehen, einmal: die Seite nimmt es sofort aus
 * der Adresse (replace, Neuladen wiederholt es nicht) und vergisst den
 * Wunsch, sobald Knopf3D oder der Zeichner ihn angenommen hat.
 */

const Zeichner = lazy(() => import('../zeichner/Zeichner'))

const VORSCHLAEGE = ['grundriss.neue_wohnung', 'grundriss.alte_wohnung', 'grundriss.keller', 'grundriss.lager']

function Skelett() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col gap-3 p-4">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-raised" />
      <div className="flex-1 animate-pulse rounded-2xl bg-raised" />
    </div>
  )
}

/** grundriss ohne Id: den passenden Grundriss finden und umleiten.
 *  ?kiste= sucht den Platz der Kiste, ?raum= und ?zimmer= den Raum, sonst
 *  der erste Grundriss (ein Bearbeiter legt "Neue Wohnung" an). */
export function GrundrissWeiche() {
  const { project } = useProject()
  const { t } = useSprache()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [stand, setStand] = useState<{ art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'leer' }>({ art: 'laedt' })
  const [versuch, setVersuch] = useState(0)
  const kiste = params.get('kiste')
  const raumParam = params.get('raum')
  const zimmer = params.get('zimmer')
  const neuName = t('grundriss.neue_wohnung')

  useEffect(() => {
    let alive = true
    setStand({ art: 'laedt' })
    ;(async () => {
      let gid: string | null = null
      let raum = raumParam
      if (kiste && !raum) {
        const lage = await ladeKisteLage(kiste)
        if (lage) {
          gid = lage.grundriss.id
          raum = lage.raum.id
        }
      }
      if (!gid && (raum || zimmer)) {
        const [liste, grundrisse] = await Promise.all([ladeRaeumeDesUmzugs(project.id), ladeGrundrisse(project.id)])
        const ordnung = new Map(grundrisse.map((g, i) => [g.id, i]))
        const passend = liste
          .filter((r) => (raum ? r.id === raum : r.tag_id === zimmer))
          .sort((a, b) => (ordnung.get(a.grundriss_id) ?? 99) - (ordnung.get(b.grundriss_id) ?? 99))
        if (passend[0]) {
          gid = passend[0].grundriss_id
          raum = passend[0].id
        }
      }
      if (!gid) gid = await grundrissSicherstellen(project.id, neuName)
      return { gid, raum }
    })()
      .then(({ gid, raum }) => {
        if (!alive) return
        if (!gid) {
          setStand({ art: 'leer' })
          return
        }
        const q = new URLSearchParams()
        if (raum) q.set('raum', raum)
        if (kiste) q.set('kiste', kiste)
        const s = q.toString()
        nav(`/app/p/${project.id}/grundriss/${gid}${s ? `?${s}` : ''}`, { replace: true })
      })
      .catch((err: unknown) => alive && setStand({ art: 'fehler', text: err instanceof Error ? err.message : String(err) }))
    return () => {
      alive = false
    }
  }, [project.id, kiste, raumParam, zimmer, neuName, nav, versuch])

  return (
    <>
      <AppHeader title={t('grundriss.titel')} subtitle={project.name} back={`/app/p/${project.id}`} />
      <Page>
        {stand.art === 'laedt' ? (
          <Loading label={t('grundriss.laedt')} />
        ) : stand.art === 'fehler' ? (
          <ErrorBox error={stand.text} onRetry={() => setVersuch((v) => v + 1)} />
        ) : (
          <Empty title={t('grundriss.leer')} hint={t('grundriss.leer_betrachter')} />
        )}
      </Page>
    </>
  )
}

/** Alter Link /zimmer/:tagId/plan (Chat, Lesezeichen): weiter in den
 *  Grundriss, zum Raum dieses Zimmers bzw. zur Kiste. */
export function AlterPlanLink() {
  const { tagId = '' } = useParams()
  const { project } = useProject()
  const [params] = useSearchParams()
  const q = new URLSearchParams({ zimmer: tagId })
  const kiste = params.get('kiste')
  if (kiste) q.set('kiste', kiste)
  return <Navigate to={`/app/p/${project.id}/grundriss?${q.toString()}`} replace />
}

/* ------------------------------------------------------------ Reiter */

function Reiter({
  liste,
  aktiv,
  canEdit,
  onNeu,
  onUmbenennen,
  onLoeschen,
  kompakt = false,
}: {
  liste: GrundrissTyp[]
  aktiv: string
  canEdit: boolean
  onNeu: () => void
  onUmbenennen: () => void
  onLoeschen: () => void
  /** Im Zeichner: klein, ohne eigene Zeile. */
  kompakt?: boolean
}) {
  const { project } = useProject()
  const { t } = useSprache()
  return (
    <div
      className={cx(
        'no-print flex items-center overflow-x-auto scrollbar-thin',
        kompakt ? 'min-w-0 gap-1' : 'gap-2 border-b border-line bg-paper px-3 py-2 sm:px-5',
      )}
    >
      <div role="tablist" aria-label={t('grundriss.reiter')} className="flex shrink-0 items-center gap-1.5">
        {liste.map((g) => (
          <Link
            key={g.id}
            role="tab"
            aria-selected={g.id === aktiv}
            to={`/app/p/${project.id}/grundriss/${g.id}`}
            className={cx(
              'inline-flex shrink-0 items-center rounded-full font-bold transition',
              kompakt ? 'h-8 border px-3 text-sm' : 'h-10 border-2 px-4 text-[0.9375rem]',
              g.id === aktiv ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:border-ink/35',
            )}
          >
            {g.name}
          </Link>
        ))}
      </div>
      {canEdit ? (
        <>
          <IconButton label={t('grundriss.anlegen')} size="sm" onClick={onNeu}>
            <Plus size={17} />
          </IconButton>
          {kompakt ? null : <span className="flex-1" />}
          <IconButton label={t('grundriss.umbenennen')} size="sm" onClick={onUmbenennen}>
            <Pencil size={16} />
          </IconButton>
          <IconButton label={t('grundriss.loeschen')} size="sm" tone="danger" onClick={onLoeschen}>
            <Trash2 size={16} />
          </IconButton>
        </>
      ) : null}
    </div>
  )
}

function NameDialog({
  offen,
  titel,
  start,
  vorschlaege,
  onClose,
  onSpeichern,
}: {
  offen: boolean
  titel: string
  start: string
  vorschlaege: string[]
  onClose: () => void
  onSpeichern: (name: string) => Promise<void>
}) {
  const { t } = useSprache()
  const [name, setName] = useState(start)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  /* Beim Oeffnen zuruecksetzen. */
  useEffect(() => {
    if (!offen) return
    setName(start)
    setBusy(false)
    setFehler(null)
  }, [offen, start])

  async function speichern() {
    const n = name.trim()
    if (!n || n.length > 60) {
      setFehler(t('grundriss.name_fehlt'))
      return
    }
    setBusy(true)
    setFehler(null)
    try {
      await onSpeichern(n)
      onClose()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={titel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button loading={busy} onClick={() => void speichern()}>
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void speichern()
        }}
      >
        <Field label={t('begriff.name')} error={fehler}>
          <Input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        {vorschlaege.length ? (
          <div className="flex flex-wrap gap-2">
            {vorschlaege.map((v) => (
              <Chip key={v} active={name === v} onClick={() => setName(v)}>
                {v}
              </Chip>
            ))}
          </div>
        ) : null}
      </form>
    </Modal>
  )
}

/* ---------------------------------------------------- Nur ansehen */

function Ansehen({
  daten,
  raumId,
  kisteId,
  begehen,
  onBegehen,
  onGespeichert,
}: {
  daten: GrundrissDaten
  raumId: string | null
  kisteId: string | null
  /** E87: 3D gleich offen und gleich begehen (?begehen=1). */
  begehen: boolean
  onBegehen: () => void
  /** E89: in 3D wurden Moebel gespeichert (beim Schliessen): neu laden. */
  onGespeichert: () => void
}) {
  const { project } = useProject()
  const { t } = useSprache()
  const zeichnen = useZeichnen()
  const [, setParams] = useSearchParams()
  const [tipp, setTipp] = useState<PlanTreffer | null>(null)
  const raum = raumId ? daten.raeume.find((r) => r.id === raumId) ?? null : null

  useEffect(() => setTipp(null), [raumId])

  const gewaehlt = useMemo(() => {
    if (tipp?.art === 'kiste') return { kiste: daten.kisten.find((k) => k.id === tipp.id) ?? null, objekt: null }
    if (tipp?.art === 'objekt') return { kiste: null, objekt: daten.objekte.find((o) => o.id === tipp.id) ?? null }
    return { kiste: null, objekt: null }
  }, [tipp, daten])

  return (
    <Page wide>
      <div className="space-y-4">
        {!zeichnen ? (
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3">
            <Monitor size={22} className="mt-0.5 shrink-0 text-muted" />
            <p className="t-sub">{t('grundriss.nur_computer')}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3">
            <Monitor size={22} className="mt-0.5 shrink-0 text-muted" />
            <p className="t-sub">{t('grundriss.nur_ansehen')}</p>
          </div>
        )}

        {daten.raeume.length === 0 ? (
          <Empty title={t('grundriss.leer')} hint={t('grundriss.leer_hinweis')} />
        ) : (
          <>
            <div data-tour="grundriss-raeume" className="flex flex-wrap gap-2">
              <Chip active={!raumId} onClick={() => setParams({}, { replace: true })}>
                {t('grundriss.alles')}
              </Chip>
              {daten.raeume.map((r) => (
                <Chip
                  key={r.id}
                  active={r.id === raumId}
                  color={r.tag_color ?? undefined}
                  onClick={() => setParams(kisteId ? { raum: r.id, kiste: kisteId } : { raum: r.id }, { replace: true })}
                >
                  {raumTitel(r) || t('plan.raum_ohne_name')}
                </Chip>
              ))}
            </div>
            <div data-tour="grundriss-plan">
            <PlanBild
              daten={daten}
              ausschnitt={raum ? { raumId: raum.id } : 'alles'}
              hervor={kisteId}
              auswahl={tipp ?? (raum ? { art: 'raum', id: raum.id } : null)}
              maxHoehe="68vh"
              label={daten.grundriss.name}
              zoomen
              onTipp={(_p, treffer) => {
                if (treffer?.art === 'raum' && treffer.id !== raumId) {
                  setParams(kisteId ? { raum: treffer.id, kiste: kisteId } : { raum: treffer.id }, { replace: true })
                } else setTipp(treffer && treffer.art !== 'raum' ? treffer : null)
              }}
            />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PlanLegende mitKiste={Boolean(kisteId)} />
              <Knopf3D
                daten={daten}
                raumId={raum?.id ?? null}
                hervor={kisteId}
                className="justify-center"
                tour="grundriss-3d"
                begehen={begehen}
                onBegehen={onBegehen}
                onGespeichert={onGespeichert}
              />
            </div>
            {gewaehlt.kiste ? (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3">
                <CodeChip code={gewaehlt.kiste.code} />
                <span className="t-sub min-w-0 flex-1">
                  {t('lage.hoehe', { von: gewaehlt.kiste.unten_cm, bis: gewaehlt.kiste.oben_cm })}
                </span>
                <Link to={`/app/p/${project.id}/kisten/${gewaehlt.kiste.id}`}>
                  <Button size="sm" variant="outline">
                    {t('suche.zur_kiste')}
                  </Button>
                </Link>
              </div>
            ) : null}
            {gewaehlt.objekt && gewaehlt.objekt.art !== 'moebel' ? (
              <div className="rounded-2xl border border-line bg-surface p-3">
                <FachAnsicht objekt={gewaehlt.objekt} kisten={daten.kisten} hervor={kisteId} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </Page>
  )
}

/* --------------------------------------------------------- Die Seite */

export default function Grundriss() {
  const { gid = '' } = useParams()
  const { project, canEdit } = useProject()
  const { profile, user } = useAuth()
  const { t } = useSprache()
  const toast = useToast()
  const nav = useNavigate()
  const zeichnen = useZeichnen()
  const [params, setParams] = useSearchParams()
  const raumId = params.get('raum')
  const kisteId = params.get('kiste')

  // E87: ?begehen=1 gilt fuer diesen Grundriss, einmal. Gleich aus der
  // Adresse nehmen (replace); vergessen, sobald es angenommen ist.
  const [begehenFuer, setBegehenFuer] = useState<string | null>(() => (params.get('begehen') === '1' ? gid : null))
  useEffect(() => {
    if (!params.has('begehen')) return
    const ohne = new URLSearchParams(params)
    ohne.delete('begehen')
    setParams(ohne, { replace: true })
  }, [params, setParams])
  const begehen = begehenFuer !== null && begehenFuer === gid
  const begehenAngenommen = useCallback(() => setBegehenFuer(null), [])

  const mitZeichner = zeichnen && canEdit
  const liste = useAsync(() => ladeGrundrisse(project.id), [project.id])
  /* Wechselt die Ansicht (Fenster schmaler oder breiter), zeigt die andere
   * Ansicht nicht die Daten vom Anfang: der Zeichner hat seitdem
   * gespeichert. Also neu laden und bis dahin das Skelett. */
  const daten = useAsync(async () => ({ fuer: mitZeichner, d: await ladeGrundriss(gid) }), [gid, mitZeichner])
  const [dialog, setDialog] = useState<'neu' | 'umbenennen' | null>(null)
  const [loeschen, setLoeschen] = useState<{ zahl: number | null; fehler: string | null } | null>(null)

  const aktiv = liste.data?.find((g) => g.id === gid) ?? null

  /* Verschwindet der Zeichner mit nicht Gespeichertem, nicht still
   * verlieren: Hinweis. */
  const ungespeichert = useRef(false)
  const zeichnerVorher = useRef(mitZeichner)
  const ungespeichertMelden = useCallback((ja: boolean) => {
    ungespeichert.current = ja
  }, [])
  useEffect(() => {
    if (zeichnerVorher.current === mitZeichner) return
    zeichnerVorher.current = mitZeichner
    if (!mitZeichner && ungespeichert.current) toast(t('grundriss.wechsel_ungespeichert'), 'error')
    ungespeichert.current = false
  }, [mitZeichner, toast, t])

  function loeschenFragen() {
    setLoeschen({ zahl: null, fehler: null })
    grundrissKistenZahl(gid)
      .then((zahl) => setLoeschen((l) => (l ? { ...l, zahl } : l)))
      .catch((err: unknown) => setLoeschen((l) => (l ? { ...l, fehler: err instanceof Error ? err.message : String(err) } : l)))
  }

  /* Im Zeichner eine einzige schmale Leiste: Zurueck, Grundrisse, dann die
   * Knoepfe des Zeichners, am Ende Erklaerung und Profil. */
  const kompaktKopf = (
    <>
      <Link
        to={`/app/p/${project.id}`}
        data-tour="zurueck"
        aria-label={t('aktion.zurueck')}
        title={t('aktion.zurueck')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-raised"
      >
        <ArrowLeft size={18} className="spiegeln" />
      </Link>
      <span className="hidden shrink-0 text-sm font-black xl:inline" title={project.name}>
        {t('grundriss.titel')}
      </span>
      {liste.data ? (
        <Reiter
          kompakt
          liste={liste.data}
          aktiv={gid}
          canEdit={canEdit}
          onNeu={() => setDialog('neu')}
          onUmbenennen={() => setDialog('umbenennen')}
          onLoeschen={loeschenFragen}
        />
      ) : null}
    </>
  )
  const kompaktEnde = (
    <>
      <ErklaerKnopf />
      <Link
        to="/app/einstellungen"
        data-tour="profil"
        aria-label={t('kopf.profil')}
        title={t('kopf.profil')}
        className="shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-line"
      >
        <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={32} />
      </Link>
    </>
  )

  const kopf = (
    <>
      <AppHeader title={t('grundriss.titel')} subtitle={project.name} back={`/app/p/${project.id}`} sticky={!mitZeichner} />
      {liste.error ? (
        <div className="px-3 py-2 sm:px-5">
          <ErrorBox error={liste.error} onRetry={liste.reload} />
        </div>
      ) : liste.data ? (
        <Reiter
          liste={liste.data}
          aktiv={gid}
          canEdit={canEdit}
          onNeu={() => setDialog('neu')}
          onUmbenennen={() => setDialog('umbenennen')}
          onLoeschen={loeschenFragen}
        />
      ) : (
        <div className="h-14 border-b border-line" />
      )}
    </>
  )

  /* Beim Wechsel des Reiters oder der Ansicht haelt useAsync noch die
   * alten Daten: erst zeigen, wenn sie zu diesem Grundriss und dieser
   * Ansicht gehoeren. */
  const alt =
    daten.data !== null &&
    (daten.data.fuer !== mitZeichner || (daten.data.d !== null && daten.data.d.grundriss.id !== gid))
  const passend = daten.data && !alt ? daten.data.d : null
  let inhalt
  if (daten.error) {
    inhalt = (
      <Page>
        <ErrorBox error={daten.error} onRetry={daten.reload} />
      </Page>
    )
  } else if (daten.loading || alt) {
    inhalt = <Skelett />
  } else if (!passend) {
    inhalt = (
      <Page>
        <Empty
          title={t('grundriss.fehlt')}
          action={
            <Link to={`/app/p/${project.id}/grundriss`}>
              <Button>{t('grundriss.zum_ersten')}</Button>
            </Link>
          }
        />
      </Page>
    )
  } else if (mitZeichner) {
    inhalt = (
      <Suspense fallback={<Skelett />}>
        <Zeichner
          key={gid}
          start={passend}
          raumId={raumId}
          kisteId={kisteId}
          onUngespeichert={ungespeichertMelden}
          kopf={kompaktKopf}
          kopfEnde={kompaktEnde}
          begehen={begehen}
          onBegehen={begehenAngenommen}
        />
      </Suspense>
    )
  } else {
    inhalt = <Ansehen daten={passend} raumId={raumId} kisteId={kisteId} begehen={begehen} onBegehen={begehenAngenommen} onGespeichert={daten.reload} />
  }

  // Der Zeichner bringt den Kopf in seiner eigenen Leiste mit.
  const zeichnerDa = mitZeichner && !!passend && !daten.error && !daten.loading && !alt
  return (
    <div className={cx(mitZeichner && 'flex h-dvh flex-col')}>
      {zeichnerDa ? null : kopf}
      <div className={cx(mitZeichner && 'min-h-0 flex-1')}>{inhalt}</div>

      <NameDialog
        offen={dialog === 'neu'}
        titel={t('grundriss.anlegen')}
        start=""
        vorschlaege={VORSCHLAEGE.map((k) => t(k)).filter((n) => !liste.data?.some((g) => g.name === n))}
        onClose={() => setDialog(null)}
        onSpeichern={async (name) => {
          const sort = (liste.data ?? []).reduce((m, g) => Math.max(m, g.sort), -1) + 1
          const g = await legeGrundrissAn(project.id, name, sort)
          liste.reload()
          nav(`/app/p/${project.id}/grundriss/${g.id}`)
        }}
      />
      <NameDialog
        offen={dialog === 'umbenennen'}
        titel={t('grundriss.umbenennen')}
        start={aktiv?.name ?? ''}
        vorschlaege={[]}
        onClose={() => setDialog(null)}
        onSpeichern={async (name) => {
          await aendereGrundriss(gid, { name })
          liste.reload()
        }}
      />
      <ConfirmDialog
        open={loeschen !== null}
        title={t('grundriss.loeschen_titel', { name: aktiv?.name ?? '' })}
        body={
          loeschen?.fehler
            ? loeschen.fehler
            : loeschen?.zahl === null
              ? t('grundriss.loeschen_zaehlt')
              : t('grundriss.loeschen_frage', { n: loeschen?.zahl ?? 0 })
        }
        onClose={() => setLoeschen(null)}
        onConfirm={async () => {
          try {
            await loescheGrundriss(gid)
            toast(t('grundriss.geloescht'), 'ok')
            nav(`/app/p/${project.id}/grundriss`, { replace: true })
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </div>
  )
}
