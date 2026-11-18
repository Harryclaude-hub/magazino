import { useMemo, useState } from 'react'
import { Package, Plus, Search, Settings2 } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Badge, Button, Card, Chip, Empty, ErrorBox, Input, Loading } from '../components/ui'
import {
  AendernDialog,
  BereicheDialog,
  EntnehmenDialog,
  NeuDialog,
  ZugangDialog,
} from '../components/BestandDialoge'
import { useProject } from './ProjectLayout'
import { listBestand, listKategorien } from '../lib/api'
import { useT } from '../lib/i18n'
import { istKnapp, mengeText } from '../lib/lager'
import { useAsync } from '../lib/util'
import type { Bestand as BestandZeile, LagerKategorie } from '../lib/types'

const OHNE = '__ohne__'
const KNAPP = '__knapp__'

type Offen =
  | { art: 'entnehmen' | 'zugang' | 'zaehlen' | 'aendern'; b: BestandZeile }
  | { art: 'neu' | 'bereiche' }
  | null

/* Bestand (E103): was da ist, was knapp ist, was man entnehmen kann.
 * Jede Buchung laeuft ueber die Datenbankfunktion; danach wird neu geladen. */
export default function Bestand() {
  const { project, canEdit } = useProject()
  const t = useT()
  const pid = project.id

  const daten = useAsync(async () => {
    const [bestand, kategorien] = await Promise.all([listBestand(pid), listKategorien(pid)])
    return { bestand, kategorien }
  }, [pid])

  const [filter, setFilter] = useState<string>('')
  const [suche, setSuche] = useState('')
  const [offen, setOffen] = useState<Offen>(null)

  const bestand = useMemo(() => daten.data?.bestand ?? [], [daten.data])
  const kategorien = useMemo<LagerKategorie[]>(() => daten.data?.kategorien ?? [], [daten.data])
  const katName = (id: string | null) => kategorien.find((k) => k.id === id)?.name
  const anzahlKnapp = bestand.filter(istKnapp).length
  const gibtOhne = bestand.some((b) => b.kategorie_id === null)

  const sichtbar = useMemo(() => {
    const q = suche.trim().toLowerCase()
    return bestand.filter((b) => {
      if (filter === KNAPP && !istKnapp(b)) return false
      if (filter === OHNE && b.kategorie_id !== null) return false
      if (filter && filter !== KNAPP && filter !== OHNE && b.kategorie_id !== filter) return false
      if (q && !`${b.name} ${b.ort ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [bestand, filter, suche])

  const schliessen = () => setOffen(null)
  const fertig = () => {
    setOffen(null)
    daten.reload()
  }

  return (
    <>
      <AppHeader
        title={t('lager.bestand_titel')}
        subtitle={project.name}
        back={`/app/p/${pid}`}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setOffen({ art: 'neu' })}>
              <Plus size={16} /> {t('lager.neu')}
            </Button>
          ) : undefined
        }
      />
      <Page>
        {daten.loading && !daten.data ? (
          <Loading label={t('lager.bestand_laedt')} />
        ) : daten.error ? (
          <ErrorBox error={daten.error} onRetry={daten.reload} />
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder={t('lager.bestand_suche')}
                aria-label={t('lager.bestand_suche')}
                className="ps-11"
              />
            </div>

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <Chip active={filter === ''} onClick={() => setFilter('')}>
                {t('aktion.alle')}
              </Chip>
              {anzahlKnapp > 0 ? (
                <Chip active={filter === KNAPP} onClick={() => setFilter(KNAPP)}>
                  {t('lager.knapp')} ({anzahlKnapp})
                </Chip>
              ) : null}
              {kategorien.map((k) => (
                <Chip key={k.id} active={filter === k.id} onClick={() => setFilter(k.id)}>
                  {k.name}
                </Chip>
              ))}
              {gibtOhne ? (
                <Chip active={filter === OHNE} onClick={() => setFilter(OHNE)}>
                  {t('lager.bestand_ohne_bereich')}
                </Chip>
              ) : null}
              {canEdit ? (
                <Chip onClick={() => setOffen({ art: 'bereiche' })}>
                  <Settings2 size={16} /> {t('lager.bereiche_verwalten')}
                </Chip>
              ) : null}
            </div>

            {bestand.length === 0 ? (
              <Empty
                icon={<Package size={30} />}
                zeichnung="keine"
                title={t('lager.bestand_leer_titel')}
                hint={t(canEdit ? 'lager.bestand_leer_bearbeiter' : 'lager.bestand_leer_leser')}
                action={
                  canEdit ? (
                    <Button size="lg" onClick={() => setOffen({ art: 'neu' })}>
                      <Plus size={20} /> {t('lager.neu')}
                    </Button>
                  ) : undefined
                }
              />
            ) : sichtbar.length === 0 ? (
              <Empty zeichnung="keine" icon={<Search size={30} />} title={t('zustand.nichts_gefunden')} />
            ) : (
              <ul className="space-y-3">
                {sichtbar.map((b) => (
                  <li key={b.id}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="t-name-lg break-words">{b.name}</h3>
                          <p className="t-sub mt-0.5 break-words">
                            {[katName(b.kategorie_id), b.ort ? t('lager.ort_zeile', { ort: b.ort }) : null]
                              .filter(Boolean)
                              .join(' . ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-2xl font-black leading-none tabular-nums" dir="ltr">
                            {mengeText(b.menge)} <span className="text-base font-bold text-muted">{b.einheit}</span>
                          </p>
                          {b.mindestmenge > 0 ? (
                            <p className="t-sub mt-1">
                              {t('lager.mindestens', { menge: mengeText(b.mindestmenge), einheit: b.einheit })}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {istKnapp(b) ? <Badge className="bg-warn text-paper">{t('lager.knapp')}</Badge> : null}
                        {b.art === 'ausleihe' ? <Badge>{t('lager.art_ausleihe')}</Badge> : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="md" className="flex-1" onClick={() => setOffen({ art: 'entnehmen', b })}>
                          {t('lager.entnehmen')}
                        </Button>
                        {canEdit ? (
                          <>
                            <Button size="md" variant="outline" onClick={() => setOffen({ art: 'zugang', b })}>
                              {t('lager.zugang')}
                            </Button>
                            <Button size="md" variant="outline" onClick={() => setOffen({ art: 'zaehlen', b })}>
                              {t('lager.zaehlen')}
                            </Button>
                            <Button size="md" variant="ghost" onClick={() => setOffen({ art: 'aendern', b })}>
                              {t('aktion.bearbeiten')}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="h-6" />
      </Page>

      {offen?.art === 'entnehmen' ? <EntnehmenDialog b={offen.b} onClose={schliessen} onFertig={fertig} /> : null}
      {offen?.art === 'zugang' ? <ZugangDialog b={offen.b} art="zugang" onClose={schliessen} onFertig={fertig} /> : null}
      {offen?.art === 'zaehlen' ? <ZugangDialog b={offen.b} art="korrektur" onClose={schliessen} onFertig={fertig} /> : null}
      {offen?.art === 'aendern' ? (
        <AendernDialog b={offen.b} kategorien={kategorien} onClose={schliessen} onFertig={fertig} />
      ) : null}
      {offen?.art === 'neu' ? (
        <NeuDialog
          kategorien={kategorien}
          vorbelegtKategorie={kategorien.some((k) => k.id === filter) ? filter : undefined}
          onClose={schliessen}
          onGespeichert={daten.reload}
        />
      ) : null}
      {offen?.art === 'bereiche' ? (
        <BereicheDialog kategorien={kategorien} onClose={schliessen} onGeaendert={daten.reload} />
      ) : null}
    </>
  )
}
