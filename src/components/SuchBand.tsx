import { MapPin, X } from 'lucide-react'
import { Ausschnitt } from './Ausschnitt'
import { useSprache } from '../lib/i18n'
import { rahmenVon } from '../lib/rahmen'
import type { ItemContent } from '../lib/types'

/* Das Band oben auf der Kisten- oder Moebelseite, wenn man aus der Suche
 * kommt (?inhalt=<id>): "Gesucht: Akkuschrauber, Schicht 2" mit dem
 * kleinen Bild (ein Tipp zeigt es im Foto), "Zum Lageplan" und X. Ist
 * der Eintrag nicht mehr in der Liste, sagt das Band das, statt still zu
 * verschwinden.
 */
export function SuchBand({
  eintrag,
  fotoUrl,
  onFoto,
  onLage,
  onWeg,
}: {
  /** Der gesuchte Eintrag, oder null, wenn es ihn hier nicht mehr gibt. */
  eintrag: ItemContent | null
  fotoUrl: string | null
  onFoto?: () => void
  /** Zum Lageplan unten auf der Seite; fehlt er, kein Knopf. */
  onLage?: () => void
  onWeg: () => void
}) {
  const { t } = useSprache()
  const mitBild = Boolean(eintrag && (eintrag.ausschnitt_pfad || (eintrag.photo_id && eintrag.box_x0 !== null)))
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-danger/45 bg-danger/8 p-3"
    >
      {eintrag && mitBild ? (
        <button
          type="button"
          onClick={onFoto}
          disabled={!onFoto || !eintrag.photo_id}
          aria-label={t('suche.im_foto')}
          className="shrink-0 transition active:scale-95"
        >
          <Ausschnitt
            pfad={eintrag.ausschnitt_pfad}
            fotoUrl={fotoUrl}
            rahmen={rahmenVon(eintrag)}
            groesse={56}
            alt={eintrag.text}
          />
        </button>
      ) : null}
      <p className="t-name min-w-0 flex-1 break-words">
        {eintrag
          ? eintrag.schicht
            ? t('suche.gesucht_schicht', { name: eintrag.text, n: eintrag.schicht })
            : t('suche.gesucht', { name: eintrag.text })
          : t('suche.eintrag_weg')}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {onLage ? (
          <button
            type="button"
            onClick={onLage}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-ink/25 bg-surface px-3 text-[0.9375rem] font-bold transition hover:border-ink/55 active:scale-95"
          >
            <MapPin size={17} /> {t('suche.zum_lageplan')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onWeg}
          aria-label={t('suche.band_weg')}
          title={t('suche.band_weg')}
          className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink/15 bg-surface transition hover:border-ink/40 active:scale-95"
        >
          <X size={19} />
        </button>
      </div>
    </div>
  )
}
