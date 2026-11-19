import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, Crosshair, DoorOpen, ExternalLink, X } from 'lucide-react'
import { Button, Card, CodeChip, IconButton } from './ui'
import { FuellBalken } from './Fuellstand'
import { MarkIcon } from './Mark'
import { TagTile, zielFuerItem } from './ItemRow'
import { useSprache } from '../lib/i18n'
import { groesseSatz, useKistenGroessen } from '../lib/groessen'
import { markFlaeche } from '../lib/marken'
import type { Item, Tag } from '../lib/types'
import { cx } from '../lib/util'

/* Kistenliste am Computer: Tabelle mit sortierbaren Spalten und daneben
 * die gewaehlte Kiste als Vorschau (START 5.9a).
 *
 * Reine Darstellung. Beide lesen nur, was die Liste schon geladen hat;
 * hier steht keine Abfrage. Sortiert wird im Browser ueber die geladenen
 * Zeilen, die Reihenfolge der Datenbank bleibt der Ausgangspunkt. Das
 * Handy zeigt weiter die Zeilen aus ItemRow.
 */

type Spalte = 'nummer' | 'bereich' | 'groesse' | 'fuellstand' | 'platz'

type TagVon = (id: string | null | undefined) => Tag | undefined

function platzWort(item: Item, t: (k: string) => string): string | null {
  if (!item.platz_raum_id) return null
  switch (item.unterlage_art) {
    case 'kiste':
      return t('kisten.platz_auf_kiste')
    case 'objekt':
      return t('plan.moebel')
    case 'fach':
      return t('plan.regal')
    default:
      return t('plan.boden')
  }
}

export function KistenTabelle({
  rows,
  tagById,
  bereichName,
  gewaehltId,
  onWaehlen,
  unvollstaendig,
}: {
  rows: Item[]
  tagById: TagVon
  /** Name des Bereichs zu einem Kuerzel (room_id). */
  bereichName: (tagId: string | null) => string
  gewaehltId: string | null
  onWaehlen: (id: string) => void
  /** Es gibt mehr Eintraege, als geladen sind. */
  unvollstaendig: boolean
}) {
  const { t } = useSprache()
  const [sort, setSort] = useState<{ spalte: Spalte; richtung: 1 | -1 } | null>(null)

  const sortiert = useMemo(() => {
    if (!sort) return rows
    const wert = (i: Item): string | number => {
      switch (sort.spalte) {
        case 'nummer':
          return `${i.prefix}\u0000${String(i.seq).padStart(6, '0')}`
        case 'bereich':
          return i.room_id ? bereichName(i.room_id).toLocaleLowerCase() : '￿'
        case 'groesse':
          return i.size
        case 'fuellstand':
          // Ohne Angabe ans Ende (aufsteigend), wie leere Zimmer.
          return i.fuellstand ?? 1000
        case 'platz':
          return i.platz_raum_id ? (i.unterlage_art ?? 'boden') : '￿'
      }
    }
    return [...rows].sort((a, b) => {
      const x = wert(a)
      const y = wert(b)
      const v = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return v * sort.richtung
    })
  }, [rows, sort, bereichName])

  function umschalten(spalte: Spalte) {
    setSort((s) =>
      !s || s.spalte !== spalte ? { spalte, richtung: 1 } : s.richtung === 1 ? { spalte, richtung: -1 } : null,
    )
  }

  const kopf = (spalte: Spalte, text: string, klasse = '') => {
    const aktiv = sort?.spalte === spalte
    const Pfeil = !aktiv ? ArrowUpDown : sort.richtung === 1 ? ArrowUp : ArrowDown
    return (
      <th
        scope="col"
        aria-sort={aktiv ? (sort.richtung === 1 ? 'ascending' : 'descending') : 'none'}
        className={cx('px-2 py-0 text-start', klasse)}
      >
        <button
          type="button"
          onClick={() => umschalten(spalte)}
          title={t('kisten.sortieren_nach', { spalte: text })}
          className={cx(
            'tabelle-kopf inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-black uppercase tracking-wider transition',
            aktiv ? 'text-ink' : 'text-muted hover:bg-raised hover:text-ink',
          )}
        >
          {text}
          <Pfeil size={14} aria-hidden="true" className={aktiv ? '' : 'opacity-50'} />
        </button>
      </th>
    )
  }

  return (
    <>
      <Card className="scrollbar-thin overflow-x-auto">
        <table className="kisten-tabelle w-full border-collapse text-start">
          <thead className="border-b-2 border-line bg-surface">
            <tr>
              {kopf('nummer', t('kisten.spalte_nummer'), 'ps-3')}
              {kopf('bereich', t('begriff.bereich'))}
              {kopf('groesse', t('begriff.groesse'))}
              {kopf('fuellstand', t('fuellstand.spalte'))}
              {kopf('platz', t('kisten.spalte_platz'), 'pe-3')}
            </tr>
          </thead>
          <tbody className="zebra">
            {sortiert.map((item) => {
              const room = tagById(item.room_id)
              const streifen = item.mark_color ?? room?.color ?? '#94a3b8'
              const gewaehlt = gewaehltId === item.id
              const platz = platzWort(item, t)
              const klick = () => onWaehlen(item.id)
              return (
                <tr
                  key={item.id}
                  onClick={klick}
                  aria-selected={gewaehlt}
                  data-gewaehlt={gewaehlt || undefined}
                  style={{ '--mark': markFlaeche(item.mark_color) } as CSSProperties}
                  className="tabelle-zeile cursor-pointer border-b border-line last:border-b-0 data-gewaehlt:*:bg-ink/[0.08]"
                >
                  <td className="py-2.5 ps-3 pe-2 align-middle">
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: streifen }} />
                      <span className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            klick()
                          }}
                          aria-pressed={gewaehlt}
                          className="block rounded-lg text-start"
                        >
                          <CodeChip code={item.code} size="md" />
                        </button>
                        <span className="mt-1 flex max-w-[9rem] items-center gap-1.5 truncate text-[0.9375rem] font-semibold xl:max-w-[11rem] 2xl:max-w-[20rem]">
                          {item.mark_symbol ? <MarkIcon symbol={item.mark_symbol} size={14} /> : null}
                          <span className="truncate">{item.title || t(`art.${item.kind}`)}</span>
                          {item.fragile ? (
                            <span className="shrink-0 rounded-md bg-warn/12 px-1.5 text-xs font-black text-warn">
                              {t('begriff.zerbrechlich')}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-1.5 align-middle">
                    {room ? (
                      <TagTile tag={{ ...room, name: bereichName(item.room_id) }} icon={<DoorOpen size={14} />} />
                    ) : (
                      <span className="t-sub">{t('lager.bestand_ohne_bereich')}</span>
                    )}
                  </td>
                  <td className="px-1.5 align-middle">
                    <span className="t-serial block text-xl leading-none">{item.size}</span>
                    <span className="t-sub mt-1 hidden whitespace-nowrap text-sm 2xl:block">{t(`groesse.${item.size}`)}</span>
                  </td>
                  <td className="px-1.5 align-middle">
                    {item.fuellstand != null ? (
                      <FuellBalken wert={item.fuellstand} groesse="klein" className="whitespace-nowrap" />
                    ) : (
                      <span className="t-sub" title={t('fuellstand.nicht_angegeben')}>
                        <span aria-hidden="true">–</span>
                        <span className="sr-only">{t('fuellstand.nicht_angegeben')}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 pe-3 align-middle">
                    {platz ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.9375rem] font-bold">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ok" />
                        {platz}
                      </span>
                    ) : (
                      <span className="t-sub whitespace-nowrap">{t('kisten.platz_nein')}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      {sort && unvollstaendig ? (
        <p className="t-sub mt-2">{t('kisten.sortiert_geladene', { n: rows.length })}</p>
      ) : null}
    </>
  )
}

/** Die gewaehlte Kiste rechts neben der Tabelle. Nur, was die Liste schon
 *  weiss; alles Weitere steht auf der Kistenseite. */
export function KistenVorschau({
  item,
  projectId,
  tagById,
  bereichName,
  canEdit,
  onSchliessen,
}: {
  item: Item | null
  projectId: string
  tagById: TagVon
  bereichName: (tagId: string | null) => string
  canEdit: boolean
  onSchliessen: () => void
}) {
  const { t, lang } = useSprache()
  const groessen = useKistenGroessen()
  const loc = useLocation()

  if (!item) {
    return (
      <Card className="vorschau px-5 py-10 text-center">
        <p className="t-sub">{t('kisten.vorschau_leer')}</p>
      </Card>
    )
  }

  const room = tagById(item.room_id)
  const farbe = item.mark_color ?? room?.color ?? '#94a3b8'
  const platz = platzWort(item, t)

  return (
    <Card className="vorschau animate-in overflow-hidden" style={{ backgroundColor: markFlaeche(item.mark_color) }}>
      <div className="h-2" style={{ background: farbe }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="t-serial text-[2.6rem] leading-none">
            {item.prefix}
            <span className="opacity-25">-</span>
            <span className="text-danger">{item.size}</span>
            <span className="opacity-25">-</span>
            {String(item.seq).padStart(3, '0')}
          </p>
          <IconButton label={t('kisten.vorschau_schliessen')} size="sm" onClick={onSchliessen}>
            <X size={18} />
          </IconButton>
        </div>
        <p className="t-name-lg mt-3 break-words">{item.title || t(`art.${item.kind}`)}</p>
        <p className="t-sub mt-1">{groesseSatz(t, lang, item.size, item.kind, groessen)}</p>

        <div className="mt-5 grid gap-3 border-t border-line pt-4">
          {room ? (
            <div className="flex flex-wrap gap-1.5">
              <TagTile tag={{ ...room, name: bereichName(item.room_id) }} icon={<DoorOpen size={14} />} />
            </div>
          ) : null}
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-muted">{t('kisten.spalte_platz')}</p>
            <p className="mt-0.5 text-base font-bold">{platz ?? t('kisten.platz_nein')}</p>
          </div>
          {item.fuellstand != null ? (
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-muted">{t('fuellstand.titel')}</p>
              <FuellBalken wert={item.fuellstand} className="mt-1" />
            </div>
          ) : null}
          {item.fragile ? (
            <p className="rounded-knopf bg-warn/12 px-3 py-2 text-base font-bold text-warn">
              {t('kisten.zerbrechlich_warnung')}
            </p>
          ) : null}
          {item.note ? (
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-muted">{t('begriff.notiz')}</p>
              <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap break-words text-base">{item.note}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2">
          <Link to={zielFuerItem(projectId, item)} className="block">
            <Button variant="outline" full>
              <ExternalLink size={17} /> {t('kisten.oeffnen')}
            </Button>
          </Link>
          {canEdit && item.kind !== 'furniture' ? (
            <Link
              to={`/app/p/${projectId}/kisten/${item.id}/platz`}
              state={{ zurueck: loc.pathname + loc.search }}
              className="block"
            >
              <Button variant="ghost" full>
                <Crosshair size={17} /> {platz ? t('lage.platz_aendern') : t('lage.platz_waehlen')}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
