import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Field, Input, Modal } from '../ui'
import { useSprache } from '../../lib/i18n'
import { brettListeLesen, zahlLesen } from '../../lib/raumplan'
import type { RegalWerte } from '../../lib/api'
import type { Regal } from '../../lib/types'

/* Ein Regal aufstellen oder aendern.
 *
 * Der Dialog faengt bei jedem Oeffnen von vorn an. Ein Dialog, der den
 * Stand vom letzten Mal behaelt, hat hier schon einmal acht Kisten
 * orange gefaerbt.
 *
 * Stehen Kisten auf dem Regal, laesst die Datenbank nur den Namen
 * aendern (0022). Darum sind die anderen Felder dann gesperrt und es
 * steht dabei, warum.
 */

function vorschlagBretter(hoehe: number): number[] {
  const out: number[] = []
  for (let h = 0; h < hoehe; h += 40) out.push(h)
  return out
}

export function RegalDialog({
  offen,
  regal,
  x,
  y,
  zimmerHoehe,
  belegt,
  busy,
  onSpeichern,
  onLoeschen,
  onClose,
}: {
  offen: boolean
  /** Das vorhandene Regal, oder null zum Aufstellen an (x, y). */
  regal: Regal | null
  x: number
  y: number
  zimmerHoehe: number
  /** Stehen Kisten darauf? Dann laesst sich nur der Name aendern. */
  belegt: boolean
  busy: boolean
  onSpeichern: (werte: RegalWerte) => Promise<void>
  onLoeschen: (() => void) | null
  onClose: () => void
}) {
  const { t } = useSprache()
  const [name, setName] = useState('')
  const [breite, setBreite] = useState('1')
  const [tiefe, setTiefe] = useState('1')
  const [hoehe, setHoehe] = useState('200')
  const [bretter, setBretter] = useState('')
  const [fehler, setFehler] = useState<Partial<Record<'breite' | 'tiefe' | 'hoehe' | 'bretter', string>>>({})

  useEffect(() => {
    if (!offen) return
    const h = regal?.hoehe_cm ?? Math.min(200, zimmerHoehe)
    setName(regal?.name ?? '')
    setBreite(String(regal?.breite ?? 1))
    setTiefe(String(regal?.tiefe ?? 1))
    setHoehe(String(h))
    setBretter((regal?.boeden_cm ?? vorschlagBretter(h)).join(', '))
    setFehler({})
  }, [offen, regal, zimmerHoehe])

  function pruefen(): RegalWerte | null {
    const f: typeof fehler = {}
    const b = zahlLesen(breite)
    const ti = zahlLesen(tiefe)
    const h = zahlLesen(hoehe)
    const liste = brettListeLesen(bretter)
    const ganz = (z: number | null) => z !== null && Number.isInteger(z) && z >= 1 && z <= 40
    if (!ganz(b)) f.breite = t('raumplan.feld_bereich_zellen', { min: 1, max: 40 })
    if (!ganz(ti)) f.tiefe = t('raumplan.feld_bereich_zellen', { min: 1, max: 40 })
    const hMax = Math.min(600, zimmerHoehe)
    if (h === null || h < 20 || h > hMax) f.hoehe = t('raumplan.feld_bereich_cm', { min: 20, max: hMax })
    if (
      !liste ||
      liste.length === 0 ||
      liste.length > 20 ||
      liste.some((v, i) => v < 0 || (h !== null && v >= h) || (i > 0 && v <= liste[i - 1]))
    ) {
      f.bretter = t('raumplan.regal_boeden_fehler')
    }
    setFehler(f)
    if (Object.keys(f).length > 0 || b === null || ti === null || h === null || !liste) return null
    return {
      name: name.trim(),
      x: regal?.x ?? x,
      y: regal?.y ?? y,
      breite: b,
      tiefe: ti,
      hoehe_cm: Math.round(h),
      boeden_cm: liste,
    }
  }

  const nurName = regal !== null && belegt

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={regal ? t('raumplan.regal_bearbeiten') : t('raumplan.regal_neu')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              if (nurName && regal) {
                void onSpeichern({
                  name: name.trim(),
                  x: regal.x,
                  y: regal.y,
                  breite: regal.breite,
                  tiefe: regal.tiefe,
                  hoehe_cm: regal.hoehe_cm,
                  boeden_cm: regal.boeden_cm,
                })
                return
              }
              const v = pruefen()
              if (v) void onSpeichern(v)
            }}
          >
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {nurName ? (
          <p className="rounded-xl bg-raised p-3 text-base">{t('raumplan.regal_belegt_hinweis')}</p>
        ) : null}
        <Field label={t('raumplan.regal_name')}>
          <Input
            value={name}
            maxLength={60}
            placeholder={t('raumplan.regal_name_platzhalter')}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('raumplan.regal_breite')} error={fehler.breite}>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={breite}
              disabled={nurName}
              onChange={(e) => setBreite(e.target.value)}
              className="t-serial"
            />
          </Field>
          <Field label={t('raumplan.regal_tiefe')} error={fehler.tiefe}>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={tiefe}
              disabled={nurName}
              onChange={(e) => setTiefe(e.target.value)}
              className="t-serial"
            />
          </Field>
          <Field label={t('raumplan.regal_hoehe')} error={fehler.hoehe}>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={hoehe}
              disabled={nurName}
              onChange={(e) => setHoehe(e.target.value)}
              className="t-serial"
            />
          </Field>
        </div>
        <Field
          label={t('raumplan.regal_boeden')}
          hint={t('raumplan.regal_boeden_hinweis')}
          error={fehler.bretter}
        >
          <Input
            dir="ltr"
            value={bretter}
            disabled={nurName}
            onChange={(e) => setBretter(e.target.value)}
            className="t-serial"
          />
        </Field>
        {/* Wegnehmen steht im Dialog, nicht in der Fusszeile: drei Knoepfe
            nebeneinander passten auf dem Handy nicht, und dieser fiel aus
            dem Bild. */}
        {onLoeschen ? (
          <div className="border-t border-line pt-3">
            <Button variant="ghost" onClick={onLoeschen}>
              <Trash2 size={16} /> {t('raumplan.regal_loeschen')}
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
