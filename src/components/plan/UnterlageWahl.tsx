import { Check } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import type { Unterlage } from '../../lib/geometrie'
import type { GrundrissDaten, Objekt } from '../../lib/types'
import { cx } from '../../lib/util'
import { FachAnsicht } from './FachAnsicht'
import { insel, objektName } from './lage'

/* Worauf die Kiste an der getippten Stelle steht (Handy, START 5.7):
 * Boden, eine der Kisten dort, das Moebel dort, oder Regal bzw. Schrank
 * und dann das Fach. Die Liste kommt fertig aus unterlagenAn
 * (lib/geometrie.ts); was nicht passt, bleibt sichtbar, ist aber
 * ausgegraut und sagt, warum. Entscheiden tut die Datenbank beim
 * Speichern.
 *
 * Grosse Knoepfe (mindestens 56 px hoch), ein Tipp waehlt. Regale zeigen
 * ihre Vorderansicht (Tipp auf ein Fach waehlt es) und darunter dieselben
 * Faecher noch einmal als Knoepfe, weil ein kleines Fach im Bild schwer
 * zu treffen ist.
 */

/** Eindeutiger Schluessel einer Unterlage, auch ueber Neuberechnungen. */
export function unterlageSchluessel(u: Unterlage): string {
  return `${u.art}-${u.itemId ?? u.objektId ?? ''}-${u.ebene ?? ''}-${u.spalte ?? ''}`
}

type Gruppe = { art: 'einzeln'; u: Unterlage } | { art: 'regal'; objekt: Objekt; faecher: Unterlage[] }

export function UnterlageWahl({
  daten,
  liste,
  wahl,
  onWahl,
}: {
  daten: GrundrissDaten
  liste: Unterlage[]
  /** Schluessel der gewaehlten Unterlage (unterlageSchluessel). */
  wahl: string | null
  onWahl: (schluessel: string) => void
}) {
  const { t } = useSprache()

  if (liste.length === 0) return <p className="t-sub">{t('platz.unterlage_leer')}</p>

  /* Faecher je Regal zusammenfassen, sonst die Reihenfolge der Liste. */
  const gruppen: Gruppe[] = []
  for (const u of liste) {
    if (u.art === 'fach' && u.objektId) {
      const da = gruppen.find((g) => g.art === 'regal' && g.objekt.id === u.objektId)
      if (da && da.art === 'regal') {
        da.faecher.push(u)
        continue
      }
      const o = daten.objekte.find((x) => x.id === u.objektId)
      if (o) {
        gruppen.push({ art: 'regal', objekt: o, faecher: [u] })
        continue
      }
    }
    gruppen.push({ art: 'einzeln', u })
  }

  function text(u: Unterlage): string {
    const von = u.unten_cm
    const bis = u.oben_cm
    const o = u.objektId ? daten.objekte.find((x) => x.id === u.objektId) : null
    if (u.art === 'fach') {
      const mitSpalte = (o?.spalten ?? u.spalte ?? 1) > 1
      return t(mitSpalte ? 'platz.fach_spalte' : 'platz.fach', { ebene: u.ebene ?? 0, spalte: u.spalte ?? 1, von, bis })
    }
    if (u.art === 'objekt' && o) return t('platz.auf_objekt', { name: objektName(t, o), von, bis })
    if (u.art === 'kiste') return t('platz.auf_kiste', { code: insel(u.text), von, bis })
    return t('platz.boden', { von, bis })
  }

  function knopf(u: Unterlage) {
    const s = unterlageSchluessel(u)
    const an = s === wahl
    return (
      <button
        key={s}
        type="button"
        disabled={!u.passt}
        aria-pressed={an}
        onClick={() => onWahl(s)}
        className={cx(
          'flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-start transition active:scale-[0.99]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          an ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:border-ink/35',
        )}
      >
        <span
          className={cx(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2',
            an ? 'border-paper bg-paper text-ink' : 'border-line',
          )}
          aria-hidden
        >
          {an ? <Check size={16} strokeWidth={3} /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold break-words">{text(u)}</span>
          {!u.passt ? (
            <span className="block text-sm font-semibold">{t('platz.passt_nicht', { grenze: u.grenze_cm })}</span>
          ) : null}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {gruppen.map((g) => {
        if (g.art === 'einzeln') return knopf(g.u)
        const gewaehlt = g.faecher.find((u) => unterlageSchluessel(u) === wahl) ?? null
        return (
          <div key={`regal-${g.objekt.id}`} className="space-y-2 rounded-2xl border-2 border-line bg-surface p-3">
            <p className="t-name">{t('platz.regal', { name: objektName(t, g.objekt) })}</p>
            <FachAnsicht
              objekt={g.objekt}
              kisten={daten.kisten}
              auswahl={gewaehlt ? { ebene: gewaehlt.ebene ?? 0, spalte: gewaehlt.spalte ?? 0 } : null}
              onFach={(e, s) => {
                const u = g.faecher.find((x) => x.ebene === e && x.spalte === s)
                if (u && u.passt) onWahl(unterlageSchluessel(u))
              }}
              maxHoehe="15rem"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {/* Von oben nach unten, wie man vor dem Regal steht. */}
              {[...g.faecher].sort((a, b) => (b.ebene ?? 0) - (a.ebene ?? 0) || (a.spalte ?? 0) - (b.spalte ?? 0)).map(knopf)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
