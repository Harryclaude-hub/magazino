import { Link, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useSprache } from '../lib/i18n'
import { groessenArt } from '../lib/arten'
import {
  eigeneGroesseMasse,
  groesseSatz,
  hatLiter,
  literText,
  useKistenGroessen,
} from '../lib/groessen'
import type { EigeneGroesse, ItemKind } from '../lib/types'

/** Die Groesse 1 bis 10. Bei Kisten steht unter jeder Ziffer, wie viele
 *  Liter sie fasst, bei Moebeln bleibt es beim Wort. Die Liter kommen aus
 *  der Datenbank; solange sie fehlen, steht nur die Ziffer da.
 *
 *  Darunter die eigenen Groessen des Umzugs der passenden Art (Kiste oder
 *  Moebel), wenn die Seite sie mitgibt. Ein Tipp waehlt eine eigene
 *  Groesse, noch ein Tipp oder eine Stufe waehlt sie ab. Die Stufe einer
 *  eigenen Groesse setzt die Datenbank; hier wird sie nie gerechnet.
 *
 *  eigene: undefined = ohne eigene Groessen, null = laedt, sonst die Liste.
 */
export function SizePicker({
  value,
  onChange,
  kind = 'box',
  eigene,
  eigeneFehler = null,
  eigeneId = null,
  onEigene,
  onEigeneNochmal,
}: {
  value: number
  onChange: (v: number) => void
  kind?: ItemKind
  eigene?: EigeneGroesse[] | null
  eigeneFehler?: string | null
  eigeneId?: string | null
  onEigene?: (id: string | null) => void
  onEigeneNochmal?: () => void
}) {
  const { t, lang } = useSprache()
  const { pid } = useParams()
  const tabelle = useKistenGroessen()
  const mitLiter = hatLiter(kind) && tabelle !== null
  const mitEigenen = eigene !== undefined && onEigene !== undefined
  const art = groessenArt(kind)
  /* Die gewaehlte bleibt sichtbar, auch wenn sie zur anderen Art gehoert
   * (etwa nach einem Wechsel der Kistenart). */
  const passende = (eigene ?? []).filter((g) => g.art === art || g.id === eigeneId)
  const gewaehlteEigene = eigeneId ? ((eigene ?? []).find((g) => g.id === eigeneId) ?? null) : null
  const stufeAktiv = !eigeneId
  const gewaehlt = mitLiter && stufeAktiv ? tabelle.get(value) : undefined

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const g = mitLiter ? tabelle.get(n) : undefined
          const an = stufeAktiv && value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                // Die Seite setzt in onChange auch die eigene Groesse zurueck.
                // Zwei Aufrufe hier wurden in ItemDetail zu zwei Speichervorgaengen.
                onChange(n)
              }}
              aria-label={
                g
                  ? t('kisten.groesse_knopf_liter', { n, liter: literText(g.liter, lang) })
                  : t('kisten.groesse_knopf', { n, wort: t(`groesse.${n}`) })
              }
              aria-pressed={an}
              className={`flex w-full min-w-0 flex-col items-center justify-center rounded-xl border-2 font-mono transition active:scale-95 ${
                g ? 'h-14' : 'h-12'
              } ${
                an
                  ? 'border-danger bg-danger text-paper'
                  : 'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised'
              }`}
            >
              <span className="text-lg font-black leading-none">{n}</span>
              {g ? (
                <span dir="ltr" className="mt-1 text-xs font-bold leading-none opacity-80">
                  {literText(g.liter, lang)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {mitEigenen ? (
        <div className="mt-3">
          <p className="mb-2 text-sm font-bold text-muted">{t('kisten.eigene_groesse')}</p>
          {eigeneFehler ? (
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-danger">
              <span className="min-w-0">{eigeneFehler}</span>
              {onEigeneNochmal ? (
                <button
                  type="button"
                  onClick={onEigeneNochmal}
                  className="rounded-lg border-2 border-line px-2.5 py-1 font-bold text-ink hover:bg-raised"
                >
                  {t('aktion.nochmal')}
                </button>
              ) : null}
            </p>
          ) : eigene === null ? (
            <div className="flex flex-wrap gap-2" aria-busy="true" aria-label={t('zustand.laedt')}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-12 w-36 animate-pulse rounded-xl border-2 border-line bg-raised" />
              ))}
            </div>
          ) : passende.length === 0 ? (
            pid ? (
              <Link
                to={`/app/p/${pid}/groessen`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-ink underline underline-offset-2"
              >
                <Plus size={15} /> {t('groessen.eigene_anlegen')}
              </Link>
            ) : (
              <p className="t-sub">{t('groessen.eigene_leer')}</p>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              {passende.map((g) => {
                const an = g.id === eigeneId
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={an}
                    onClick={() => onEigene?.(an ? null : g.id)}
                    className={`flex min-w-0 max-w-full flex-col items-start rounded-xl border-2 px-3 py-2 text-start transition active:scale-95 ${
                      an
                        ? 'border-danger bg-danger text-paper'
                        : 'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised'
                    }`}
                  >
                    <span className="max-w-full truncate text-[0.9375rem] font-black leading-tight">
                      {g.name}
                    </span>
                    <span className="t-serial mt-0.5 text-xs font-bold opacity-80">
                      {eigeneGroesseMasse(t, g)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      <p className="t-sub mt-2.5">
        {gewaehlteEigene ? (
          <>
            {gewaehlteEigene.name} (<span className="t-serial">{eigeneGroesseMasse(t, gewaehlteEigene)}</span>).{' '}
            {t('groessen.stufe_setzt_db')}
          </>
        ) : (
          <>
            {groesseSatz(t, lang, value, kind, tabelle)}
            {gewaehlt
              ? `, ${t('groesse.mass', { l: gewaehlt.laenge_cm, b: gewaehlt.breite_cm, h: gewaehlt.hoehe_cm })}`
              : null}
            . {t('kisten.groesse_hinweis')}
          </>
        )}
      </p>
    </div>
  )
}
