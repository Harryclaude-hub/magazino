import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Plus, Search, Settings2, X } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { BestandListe } from '../components/BestandListe'
import { BereicheDialog, NeuDialog } from '../components/BestandDialoge'
import type { Produkt } from '../components/StartSuche'
import { Button, Chip, Empty, ErrorBox, Input, Loading } from '../components/ui'
import { useProject } from './ProjectLayout'
import { listBestand, listKategorien } from '../lib/api'
import { normalisieren } from '../lib/fuzzy'
import { useT } from '../lib/i18n'
import { zustandVon } from '../lib/lager'
import { useAsync } from '../lib/util'
import type { LagerKategorie } from '../lib/types'

const OHNE = '__ohne__'
const KNAPP = '__knapp__'
const LEER = '__leer__'

type Offen = 'neu' | 'bereiche' | null

/* Bestand (E103, E105, E109): was da ist, was knapp ist, was leer ist.
 * Eine schlanke Leiste oben (Suche, Chips in einer Zeile), darunter dichte
 * Zeilen am Handy und eine Tabelle am Computer (BestandListe). Aktionen
 * stehen im Blatt hinter jeder Zeile. Jede Buchung laeuft ueber die
 * Datenbankfunktion; danach wird neu geladen. */
export default function Bestand() {
  const { project, canEdit } = useProject()
  const t = useT()
  const pid = project.id
  const [params] = useSearchParams()

  const daten = useAsync(async () => {
    const [bestand, kategorien] = await Promise.all([listBestand(pid), listKategorien(pid)])
    return { bestand, kategorien }
  }, [pid])

  const [filter, setFilter] = useState<string>('')
  // Aus der Suche kommt man mit ?q=<Name>.
  const [suche, setSuche] = useState(params.get('q') ?? '')
  const such = useDeferredValue(suche)
  const [offen, setOffen] = useState<Offen>(null)

  const bestand = useMemo(() => daten.data?.bestand ?? [], [daten.data])
  const kategorien = useMemo<LagerKategorie[]>(() => daten.data?.kategorien ?? [], [daten.data])

  /* Alles Rechnerische einmal je Laden: Produkte mit Bereichsnamen und der
   * normalisierte Suchtext (Umlaute und Gross/Klein egal). */
  const produkte = useMemo<{ p: Produkt; text: string; z: ReturnType<typeof zustandVon> }[]>(() => {
    const name = new Map(kategorien.map((k) => [k.id, k.name]))
    return bestand.map((b) => {
      const bereich = b.kategorie_id ? (name.get(b.kategorie_id) ?? null) : null
      return {
        p: { b, lager: project.name, bereich, bereichKey: bereich ? normalisieren(bereich) : null },
        text: normalisieren(`${b.name} ${b.ort ?? ''} ${bereich ?? ''}`),
        z: zustandVon(b),
      }
    })
  }, [bestand, kategorien, project.name])

  const anzahlKnapp = useMemo(() => produkte.filter((x) => x.z === 'knapp').length, [produkte])
  const anzahlLeer = useMemo(() => produkte.filter((x) => x.z === 'leer').length, [produkte])
  const gibtOhne = useMemo(() => bestand.some((b) => b.kategorie_id === null), [bestand])

  const sichtbar = useMemo(() => {
    const q = normalisieren(such)
    return produkte
      .filter(({ p, text, z }) => {
        if (filter === KNAPP && z !== 'knapp') return false
        if (filter === LEER && z !== 'leer') return false
        if (filter === OHNE && p.b.kategorie_id !== null) return false
        if (filter && filter !== KNAPP && filter !== LEER && filter !== OHNE && p.b.kategorie_id !== filter) return false
        if (q && !text.includes(q)) return false
        return true
      })
      .map((x) => x.p)
  }, [produkte, filter, such])

  const schliessen = () => setOffen(null)

  return (
    <>
      <AppHeader
        title={t('lager.bestand_titel')}
        subtitle={project.name}
        back={`/app/p/${pid}`}
        wide
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setOffen('neu')}>
              <Plus size={16} /> {t('lager.neu')}
            </Button>
          ) : undefined
        }
      />
      <Page wide>
        {daten.loading && !daten.data ? (
          <Loading label={t('lager.bestand_laedt')} />
        ) : daten.error ? (
          <ErrorBox error={daten.error} onRetry={daten.reload} />
        ) : (
          <div className="space-y-3">
            {/* Eine schlanke Leiste: Suche, darunter die Chips in einer Zeile */}
            <div className="space-y-2.5">
              <div className="relative lg:max-w-xl">
                <Search size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="search"
                  value={suche}
                  onChange={(e) => setSuche(e.target.value)}
                  placeholder={t('lager.bestand_suche')}
                  aria-label={t('lager.bestand_suche')}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 ps-10 pe-11 [&::-webkit-search-cancel-button]:hidden"
                />
                {suche ? (
                  <button
                    type="button"
                    onClick={() => setSuche('')}
                    aria-label={t('suche.leeren')}
                    title={t('suche.leeren')}
                    className="absolute end-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-raised hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                ) : null}
              </div>

              <div
                role="group"
                aria-label={t('aktion.filter')}
                className="-mx-3 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
              >
                <Chip active={filter === ''} onClick={() => setFilter('')}>
                  {t('aktion.alle')}
                </Chip>
                <Chip active={filter === KNAPP} onClick={() => setFilter(filter === KNAPP ? '' : KNAPP)}>
                  {t('lager.knapp')} ({anzahlKnapp})
                </Chip>
                <Chip active={filter === LEER} onClick={() => setFilter(filter === LEER ? '' : LEER)}>
                  {t('lager.z_leer')} ({anzahlLeer})
                </Chip>
                {kategorien.map((k) => (
                  <Chip key={k.id} active={filter === k.id} onClick={() => setFilter(filter === k.id ? '' : k.id)}>
                    {k.name}
                  </Chip>
                ))}
                {gibtOhne ? (
                  <Chip active={filter === OHNE} onClick={() => setFilter(filter === OHNE ? '' : OHNE)}>
                    {t('lager.bestand_ohne_bereich')}
                  </Chip>
                ) : null}
                {canEdit ? (
                  <Chip onClick={() => setOffen('bereiche')}>
                    <Settings2 size={16} /> {t('lager.bereiche_verwalten')}
                  </Chip>
                ) : null}
              </div>
            </div>

            {bestand.length === 0 ? (
              <Empty
                icon={<Package size={30} />}
                zeichnung="keine"
                title={t('lager.bestand_leer_titel')}
                action={
                  canEdit ? (
                    <Button size="lg" onClick={() => setOffen('neu')}>
                      <Plus size={20} /> {t('lager.neu')}
                    </Button>
                  ) : undefined
                }
              />
            ) : sichtbar.length === 0 ? (
              <Empty zeichnung="keine" icon={<Search size={30} />} title={t('zustand.nichts_gefunden')} />
            ) : (
              <>
                <p className="t-sub px-1" aria-live="polite">
                  {sichtbar.length === bestand.length
                    ? t('lager.anzahl_dinge', { n: bestand.length })
                    : t('lager.anzahl_von', { n: sichtbar.length, gesamt: bestand.length })}
                </p>
                <BestandListe
                  zeilen={sichtbar}
                  canEdit={canEdit}
                  kategorien={kategorien}
                  onGeaendert={daten.reload}
                />
              </>
            )}
          </div>
        )}
        <div className="h-6" />
      </Page>

      {offen === 'neu' ? (
        <NeuDialog
          kategorien={kategorien}
          vorbelegtKategorie={kategorien.some((k) => k.id === filter) ? filter : undefined}
          onClose={schliessen}
          onGespeichert={daten.reload}
        />
      ) : null}
      {offen === 'bereiche' ? (
        <BereicheDialog kategorien={kategorien} onClose={schliessen} onGeaendert={daten.reload} />
      ) : null}
    </>
  )
}
