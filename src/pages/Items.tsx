import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Boxes, ChevronDown, Crosshair, Download, Minus, Plus, Search, X } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { ItemRow } from '../components/ItemRow'
import {
  Button,
  Card,
  Chip,
  CodeChip,
  Empty,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
  Skelett,
  Spinner,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { countItems, createItem, ladeRaeumeDesUmzugs, listAllItems, listItems, listKategorien } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { hatLiter, literText, useEigeneGroessen, useKistenGroessen } from '../lib/groessen'
import { ARTEN, groessenArt } from '../lib/arten'
import { SizePicker } from '../components/SizePicker'
import { KistenTabelle, KistenVorschau } from '../components/KistenTabelle'
import { useIstDesktop } from '../lib/desktop'
import { supabase } from '../lib/supabase'
import type { Item, ItemKind, LagerKategorie } from '../lib/types'
import { download, toCsv, useAsync, useDebounced, useLocalState } from '../lib/util'

/* Kisten (E105): Bereich waehlen, Namen geben, fertig. Zimmer, Person, Umzug
 * und Moebel gibt es hier nicht mehr. Die Nummer einer Kiste vergibt die
 * Datenbank aus dem Kuerzel des Bereichs (room_id = Kuerzel des Bereichs). */

/** Kistenarten ohne Moebel: Moebel haben keinen Platz in dieser Liste. */
const ARTEN_KISTE = ARTEN.filter((k) => k !== 'furniture')

interface Draft {
  kind: ItemKind
  title: string
  /** Das Kuerzel (tag_id) des gewaehlten Bereichs. */
  room_id: string
  size: number
  /** Eigene Groesse (0027) oder null. Die Stufe setzt dann die Datenbank. */
  eigene_groesse_id: string | null
  note: string
  fragile: boolean
  count: number
}

export default function Items() {
  const { project, tagById, canEdit } = useProject()
  const { t, tn } = useSprache()
  const groessen = useKistenGroessen()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)
  const roomId = params.get('room') ?? 'all'

  const bereiche = useAsync(() => listKategorien(project.id), [project.id])
  /** Nur Bereiche mit Kuerzel koennen Kisten tragen. */
  const waehlbar = useMemo<LagerKategorie[]>(
    () => (bereiche.data ?? []).filter((k) => k.tag_id !== null),
    [bereiche.data],
  )
  const bereichName = (tagId: string | null) =>
    waehlbar.find((k) => k.tag_id === tagId)?.name ?? tagById(tagId)?.name ?? t('lager.bestand_ohne_bereich')

  const [rows, setRows] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)
  /* Wie viele Kisten keinem Bereich zugeordnet sind. null heisst ungezaehlt,
   * nicht null gleich null. */
  const [ohneBereich, setOhneBereich] = useState<number | null>(null)
  const PAGE = 60
  /* Am Computer: Tabelle links, gewaehlte Kiste rechts. Die Wahl steht in
   * der Adresse, damit Neuladen und Zurueck sie behalten. */
  const desktop = useIstDesktop()
  const gewaehltId = params.get('kiste')
  function kisteWaehlen(id: string | null) {
    const next = new URLSearchParams(params)
    if (id) next.set('kiste', id)
    else next.delete('kiste')
    setParams(next, { replace: true })
  }

  /* Moebel gibt es hier nicht mehr: ausdruecklich ausgeschlossen. */
  const filter = useMemo(
    () => ({ search: debounced, roomId, sort: 'code' as const, kindNot: 'furniture' as const }),
    [debounced, roomId],
  )

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await listItems(project.id, {
          ...filter,
          limit: PAGE,
          offset: nextPage * PAGE,
        })
        setRows((prev) => (append ? [...prev, ...res.rows] : res.rows))
        setTotal(res.total)
        setPage(nextPage)
        /* Nur bei der ersten Seite zaehlen. */
        if (!append) {
          try {
            setOhneBereich(await countItems(project.id, { roomId: 'none', kindNot: 'furniture' }))
          } catch {
            setOhneBereich(null)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [project.id, filter],
  )

  useEffect(() => {
    void load(0, false)
  }, [load])

  // Aendert jemand anders etwas, soll die Liste das sofort zeigen.
  useEffect(() => {
    const ch = supabase
      .channel(`items-${project.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `project_id=eq.${project.id}` },
        (payload) => {
          const next = payload.new as Item
          setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)))
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [project.id])

  /* -------------------------------------------------------- neue Kiste */
  const [open, setOpen] = useState(params.get('neu') === '1')
  /* Nach dem Anlegen: gleich im Plan hinstellen. Das Blatt zeigt nur, was
   * es anzeigt; es haelt keinen eigenen Zustand. */
  const [angelegt, setAngelegt] = useState<Item[] | null>(null)

  /** Schliessen nimmt auch ?neu aus der Adresse, sonst oeffnete ein
   *  Neuladen den Dialog von selbst wieder. */
  function schliessen() {
    setOpen(false)
    if (params.get('neu')) {
      const rest = new URLSearchParams(params)
      rest.delete('neu')
      setParams(rest, { replace: true })
    }
  }

  async function exportCsv() {
    if (exporting) return
    setExporting(true)
    try {
      const all = (await listAllItems(project.id)).filter((i) => i.kind !== 'furniture')
      const csv = toCsv(
        all.map((i) => ({
          [t('kisten.csv_code')]: i.code,
          [t('kisten.art')]: t(`art.${i.kind}`),
          [t('begriff.titel')]: i.title ?? '',
          [t('begriff.bereich')]: bereichName(i.room_id),
          [t('begriff.groesse')]: i.size,
          // Immer mit Komma: die Datei trennt mit Semikolon, und in einem
          // deutschen Excel wuerde 35.5 zum Datum.
          [t('ausgabe.spalte_liter')]:
            hatLiter(i.kind) && groessen?.get(i.size)
              ? literText(groessen.get(i.size)!.liter, 'de')
              : '',
          [t('begriff.zerbrechlich')]: i.fragile ? t('kisten.ja') : t('kisten.nein'),
          [t('begriff.notiz')]: i.note ?? '',
        })),
      )
      if (!csv) {
        toast(t('kisten.nichts_zu_exportieren'), 'info')
        return
      }
      download(`magazino-${project.name.replace(/\W+/g, '-').toLowerCase()}.csv`, csv)
      toast(t('kisten.exportiert', { n: all.length }), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  function setRoom(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all' || !value) next.delete('room')
    else next.set('room', value)
    setParams(next, { replace: true })
  }

  const gefiltert = roomId !== 'all' || Boolean(debounced)

  return (
    <>
      <AppHeader
        wide
        title={t('nav.kisten')}
        subtitle={tn('begriff.eintraege', total)}
        back={`/app/p/${project.id}`}
        actions={
          <>
            <IconButton
              label={t('aktion.exportieren')}
              size="sm"
              disabled={exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? <Spinner /> : <Download size={19} />}
            </IconButton>
            {canEdit ? (
              <Button data-tour="kisten-neu" size="sm" onClick={() => setOpen(true)}>
                <Plus size={16} /> {t('aktion.neu')}
              </Button>
            ) : null}
          </>
        }
      />

      <Page wide>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_380px] 2xl:gap-6">
          <div className="min-w-0">
            {/* Suche */}
            <div className="relative mb-3">
              <Search size={19} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                data-tour="kisten-suche"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('kisten.suche_platzhalter')}
                className={search ? 'ps-10 pe-14' : 'ps-10'}
              />
              {search ? (
                <IconButton
                  label={t('kisten.suche_leeren')}
                  size="sm"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2"
                  onClick={() => setSearch('')}
                >
                  <X size={17} />
                </IconButton>
              ) : null}
            </div>

            {/* Bereiche: ein Tipp filtert. Die Leiste darf waagerecht rollen, die Seite nicht. */}
            <div className="-mx-3 mb-3 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
              <Chip active={roomId === 'all'} onClick={() => setRoom('all')}>
                {t('aktion.alle')}
              </Chip>
              {waehlbar.map((k) => (
                <Chip key={k.id} active={roomId === k.tag_id} onClick={() => setRoom(k.tag_id ?? 'all')}>
                  {k.name}
                </Chip>
              ))}
              {ohneBereich !== null && ohneBereich > 0 ? (
                <Chip active={roomId === 'none'} onClick={() => setRoom('none')}>
                  {t('lager.bestand_ohne_bereich')} ({ohneBereich})
                </Chip>
              ) : null}
            </div>
            {bereiche.error ? (
              <div className="mb-3">
                <ErrorBox error={bereiche.error} onRetry={bereiche.reload} />
              </div>
            ) : null}

            {/* Liste: Laden, Fehler und leer sind drei verschiedene Zustaende. */}
            {error && rows.length === 0 ? (
              <ErrorBox error={error} onRetry={() => void load(0, false)} />
            ) : loading && rows.length === 0 ? (
              <Skelett label={t('kisten.laedt')} anzahl={desktop ? 8 : 5} />
            ) : rows.length === 0 ? (
              <Empty
                icon={<Boxes size={28} />}
                zeichnung={gefiltert ? 'stapel' : 'karton'}
                title={gefiltert ? t('zustand.nichts_gefunden') : t('kisten.leer_titel')}
                hint={gefiltert ? undefined : t('kisten.leer_hinweis')}
                action={
                  gefiltert ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch('')
                        setRoom('all')
                      }}
                    >
                      <X size={16} /> {t('kisten.filter_zuruecksetzen')}
                    </Button>
                  ) : canEdit ? (
                    <Button variant="outline" onClick={() => setOpen(true)}>
                      <Plus size={16} /> {t('kisten.erste')}
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                {/* Scheitert das Nachladen, bleibt die geladene Liste stehen.
                    Der Fehler steht darueber, damit niemand denkt, es gebe
                    einfach nichts mehr. */}
                {error ? (
                  <div className="mb-3">
                    <ErrorBox error={error} onRetry={() => void load(page + 1, true)} />
                  </div>
                ) : null}
                {desktop ? (
                  <div data-tour="kisten-liste">
                    <KistenTabelle
                      rows={rows}
                      tagById={tagById}
                      bereichName={bereichName}
                      gewaehltId={gewaehltId}
                      onWaehlen={(id) => kisteWaehlen(id)}
                      unvollstaendig={rows.length < total}
                    />
                  </div>
                ) : (
                  /* Handy: volle Breite, von Rand zu Rand. */
                  <Card
                    data-tour="kisten-liste"
                    className="zebra -mx-3 divide-y divide-line overflow-hidden rounded-none border-x-0 sm:mx-0 sm:rounded-karte sm:border-x"
                  >
                    {rows.map((item, i) => (
                      <Fragment key={item.id}>
                        {/* Die Kisten eines Bereichs stehen beisammen (die
                            Vorsilbe ist das Kuerzel). Jeder Bereich bekommt
                            eine Kopfzeile mit Farbe und Zahl. */}
                        {i === 0 || rows[i - 1].room_id !== item.room_id ? (
                          <BereichKopf
                            name={bereichName(item.room_id)}
                            farbe={tagById(item.room_id)?.color ?? null}
                            anzahl={rows.filter((r) => r.room_id === item.room_id).length}
                          />
                        ) : null}
                        <ItemRow
                          item={item}
                          projectId={project.id}
                          tagById={tagById}
                          canEdit={canEdit}
                          zeigeZimmer={false}
                          zeigePerson={false}
                        />
                      </Fragment>
                    ))}
                  </Card>
                )}

                {rows.length < total ? (
                  <div className="mt-5 flex flex-col items-center gap-2">
                    <Button variant="outline" size="lg" loading={loading} onClick={() => void load(page + 1, true)}>
                      {t('aktion.mehr_laden')}
                    </Button>
                    <p className="t-sub">{t('kisten.geladen_von', { a: rows.length, b: total })}</p>
                  </div>
                ) : (
                  <p className="t-sub mt-5 text-center">{t('kisten.alle_geladen', { n: total })}</p>
                )}
              </>
            )}

            <div className="h-6" />
          </div>

          {desktop ? (
            <aside className="sticky top-20 hidden lg:block">
              <KistenVorschau
                item={rows.find((r) => r.id === gewaehltId) ?? null}
                projectId={project.id}
                tagById={tagById}
                bereichName={bereichName}
                canEdit={canEdit}
                onSchliessen={() => kisteWaehlen(null)}
              />
            </aside>
          ) : null}
        </div>
      </Page>

      {/* Neue Kiste: nur eingehaengt, solange er offen ist (frischer Zustand). */}
      {open ? (
        <NeueKisteDialog
          projectId={project.id}
          bereiche={waehlbar}
          ladeFehler={bereiche.error}
          vorBereich={roomId !== 'all' && roomId !== 'none' && waehlbar.some((k) => k.tag_id === roomId) ? roomId : ''}
          onClose={schliessen}
          onAngelegt={() => load(0, false)}
          onBlatt={setAngelegt}
        />
      ) : null}

      {/* Angelegt: gleich hinstellen oder fertig. */}
      <Modal
        open={angelegt !== null}
        onClose={() => setAngelegt(null)}
        title={
          angelegt && angelegt.length === 1
            ? t('kisten.angelegt_blatt', { code: angelegt[0].code })
            : t('kisten.angelegt_blatt_viele', { n: angelegt?.length ?? 0 })
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setAngelegt(null)}>
              {t('aktion.fertig')}
            </Button>
            <Button
              onClick={() => {
                if (!angelegt || angelegt.length === 0) return
                const ids = angelegt.map((i) => i.id)
                setAngelegt(null)
                nav(`/app/p/${project.id}/kisten/${ids[0]}/platz`, {
                  state: { zurueck: loc.pathname + loc.search, reihe: ids.length > 1 ? ids : undefined },
                })
              }}
            >
              <Crosshair size={18} />
              {angelegt && angelegt.length > 1 ? t('kisten.nacheinander') : t('lager.k_platz_waehlen')}
            </Button>
          </>
        }
      >
        {angelegt && angelegt.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {angelegt.slice(0, 12).map((i) => (
              <CodeChip key={i.id} code={i.code} size="sm" />
            ))}
            {angelegt.length > 12 ? <span className="t-sub self-center">…</span> : null}
          </div>
        ) : null}
      </Modal>
    </>
  )
}

/* ------------------------------------------------------ Neue Kiste */

function NeueKisteDialog({
  projectId,
  bereiche,
  ladeFehler,
  vorBereich,
  onClose,
  onAngelegt,
  onBlatt,
}: {
  projectId: string
  bereiche: LagerKategorie[]
  ladeFehler: string | null
  vorBereich: string
  onClose: () => void
  /** Liste neu laden; kommt zurueck, wenn sie steht. */
  onAngelegt: () => Promise<void>
  /** Das Blatt "Gleich hinstellen". */
  onBlatt: (created: Item[]) => void
}) {
  const { t } = useSprache()
  const toast = useToast()
  const { tagById } = useProject()
  const [merkerBereich, setMerkerBereich] = useLocalState<string>('magazino.kiste.bereich', '')
  const start = vorBereich || (bereiche.some((k) => k.tag_id === merkerBereich) ? merkerBereich : '')
  const [draft, setDraft] = useState<Draft>({
    kind: 'box',
    title: '',
    room_id: start,
    size: 5,
    eigene_groesse_id: null,
    note: '',
    fragile: false,
    count: 1,
  })
  const [mehr, setMehr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const eigene = useEigeneGroessen(mehr ? projectId : null)

  /** Neue Kistenart: passt die gewaehlte eigene Groesse nicht mehr zur Art,
   *  faellt sie weg. */
  function setzeArt(kind: ItemKind) {
    setDraft((d) => {
      const g = eigene.liste?.find((x) => x.id === d.eigene_groesse_id)
      const passt = !g || g.art === groessenArt(kind)
      return { ...d, kind, eigene_groesse_id: passt ? d.eigene_groesse_id : null }
    })
  }

  const previewPrefix = tagById(draft.room_id)?.short ?? '??'

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setFormError(null)
    if (!draft.room_id) {
      setFormError(t('lager.k_bereich_waehlen'))
      return
    }
    setBusy(true)
    const created: Item[] = []
    let abbruch: string | null = null
    try {
      for (let i = 0; i < Math.min(Math.max(draft.count, 1), 50); i++) {
        created.push(
          await createItem({
            project_id: projectId,
            kind: draft.kind,
            title: draft.title.trim() || null,
            // Der Bereich traegt das Kuerzel; eine Person gibt es nicht mehr.
            room_id: draft.room_id,
            code_source: 'room',
            size: draft.size,
            eigene_groesse_id: draft.eigene_groesse_id,
            note: draft.note.trim() || null,
            fragile: draft.fragile,
          }),
        )
      }
    } catch (err) {
      abbruch = err instanceof Error ? err.message : String(err)
    }

    /* Was schon in der Datenbank steht, wird gemeldet und geladen, auch wenn
     * die Reihe abgebrochen ist. Sonst waeren die angelegten Kisten
     * unsichtbar, und der naechste Versuch legte sie ein zweites Mal an. */
    if (created.length > 0) {
      setMerkerBereich(draft.room_id)
      let blatt = false
      if (!abbruch) {
        try {
          blatt = (await ladeRaeumeDesUmzugs(projectId)).some((r) => r.tag_id === draft.room_id)
        } catch (err) {
          console.warn('[kisten] Raeume nicht geprueft:', err instanceof Error ? err.message : err)
          blatt = true
        }
      }
      if (blatt) {
        onBlatt(created)
      } else {
        toast(
          created.length === 1
            ? t('kisten.angelegt', { code: created[0].code })
            : t('kisten.mehrere_angelegt', {
                n: created.length,
                von: created[0].code,
                bis: created[created.length - 1].code,
              }),
          'ok',
        )
      }
      await onAngelegt()
    }

    if (abbruch) {
      setFormError(
        created.length > 0 ? t('kisten.reihe_abgebrochen', { n: created.length, grund: abbruch }) : abbruch,
      )
      // Die Anzahl sinkt um das, was schon steht, damit ein zweiter Versuch
      // den Rest anlegt und nicht alles noch einmal.
      setDraft((d) => ({ ...d, count: Math.max(1, d.count - created.length) }))
      setBusy(false)
      return
    }

    onClose()
    setBusy(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('kisten.neu')}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="item-form" type="submit" loading={busy}>
            {draft.count > 1 ? t('kisten.anzahl_anlegen', { n: draft.count }) : t('aktion.anlegen')}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={onCreate} className="space-y-5">
        {/* Bereich: grosse Tippflaechen statt Aufklappmenue. */}
        <div>
          <span className="mb-2 block text-[0.9375rem] font-bold">
            {t('lager.bereich')} <span className="text-danger">*</span>
          </span>
          {ladeFehler ? (
            <ErrorBox error={ladeFehler} />
          ) : bereiche.length === 0 ? (
            <p className="t-sub">{t('lager.bereiche_leer')}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {bereiche.map((k) => (
                <Chip
                  key={k.id}
                  active={draft.room_id === k.tag_id}
                  color={k.tag_id ? tagById(k.tag_id)?.color : undefined}
                  onClick={() => setDraft((d) => ({ ...d, room_id: k.tag_id ?? '' }))}
                >
                  {k.name}
                </Chip>
              ))}
            </div>
          )}
        </div>

        <Field label={t('lager.k_name')}>
          <Input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder={t('lager.k_name_beispiel')}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-line bg-raised px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-muted">{t('kisten.nummer_wird')}</p>
            <p className="t-serial mt-1 text-3xl leading-none" dir="ltr">
              {previewPrefix}
              <span className="opacity-40">-</span>
              <span className="text-danger">{draft.eigene_groesse_id ? '?' : draft.size}</span>
              <span className="opacity-40">-</span>
              <span className="opacity-60">###</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1" role="group" aria-label={t('kisten.anzahl')} dir="ltr">
            <IconButton
              label={t('kisten.menge_weniger')}
              disabled={draft.count <= 1}
              onClick={() => setDraft((d) => ({ ...d, count: Math.max(1, d.count - 1) }))}
            >
              <Minus size={18} />
            </IconButton>
            <span className="t-serial min-w-10 text-center text-2xl font-black" aria-live="polite">
              {draft.count}
            </span>
            <IconButton
              label={t('kisten.menge_mehr')}
              disabled={draft.count >= 50}
              onClick={() => setDraft((d) => ({ ...d, count: Math.min(50, d.count + 1) }))}
            >
              <Plus size={18} />
            </IconButton>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMehr((v) => !v)}
          aria-expanded={mehr}
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-1 text-start text-[0.9375rem] font-bold text-muted transition hover:text-ink"
        >
          {t('lager.k_mehr')}
          <ChevronDown size={18} className={mehr ? 'rotate-180 transition' : 'transition'} />
        </button>

        {mehr ? (
          <div className="space-y-5">
            <Field label={t('begriff.groesse')}>
              <SizePicker
                value={draft.size}
                kind={draft.kind}
                onChange={(size) => setDraft((d) => ({ ...d, size, eigene_groesse_id: null }))}
                eigene={eigene.liste}
                eigeneFehler={eigene.fehler}
                eigeneId={draft.eigene_groesse_id}
                onEigene={(id) => setDraft((d) => ({ ...d, eigene_groesse_id: id }))}
                onEigeneNochmal={eigene.nochmal}
              />
            </Field>
            <Field label={t('kisten.art')}>
              <Select value={draft.kind} onChange={(e) => setzeArt(e.target.value as ItemKind)}>
                {ARTEN_KISTE.map((k) => (
                  <option key={k} value={k}>
                    {t(`art.${k}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('begriff.notiz')}>
              <Textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              />
            </Field>
            <Switch
              checked={draft.fragile}
              onChange={(fragile) => setDraft((d) => ({ ...d, fragile }))}
              label={t('begriff.zerbrechlich')}
            />
          </div>
        ) : null}

        {formError ? (
          <p className="rounded-xl border-2 border-danger/30 bg-danger/5 px-3 py-2.5 text-base font-bold text-danger">
            {formError}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}

/** Kopfzeile eines Bereichs in der Kistenliste am Handy. */
function BereichKopf({ name, farbe, anzahl }: { name: string; farbe: string | null; anzahl: number }) {
  return (
    <div className="flex items-center gap-2.5 border-t-2 border-line bg-raised px-4 py-2.5">
      <span className="h-4 w-1.5 shrink-0 rounded-full" style={{ background: farbe ?? 'var(--line)' }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-base font-black">{name}</span>
      <span className="t-serial shrink-0 text-sm font-bold text-muted">{anzahl}</span>
    </div>
  )
}
