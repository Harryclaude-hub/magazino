import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Printer, Ruler, Trash2 } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { EigeneGroesseDialog } from '../components/EigeneGroesseDialog'
import {
  Button,
  Card,
  ConfirmDialog,
  Empty,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Loading,
  SectionTitle,
  Select,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { listAllItems, loescheEigeneGroesse, updateItem } from '../lib/api'
import { useSprache } from '../lib/i18n'
import {
  eigeneGroesseMasse,
  literText,
  stufeFuerLiter,
  useEigeneGroessen,
  useKistenGroessenStand,
} from '../lib/groessen'
import { zahlLesen } from '../lib/geometrie'
import type { EigeneGroesse, Item } from '../lib/types'
import { useLocalState } from '../lib/util'

/* Groessen pruefen.
 *
 * Seit 0021 hat jede Groesse Liter. Karam hat entschieden, alle Kisten
 * einmal neu einzustufen und die Etiketten neu zu drucken. Diese Seite ist
 * der Weg dahin: alle Kisten untereinander, je eine Auswahl der Groesse,
 * und am Ende ein Knopf, der genau die geaenderten Etiketten druckt.
 *
 * Die Groesse steht in der Nummer (KUERZEL-GROESSE-NUMMER). Aendert sie
 * sich, vergibt die Datenbank die neue Nummer; die alte bleibt in der
 * Codegeschichte und wird beim Scannen weiter gefunden. Hier wird nichts
 * davon im Browser gerechnet, die neue Nummer kommt aus der Antwort.
 *
 * Welche Kisten schon neu eingestuft sind, merkt sich dieses Geraet. Wer
 * zwischendurch die Seite verlaesst, findet die Liste beim Wiederkommen.
 */
export default function Groessen() {
  const { project, tagById, canEdit } = useProject()
  const { t, tn, lang } = useSprache()
  const toast = useToast()
  const { tabelle, fehler: tabellenFehler, nochmal: tabelleNochmal } = useKistenGroessenStand()

  const [kisten, setKisten] = useState<Item[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const [speichert, setSpeichert] = useState<string | null>(null)
  const [liter, setLiter] = useState('')
  const [geaendert, setGeaendert] = useLocalState<string[]>(
    `kistly.neuEingestuft.${project.id}`,
    [],
  )
  /* Zwei schnelle Aenderungen hintereinander duerfen sich nicht gegenseitig
   * aus der Liste werfen. Darum rechnet setzen mit dem neuesten Stand. */
  const geaendertJetzt = useRef(geaendert)
  useEffect(() => {
    geaendertJetzt.current = geaendert
  }, [geaendert])

  useEffect(() => {
    let alive = true
    setLaedt(true)
    setFehler(null)
    listAllItems(project.id)
      .then((alle) => {
        if (!alive) return
        // Moebel haben keine Liter und stehen darum nicht hier.
        setKisten(
          alle
            .filter((i) => i.kind !== 'furniture')
            .sort((a, b) => a.code.localeCompare(b.code, 'de', { numeric: true })),
        )
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
  }, [project.id, nonce])

  /* Nur Kisten, die es noch gibt. Eine geloeschte Kiste bleibt sonst als
   * Zahl stehen und der Druckknopf verspraeche ein Etikett zu viel. */
  const geaendertDa = useMemo(
    () => geaendert.filter((id) => kisten.some((k) => k.id === id)),
    [geaendert, kisten],
  )

  /* ---------------------------------------------------- Meine Groessen */
  const eigene = useEigeneGroessen(project.id)
  /* undefined = zu, null = neue Groesse, sonst die zu aendernde. */
  const [dialog, setDialog] = useState<EigeneGroesse | null | undefined>(undefined)
  const [weg, setWeg] = useState<EigeneGroesse | null>(null)
  const [loeschFehler, setLoeschFehler] = useState<string | null>(null)
  const eigeneNamen = useMemo(
    () => new Map((eigene.liste ?? []).map((g) => [g.id, g.name])),
    [eigene.liste],
  )

  function gespeichert(g: EigeneGroesse) {
    setDialog(undefined)
    toast(t('groessen.eigene_gespeichert', { name: g.name }), 'ok')
    eigene.neuLaden()
    // Neue Masse koennen Kisten neu einstufen; ihre Nummern kommen frisch.
    setNonce((n) => n + 1)
  }

  /* ConfirmDialog laesst Fehler nicht durch: sie werden hier gefangen und
   * stehen danach ueber der Liste, samt der Zahl der Kisten. */
  async function loeschen(g: EigeneGroesse) {
    setLoeschFehler(null)
    try {
      await loescheEigeneGroesse(g.id)
      toast(t('groessen.eigene_geloescht', { name: g.name }), 'ok')
      eigene.neuLaden()
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      setLoeschFehler(text)
      toast(text, 'error')
    }
  }

  /* Auch arabisch-indische Ziffern und das Komma zaehlen. */
  const stufe = useMemo(() => {
    if (!tabelle) return null
    const zahl = zahlLesen(liter)
    return zahl === null ? null : stufeFuerLiter(zahl, tabelle)
  }, [liter, tabelle])

  async function setzen(k: Item, neu: number) {
    if (neu === k.size) return
    setSpeichert(k.id)
    try {
      const frisch = await updateItem(k.id, { size: neu })
      setKisten((liste) => liste.map((x) => (x.id === frisch.id ? frisch : x)))
      const bisher = geaendertJetzt.current
      if (!bisher.includes(frisch.id)) {
        const neuListe = [...bisher, frisch.id]
        geaendertJetzt.current = neuListe
        setGeaendert(neuListe)
      }
      toast(t('groessen.gespeichert', { alt: k.code, neu: frisch.code }), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSpeichert(null)
    }
  }

  /* Die Auswahl steht schon auf diesem Geraet (siehe oben). Die
   * Etikettenseite liest sie von dort, statt jede Kennung in die Adresse
   * zu schreiben: bei vielen Kisten wuerde die Adresse zu lang. */
  const druckZiel = `/app/p/${project.id}/etiketten?auswahl=groessen`

  return (
    <>
      <AppHeader
        title={t('groessen.titel')}
        subtitle={t('groessen.untertitel')}
        back={`/app/p/${project.id}/kisten`}
      />
      <Page>
        <Card className="mb-4 space-y-2 p-4">
          <p className="text-base">{t('groessen.erklaerung')}</p>
          <p className="t-sub">{t('groessen.norm')}</p>
        </Card>

        {/* Der Rechner: Liter vom Karton rein, Groesse raus. Die Grenzen
            kommen aus der Datenbank. */}
        <Card className="mb-4 p-4">
          <p className="t-name mb-1 flex items-center gap-2">
            <Ruler size={18} /> {t('groessen.rechner_titel')}
          </p>
          <p className="t-sub mb-3">{t('groessen.rechner_hinweis')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t('groessen.rechner_feld')}>
              <Input
                inputMode="decimal"
                dir="ltr"
                value={liter}
                onChange={(e) => setLiter(e.target.value)}
                className="t-serial w-32"
              />
            </Field>
            <p className="pb-3 text-lg font-black" aria-live="polite">
              {!tabelle ? (
                <span className="t-sub font-semibold">
                  {tabellenFehler ? t('groessen.liter_fehlen') : t('zustand.laedt')}
                </span>
              ) : stufe !== null ? (
                t('groessen.rechner_ergebnis', { n: stufe })
              ) : (
                <span className="t-sub font-semibold">{t('groessen.rechner_leer')}</span>
              )}
            </p>
          </div>
        </Card>

        {/* Meine Groessen: eigene Masse des Umzugs. Die Stufe in der Nummer
            setzt die Datenbank; hier steht sie nicht, sie steht an den
            Kisten. Betrachter sehen die Liste ohne Knoepfe. */}
        <SectionTitle
          action={
            canEdit ? (
              <Button size="sm" variant="outline" onClick={() => setDialog(null)}>
                <Plus size={16} /> {t('groessen.eigene_anlegen')}
              </Button>
            ) : null
          }
        >
          {t('groessen.eigene_titel')}
        </SectionTitle>
        {loeschFehler ? (
          <div className="mb-3">
            <ErrorBox error={loeschFehler} />
          </div>
        ) : null}
        <div className="mb-5">
          {eigene.fehler ? (
            <ErrorBox error={eigene.fehler} onRetry={eigene.nochmal} />
          ) : eigene.liste === null ? (
            <Loading />
          ) : eigene.liste.length === 0 ? (
            <Empty
              icon={<Ruler size={28} />}
              title={t('groessen.eigene_leer')}
              hint={t('groessen.eigene_leer_hinweis')}
              action={
                canEdit ? (
                  <Button onClick={() => setDialog(null)}>
                    <Plus size={16} /> {t('groessen.eigene_anlegen')}
                  </Button>
                ) : null
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <ul className="zebra divide-y divide-line">
                {eigene.liste.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="t-name break-words">{g.name}</p>
                      <p className="t-sub">
                        {g.art === 'moebel'
                          ? t('groessen.eigene_art_moebel')
                          : t('groessen.eigene_art_kiste')}
                        {' . '}
                        <span className="t-serial">{eigeneGroesseMasse(t, g)}</span>
                        {g.art === 'kiste' ? (
                          <>
                            {' . '}
                            <span className="t-serial">
                              {t('groesse.liter_kurz', {
                                liter: literText((g.laenge_cm * g.breite_cm * g.hoehe_cm) / 1000, lang),
                              })}
                            </span>
                          </>
                        ) : null}
                        {g.ausschnitt_breite_cm !== null && g.ausschnitt_tiefe_cm !== null ? (
                          <>
                            {' . '}
                            {t('groessen.eigene_l_form')}{' '}
                            <span className="t-serial">
                              {t('groessen.eigene_ausschnitt_masse', {
                                breite: g.ausschnitt_breite_cm,
                                tiefe: g.ausschnitt_tiefe_cm,
                              })}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex shrink-0 gap-1">
                        <IconButton label={t('groessen.eigene_aendern')} size="sm" onClick={() => setDialog(g)}>
                          <Pencil size={17} />
                        </IconButton>
                        <IconButton
                          label={t('groessen.eigene_loeschen')}
                          size="sm"
                          tone="danger"
                          onClick={() => {
                            setLoeschFehler(null)
                            setWeg(g)
                          }}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Die zehn Stufen auf einen Blick. */}
        <SectionTitle>{t('groessen.tabelle_titel')}</SectionTitle>
        {tabelle ? (
          <Card className="mb-5 overflow-x-auto">
            <table className="w-full text-start text-base">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="px-3 py-2 text-start">{t('groessen.spalte_groesse')}</th>
                  <th className="px-3 py-2 text-start">{t('groessen.spalte_liter')}</th>
                  <th className="px-3 py-2 text-start">{t('groessen.spalte_bereich')}</th>
                  <th className="px-3 py-2 text-start">{t('groessen.spalte_mass')}</th>
                </tr>
              </thead>
              <tbody className="zebra">
                {[...tabelle.values()]
                  .sort((a, b) => a.stufe - b.stufe)
                  .map((g, i, alle) => {
                    const vorher = i > 0 ? alle[i - 1].bis_liter : null
                    return (
                      <tr key={g.stufe} className="border-b border-line last:border-0">
                        <td className="t-serial px-3 py-2 text-danger">{g.stufe}</td>
                        <td className="t-serial px-3 py-2" dir="ltr">
                          {literText(g.liter, lang)}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {vorher === null && g.bis_liter !== null
                            ? t('groessen.bereich_bis', { bis: literText(g.bis_liter, lang) })
                            : g.bis_liter === null && vorher !== null
                              ? t('groessen.bereich_ab', { ab: literText(vorher, lang) })
                              : vorher !== null && g.bis_liter !== null
                                ? t('groessen.bereich_von_bis', {
                                    ab: literText(vorher, lang),
                                    bis: literText(g.bis_liter, lang),
                                  })
                                : null}
                        </td>
                        <td className="px-3 py-2 text-sm" dir="ltr">
                          {t('groessen.mass_zeile', {
                            l: g.laenge_cm,
                            b: g.breite_cm,
                            h: g.hoehe_cm,
                          })}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </Card>
        ) : tabellenFehler ? (
          <div className="mb-5">
            <ErrorBox error={t('groessen.liter_fehlen')} onRetry={tabelleNochmal} />
          </div>
        ) : (
          <div className="mb-5">
            <Loading />
          </div>
        )}

        {/* Die Kisten */}
        <SectionTitle>
          {t('groessen.kisten_titel')}
          {kisten.length > 0 ? ` (${kisten.length})` : ''}
        </SectionTitle>
        <p className="t-sub mb-3">{t('groessen.moebel_hinweis')}</p>
        {!canEdit ? (
          <p className="t-sub mb-3 font-bold">{t('groessen.nur_lesen')}</p>
        ) : null}

        {fehler ? (
          <ErrorBox error={fehler} onRetry={() => setNonce((n) => n + 1)} />
        ) : laedt ? (
          <Loading />
        ) : kisten.length === 0 ? (
          <Empty title={t('groessen.leer')} />
        ) : (
          <Card className="mb-24 overflow-hidden">
            <ul className="zebra divide-y divide-line">
              {kisten.map((k) => {
                const zimmer = tagById(k.room_id) ?? tagById(k.person_id)
                const neu = geaendertDa.includes(k.id)
                return (
                  <li key={k.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/app/p/${project.id}/kisten/${k.id}`}
                        className="t-serial block text-lg"
                        dir="ltr"
                      >
                        {k.prefix}
                        <span className="opacity-25">-</span>
                        <span className="text-danger">{k.size}</span>
                        <span className="opacity-25">-</span>
                        {String(k.seq).padStart(3, '0')}
                      </Link>
                      <p className="t-sub break-words">
                        {k.title || t(`art.${k.kind}`)}
                        {zimmer ? ` . ${zimmer.name}` : ''}
                        {neu ? (
                          <span className="ms-2 font-bold text-ok">
                            {t('groessen.neue_nummer', { code: k.code })}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {/* Mit eigener Groesse setzt die Datenbank die Stufe;
                        eine Auswahl hier wuerde sie nur ueberschreiben. */}
                    {k.eigene_groesse_id ? (
                      <span className="w-40 shrink-0 text-sm font-bold">
                        {eigeneNamen.get(k.eigene_groesse_id) ?? t('kisten.eigene_groesse')}
                      </span>
                    ) : (
                    <Select
                      aria-label={t('begriff.groesse')}
                      value={k.size}
                      disabled={!canEdit || speichert === k.id}
                      onChange={(e) => void setzen(k, Number(e.target.value))}
                      className="w-40 shrink-0"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                        const g = tabelle?.get(n)
                        return (
                          <option key={n} value={n}>
                            {g
                              ? `${n} . ${t('groesse.liter_kurz', { liter: literText(g.liter, lang) })}`
                              : `${n}`}
                          </option>
                        )
                      })}
                    </Select>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </Page>

      <EigeneGroesseDialog
        offen={dialog !== undefined}
        projectId={project.id}
        groesse={dialog ?? null}
        onClose={() => setDialog(undefined)}
        onGespeichert={gespeichert}
      />
      <ConfirmDialog
        open={weg !== null}
        title={t('groessen.eigene_loeschen')}
        body={weg ? t('groessen.eigene_loeschen_frage', { name: weg.name }) : ''}
        onConfirm={async () => {
          if (weg) await loeschen(weg)
        }}
        onClose={() => setWeg(null)}
      />

      {/* Unten fest: wie viele neu eingestuft sind, und der Weg zum Druck.
          Nur die geaenderten Etiketten, nicht der ganze Umzug. */}
      {geaendertDa.length > 0 ? (
        <div
          className="no-print fixed inset-x-0 z-40 border-t border-line bg-paper/95 px-3 py-3 backdrop-blur"
          // Ueber der unteren Leiste, nicht darunter. Sie meldet ihre Hoehe
          // selbst als --nav-h (AppShell).
          style={{ bottom: 'var(--nav-h, 0px)' }}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
            <span className="t-name flex-1">{tn('groessen.geaendert', geaendertDa.length)}</span>
            <Button variant="ghost" onClick={() => setGeaendert([])}>
              {t('groessen.erledigt')}
            </Button>
            <Link to={druckZiel}>
              <Button>
                <Printer size={18} /> {t('groessen.etiketten_drucken')}
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </>
  )
}
