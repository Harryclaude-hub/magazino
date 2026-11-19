import { memo, useCallback, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Hash, MoreHorizontal, PackageMinus, PackagePlus, Pencil, Trash2, ArrowUpRight } from 'lucide-react'
import {
  AendernDialog,
  EntfernenDialog,
  MitnehmenDialog,
  ZugangDialog,
  ZustandPunkt,
} from './BestandDialoge'
import { MehrAnzeigen } from './MehrAnzeigen'
import { ProduktBild } from './ProduktBild'
import type { Produkt } from './StartSuche'
import { Button, Modal } from './ui'
import { useIstDesktop } from '../lib/desktop'
import { useFenster } from '../lib/fenster'
import { useT } from '../lib/i18n'
import { mengeText, zustandRang, zustandText, zustandVon } from '../lib/lager'
import { cx } from '../lib/util'
import type { LagerKategorie } from '../lib/types'

/* Die Liste fuer viele Dinge (Bestand, Suchtreffer): am Handy dichte Zeilen im
 * Inset-Grouped-Stil (eine Zeile ca. 60 px), am Computer (ab lg) eine Tabelle
 * mit sortierbaren Spalten. Tippen auf eine Zeile oeffnet ein Blatt mit den
 * Aktionen, nie drei Knoepfe je Zeile. Gezeigt wird stueckweise (MehrAnzeigen),
 * so bleibt auch eine Liste mit 1.000 Zeilen leicht. Die Dialoge gehoeren
 * dazu; nach einer Buchung ruft die Liste onGeaendert (zum Neuladen). */

type Offen = { art: 'mitnehmen' | 'zugang' | 'auffuellen' | 'zaehlen' | 'aendern' | 'entfernen'; p: Produkt } | null
type SortKey = 'name' | 'menge' | 'zustand'
type Sortierung = { key: SortKey; richtung: 'auf' | 'ab' } | null

const KOLLATOR = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

function vergleich(key: SortKey): (a: Produkt, b: Produkt) => number {
  if (key === 'menge') return (a, b) => a.b.menge - b.b.menge || KOLLATOR.compare(a.b.name, b.b.name)
  if (key === 'zustand') return (a, b) => zustandRang(a.b) - zustandRang(b.b) || KOLLATOR.compare(a.b.name, b.b.name)
  return (a, b) => KOLLATOR.compare(a.b.name, b.b.name)
}

function ortZeile(p: Produkt, lagerZeigen: boolean): string {
  return [lagerZeigen ? p.lager : null, p.bereich, p.b.ort].filter(Boolean).join(' · ')
}

/* ----------------------------------------------------------- Zeilen (Handy) */

const Zeile = memo(function Zeile({
  p,
  lagerZeigen,
  suche,
  onTipp,
}: {
  p: Produkt
  lagerZeigen: boolean
  suche: boolean
  onTipp: (p: Produkt) => void
}) {
  const t = useT()
  const ort = ortZeile(p, lagerZeigen)
  const leer = zustandVon(p.b) === 'leer'
  return (
    <li className="lz-li">
      <button
        type="button"
        onClick={() => onTipp(p)}
        className="lz-zeile flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-start"
      >
        <ProduktBild pfad={p.b.bild_pfad} groesse={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold leading-tight">{p.b.name}</span>
          {ort ? <span className="block truncate text-[0.8125rem] leading-snug text-muted">{ort}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={cx('text-end text-base font-bold tabular-nums', leer && 'text-muted')} dir="ltr">
            {mengeText(p.b.menge)} <span className="text-[0.8125rem] font-medium text-muted">{p.b.einheit}</span>
          </span>
          <ZustandPunkt b={p.b} />
          <span className="sr-only">{zustandText(p.b, t, suche)}</span>
        </span>
        <ChevronRight size={16} className="spiegeln -ms-1 shrink-0 text-muted/60" aria-hidden="true" />
      </button>
    </li>
  )
})

/* --------------------------------------------------------- Tabelle (Computer) */

function SortKopf({
  label,
  key_,
  sort,
  onSort,
  rechts,
}: {
  label: string
  key_: SortKey
  sort: Sortierung
  onSort: (k: SortKey) => void
  rechts?: boolean
}) {
  const an = sort?.key === key_
  const Icon = !an ? ArrowUpDown : sort.richtung === 'auf' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={an ? (sort.richtung === 'auf' ? 'ascending' : 'descending') : 'none'} className={cx('lt-kopf', rechts ? 'text-end' : 'text-start')}>
      <button
        type="button"
        onClick={() => onSort(key_)}
        className={cx('lt-sort inline-flex items-center gap-1.5', rechts && 'flex-row-reverse', an ? 'text-ink' : 'text-muted')}
      >
        {label}
        <Icon size={14} aria-hidden="true" className={an ? '' : 'opacity-50'} />
      </button>
    </th>
  )
}

const TabellenZeile = memo(function TabellenZeile({
  p,
  lagerZeigen,
  suche,
  onTipp,
  onMitnehmen,
}: {
  p: Produkt
  lagerZeigen: boolean
  suche: boolean
  onTipp: (p: Produkt) => void
  onMitnehmen: (p: Produkt) => void
}) {
  const t = useT()
  const leer = zustandVon(p.b) === 'leer'

  function taste(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTipp(p)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const ziel = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling
      if (ziel instanceof HTMLElement) ziel.focus()
    }
  }

  return (
    <tr tabIndex={0} onClick={() => onTipp(p)} onKeyDown={taste} className="lt-zeile">
      <td className="w-14 ps-4">
        <ProduktBild pfad={p.b.bild_pfad} groesse={40} />
      </td>
      <td className="min-w-[12rem]">
        <span className="block font-semibold">{p.b.name}</span>
      </td>
      {lagerZeigen ? <td className="text-muted">{p.lager}</td> : null}
      <td className="text-muted">{p.bereich ?? ''}</td>
      <td className="text-muted">{p.b.ort ?? ''}</td>
      <td className={cx('text-end font-bold tabular-nums', leer && 'text-muted')} dir="ltr">
        {mengeText(p.b.menge)} <span className="text-[0.8125rem] font-medium text-muted">{p.b.einheit}</span>
      </td>
      <td>
        <span className="inline-flex items-center gap-2 whitespace-nowrap text-[0.9375rem]">
          <ZustandPunkt b={p.b} />
          {zustandText(p.b, t, suche)}
        </span>
      </td>
      <td className="pe-4">
        <span className="flex items-center justify-end gap-1.5">
          {leer ? null : (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onMitnehmen(p)
              }}
            >
              {t('lager.mitnehmen')}
            </Button>
          )}
          <button
            type="button"
            aria-label={t('lager.mehr_aktionen')}
            title={t('lager.mehr_aktionen')}
            onClick={(e) => {
              e.stopPropagation()
              onTipp(p)
            }}
            className="knopf grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-feld hover:text-ink"
          >
            <MoreHorizontal size={20} />
          </button>
        </span>
      </td>
    </tr>
  )
})

/* ------------------------------------------------------------- Aktionsblatt */

function BlattZeile({
  icon,
  children,
  onClick,
  gefahr,
}: {
  icon: ReactNode
  children: ReactNode
  onClick: () => void
  gefahr?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cx(
          'bl-zeile flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start text-base font-medium',
          gefahr ? 'text-danger' : 'text-ink',
        )}
      >
        <span className={gefahr ? 'text-danger' : 'text-accent'}>{icon}</span>
        {children}
      </button>
    </li>
  )
}

function Aktionsblatt({
  p,
  lagerZeigen,
  suche,
  canEdit,
  kannAendern,
  onAktion,
  onOeffnen,
  onClose,
}: {
  p: Produkt
  lagerZeigen: boolean
  suche: boolean
  canEdit: boolean
  kannAendern: boolean
  onAktion: (art: NonNullable<Offen>['art']) => void
  onOeffnen?: () => void
  onClose: () => void
}) {
  const t = useT()
  const leer = zustandVon(p.b) === 'leer'
  const ort = ortZeile(p, lagerZeigen)
  const eintraege: ReactNode[] = []
  if (canEdit && !leer) {
    eintraege.push(
      <BlattZeile key="zugang" icon={<PackagePlus size={20} />} onClick={() => onAktion('zugang')}>
        {t('lager.zugang')}
      </BlattZeile>,
      <BlattZeile key="zaehlen" icon={<Hash size={20} />} onClick={() => onAktion('zaehlen')}>
        {t('lager.zaehlen')}
      </BlattZeile>,
    )
  }
  if (canEdit && leer) {
    eintraege.push(
      <BlattZeile key="auffuellen" icon={<PackagePlus size={20} />} onClick={() => onAktion('auffuellen')}>
        {t('lager.auffuellen')}
      </BlattZeile>,
    )
  }
  if (canEdit && kannAendern) {
    eintraege.push(
      <BlattZeile key="aendern" icon={<Pencil size={20} />} onClick={() => onAktion('aendern')}>
        {t('aktion.bearbeiten')}
      </BlattZeile>,
    )
  }
  if (canEdit && leer) {
    eintraege.push(
      <BlattZeile key="entfernen" icon={<Trash2 size={20} />} gefahr onClick={() => onAktion('entfernen')}>
        {t('aktion.entfernen')}
      </BlattZeile>,
    )
  }
  if (onOeffnen) {
    eintraege.push(
      <BlattZeile key="oeffnen" icon={<ArrowUpRight size={20} />} onClick={onOeffnen}>
        {t('lager.im_bestand_oeffnen')}
      </BlattZeile>,
    )
  }
  return (
    <Modal open onClose={onClose} title={p.b.name}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ProduktBild pfad={p.b.bild_pfad} groesse={56} />
          <div className="min-w-0 flex-1">
            {ort ? <p className="t-sub break-words">{ort}</p> : null}
            <p className="mt-0.5 flex items-center gap-2 text-[0.9375rem] font-semibold">
              <ZustandPunkt b={p.b} />
              {zustandText(p.b, t, suche)}
            </p>
          </div>
          <p className={cx('shrink-0 text-end text-3xl font-black tabular-nums', leer && 'text-muted')} dir="ltr">
            {mengeText(p.b.menge)} <span className="text-base font-bold text-muted">{p.b.einheit}</span>
          </p>
        </div>
        {leer ? null : (
          <Button size="lg" full onClick={() => onAktion('mitnehmen')}>
            <PackageMinus size={20} /> {t('lager.mitnehmen')}
          </Button>
        )}
        {eintraege.length > 0 ? <ul className="bl-liste overflow-hidden rounded-[14px] bg-feld">{eintraege}</ul> : null}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------- Liste */

export function BestandListe({
  zeilen,
  lagerZeigen = false,
  canEdit = false,
  kategorien,
  suche = false,
  tabelle = true,
  onGeaendert,
  onOeffnen,
}: {
  zeilen: Produkt[]
  /** Das Lager in der Nebenzeile nennen (mehrere Lager gemischt). */
  lagerZeigen?: boolean
  /** Zugang, Zaehlen, Auffuellen, Entfernen, Bearbeiten anbieten. */
  canEdit?: boolean
  /** Fuer Bearbeiten (Bereiche zur Wahl). Ohne sie gibt es kein Bearbeiten. */
  kategorien?: LagerKategorie[]
  /** In der Suche heisst leer "gibt es nicht mehr". */
  suche?: boolean
  /** Am Computer als Tabelle. Aus: auch dort dichte Zeilen. */
  tabelle?: boolean
  /** Nach jeder Buchung: neu laden. */
  onGeaendert: () => void
  /** Im Blatt "Im Bestand oeffnen". Ohne gibt es die Zeile nicht. */
  onOeffnen?: (p: Produkt) => void
}) {
  const t = useT()
  const desktop = useIstDesktop()
  const alsTabelle = tabelle && desktop
  const [sort, setSort] = useState<Sortierung>(null)
  const [blatt, setBlatt] = useState<Produkt | null>(null)
  const [offen, setOffen] = useState<Offen>(null)

  const sortiert = useMemo(() => {
    if (!sort) return zeilen
    const f = vergleich(sort.key)
    const kopie = [...zeilen].sort(f)
    return sort.richtung === 'ab' ? kopie.reverse() : kopie
  }, [zeilen, sort])
  const { n, mehr } = useFenster(sortiert)
  const sichtbar = useMemo(() => sortiert.slice(0, n), [sortiert, n])

  const tippen = useCallback((p: Produkt) => setBlatt(p), [])
  const mitnehmen = useCallback((p: Produkt) => setOffen({ art: 'mitnehmen', p }), [])
  const klickSort = useCallback(
    (key: SortKey) =>
      setSort((s) => (!s || s.key !== key ? { key, richtung: 'auf' } : s.richtung === 'auf' ? { key, richtung: 'ab' } : null)),
    [],
  )

  const fertig = () => {
    setOffen(null)
    onGeaendert()
  }

  return (
    <>
      {alsTabelle ? (
        <div className="overflow-hidden rounded-karte border border-line bg-surface">
          <table className="lt w-full border-collapse text-start text-[0.9375rem]">
            <thead>
              <tr>
                <th scope="col" className="w-14 text-start">
                  <span className="sr-only">{t('lager.foto')}</span>
                </th>
                <SortKopf label={t('lager.produkt')} key_="name" sort={sort} onSort={klickSort} />
                {lagerZeigen ? (
                  <th scope="col" className="lt-kopf text-start text-muted">
                    {t('lager.suche_lager')}
                  </th>
                ) : null}
                <th scope="col" className="lt-kopf text-start text-muted">
                  {t('lager.bereich')}
                </th>
                <th scope="col" className="lt-kopf text-start text-muted">
                  {t('lager.ort_kurz')}
                </th>
                <SortKopf label={t('lager.menge')} key_="menge" sort={sort} onSort={klickSort} rechts />
                <SortKopf label={t('lager.zustand')} key_="zustand" sort={sort} onSort={klickSort} />
                <th scope="col">
                  <span className="sr-only">{t('lager.aktionen')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((p) => (
                <TabellenZeile
                  key={p.b.id}
                  p={p}
                  lagerZeigen={lagerZeigen}
                  suche={suche}
                  onTipp={tippen}
                  onMitnehmen={mitnehmen}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="lz overflow-hidden rounded-karte bg-surface">
          {sichtbar.map((p) => (
            <Zeile key={p.b.id} p={p} lagerZeigen={lagerZeigen} suche={suche} onTipp={tippen} />
          ))}
        </ul>
      )}
      <MehrAnzeigen rest={sortiert.length - n} n={n} onMehr={mehr} />

      {blatt ? (
        <Aktionsblatt
          p={blatt}
          lagerZeigen={lagerZeigen}
          suche={suche}
          canEdit={canEdit}
          kannAendern={kategorien !== undefined}
          onClose={() => setBlatt(null)}
          onAktion={(art) => {
            setOffen({ art, p: blatt })
            setBlatt(null)
          }}
          onOeffnen={
            onOeffnen
              ? () => {
                  const p = blatt
                  setBlatt(null)
                  onOeffnen(p)
                }
              : undefined
          }
        />
      ) : null}

      {offen?.art === 'mitnehmen' ? <MitnehmenDialog b={offen.p.b} onClose={() => setOffen(null)} onFertig={fertig} /> : null}
      {offen?.art === 'zugang' ? <ZugangDialog b={offen.p.b} art="zugang" onClose={() => setOffen(null)} onFertig={fertig} /> : null}
      {offen?.art === 'auffuellen' ? (
        <ZugangDialog b={offen.p.b} art="zugang" auffuellen onClose={() => setOffen(null)} onFertig={fertig} />
      ) : null}
      {offen?.art === 'zaehlen' ? (
        <ZugangDialog b={offen.p.b} art="korrektur" onClose={() => setOffen(null)} onFertig={fertig} />
      ) : null}
      {offen?.art === 'entfernen' ? <EntfernenDialog b={offen.p.b} onClose={() => setOffen(null)} onFertig={fertig} /> : null}
      {offen?.art === 'aendern' && kategorien ? (
        <AendernDialog b={offen.p.b} kategorien={kategorien} onClose={() => setOffen(null)} onFertig={fertig} />
      ) : null}
    </>
  )
}
