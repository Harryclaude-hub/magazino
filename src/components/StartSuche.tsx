import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Package, Search, X } from 'lucide-react'
import { BestandListe } from './BestandListe'
import { Badge, Button, Chip, CodeChip, Empty, ErrorBox, Input, Loading, SectionTitle, Spinner } from './ui'
import { inhaltSuchen, listBestand, listKategorien, listProjects } from '../lib/api'
import { fuzzyAbfrage, fuzzyIndex, normalisieren } from '../lib/fuzzy'
import { useSprache } from '../lib/i18n'
import type { Bestand, Project, SuchTreffer } from '../lib/types'

/* Suchen auf dem Start (E105, E109): eine Leiste, optional Bereiche als Filter
 * (eine Zeile, seitlich wischbar), Treffer als dichte Zeilen; Tippen oeffnet
 * das Blatt mit "Mitnehmen". Die Daten (Bestand und Bereiche aller
 * Lager, die man sieht) werden einmal geladen und dann im Browser mit der
 * toleranten Suche (fuzzy.ts) gefiltert. Kisten kommen ueber die vorhandene
 * Datenbanksuche dazu. Auch Suche.tsx nutzt useProdukte und ProduktListe. */

const WARTEN_MS = 250
/** So viele Produkte zeigt eine Liste. */
const MAX_PRODUKTE = 200
/** So viele Kisten zeigt der Start. */
const MAX_KISTEN = 5

/** Ein Ding aus dem Bestand mit dem Lager und dem Bereich, in dem es liegt. */
export interface Produkt {
  b: Bestand
  lager: string
  bereich: string | null
  /** Normalisierter Bereichsname, gleiche Namen in verschiedenen Lagern sind einer. */
  bereichKey: string | null
}

export interface BereichName {
  key: string
  name: string
}

export interface BestandDaten {
  produkte: Produkt[]
  /** Alle Bereiche aller Lager, nach Namen zusammengefasst. */
  bereiche: BereichName[]
}

/** Bestand und Bereiche aller genannten Lager holen. Ohne Angabe: alle, die
 *  man sieht. Ein Fehler wird geworfen, nie verschluckt. */
export async function ladeBestandDaten(lager?: Project[]): Promise<BestandDaten> {
  const liste = lager ?? (await listProjects()).map((l) => l.project)
  const teile = await Promise.all(
    liste.map(async (p) => {
      const [bestand, kat] = await Promise.all([listBestand(p.id), listKategorien(p.id)])
      return { p, bestand, kat }
    }),
  )
  const produkte: Produkt[] = []
  const bereiche = new Map<string, string>()
  for (const { p, bestand, kat } of teile) {
    for (const k of kat) {
      const key = normalisieren(k.name)
      if (key && !bereiche.has(key)) bereiche.set(key, k.name.trim())
    }
    for (const b of bestand) {
      const k = kat.find((x) => x.id === b.kategorie_id)
      produkte.push({ b, lager: p.name, bereich: k?.name ?? null, bereichKey: k ? normalisieren(k.name) || null : null })
    }
  }
  const namen = [...bereiche].map(([key, name]) => ({ key, name })).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return { produkte, bereiche: namen }
}

/** Laedt den Bestand, sobald aktiv. vorgabe: schon bekannte Lager (spart eine
 *  Abfrage); null heisst "noch nicht da", dann wird gewartet. neu() laedt
 *  nochmal, die alten Daten bleiben bis dahin stehen. */
export function useProdukte(aktiv: boolean, vorgabe?: Project[] | null) {
  const [daten, setDaten] = useState<BestandDaten | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [nr, setNr] = useState(0)
  const vorgabeRef = useRef(vorgabe)
  useEffect(() => {
    vorgabeRef.current = vorgabe
  })
  const warten = vorgabe === null
  const schluessel = vorgabe ? vorgabe.map((p) => p.id).join(',') : ''

  useEffect(() => {
    if (!aktiv || warten) return
    let alive = true
    setLaedt(true)
    setFehler(null)
    ladeBestandDaten(vorgabeRef.current ?? undefined)
      .then((d) => {
        if (alive) setDaten(d)
      })
      .catch((err: unknown) => {
        if (alive) setFehler(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLaedt(false)
      })
    return () => {
      alive = false
    }
  }, [aktiv, warten, schluessel, nr])

  return { daten, laedt: laedt || (aktiv && warten), fehler, neu: () => setNr((n) => n + 1) }
}

/** Die Felder eines Dings fuer die tolerante Suche. Der Name zaehlt am meisten. */
export function produktIndex(produkte: Produkt[]) {
  return fuzzyIndex(produkte, (p) => [
    p.b.name,
    { text: p.bereich ?? '', gewicht: 0.5 },
    { text: p.b.ort ?? '', gewicht: 0.5 },
    { text: p.lager, gewicht: 0.4 },
  ])
}

/* ------------------------------------------------------ Treffer-Liste */

/** Treffer als dichte Zeilen. Tippen oeffnet das Blatt (Mitnehmen, Im
 *  Bestand oeffnen); nach einer Buchung ruft sie onGeaendert (zum Neuladen). */
export function ProduktListe({
  treffer,
  lagerZeigen = true,
  onGeaendert,
}: {
  treffer: Produkt[]
  lagerZeigen?: boolean
  onGeaendert: () => void
}) {
  const nav = useNavigate()
  return (
    <BestandListe
      zeilen={treffer}
      lagerZeigen={lagerZeigen}
      suche
      tabelle={false}
      onGeaendert={onGeaendert}
      onOeffnen={(p) => nav(`/app/p/${p.b.project_id}/bestand?q=${encodeURIComponent(p.b.name)}`)}
    />
  )
}

/* ----------------------------------------------------------- Die Suche */

/** Suchleiste, Bereichsfilter, Knoepfe und Treffer. Solange nichts gesucht
 *  und kein Bereich gewaehlt ist, steht children darunter (die Karten). */
export function StartSuche({
  projekte,
  knoepfe,
  children,
}: {
  /** Die Lager, die man sieht. null: noch nicht geladen. */
  projekte: Project[] | null
  /** Die grossen Knoepfe zwischen Filter und Inhalt. */
  knoepfe?: ReactNode
  children?: ReactNode
}) {
  const { t } = useSprache()
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [wort, setWort] = useState('')
  const [gewaehlt, setGewaehlt] = useState<string[]>([])
  const feld = useRef<HTMLInputElement>(null)

  // Das Wort folgt dem Feld mit kurzer Verzoegerung.
  useEffect(() => {
    const zeit = window.setTimeout(() => setWort(text.trim()), WARTEN_MS)
    return () => window.clearTimeout(zeit)
  }, [text])

  const { daten, laedt, fehler, neu } = useProdukte(true, projekte)
  const index = useMemo(() => produktIndex(daten?.produkte ?? []), [daten])

  const sucht = wort.length >= 2
  const gefiltert = gewaehlt.length > 0
  const aktiv = sucht || gefiltert

  const produkte = useMemo(() => {
    if (!daten || !aktiv) return { liste: [] as Produkt[], mehr: false }
    const alle = fuzzyAbfrage(index, sucht ? wort : '')
      .map((x) => x.item)
      .filter((p) => !gefiltert || (p.bereichKey !== null && gewaehlt.includes(p.bereichKey)))
    return { liste: alle.slice(0, MAX_PRODUKTE), mehr: alle.length > MAX_PRODUKTE }
  }, [daten, index, aktiv, sucht, wort, gefiltert, gewaehlt])

  /* Kisten ueber die Datenbanksuche. Eine alte Antwort, die nach einer
   * neueren kommt, wird verworfen. */
  const [kisten, setKisten] = useState<SuchTreffer[]>([])
  const [kistenLaedt, setKistenLaedt] = useState(false)
  const [kistenFehler, setKistenFehler] = useState<string | null>(null)
  const [kistenNr, setKistenNr] = useState(0)
  useEffect(() => {
    if (!sucht) {
      setKisten([])
      setKistenFehler(null)
      setKistenLaedt(false)
      return
    }
    let alive = true
    setKistenLaedt(true)
    setKistenFehler(null)
    inhaltSuchen(wort, 30)
      .then((alle) => {
        // Moebel gibt es in Magazino nicht mehr; alte Eintraege bleiben stumm.
        if (alive) setKisten(alle.filter((z) => z.item_kind !== 'furniture'))
      })
      .catch((err: unknown) => {
        if (!alive) return
        setKisten([])
        setKistenFehler(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setKistenLaedt(false)
      })
    return () => {
      alive = false
    }
  }, [sucht, wort, kistenNr])

  const kistenSichtbar = useMemo(
    () =>
      kisten.filter((z) => !gefiltert || (z.room_name !== null && gewaehlt.includes(normalisieren(z.room_name)))),
    [kisten, gefiltert, gewaehlt],
  )

  function umschalten(key: string) {
    setGewaehlt((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))
  }

  function absenden(e: FormEvent) {
    e.preventDefault()
    setWort(text.trim())
    feld.current?.blur()
  }

  const mehrereLager = (projekte?.length ?? 0) > 1
  const bereiche = daten?.bereiche ?? []
  const nichts =
    aktiv &&
    daten !== null &&
    produkte.liste.length === 0 &&
    kistenSichtbar.length === 0 &&
    !kistenLaedt &&
    !kistenFehler

  return (
    <>
      <form role="search" onSubmit={absenden} className="relative mb-3">
        <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          data-tour="start-suche"
          ref={feld}
          type="search"
          enterKeyHint="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('lager.suche_platzhalter')}
          aria-label={t('suche.feld')}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 ps-11 pe-12 text-[1.0625rem] [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button
            type="button"
            onClick={() => {
              setText('')
              setWort('')
              feld.current?.focus()
            }}
            aria-label={t('suche.leeren')}
            title={t('suche.leeren')}
            className="absolute end-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-raised hover:text-ink"
          >
            <X size={20} />
          </button>
        ) : null}
      </form>

      {bereiche.length > 0 ? (
        <div
          role="group"
          aria-label={t('lager.start_bereiche')}
          className="-mx-3 mb-4 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          <Chip active={!gefiltert} onClick={() => setGewaehlt([])}>
            {t('aktion.alle')}
          </Chip>
          {bereiche.map((b) => (
            <Chip key={b.key} active={gewaehlt.includes(b.key)} onClick={() => umschalten(b.key)}>
              {b.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {knoepfe}

      {!aktiv ? (
        children
      ) : (
        <div className="space-y-5" aria-live="polite">
          {fehler ? <ErrorBox error={fehler} onRetry={neu} /> : null}
          {!daten && !fehler ? <Loading label={t('zustand.laedt')} /> : null}

          {produkte.liste.length > 0 ? (
            <section>
              <SectionTitle action={laedt ? <Spinner /> : null}>{t('lager.suche_produkte')}</SectionTitle>
              <ProduktListe treffer={produkte.liste} lagerZeigen={mehrereLager} onGeaendert={neu} />
              {produkte.mehr ? <p className="t-sub mt-3">{t('lager.start_mehr')}</p> : null}
            </section>
          ) : null}

          {sucht && (kistenSichtbar.length > 0 || kistenFehler) ? (
            <section>
              <SectionTitle action={kistenLaedt ? <Spinner /> : null}>{t('lager.suche_kisten')}</SectionTitle>
              {kistenFehler ? <ErrorBox error={kistenFehler} onRetry={() => setKistenNr((n) => n + 1)} /> : null}
              <ul className="lz overflow-hidden rounded-karte bg-surface">
                {kistenSichtbar.slice(0, MAX_KISTEN).map((z) => (
                  <li key={z.content_id} className="lz-li">
                    <KistenZeile
                      z={z}
                      onTipp={() => nav(`/app/p/${z.project_id}/kisten/${z.item_id}?inhalt=${z.content_id}`)}
                    />
                  </li>
                ))}
              </ul>
              {kistenSichtbar.length > MAX_KISTEN ? (
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => nav(`/app/suche?q=${encodeURIComponent(wort)}`)}
                >
                  {t('lager.suche_kisten')} ({kistenSichtbar.length})
                </Button>
              ) : null}
            </section>
          ) : null}

          {nichts ? <Empty icon={<Search size={30} />} zeichnung="keine" title={t('zustand.nichts_gefunden')} /> : null}
        </div>
      )}
    </>
  )
}

function KistenZeile({ z, onTipp }: { z: SuchTreffer; onTipp: () => void }) {
  const { t } = useSprache()
  return (
    <button
      type="button"
      onClick={onTipp}
      className="lz-zeile flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-start"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-raised text-muted">
        <Package size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold leading-tight">
          {z.menge > 1 ? <span className="t-serial">{z.menge}x </span> : null}
          {z.inhalt}
        </span>
        <span className="block truncate text-[0.8125rem] leading-snug text-muted">{z.project_name}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <CodeChip code={z.item_code} size="sm" />
        <Badge color={z.room_color ?? undefined}>{z.room_name ?? t('lager.bestand_ohne_bereich')}</Badge>
      </span>
      <ChevronRight size={16} className="spiegeln -ms-1 shrink-0 text-muted/60" aria-hidden="true" />
    </button>
  )
}
