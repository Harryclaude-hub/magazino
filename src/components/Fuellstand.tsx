import { useState } from 'react'
import { useT } from '../lib/i18n'
import { FUELL_SCHRITT, FUELL_STUFEN, fuellFarbe } from '../lib/fuellstand'
import { cx } from '../lib/util'

/* Fuellstand (0033): Anzeige als Balken mit Prozentzahl und Eingabe mit
 * grossen Tipp-Knoepfen plus feinem Regler.
 *
 * Die Zahl steht neben dem Balken in Tinte, nie auf der Farbe: so haelt
 * ihr Kontrast in hell und dunkel, egal wie voll. Der Balken selbst hat
 * einen Rand, damit auch "0 %" (leer, aber angegeben) sichtbar bleibt und
 * sich von "nicht angegeben" unterscheidet. Gespeichert wird nichts hier,
 * die Seite bekommt den neuen Wert (onWert) und speichert ueber api.ts.
 */

export function FuellBalken({
  wert,
  groesse = 'mittel',
  ohneWert = 'text',
  className,
}: {
  wert: number | null | undefined
  groesse?: 'klein' | 'mittel' | 'gross'
  /** Was ohne Angabe erscheint: der Satz "nicht angegeben" oder nichts. */
  ohneWert?: 'text' | 'nichts'
  className?: string
}) {
  const t = useT()
  if (wert === null || wert === undefined) {
    return ohneWert === 'text' ? (
      <span className={cx('t-sub', className)}>{t('fuellstand.nicht_angegeben')}</span>
    ) : null
  }
  const breite = groesse === 'klein' ? 'w-14' : groesse === 'gross' ? 'w-full min-w-0 flex-1' : 'w-20'
  const hoehe = groesse === 'gross' ? 'h-3.5' : groesse === 'klein' ? 'h-2' : 'h-2.5'
  return (
    <span
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={wert}
      aria-label={t('fuellstand.aria', { n: wert })}
      className={cx('inline-flex items-center gap-2', groesse === 'gross' && 'flex w-full', className)}
    >
      <span className={cx('relative block shrink-0 overflow-hidden rounded-full border border-line bg-raised', breite, hoehe)}>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 block rounded-full"
          style={{ width: `${wert}%`, background: fuellFarbe(wert) }}
        />
      </span>
      <span
        className={cx(
          'shrink-0 whitespace-nowrap font-bold tabular-nums',
          groesse === 'klein' ? 'text-sm' : groesse === 'gross' ? 'text-lg' : 'text-[0.9375rem]',
        )}
      >
        {t('fuellstand.prozent', { n: wert })}
      </span>
    </span>
  )
}

export function FuellstandWahl({
  wert,
  onWert,
  disabled,
}: {
  wert: number | null
  onWert: (v: number | null) => void
  disabled?: boolean
}) {
  const t = useT()
  /* Waehrend der Regler gezogen wird, nur zeigen; gespeichert wird beim
   * Loslassen, sonst ginge jeder 5er-Schritt einzeln an die Datenbank. */
  const [zieh, setZieh] = useState<number | null>(null)
  const anzeige = zieh ?? wert

  function fertig() {
    if (zieh === null) return
    const v = zieh
    setZieh(null)
    if (v !== wert) onWert(v)
  }

  return (
    <div className="grid gap-3">
      <FuellBalken wert={anzeige} groesse="gross" />
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={t('fuellstand.titel')}>
        {FUELL_STUFEN.map((s) => {
          const an = wert === s && zieh === null
          return (
            <button
              key={s}
              type="button"
              disabled={disabled}
              aria-pressed={an}
              onClick={() => onWert(s)}
              className={cx(
                'knopf flex min-h-14 flex-col items-center justify-center gap-1 rounded-knopf border-2 px-1 py-1.5 font-bold leading-none transition',
                'disabled:cursor-not-allowed disabled:opacity-45',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                an ? 'border-ink bg-ink text-paper' : 'border-line bg-raised text-ink hover:border-ink/25',
              )}
            >
              <span className="whitespace-nowrap tabular-nums">{t('fuellstand.prozent', { n: s })}</span>
              {s === 0 || s === 100 ? (
                <span className="text-xs font-black">{t(s === 0 ? 'fuellstand.leer' : 'fuellstand.voll')}</span>
              ) : null}
              <span aria-hidden="true" className="block h-1.5 w-7 rounded-full" style={{ background: fuellFarbe(s) }} />
            </button>
          )
        })}
      </div>
      <label className="grid gap-1">
        <span className="text-sm font-bold text-muted">{t('fuellstand.regler')}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={FUELL_SCHRITT}
          value={anzeige ?? 0}
          disabled={disabled}
          onChange={(e) => setZieh(Number(e.target.value))}
          onPointerUp={fertig}
          onKeyUp={fertig}
          onBlur={fertig}
          aria-valuetext={anzeige === null ? t('fuellstand.nicht_angegeben') : t('fuellstand.prozent', { n: anzeige })}
          className="fuell-regler h-11 w-full cursor-pointer disabled:cursor-not-allowed"
        />
      </label>
      {wert !== null ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setZieh(null)
            onWert(null)
          }}
          className="min-h-11 justify-self-start rounded-knopf px-2 text-[0.9375rem] font-bold text-muted underline underline-offset-4 hover:text-ink disabled:opacity-45"
        >
          {t('fuellstand.zuruecksetzen')}
        </button>
      ) : null}
    </div>
  )
}
