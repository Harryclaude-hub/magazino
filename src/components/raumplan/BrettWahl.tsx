import { Button, Modal } from '../ui'
import { useSprache } from '../../lib/i18n'
import { passtDrauf, type Stapel } from '../../lib/raumplan'
import type { Regal } from '../../lib/types'
import { cx } from '../../lib/util'

/* Auf welches Brett eines Regals die Kiste in der Hand kommt.
 *
 * Die Bretter stehen von oben nach unten, so wie man vor dem Regal steht.
 * Zu jedem steht, was schon darauf ist und wie viel Platz noch bleibt.
 * Ein Brett, auf das die Kiste nicht mehr passt, laesst sich nicht
 * waehlen; die Datenbank wuerde sie ohnehin abweisen (0022).
 */
export function BrettWahl({
  offen,
  regal,
  code,
  hoehe,
  stapelAuf,
  onWahl,
  onClose,
}: {
  offen: boolean
  regal: Regal | null
  /** Die Kiste in der Hand. */
  code: string
  hoehe: number
  /** Der Stapel auf Brett n dieser Zelle, auch wenn er leer ist. */
  stapelAuf: (brett: number) => Stapel
  onWahl: (brett: number) => void
  onClose: () => void
}) {
  const { t } = useSprache()
  if (!regal) return null
  const bretter = regal.boeden_cm.map((_, i) => i + 1).reverse()

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('raumplan.brett_waehlen')}
      footer={
        <Button variant="ghost" onClick={onClose}>
          {t('aktion.abbrechen')}
        </Button>
      }
    >
      <p className="t-sub mb-3">
        <span className="t-serial" dir="ltr">
          {code}
        </span>{' '}
        . {t('raumplan.stapel_hoehe', { h: hoehe })}
      </p>
      <div className="grid gap-2">
        {bretter.map((n) => {
          const s = stapelAuf(n)
          const passt = passtDrauf(s, hoehe)
          const frei = Math.max(0, s.grenze - s.oben)
          return (
            <button
              key={n}
              type="button"
              disabled={!passt}
              onClick={() => onWahl(n)}
              className={cx(
                'flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border-2 px-4 py-3 text-start transition active:scale-[0.99]',
                passt
                  ? 'border-line bg-surface hover:border-ink/40 hover:bg-raised'
                  : 'cursor-not-allowed border-line bg-raised opacity-60',
              )}
            >
              <span className="t-name">{t('raumplan.brett_n', { n })}</span>
              <span className="t-sub">{t('raumplan.brett_hoehe', { h: s.grund })}</span>
              <span className="w-full text-sm">
                {s.kisten.length === 0 ? (
                  <span className="text-muted">{t('raumplan.brett_leer')}</span>
                ) : (
                  <span className="t-serial" dir="ltr">
                    {s.kisten.map((k) => k.item.code).join('  ')}
                  </span>
                )}
              </span>
              <span className={cx('w-full text-sm font-bold', passt ? 'text-ok' : 'text-danger')}>
                {passt
                  ? t('raumplan.frei_bis', {
                      frei,
                      grenze:
                        n === regal.boeden_cm.length
                          ? t('raumplan.bis_decke')
                          : t('raumplan.bis_brett'),
                    })
                  : t('raumplan.brett_voll')}
              </span>
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
