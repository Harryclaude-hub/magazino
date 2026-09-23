import { useState } from 'react'
import { Button, Card, Field, Input } from '../ui'
import { useSprache } from '../../lib/i18n'
import { rasterMasse, zahlLesen } from '../../lib/raumplan'
import type { Raumplan } from '../../lib/types'

/* Masse eines Zimmers eingeben.
 *
 * Jedes Feld wird geprueft, bevor gespeichert wird, und ein Fehler steht
 * am Feld, auf Deutsch oder Arabisch. Nie ein stiller Ersatzwert: wer
 * "2,5x" tippt, bekommt keinen Plan mit 4 Metern, sondern einen Hinweis.
 * Arabisch-indische Ziffern und der arabische Dezimaltrenner zaehlen wie
 * westliche.
 *
 * Die Grenzen sind dieselben wie in der Datenbank (0017 und 0022). Die
 * Datenbank prueft sie noch einmal; hier stehen sie, damit man den Grund
 * vorher liest.
 */

export interface PlanWerte {
  breite_cm: number
  tiefe_cm: number
  hoehe_cm: number
  raster_cm: number
}

interface Grenze {
  min: number
  max: number
}

const BREITE: Grenze = { min: 0.5, max: 20 }
const HOEHE: Grenze = { min: 0.5, max: 6 }
const RASTER: Grenze = { min: 25, max: 200 }
const MAX_ZELLEN = 2500

function meter(cm: number): string {
  return String(Math.round(cm) / 100)
}

export function PlanFormular({
  werte,
  busy,
  rasterFest,
  onSpeichern,
  onAbbrechen,
}: {
  /** Der vorhandene Plan, oder null beim Anlegen. */
  werte: Raumplan | null
  busy: boolean
  /** Steht schon etwas im Plan, bleibt die Zellgroesse, wie sie ist. */
  rasterFest: boolean
  onSpeichern: (v: PlanWerte) => Promise<void>
  onAbbrechen: (() => void) | null
}) {
  const { t } = useSprache()
  const [breite, setBreite] = useState(meter(werte?.breite_cm ?? 400))
  const [tiefe, setTiefe] = useState(meter(werte?.tiefe_cm ?? 400))
  const [hoehe, setHoehe] = useState(meter(werte?.hoehe_cm ?? 250))
  const [raster, setRaster] = useState(String(werte?.raster_cm ?? 50))
  const [fehler, setFehler] = useState<Partial<Record<keyof PlanWerte | 'zellen', string>>>({})

  function pruefen(): PlanWerte | null {
    const f: Partial<Record<keyof PlanWerte | 'zellen', string>> = {}
    const b = zahlLesen(breite)
    const ti = zahlLesen(tiefe)
    const h = zahlLesen(hoehe)
    const r = zahlLesen(raster)
    const imBereich = (z: number | null, g: Grenze, feld: keyof PlanWerte, einheit: 'm' | 'cm') => {
      if (z === null) f[feld] = t('raumplan.feld_zahl')
      else if (z < g.min || z > g.max)
        f[feld] = t(einheit === 'm' ? 'raumplan.feld_bereich_m' : 'raumplan.feld_bereich_cm', {
          min: g.min,
          max: g.max,
        })
    }
    imBereich(b, BREITE, 'breite_cm', 'm')
    imBereich(ti, BREITE, 'tiefe_cm', 'm')
    imBereich(h, HOEHE, 'hoehe_cm', 'm')
    imBereich(r, RASTER, 'raster_cm', 'cm')
    if (Object.keys(f).length === 0 && b !== null && ti !== null && r !== null) {
      const { spalten, reihen } = rasterMasse({
        breite_cm: Math.round(b * 100),
        tiefe_cm: Math.round(ti * 100),
        raster_cm: Math.round(r),
      })
      if (spalten * reihen > MAX_ZELLEN) f.zellen = t('raumplan.feld_zu_viele_zellen', { n: spalten * reihen })
    }
    setFehler(f)
    if (Object.keys(f).length > 0 || b === null || ti === null || h === null || r === null) return null
    return {
      breite_cm: Math.round(b * 100),
      tiefe_cm: Math.round(ti * 100),
      hoehe_cm: Math.round(h * 100),
      raster_cm: Math.round(r),
    }
  }

  return (
    <Card className="mb-4 space-y-4 p-5">
      <div>
        <p className="t-name">{t('raumplan.einrichten_titel')}</p>
        <p className="t-sub mt-1.5">{t('raumplan.einrichten_text')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('raumplan.breite')} error={fehler.breite_cm}>
          <Input
            inputMode="decimal"
            dir="ltr"
            value={breite}
            onChange={(e) => setBreite(e.target.value)}
            className="t-serial"
          />
        </Field>
        <Field label={t('raumplan.tiefe')} error={fehler.tiefe_cm}>
          <Input
            inputMode="decimal"
            dir="ltr"
            value={tiefe}
            onChange={(e) => setTiefe(e.target.value)}
            className="t-serial"
          />
        </Field>
        <Field label={t('raumplan.hoehe')} error={fehler.hoehe_cm}>
          <Input
            inputMode="decimal"
            dir="ltr"
            value={hoehe}
            onChange={(e) => setHoehe(e.target.value)}
            className="t-serial"
          />
        </Field>
      </div>
      <Field
        label={t('raumplan.raster')}
        hint={rasterFest ? t('raumplan.raster_fest_hinweis') : t('raumplan.raster_hinweis')}
        error={fehler.raster_cm ?? fehler.zellen}
      >
        <Input
          inputMode="numeric"
          dir="ltr"
          value={raster}
          disabled={rasterFest}
          onChange={(e) => setRaster(e.target.value)}
          className="t-serial"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          loading={busy}
          onClick={() => {
            const v = pruefen()
            if (v) void onSpeichern(v)
          }}
        >
          {werte ? t('aktion.speichern') : t('raumplan.anlegen')}
        </Button>
        {onAbbrechen ? (
          <Button variant="ghost" size="lg" onClick={onAbbrechen}>
            {t('aktion.abbrechen')}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
