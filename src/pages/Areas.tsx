import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Pencil, Plus, Trash2, User, DoorOpen } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { MarkIcon } from '../components/Mark'
import {
  Button,
  Card,
  ConfirmDialog,
  Empty,
  ErrorBox,
  IconButton,
  SectionTitle,
  useToast,
} from '../components/ui'
import { BereichDialog } from '../components/BereichDialog'
import { bereichEntwurf, neuerBereich, type BereichEntwurf } from '../lib/bereich'
import { useProject } from './ProjectLayout'
import { deleteTag, listTagStats } from '../lib/api'
import { useSprache } from '../lib/i18n'
import type { Tag, TagKind } from '../lib/types'
import { contrastOn } from '../lib/util'

function TagRow({
  tag,
  to,
  count,
  countsFailed,
  onEdit,
  onDelete,
  canEdit,
}: {
  tag: Tag
  /** Die eigene Seite dieses Bereichs. Antippen oeffnet sie wie eine Akte. */
  to: string
  count: number | undefined
  countsFailed: boolean
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const { t, tn } = useSprache()
  const countText =
    count !== undefined
      ? tn('begriff.kisten_anzahl', count)
      : countsFailed
        ? t('bereiche.anzahl_fehlt')
        : t('bereiche.wird_gezaehlt')
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3">
        {/* Das Kuerzel ist die Verbindung zur Nummer auf dem Etikett, darum
            steht es so gross wie moeglich. Es bleibt immer von links nach
            rechts, auch im arabischen Satz. */}
        <Link data-tour="bereiche-zeile" to={to} className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1">
          <span
            dir="ltr"
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-mono font-black ${
              tag.short.length > 2 ? 'text-lg' : 'text-2xl'
            }`}
            style={{ background: tag.color, color: contrastOn(tag.color) }}
          >
            {tag.short}
          </span>
          <span className="min-w-0 flex-1">
            <span className="t-name-lg flex items-center gap-1.5 break-words">
              {tag.symbol ? <MarkIcon symbol={tag.symbol} size={17} /> : null}
              {tag.name}
            </span>
            <span className="t-sub block truncate">{countText}</span>
          </span>
          <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
        </Link>
        {canEdit ? (
          <div className="flex shrink-0 gap-1.5">
            <IconButton data-tour="bereiche-bearbeiten"
              label={t('bereiche.bearbeiten_label', { name: tag.name })}
              size="sm"
              onClick={onEdit}
            >
              <Pencil size={17} />
            </IconButton>
            <IconButton data-tour="bereiche-loeschen"
              label={t('bereiche.loeschen_label', { name: tag.name })}
              size="sm"
              tone="danger"
              onClick={onDelete}
            >
              <Trash2 size={17} />
            </IconButton>
          </div>
        ) : null}
      </div>
      {tag.note ? <p className="t-sub mt-2 break-words">{tag.note}</p> : null}
    </div>
  )
}

export default function Areas() {
  const { project, rooms, people, tags, canEdit, reloadTags } = useProject()
  const { t, tn } = useSprache()
  const toast = useToast()

  const [draft, setDraft] = useState<BereichEntwurf | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [countsError, setCountsError] = useState<string | null>(null)
  const [countsNonce, setCountsNonce] = useState(0)
  const [toDelete, setToDelete] = useState<Tag | null>(null)
  const [params, setParams] = useSearchParams()

  const retryCounts = useCallback(() => setCountsNonce((n) => n + 1), [])

  /* Die eigene Seite eines Bereichs schickt zum Bearbeiten hierher zurueck.
   * Der Dialog steht nur an dieser einen Stelle, sonst gaebe es ihn zweimal
   * und beide wuerden auseinanderlaufen. */
  useEffect(() => {
    const wunsch = params.get('bearbeiten')
    if (!wunsch) return
    const tag = tags.find((x) => x.id === wunsch)
    if (tag) setDraft(bereichEntwurf(tag))
    const rest = new URLSearchParams(params)
    rest.delete('bearbeiten')
    setParams(rest, { replace: true })
  }, [params, tags, setParams])

  useEffect(() => {
    let alive = true
    setCountsError(null)
    void listTagStats(project.id)
      .then((stats) => {
        if (!alive) return
        const m = new Map<string, number>()
        for (const [id, s] of stats) m.set(id, s.total)
        setCounts(m)
      })
      .catch((err: unknown) => {
        if (!alive) return
        // Zaehlen ist nur Anzeige, die Liste laeuft ohne weiter. Trotzdem
        // steht der Fehler auf dem Bildschirm und nicht nur in der Konsole.
        setCountsError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      alive = false
    }
  }, [project.id, tags, countsNonce])

  function openNew(kind: TagKind) {
    setDraft(neuerBereich(kind, tags.length))
  }

  function openEdit(tag: Tag) {
    setDraft(bereichEntwurf(tag))
  }

  const deleteCount = toDelete ? counts.get(toDelete.id) : undefined

  const section = (kind: TagKind, list: Tag[]) => (
    <>
      <SectionTitle
        action={
          canEdit ? (
            <Button data-tour="bereiche-neu" size="sm" variant="soft" onClick={() => openNew(kind)}>
              <Plus size={16} /> {kind === 'room' ? t('begriff.zimmer') : t('begriff.person')}
            </Button>
          ) : null
        }
      >
        {kind === 'room' ? t('bereiche.zimmer_titel') : t('begriff.personen')}
      </SectionTitle>
      {list.length === 0 ? (
        <div className="mb-6">
          <Empty
            icon={kind === 'room' ? <DoorOpen size={26} /> : <User size={26} />}
            title={
              kind === 'room' ? t('bereiche.leer_zimmer_titel') : t('bereiche.leer_person_titel')
            }
            hint={
              kind === 'room'
                ? t('bereiche.leer_zimmer_hinweis')
                : t('bereiche.leer_person_hinweis')
            }
            action={
              canEdit ? (
                <Button onClick={() => openNew(kind)}>
                  <Plus size={16} /> {t('aktion.anlegen')}
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {list.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              to={`/app/p/${project.id}/${tag.kind === 'room' ? 'zimmer' : 'person'}/${tag.id}`}
              count={counts.get(tag.id)}
              countsFailed={Boolean(countsError)}
              canEdit={canEdit}
              onEdit={() => openEdit(tag)}
              onDelete={() => setToDelete(tag)}
            />
          ))}
        </Card>
      )}
    </>
  )

  return (
    <>
      <AppHeader
        title={t('begriff.bereiche')}
        subtitle={t('bereiche.untertitel')}
        back={`/app/p/${project.id}`}
      />
      <Page>
        <Card className="t-sub mb-6 p-4">{t('bereiche.erklaerung')}</Card>

        {countsError ? (
          <div className="mb-6">
            <ErrorBox
              error={t('bereiche.anzahl_fehler', { grund: countsError })}
              onRetry={retryCounts}
            />
          </div>
        ) : null}

        {section('room', rooms)}
        {section('person', people)}

        <div className="h-6" />
      </Page>

      <BereichDialog
        entwurf={draft}
        projectId={project.id}
        tags={tags}
        onClose={() => setDraft(null)}
        onGespeichert={async (_tag, neu) => {
          toast(t(neu ? 'bereiche.angelegt' : 'bereiche.gespeichert'), 'ok')
          await reloadTags()
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('bereiche.loeschen_titel', { name: toDelete?.name ?? '' })}
        body={
          deleteCount === undefined
            ? t('bereiche.loeschen_unbekannt')
            : deleteCount > 0
              ? t('bereiche.loeschen_mit_kisten', {
                  kisten: tn('begriff.kisten_anzahl', deleteCount),
                })
              : t('bereiche.loeschen_leer')
        }
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteTag(toDelete.id)
            await reloadTags()
            toast(t('bereiche.geloescht'), 'ok')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}
