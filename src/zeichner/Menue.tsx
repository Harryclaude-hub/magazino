import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Info, Move, Pencil, RotateCw, Scaling, Trash2 } from 'lucide-react'
import { Button, ErrorBox, Field, Input, Modal } from '../components/ui'
import { useSprache } from '../lib/i18n'
import { cx } from '../lib/util'

/* Rechtsklick-Menue des Zeichners (Auswahl). Verschieben und Groesse
 * aendern gibt es nur ueber dieses Menue: ein Linksklick waehlt nur aus, so
 * rutscht nichts mehr aus Versehen. */

export type MenueAktion = 'bearbeiten' | 'verschieben' | 'drehen' | 'umbenennen' | 'eigenschaften' | 'loeschen'

const SYMBOL: Record<MenueAktion, typeof Move> = {
  bearbeiten: Scaling,
  verschieben: Move,
  drehen: RotateCw,
  umbenennen: Pencil,
  eigenschaften: Info,
  loeschen: Trash2,
}

export function KontextMenue({
  x,
  y,
  aktionen,
  onWahl,
  onClose,
}: {
  x: number
  y: number
  aktionen: MenueAktion[]
  onWahl: (a: MenueAktion) => void
  onClose: () => void
}) {
  const { t } = useSprache()
  const ref = useRef<HTMLDivElement>(null)
  const [lage, setLage] = useState({ x, y })

  // Im sichtbaren Bereich halten.
  useEffect(() => {
    const el = ref.current
    const eltern = el?.parentElement
    if (!el || !eltern) return
    const w = eltern.clientWidth
    const h = eltern.clientHeight
    setLage({ x: Math.min(x, w - el.offsetWidth - 8), y: Math.min(y, h - el.offsetHeight - 8) })
  }, [x, y])

  // Esc und Klick daneben schliessen.
  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', taste, true)
    return () => window.removeEventListener('keydown', taste, true)
  }, [onClose])

  return (
    <>
      <div
        className="absolute inset-0 z-20"
        onPointerDown={(e) => {
          e.stopPropagation()
          onClose()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        ref={ref}
        role="menu"
        className="absolute z-30 min-w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl"
        style={{ left: Math.max(8, lage.x), top: Math.max(8, lage.y) }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {aktionen.map((a) => {
          const Zeichen = SYMBOL[a]
          return (
            <button
              key={a}
              type="button"
              role="menuitem"
              onClick={() => onWahl(a)}
              className={cx(
                'flex w-full items-center gap-2.5 px-3 py-2 text-start text-[0.9375rem] font-bold hover:bg-raised',
                a === 'loeschen' ? 'text-danger' : 'text-ink',
              )}
            >
              <Zeichen size={16} />
              {t(`zeichner.menue.${a}`)}
            </button>
          )
        })}
      </div>
    </>
  )
}

export function UmbenennenDialog({
  offen,
  start,
  onClose,
  onSpeichern,
}: {
  offen: boolean
  start: string
  onClose: () => void
  onSpeichern: (name: string) => Promise<void>
}) {
  const { t } = useSprache()
  const [name, setName] = useState(start)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  // Beim Oeffnen zuruecksetzen.
  useEffect(() => {
    if (!offen) return
    setName(start)
    setBusy(false)
    setFehler(null)
  }, [offen, start])

  async function speichern(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      setFehler(t('zeichner.menue.name_fehlt'))
      return
    }
    setBusy(true)
    try {
      await onSpeichern(n)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('zeichner.menue.umbenennen')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="umbenennen-form" type="submit" loading={busy}>
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <form id="umbenennen-form" onSubmit={(e) => void speichern(e)} className="space-y-3">
        {fehler ? <ErrorBox error={fehler} /> : null}
        <Field label={t('zeichner.menue.name')} hint={t('zeichner.menue.name_hinweis')}>
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </form>
    </Modal>
  )
}
