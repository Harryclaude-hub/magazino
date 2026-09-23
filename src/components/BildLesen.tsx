import { useEffect, useState } from 'react'
import { Check, Eye, RefreshCw, Sparkles } from 'lucide-react'
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorBox,
  Input,
  Loading,
  Modal,
  useToast,
} from './ui'
import { Ausschnitt } from './Ausschnitt'
import { useSprache } from '../lib/i18n'
import { addContent, updateContent } from '../lib/api'
import { ausschnittErstellen, type Rahmen } from '../lib/media'
import {
  BildFehler,
  MAX_BILDER_JE_LAUF,
  bilderLesen,
  erkennungVerwerfen,
  lesbareFotos,
  restGuthaben,
  stufeVon,
  vorhandeneErkennungen,
  type BildErgebnis,
  type Erkennungsart,
} from '../lib/bildki'
import type { ErkanntesDing, ItemContent, ItemPhoto } from '../lib/types'
import { cx, uid } from '../lib/util'

/* Vorschlaege aus einem Foto.
 *
 * Der wichtigste Satz dieser Datei: es wird nichts eingetragen, bis
 * jemand tippt. Ein Vorschlag, der von allein in der Liste landet, ist
 * spaeter nicht mehr von einer Angabe zu unterscheiden, die ein Mensch
 * gemacht hat, und dann weiss niemand mehr, worauf er sich verlassen kann.
 *
 * Was nicht uebernommen wird, verschwindet auch nicht: es bleibt in der
 * Tabelle stehen, abgewaehlt. Wer es spaeter doch braucht, findet es.
 */

/** Eine Zeile in der Vorschlagstabelle. Sie traegt ihren eigenen Zustand,
 *  weil man Text und Menge vor dem Uebernehmen noch aendern koennen soll. */
interface Zeile {
  schluessel: string
  photoId: string
  bildNr: number
  text: string
  menge: number
  sicherheit: number
  hinweis: string | null
  gewaehlt: boolean
  schonDrin: boolean
  /* Wo das Ding auf dem Bild sitzt und in welcher Schicht der Kiste das
   * Bild aufgenommen wurde. Beides wandert mit in die Inhaltsliste,
   * damit man den Gegenstand spaeter im Bild wiederfindet. */
  x: number | null
  y: number | null
  /** Der Rahmen um das Ding, wenn die Erkennung einen geliefert hat. */
  rahmen: Rahmen | null
  /** Suchwoerter und beide Namen, fuer die Suche ueber alle Umzuege. */
  suchwoerter: string[]
  schicht: number | null
}

/** Steht genau dieser Vorschlag schon in der Liste? Derselbe Text reicht
 *  nicht: dasselbe Ding kann in Schicht 1 und in Schicht 3 liegen, und
 *  beides gehoert in die Liste. Schon drin ist ein Vorschlag nur, wenn
 *  eine Zeile mit demselben Text von DIESEM Foto uebernommen wurde. Der
 *  Vergleich ist ohne Gross- und Kleinschreibung, aber nicht unscharf. */
function schonUebernommen(text: string, photoId: string, vorhanden: ItemContent[]): boolean {
  const a = text.trim().toLowerCase()
  return vorhanden.some((v) => v.photo_id === photoId && v.text.trim().toLowerCase() === a)
}

function zeilenAus(
  ergebnisse: BildErgebnis[],
  vorhanden: ItemContent[],
  reihenfolge: string[],
  /** Welches Bild in welcher Schicht aufgenommen wurde. */
  schichtVon: Map<string, number | null>,
): Zeile[] {
  const out: Zeile[] = []
  for (const e of ergebnisse) {
    const nr = reihenfolge.indexOf(e.photo_id) + 1
    e.dinge.forEach((d: ErkanntesDing, i) => {
      const drin = schonUebernommen(d.text, e.photo_id, vorhanden)
      out.push({
        schluessel: `${e.photo_id}:${i}`,
        photoId: e.photo_id,
        bildNr: nr,
        text: d.text,
        menge: d.menge,
        sicherheit: d.sicherheit,
        hinweis: d.hinweis ?? null,
        // Was schon in der Liste steht, ist vorgewaehlt abgewaehlt. Sonst
        // legt ein Tippen alles doppelt an.
        gewaehlt: !drin,
        schonDrin: drin,
        // Beide oder keiner. Ein halber Punkt zeigt auf nichts.
        x: typeof d.x === 'number' && typeof d.y === 'number' ? d.x : null,
        y: typeof d.x === 'number' && typeof d.y === 'number' ? d.y : null,
        rahmen:
          typeof d.x0 === 'number' &&
          typeof d.y0 === 'number' &&
          typeof d.x1 === 'number' &&
          typeof d.y1 === 'number' &&
          d.x0 < d.x1 &&
          d.y0 < d.y1
            ? { x0: d.x0, y0: d.y0, x1: d.x1, y1: d.y1 }
            : null,
        suchwoerter: [
          ...(Array.isArray(d.suchwoerter) ? d.suchwoerter : []),
          d.name_de ?? '',
          d.name_ar ?? '',
        ].filter((w): w is string => typeof w === 'string' && w.trim().length > 0),
        schicht: schichtVon.get(e.photo_id) ?? null,
      })
    })
  }
  return out
}

export function BildLesen({
  offen,
  onClose,
  projectId,
  itemId,
  fotos,
  fotoUrls,
  art,
  vorhandeneInhalte,
  canEdit,
  userId,
  onUebernommen,
}: {
  offen: boolean
  onClose: () => void
  projectId: string
  /** Wohin die uebernommenen Zeilen gehen. */
  itemId: string
  fotos: ItemPhoto[]
  /** Signierte Adressen der Fotos, nach Pfad. Fuer die Vorschau der
   *  Ausschnitte in der Tabelle. */
  fotoUrls: Map<string, string>
  art: Erkennungsart
  vorhandeneInhalte: ItemContent[]
  canEdit: boolean
  userId: string
  onUebernommen: (neu: ItemContent[]) => void
}) {
  const { t, tn, lang } = useSprache()
  const toast = useToast()

  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<{ code: string; text: string } | null>(null)
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null)
  const [rest, setRest] = useState<{ projekt: number; nutzer: number } | null>(null)
  const [grenzeUebrig, setGrenzeUebrig] = useState(0)
  const [schonGelesen, setSchonGelesen] = useState<Set<string>>(new Set())
  const [neuLesen, setNeuLesen] = useState(false)
  const [busy, setBusy] = useState(false)

  /* Alle lesbaren Fotos, nicht nur die ersten vier. Gelesen wird je
   * Durchgang hoechstens MAX_BILDER_JE_LAUF, und zwar zuerst die, die noch
   * niemand gelesen hat. Sonst kaemen die tieferen Schichten nie dran. */
  const alle = lesbareFotos(fotos)
  const reihenfolge = alle.map((f) => f.id)
  const schichtVon = new Map(alle.map((f) => [f.id, f.schicht]))
  const nochOffen = alle.filter((f) => !schonGelesen.has(f.id)).length

  /* Beim Oeffnen wird nur nachgesehen, was schon einmal gelesen wurde.
   * Gelesen wird erst auf Tippen: es kostet Geld, und Geld gibt niemand
   * ungefragt aus. */
  useEffect(() => {
    if (!offen) return
    let alive = true
    setZeilen(null)
    setFehler(null)
    setGrenzeUebrig(0)
    void (async () => {
      try {
        const [alt, guthaben] = await Promise.all([
          vorhandeneErkennungen(reihenfolge, lang),
          restGuthaben(projectId, userId),
        ])
        if (!alive) return
        setRest(guthaben)
        /* Gelesen ist nur, was fertig ist. Ein gescheitertes Foto soll beim
         * naechsten Mal wieder drankommen, nicht fuer immer liegen bleiben. */
        const fertige = [...alt.values()].filter((a) => a.status === 'fertig')
        setSchonGelesen(new Set(fertige.map((a) => a.photo_id)))
        if (fertige.length > 0) {
          setZeilen(
            zeilenAus(
              fertige.map((a) => ({
                photo_id: a.photo_id,
                status: 'fertig' as const,
                aus_speicher: true,
                dinge: a.ergebnis,
              })),
              vorhandeneInhalte,
              reihenfolge,
              schichtVon,
            ),
          )
        }
      } catch (err) {
        if (alive) setFehler({ code: 'laden', text: err instanceof Error ? err.message : String(err) })
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen, projectId, userId, lang])

  /* Eine gewoehnliche Funktion, kein useCallback: sie soll bei jedem
   * Aufruf die aktuellen Fotos und ihre Schicht sehen. Eine eingefrorene
   * Fassung gab neu gelesenen Vorschlaegen die Schicht von vorhin.
   * `gelesen` erlaubt dem Neu-Lesen, den gerade geleerten Stand
   * mitzugeben, bevor React ihn gesetzt hat. */
  async function lesen(gelesen: Set<string> = schonGelesen) {
    if (alle.length === 0) {
      setFehler({ code: 'leer', text: t('bildki.keine_bilder') })
      return
    }
    const ungelesen = alle.filter((f) => !gelesen.has(f.id))
    /* Alles schon gelesen: nichts neu holen. Sonst ersetzte die Antwort die
     * Zeilen samt Auswahl und Aenderungen. Neu lesen geht ueber den eigenen
     * Knopf daneben. */
    if (ungelesen.length === 0) {
      toast(t('bildki.alles_gelesen'), 'info')
      return
    }
    const lauf = ungelesen.slice(0, MAX_BILDER_JE_LAUF)
    setLaeuft(true)
    setFehler(null)
    try {
      const antwort = await bilderLesen(
        projectId,
        lauf.map((f) => f.id),
        art,
        lang,
      )
      setRest({ projekt: antwort.rest_projekt, nutzer: antwort.rest_nutzer })
      setGrenzeUebrig(antwort.uebersprungen_wegen_grenze)
      const fertig = antwort.ergebnisse.filter((e) => e.status === 'fertig')
      setSchonGelesen((alt) => new Set([...alt, ...fertig.map((e) => e.photo_id)]))

      // Fehlgeschlagene Bilder werden gemeldet, nicht uebergangen. Hat der
      // Fehler eine Kennung, kommt der eigene Satz dazu.
      const kaputt = antwort.ergebnisse.filter((e) => e.status === 'fehler')
      if (kaputt.length > 0) {
        const k = kaputt[0]
        const key = k.code ? `bildki.fehler.${k.code}` : ''
        const satz = key ? t(key) : ''
        toast(
          satz && satz !== key ? satz : (k.fehler ?? t('zustand.unbekannter_fehler')),
          'error',
        )
      }
      /* Die neuen Zeilen kommen zu den alten dazu. Was schon in der
       * Tabelle steht, bleibt mit seinen Aenderungen stehen; nur die
       * Zeilen eines gerade neu gelesenen Fotos werden ersetzt. */
      const neu = zeilenAus(fertig, vorhandeneInhalte, reihenfolge, schichtVon)
      const neuVon = new Set(fertig.map((e) => e.photo_id))
      setZeilen((alt) => [...(alt ?? []).filter((z) => !neuVon.has(z.photoId)), ...neu])
    } catch (err) {
      if (err instanceof BildFehler) setFehler({ code: err.code, text: err.message })
      else setFehler({ code: 'unbekannt', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLaeuft(false)
    }
  }

  async function uebernehmen() {
    const gewaehlt = (zeilen ?? []).filter((z) => z.gewaehlt && z.text.trim())
    if (gewaehlt.length === 0) {
      toast(t('bildki.nichts_gewaehlt'), 'error')
      return
    }
    setBusy(true)
    const neu: ItemContent[] = []
    const fehlgeschlagen: string[] = []
    let ohneAusschnitt = 0
    for (const z of gewaehlt) {
      const text = z.text.trim()
      try {
        // Der Name, wie er uebernommen wird, zaehlt immer zu den
        // Suchwoertern, auch wenn er von Hand geaendert wurde.
        const woerter = [...new Set([text, ...z.suchwoerter].map((w) => w.trim()).filter(Boolean))]
        const zeile = await addContent(
          projectId,
          itemId,
          text,
          z.menge,
          'bild',
          {
            photo_id: z.photoId,
            schicht: z.schicht,
            punkt_x: z.x,
            punkt_y: z.y,
            rahmen: z.rahmen,
          },
          { suchwoerter: woerter.slice(0, 30), sicherheit: z.sicherheit },
        )
        /* Das kleine Bild des Dings gleich mit anlegen. Scheitert es, steht
         * der Eintrag trotzdem da, und das Bild wird live aus dem Foto
         * geschnitten; gemeldet wird es aber. */
        const foto = fotos.find((f) => f.id === z.photoId)
        if (z.rahmen && foto) {
          try {
            const pfad = await ausschnittErstellen(
              foto.path,
              z.rahmen,
              `${projectId}/${itemId}/ausschnitt-${uid()}.jpg`,
            )
            await updateContent(zeile.id, { ausschnitt_pfad: pfad })
            zeile.ausschnitt_pfad = pfad
          } catch {
            ohneAusschnitt++
          }
        }
        neu.push(zeile)
      } catch (err) {
        fehlgeschlagen.push(err instanceof Error ? err.message : String(err))
      }
    }
    setBusy(false)
    if (ohneAusschnitt > 0) toast(tn('schichten.ausschnitt_fehlt', ohneAusschnitt), 'info')
    if (neu.length > 0) {
      onUebernommen(neu)
      toast(tn('bildki.uebernommen', neu.length), 'ok')
      // Uebernommene Zeilen bleiben stehen, aber abgewaehlt und als
      // vorhanden markiert. Sie verschwinden nicht: wer nachsehen will,
      // was die Erkennung gesagt hat, findet es weiter.
      const genommen = new Set(gewaehlt.map((z) => z.schluessel))
      setZeilen((alt) =>
        (alt ?? []).map((z) =>
          genommen.has(z.schluessel) ? { ...z, gewaehlt: false, schonDrin: true } : z,
        ),
      )
    }
    if (fehlgeschlagen.length > 0) {
      toast(
        t('bildki.teilweise_uebernommen', {
          ok: neu.length,
          fehler: fehlgeschlagen.length,
          grund: fehlgeschlagen[0],
        }),
        'error',
      )
    }
  }

  const gewaehlteZahl = (zeilen ?? []).filter((z) => z.gewaehlt).length

  return (
    <>
      <Modal
        open={offen}
        onClose={onClose}
        title={t('bildki.titel')}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('aktion.schliessen')}
            </Button>
            {zeilen && zeilen.length > 0 ? (
              <Button loading={busy} disabled={gewaehlteZahl === 0} onClick={() => void uebernehmen()}>
                <Check size={17} />
                {t('bildki.alle_uebernehmen')}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-4">
          <p className="t-sub">{t('bildki.erklaerung')}</p>

          {fehler ? (
            fehler.code === 'kein_schluessel' ? (
              <Card className="border-2 border-warn/40 bg-warn/10 p-4">
                <p className="t-name mb-1">{t('bildki.kein_schluessel_titel')}</p>
                <p className="text-base">{t('bildki.kein_schluessel')}</p>
              </Card>
            ) : fehler.code === 'nur_lesen' ? (
              <ErrorBox error={t('bildki.nur_lesen')} />
            ) : (
              <ErrorBox error={fehler.text} onRetry={() => void lesen()} />
            )
          ) : null}

          {grenzeUebrig > 0 ? (
            <ErrorBox error={t('bildki.grenze_erreicht', { n: grenzeUebrig })} />
          ) : null}

          {/* Was noch nicht gelesen ist, steht da. Still liegen gebliebene
              Fotos saehen aus wie Fotos ohne Inhalt. */}
          {canEdit &&
          nochOffen > 0 &&
          (schonGelesen.size > 0 || alle.length > MAX_BILDER_JE_LAUF) ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-3 text-base">
              {tn('bildki.noch_ungelesen', nochOffen, { max: MAX_BILDER_JE_LAUF })}
            </p>
          ) : null}

          {!canEdit ? (
            <ErrorBox error={t('bildki.nur_lesen')} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button loading={laeuft} onClick={() => void lesen()} disabled={alle.length === 0}>
                <Sparkles size={17} />
                {schonGelesen.size > 0 ? t('bildki.knopf_kurz') : t('bildki.knopf')}
              </Button>
              {schonGelesen.size > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setNeuLesen(true)}>
                  <RefreshCw size={16} />
                  {t('bildki.neu_lesen')}
                </Button>
              ) : null}
              {rest ? (
                <span className="t-sub">
                  {t('bildki.rest', { projekt: rest.projekt, nutzer: rest.nutzer })}
                </span>
              ) : null}
            </div>
          )}

          {laeuft ? <Loading label={t('bildki.laeuft')} /> : null}

          {zeilen && zeilen.length === 0 && !laeuft ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-4 text-base text-muted">
              {t('bildki.kein_ergebnis')}
            </p>
          ) : null}

          {zeilen && zeilen.length > 0 ? (
            <>
              <Card className="zebra divide-y divide-line overflow-hidden">
                {zeilen.map((z, i) => (
                  <div key={z.schluessel} className="flex items-start gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={z.gewaehlt}
                      aria-label={t('bildki.uebernehmen')}
                      onClick={() =>
                        setZeilen((alt) =>
                          (alt ?? []).map((x, j) => (j === i ? { ...x, gewaehlt: !x.gewaehlt } : x)),
                        )
                      }
                      className={cx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition',
                        z.gewaehlt ? 'border-ink bg-ink text-paper' : 'border-line bg-surface',
                      )}
                    >
                      {z.gewaehlt ? <Check size={17} /> : null}
                    </button>

                    {z.rahmen ? (
                      <Ausschnitt
                        pfad={null}
                        fotoUrl={(() => {
                          const f = fotos.find((x) => x.id === z.photoId)
                          return f ? (fotoUrls.get(f.path) ?? null) : null
                        })()}
                        rahmen={z.rahmen}
                        groesse={52}
                        alt={z.text}
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <Input
                        value={z.text}
                        onChange={(e) =>
                          setZeilen((alt) =>
                            (alt ?? []).map((x, j) =>
                              j === i ? { ...x, text: e.target.value } : x,
                            ),
                          )
                        }
                        aria-label={t('bildki.zeile_aendern')}
                        className="py-1.5 text-base"
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Stufenband sicherheit={z.sicherheit} />
                        {z.hinweis ? <span className="t-sub">{z.hinweis}</span> : null}
                        {z.schonDrin ? (
                          <span className="t-sub font-bold">{t('bildki.schon_drin')}</span>
                        ) : null}
                        {alle.length > 1 ? (
                          <span className="t-sub">{t('bildki.bild_nummer', { n: z.bildNr })}</span>
                        ) : null}
                        {z.schicht ? (
                          <span className="t-sub font-bold">
                            {t('schichten.schicht_n', { n: z.schicht })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={z.menge}
                      onChange={(e) =>
                        setZeilen((alt) =>
                          (alt ?? []).map((x, j) =>
                            j === i
                              ? { ...x, menge: Math.max(1, Number(e.target.value) || 1) }
                              : x,
                          ),
                        )
                      }
                      aria-label={t('bildki.menge')}
                      dir="ltr"
                      className="w-20 shrink-0 py-1.5 text-center"
                    />
                  </div>
                ))}
              </Card>
              <p className="t-sub">{t('bildki.stufe_hinweis')}</p>
            </>
          ) : null}

          <p className="t-sub border-t border-line pt-3">{t('bildki.kostet')}</p>
          <p className="t-sub">{t('bildki.dienst')}</p>
          <p className="t-sub flex items-start gap-1.5">
            <Eye size={15} className="mt-0.5 shrink-0" />
            {t('bildki.datenschutz')}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={neuLesen}
        title={t('bildki.neu_lesen')}
        body={t('bildki.neu_lesen_frage')}
        confirmLabel={t('bildki.neu_lesen')}
        danger={false}
        onClose={() => setNeuLesen(false)}
        onConfirm={async () => {
          setNeuLesen(false)
          try {
            for (const id of reihenfolge) await erkennungVerwerfen(id, lang)
            const leer = new Set<string>()
            setSchonGelesen(leer)
            setZeilen(null)
            await lesen(leer)
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}

/** Drei Stufen statt einer Prozentzahl. Eine Prozentzahl liest sich wie
 *  ein Messwert, und das ist sie nicht. */
function Stufenband({ sicherheit }: { sicherheit: number }) {
  const t = useSprache().t
  const stufe = stufeVon(sicherheit)
  const farbe =
    stufe === 'sicher' ? 'var(--ok)' : stufe === 'wahrscheinlich' ? 'var(--warn)' : 'var(--muted)'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm font-bold"
      style={{ color: farbe, borderColor: farbe }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: farbe }} />
      {t(`bildki.stufe_${stufe}`)}
    </span>
  )
}
