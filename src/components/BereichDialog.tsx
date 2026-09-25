import { useEffect, useState, type FormEvent } from 'react'
import { MarkIcon } from './Mark'
import { Button, CodeChip, Field, Input, Modal, Textarea } from './ui'
import { createTag, updateTag } from '../lib/api'
import { useT } from '../lib/i18n'
import { MARK_SYMBOLE } from '../lib/marken'
import { TAG_COLORS, type Tag } from '../lib/types'
import type { BereichEntwurf } from '../lib/bereich'
import { cx, suggestShort } from '../lib/util'

/* Zimmer oder Person anlegen und bearbeiten. Steht hier und nicht in der
 * Seite Bereiche, weil auch der Zeichner ein neues Zimmer anlegt ("Neues
 * Zimmer anlegen" in den Eigenschaften eines Raums). Eine Fassung, zwei
 * Einstiege. Der Dialog setzt sich bei jedem Oeffnen zurueck. */

function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={t('bereiche.farbe_waehlen', { farbe: c })}
          aria-pressed={value.toUpperCase() === c}
          className="h-11 w-11 rounded-xl border-4 transition active:scale-95"
          style={{
            background: c,
            borderColor: value.toUpperCase() === c ? 'var(--ink)' : 'transparent',
          }}
        />
      ))}
      <label
        title={t('bereiche.eigene_farbe')}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-raised"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-7 w-7 cursor-pointer"
          aria-label={t('bereiche.eigene_farbe')}
        />
      </label>
    </div>
  )
}

export function BereichDialog({
  entwurf,
  projectId,
  tags,
  onClose,
  onGespeichert,
}: {
  /** null = zu. Ein neues Objekt oeffnet den Dialog frisch. */
  entwurf: BereichEntwurf | null
  projectId: string
  tags: Tag[]
  onClose: () => void
  /** Nach dem Speichern; die Seite laedt ihre Bereiche selbst neu. */
  onGespeichert: (tag: Tag, neu: boolean) => void | Promise<void>
}) {
  const t = useT()
  const [draft, setDraft] = useState<BereichEntwurf | null>(entwurf)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Beim Oeffnen zuruecksetzen: kein Rest vom letzten Mal. */
  useEffect(() => {
    setDraft(entwurf)
    setError(null)
    setBusy(false)
  }, [entwurf])

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    setError(null)
    if (!draft.name.trim()) {
      setError(t('bereiche.fehler_name'))
      return
    }
    const short = draft.short.trim().toUpperCase()
    if (!/^[A-Z0-9]{1,4}$/.test(short)) {
      setError(t('bereiche.fehler_kuerzel'))
      return
    }
    const clash = tags.find((x) => x.short.toUpperCase() === short && x.id !== draft.id)
    if (clash) {
      setError(t('bereiche.fehler_kuerzel_belegt', { kuerzel: short, name: clash.name }))
      return
    }
    setBusy(true)
    try {
      const werte = {
        name: draft.name.trim(),
        short,
        color: draft.color,
        symbol: draft.symbol,
        note: draft.note.trim() || null,
      }
      const tag = draft.id
        ? await updateTag(draft.id, werte)
        : await createTag({ project_id: projectId, kind: draft.kind, ...werte })
      await onGespeichert(tag, !draft.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={Boolean(entwurf)}
      onClose={onClose}
      title={
        draft?.id
          ? t('bereiche.dialog_bearbeiten')
          : draft?.kind === 'room'
            ? t('bereiche.dialog_neues_zimmer')
            : t('bereiche.dialog_neue_person')
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="tag-form" type="submit" loading={busy}>
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      {draft ? (
        <form id="tag-form" onSubmit={save} className="space-y-5">
          <Field label={t('begriff.name')} required>
            <Input
              autoFocus
              required
              value={draft.name}
              onChange={(e) => {
                const name = e.target.value
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        name,
                        short:
                          d.id || d.short
                            ? d.short
                            : suggestShort(
                                name,
                                tags.map((x) => x.short),
                              ),
                      }
                    : d,
                )
              }}
              placeholder={
                draft.kind === 'room'
                  ? t('bereiche.name_platzhalter_zimmer')
                  : t('bereiche.name_platzhalter_person')
              }
              className="text-lg font-bold"
            />
          </Field>

          <Field label={t('begriff.kuerzel')} required hint={t('bereiche.kuerzel_hinweis')}>
            {/* Das Kuerzel ist immer lateinisch und gehoert zur Nummer,
                darum bleibt das Feld von links nach rechts. */}
            <Input
              dir="ltr"
              required
              maxLength={4}
              value={draft.short}
              onChange={(e) => setDraft((d) => (d ? { ...d, short: e.target.value.toUpperCase() } : d))}
              placeholder={t('bereiche.kuerzel_platzhalter')}
              className="w-32 font-mono text-2xl font-black uppercase"
            />
          </Field>

          <Field label={t('marken.symbol')} hint={t('begriff.optional')}>
            <div className="flex flex-wrap gap-2">
              {MARK_SYMBOLE.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setDraft((d) => (d ? { ...d, symbol: d.symbol === sym ? null : sym } : d))}
                  aria-label={t(`marken.symbol_${sym}`)}
                  title={t(`marken.symbol_${sym}`)}
                  aria-pressed={draft.symbol === sym}
                  className={cx(
                    'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition active:scale-95',
                    draft.symbol === sym
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised',
                  )}
                >
                  <MarkIcon symbol={sym} size={20} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDraft((d) => (d ? { ...d, symbol: null } : d))}
                aria-pressed={draft.symbol === null}
                className={cx(
                  'flex h-11 items-center rounded-xl border-2 px-3 text-[0.9375rem] font-bold transition active:scale-95',
                  draft.symbol === null ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink',
                )}
              >
                {t('marken.ohne_symbol')}
              </button>
            </div>
          </Field>

          <Field label={t('begriff.farbe')} hint={t('bereiche.farbe_hinweis')}>
            <ColorGrid value={draft.color} onChange={(color) => setDraft((d) => (d ? { ...d, color } : d))} />
          </Field>

          <div className="rounded-2xl border-2 border-line bg-raised px-3 py-4 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-muted">{t('bereiche.vorschau')}</p>
            <div className="mt-2 flex justify-center">
              <CodeChip code={`${(draft.short || t('bereiche.kuerzel_platzhalter')).toUpperCase()}-3-001`} size="xl" />
            </div>
          </div>

          <Field label={t('begriff.notiz')} hint={t('bereiche.notiz_hinweis')}>
            <Textarea
              rows={2}
              value={draft.note}
              onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
            />
          </Field>

          {error ? (
            <p className="rounded-xl border-2 border-danger/30 bg-danger/5 px-3 py-2.5 text-base font-bold text-danger">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}
    </Modal>
  )
}
