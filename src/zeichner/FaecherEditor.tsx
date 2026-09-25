import { useEffect, useState } from 'react'
import { FachAnsicht } from '../components/plan/FachAnsicht'
import { Button, Chip, Input } from '../components/ui'
import {
  abstaendeAusFaechern,
  brettListeLesen,
  faecherAusAbstaenden,
  faecherGleichmaessig,
  faecherGueltig,
} from '../lib/geometrie'
import { useSprache } from '../lib/i18n'
import type { ObjektArt } from '../lib/types'

/* Faecher eines Regals oder Schranks festlegen (START 4.2: jedes Fach darf
 * anders hoch sein).
 *   Abstaende: lichte Hoehen von unten nach oben, "30, 35, 35, 40". Daraus
 *              ergeben sich die Bretter und die Hoehe (2 cm Brett).
 *   Gleichmaessig: n Faecher in der jetzigen Hoehe.
 * Dazu die Spalten (1 bis 20). Die Vorderansicht zeigt das Ergebnis live;
 * uebernommen wird erst mit "Uebernehmen".
 */

export interface Faecher {
  brett_cm: number[]
  hoehe_cm: number
  spalten: number
}

export function FaecherEditor({
  wert,
  breite_cm,
  name,
  art,
  onSetzen,
}: {
  wert: Faecher
  breite_cm: number
  name: string
  art: ObjektArt
  onSetzen: (f: Faecher) => void
}) {
  const { t } = useSprache()
  const [modus, setModus] = useState<'abstaende' | 'gleich'>('abstaende')
  const [abstaende, setAbstaende] = useState('')
  const [anzahl, setAnzahl] = useState('')
  const [spalten, setSpalten] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  /* Bei neuem Wert (anderes Objekt, gespeichert) die Felder frisch fuellen. */
  const schluessel = `${wert.brett_cm.join(',')}|${wert.hoehe_cm}|${wert.spalten}`
  useEffect(() => {
    setAbstaende(abstaendeAusFaechern(wert.brett_cm, wert.hoehe_cm).join(', '))
    setAnzahl(String(wert.brett_cm.length))
    setSpalten(String(wert.spalten))
    setFehler(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel])

  function entwurf(): Faecher | string {
    const s = Number.parseInt(spalten, 10)
    if (!Number.isInteger(s) || s < 1 || s > 20) return t('zeichner.faecher.spalten_fehler')
    if (modus === 'abstaende') {
      const liste = brettListeLesen(abstaende)
      if (!liste || liste.length < 1 || liste.length > 30 || liste.some((a) => a < 1)) {
        return t('zeichner.faecher.abstaende_fehler')
      }
      const f = faecherAusAbstaenden(liste)
      return { ...f, spalten: s }
    }
    const n = Number.parseInt(anzahl, 10)
    if (!Number.isInteger(n) || n < 1 || n > 30) return t('zeichner.faecher.anzahl_fehler')
    return { ...faecherGleichmaessig(n, wert.hoehe_cm), spalten: s }
  }

  const e = entwurf()
  const gueltig = typeof e !== 'string' && faecherGueltig(e.brett_cm, e.hoehe_cm)
  const vorschau: Faecher = typeof e === 'string' || !gueltig ? wert : e

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip active={modus === 'abstaende'} onClick={() => setModus('abstaende')}>
          {t('zeichner.faecher.modus_abstaende')}
        </Chip>
        <Chip active={modus === 'gleich'} onClick={() => setModus('gleich')}>
          {t('zeichner.faecher.modus_gleich')}
        </Chip>
      </div>
      {modus === 'abstaende' ? (
        <label className="block">
          <span className="mb-1 block text-sm font-bold">{t('zeichner.faecher.abstaende')}</span>
          <Input
            dir="ltr"
            value={abstaende}
            onChange={(ev) => setAbstaende(ev.target.value)}
            placeholder="30, 35, 35, 40"
            className="t-serial py-2"
          />
          <span className="t-sub mt-1 block">{t('zeichner.faecher.abstaende_hilfe')}</span>
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-bold">{t('zeichner.faecher.anzahl')}</span>
          <Input dir="ltr" inputMode="numeric" value={anzahl} onChange={(ev) => setAnzahl(ev.target.value)} className="t-serial w-28 py-2" />
          <span className="t-sub mt-1 block">{t('zeichner.faecher.gleich_hilfe', { hoehe: wert.hoehe_cm })}</span>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-bold">{t('zeichner.faecher.spalten')}</span>
        <Input dir="ltr" inputMode="numeric" value={spalten} onChange={(ev) => setSpalten(ev.target.value)} className="t-serial w-28 py-2" />
      </label>

      <FachAnsicht
        objekt={{ breite_cm, hoehe_cm: vorschau.hoehe_cm, brett_cm: vorschau.brett_cm, spalten: vorschau.spalten, name, art }}
        maxHoehe="14rem"
      />
      {typeof e !== 'string' ? (
        <p className="t-sub">
          {t('zeichner.faecher.ergebnis', { n: e.brett_cm.length, hoehe: e.hoehe_cm })}
        </p>
      ) : null}
      {typeof e === 'string' ? (
        <p className="text-sm font-bold text-danger">{e}</p>
      ) : !gueltig ? (
        <p className="text-sm font-bold text-danger">{t('zeichner.faecher.ungueltig')}</p>
      ) : null}
      {fehler ? <p className="text-sm font-bold text-danger">{fehler}</p> : null}
      <Button
        size="sm"
        disabled={!gueltig}
        onClick={() => {
          if (typeof e === 'string' || !gueltig) {
            setFehler(t('zeichner.faecher.ungueltig'))
            return
          }
          onSetzen(e)
        }}
      >
        {t('zeichner.faecher.uebernehmen')}
      </Button>
    </div>
  )
}
