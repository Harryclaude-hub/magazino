import { useEffect, useMemo, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, SectionTitle, Segmented, Select, Switch } from '../ui'
import { TuerEtikett } from '../TuerEtikett'
import { Etikett, type EtikettDaten } from './Etikett'
import { useSprache } from '../../lib/i18n'
import { useLocalState } from '../../lib/util'
import {
  aufSeiten,
  blattmass,
  FORMATE,
  FORMAT_IDS,
  formatVon,
  type Ausrichtung,
  type FormatId,
} from '../../lib/etikett'

/* Die Etikettenseite ohne Daten und Anmeldung: Einstellungen links (am
 * Handy oben), Vorschau in echtem Seitenverhaeltnis rechts, Druck.
 *
 * Gedruckt wird nur das Blatt (.etk-seite). Die @page-Regel mit der
 * Blattgroesse haengt zur Laufzeit im Dokumentkopf, denn ohne sie druckt
 * der Browser immer A4. Der Rand liegt im Blatt, nicht in @page: so
 * stimmt das Raster auf jedem Drucker. */

/** Millimeter in Bildschirmpunkte (nur fuer die Vorschau). */
const MM = 96 / 25.4

type Zoom = 'fit' | 'halb' | 'voll'
const ZOOMS: readonly Zoom[] = ['fit', 'halb', 'voll']
type Auswahl = 'alle' | 'bereich' | 'einzeln'
type Ansicht = 'kisten' | 'tuer'

interface Einstellung {
  format: FormatId
  ausrichtung: Ausrichtung
  inhalt: boolean
  platz: boolean
  lager: boolean
  rahmen: boolean
  zoom: Zoom
}

const STANDARD: Einstellung = {
  format: 'a6',
  ausrichtung: 'quer',
  inhalt: true,
  platz: true,
  lager: true,
  rahmen: true,
  zoom: 'fit',
}

function waehle<T extends string>(v: unknown, erlaubt: readonly T[], fallback: T): T {
  return (erlaubt as readonly unknown[]).includes(v) ? (v as T) : fallback
}

function schalter(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

/** Der gemerkte Wert kann aus einer aelteren Fassung stammen. Jedes Feld wird
 *  einzeln geprueft und faellt sonst auf den Standard zurueck. */
function bereinige(roh: unknown): Einstellung {
  const d = STANDARD
  if (roh === null || typeof roh !== 'object') return d
  const o = roh as Record<string, unknown>
  return {
    format: waehle(o.format, FORMAT_IDS, d.format),
    ausrichtung: waehle(o.ausrichtung, ['hoch', 'quer'] as const, d.ausrichtung),
    inhalt: schalter(o.inhalt, d.inhalt),
    platz: schalter(o.platz, d.platz),
    lager: schalter(o.lager, d.lager),
    rahmen: schalter(o.rahmen, d.rahmen),
    zoom: waehle(o.zoom, ZOOMS, d.zoom),
  }
}

function tuerPlatzhalter(i: number): EtikettDaten {
  return {
    id: `tuer-${i}`,
    code: '',
    titel: null,
    bereichName: null,
    bereichFarbe: null,
    inhalt: [],
    qrWert: '',
    lagerName: '',
    platz: null,
  }
}

export interface KisteEintrag extends Omit<EtikettDaten, 'platz' | 'lagerName'> {
  bereichId: string | null
}

export interface BereichEintrag {
  id: string
  name: string
}

export type PlatzZustand = 'aus' | 'laden' | 'fehler' | 'bereit'

export function EtikettenAnsicht({
  lagerName,
  tuerAdresse,
  kisten,
  bereiche,
  laedt,
  fehler,
  nochmal,
  vorauswahl,
  platzTexte,
  platzZustand,
  platzFehler,
  platzNochmal,
  platzGebraucht,
}: {
  lagerName: string
  tuerAdresse: string
  kisten: KisteEintrag[]
  bereiche: BereichEintrag[]
  laedt: boolean
  fehler: string | null
  nochmal: () => void
  /** Kisten, die schon angehakt sein sollen (aus der Adresse). */
  vorauswahl: string[] | null
  platzTexte: Map<string, string>
  platzZustand: PlatzZustand
  platzFehler: string | null
  platzNochmal: () => void
  /** Meldet, ob die Seite die Plaetze braucht (Schalter "Platz zeigen"). */
  platzGebraucht: (noetig: boolean) => void
}) {
  const { t, tn } = useSprache()
  const [gemerkt, setzeGemerkt] = useLocalState<unknown>('kistly.etiketten.v2', STANDARD)
  const cfg = useMemo(() => bereinige(gemerkt), [gemerkt])
  const aendere = (n: Partial<Einstellung>) => setzeGemerkt({ ...cfg, ...n })

  const [ansicht, setAnsicht] = useState<Ansicht>('kisten')
  const [auswahl, setAuswahl] = useState<Auswahl>(vorauswahl && vorauswahl.length > 0 ? 'einzeln' : 'alle')
  const [bereichId, setBereichId] = useState('')
  const [angehakt, setAngehakt] = useState<Set<string>>(() => new Set(vorauswahl ?? []))
  const [suche, setSuche] = useState('')

  const format = formatVon(cfg.format)
  const blatt = useMemo(() => blattmass(format, cfg.ausrichtung), [format, cfg.ausrichtung])
  const istRaster = format.art === 'raster'

  // Die Plaetze werden erst geladen, wenn sie gezeigt werden sollen.
  const platzNoetig = ansicht === 'kisten' && cfg.platz
  useEffect(() => {
    platzGebraucht(platzNoetig)
  }, [platzNoetig, platzGebraucht])

  /* ---- Welche Kisten */
  const gewaehlt = useMemo(() => {
    if (auswahl === 'bereich') {
      if (bereichId === '__keiner') return kisten.filter((k) => !k.bereichId)
      return bereichId ? kisten.filter((k) => k.bereichId === bereichId) : []
    }
    if (auswahl === 'einzeln') return kisten.filter((k) => angehakt.has(k.id))
    return kisten
  }, [auswahl, bereichId, angehakt, kisten])

  const hatOhneBereich = useMemo(() => kisten.some((k) => !k.bereichId), [kisten])
  const sichtbareListe = useMemo(() => {
    const q = suche.trim().toLowerCase()
    if (!q) return kisten
    return kisten.filter((k) => `${k.code} ${k.titel ?? ''} ${k.bereichName ?? ''}`.toLowerCase().includes(q))
  }, [kisten, suche])

  const daten = useMemo<EtikettDaten[]>(
    () =>
      gewaehlt.map((k) => ({
        id: k.id,
        code: k.code,
        titel: k.titel,
        bereichName: k.bereichName,
        bereichFarbe: k.bereichFarbe,
        inhalt: k.inhalt,
        qrWert: k.qrWert,
        lagerName,
        platz: platzTexte.get(k.id) ?? null,
      })),
    [gewaehlt, platzTexte, lagerName],
  )

  /* ---- Seiten */
  const bereit = !laedt && fehler === null
  const seiten = useMemo<EtikettDaten[][]>(() => {
    // Das Tuer-Etikett braucht keine Kiste; die Platzhalter zaehlen nur mit.
    if (ansicht === 'tuer') return [Array.from({ length: blatt.proSeite }, (_, i) => tuerPlatzhalter(i))]
    if (!bereit) return []
    return aufSeiten(daten, blatt.proSeite)
  }, [ansicht, bereit, daten, blatt.proSeite])
  const anzahl = ansicht === 'tuer' ? blatt.proSeite : daten.length

  /* ---- Druckregeln (nur solange die Seite steht) */
  const druckCss = useMemo(
    () =>
      [
        `@page { size: ${blatt.seitenB}mm ${blatt.seitenH}mm; margin: 0 }`,
        '@media print {',
        '  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important }',
        '  .etk-layout { display: block !important; margin: 0 !important; padding: 0 !important; max-width: none !important }',
        '  .etk-vorschau { display: block !important; overflow: visible !important; padding: 0 !important; margin: 0 !important; background: none !important; border: 0 !important }',
        `  .etk-seite { width: ${blatt.seitenB}mm !important; height: ${(blatt.seitenH - 0.4).toFixed(1)}mm !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; overflow: hidden !important; break-after: page; page-break-after: always }`,
        '  .etk-seite:last-child { break-after: auto; page-break-after: auto }',
        '  .etk-blatt { transform: none !important }',
        '  .etk-seite, .etk-seite * { -webkit-print-color-adjust: exact; print-color-adjust: exact }',
        '}',
      ].join('\n'),
    [blatt.seitenB, blatt.seitenH],
  )
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-kistly', 'etiketten-druck')
    el.textContent = druckCss
    document.head.appendChild(el)
    return () => el.remove()
  }, [druckCss])

  /* ---- Zoom der Vorschau */
  const vorschauRef = useRef<HTMLDivElement>(null)
  const [breite, setBreite] = useState(0)
  useEffect(() => {
    const el = vorschauRef.current
    if (!el) return
    const lies = () => setBreite(el.clientWidth)
    lies()
    const ro = new ResizeObserver(lies)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const zoom =
    cfg.zoom === 'halb'
      ? 0.5
      : cfg.zoom === 'voll'
        ? 1
        : breite > 0
          ? Math.min(1.6, Math.max(0.2, (breite - 24) / (blatt.seitenB * MM)))
          : 0.5

  const formatName = format.art === 'einzel' ? format.id.toUpperCase() : 'A4'
  const zusammen =
    anzahl === 0
      ? t('etiketten.keine_auswahl')
      : t('etiketten.zusammen', {
          etiketten: tn('etiketten.anzahl', anzahl),
          seiten: tn('etiketten.seiten', seiten.length),
        })
  const kannDrucken = seiten.length > 0 && (ansicht === 'tuer' || bereit)

  const optionen = { inhalt: cfg.inhalt, platz: cfg.platz, lager: cfg.lager, rahmen: cfg.rahmen }

  return (
    <div className="etk-layout mx-auto grid w-full max-w-[1600px] gap-4 px-3 py-4 sm:px-5 sm:py-6 lg:grid-cols-[23rem_minmax(0,1fr)] lg:items-start">
      {/* ------------------------------------------------ Einstellungen */}
      <aside className="no-print min-w-0 space-y-4">
        <Card className="p-4">
          <Segmented<Ansicht>
            label={t('etiketten.ansicht')}
            value={ansicht}
            onChange={setAnsicht}
            options={[
              { value: 'kisten', label: t('etiketten.ansicht_kisten') },
              { value: 'tuer', label: t('etiketten.ansicht_tuer') },
            ]}
          />
          {ansicht === 'tuer' ? <p className="t-sub mt-3">{t('lager.etikett_hinweis')}</p> : null}
        </Card>

        <Card className="p-4">
          <SectionTitle>{t('etiketten.format')}</SectionTitle>
          <div className="space-y-3">
            <Select
              aria-label={t('etiketten.format')}
              value={cfg.format}
              onChange={(e) => aendere({ format: waehle(e.target.value, FORMAT_IDS, cfg.format) })}
            >
              <optgroup label={t('etiketten.gruppe_einzel')}>
                {FORMATE.filter((f) => f.art === 'einzel').map((f) => (
                  <option key={f.id} value={f.id}>
                    {t('etiketten.format_einzel', { name: f.id.toUpperCase(), b: f.breite, h: f.hoehe })}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t('etiketten.gruppe_raster')}>
                {FORMATE.filter((f) => f.art === 'raster').map((f) => {
                  const m = blattmass(f, 'hoch')
                  return (
                    <option key={f.id} value={f.id}>
                      {t(f.mini ? 'etiketten.format_mini' : 'etiketten.format_raster', {
                        s: f.spalten,
                        z: f.zeilen,
                        b: Math.round(m.zelleB),
                        h: Math.round(m.zelleH),
                      })}
                    </option>
                  )
                })}
              </optgroup>
            </Select>

            {istRaster ? (
              <p className="t-sub">{t('etiketten.raster_hoch')}</p>
            ) : (
              <Segmented<Ausrichtung>
                label={t('etiketten.ausrichtung')}
                value={cfg.ausrichtung}
                onChange={(v) => aendere({ ausrichtung: v })}
                options={[
                  { value: 'hoch', label: t('etiketten.hoch') },
                  { value: 'quer', label: t('etiketten.quer') },
                ]}
              />
            )}
          </div>
        </Card>

        {ansicht === 'kisten' ? (
          <Card className="p-4">
            <SectionTitle>{t('etiketten.welche')}</SectionTitle>
            <Segmented<Auswahl>
              label={t('etiketten.welche')}
              value={auswahl}
              onChange={setAuswahl}
              options={[
                { value: 'alle', label: t('etiketten.sel_alle') },
                { value: 'bereich', label: t('etiketten.sel_bereich') },
                { value: 'einzeln', label: t('etiketten.sel_einzeln') },
              ]}
            />
            {auswahl === 'bereich' ? (
              <div className="mt-3">
                <Field label={t('begriff.bereich')}>
                  <Select value={bereichId} onChange={(e) => setBereichId(e.target.value)}>
                    <option value="">{t('etiketten.bereich_waehlen')}</option>
                    {bereiche.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    {hatOhneBereich ? <option value="__keiner">{t('etiketten.ohne_bereich')}</option> : null}
                  </Select>
                </Field>
              </div>
            ) : null}
            {auswahl === 'einzeln' ? (
              <div className="mt-3 space-y-2">
                <Input
                  type="search"
                  value={suche}
                  onChange={(e) => setSuche(e.target.value)}
                  placeholder={t('etiketten.suche')}
                  aria-label={t('etiketten.suche')}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="t-sub">{t('etiketten.n_angehakt', { n: angehakt.size })}</span>
                  <span className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAngehakt((alt) => new Set([...alt, ...sichtbareListe.map((k) => k.id)]))}
                    >
                      {t('etiketten.alle_anhaken')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAngehakt(new Set())}>
                      {t('etiketten.keine_anhaken')}
                    </Button>
                  </span>
                </div>
                <ul className="max-h-72 overflow-y-auto rounded-[12px] bg-feld">
                  {sichtbareListe.map((k) => (
                    <li key={k.id}>
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0"
                          checked={angehakt.has(k.id)}
                          onChange={(e) =>
                            setAngehakt((alt) => {
                              const neu = new Set(alt)
                              if (e.target.checked) neu.add(k.id)
                              else neu.delete(k.id)
                              return neu
                            })
                          }
                        />
                        <span className="t-serial shrink-0 text-base" dir="ltr">
                          {k.code}
                        </span>
                        <span className="min-w-0 truncate text-base text-muted">{k.titel ?? ''}</span>
                      </label>
                    </li>
                  ))}
                  {sichtbareListe.length === 0 ? (
                    <li className="px-3 py-3 text-base text-muted">{t('etiketten.suche_leer')}</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="px-4 py-2">
          {ansicht === 'kisten' ? (
            <>
              <Switch checked={cfg.inhalt} onChange={(v) => aendere({ inhalt: v })} label={t('etiketten.schalter_inhalt')} />
              <Switch checked={cfg.platz} onChange={(v) => aendere({ platz: v })} label={t('etiketten.schalter_platz')} />
              <Switch checked={cfg.lager} onChange={(v) => aendere({ lager: v })} label={t('etiketten.schalter_lager')} />
            </>
          ) : null}
          <Switch checked={cfg.rahmen} onChange={(v) => aendere({ rahmen: v })} label={t('etiketten.schalter_rahmen')} />
        </Card>

        <Button size="lg" full onClick={() => window.print()} disabled={!kannDrucken}>
          <Printer size={20} /> {t('aktion.drucken')}
        </Button>
      </aside>

      {/* ------------------------------------------------------ Vorschau */}
      <section className="min-w-0" aria-label={t('etiketten.vorschau')}>
        <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="t-name">{zusammen}</p>
            <p className="t-sub">{t('etiketten.druck_hinweis', { format: formatName })}</p>
          </div>
          <div className="w-full sm:w-72">
            <Segmented<Zoom>
              label={t('etiketten.vorschau')}
              value={cfg.zoom}
              onChange={(v) => aendere({ zoom: v })}
              options={[
                { value: 'fit', label: t('etiketten.zoom_fit') },
                { value: 'halb', label: t('etiketten.zoom_halb') },
                { value: 'voll', label: t('etiketten.zoom_voll') },
              ]}
            />
          </div>
        </div>

        {ansicht === 'kisten' && fehler ? (
          <div className="no-print mb-3">
            <ErrorBox error={fehler} onRetry={nochmal} />
          </div>
        ) : null}
        {ansicht === 'kisten' && platzNoetig && platzZustand === 'fehler' && platzFehler ? (
          <div className="no-print mb-3">
            <ErrorBox error={t('etiketten.platz_fehler', { grund: platzFehler })} onRetry={platzNochmal} />
          </div>
        ) : null}
        {ansicht === 'kisten' && laedt ? <Loading label={t('etiketten.laden')} /> : null}
        {ansicht === 'kisten' && platzNoetig && platzZustand === 'laden' ? (
          <p className="no-print t-sub mb-3">{t('etiketten.platz_laedt')}</p>
        ) : null}
        {ansicht === 'kisten' && bereit && daten.length === 0 ? (
          <div className="no-print">
            <Empty
              title={t('etiketten.nichts')}
              hint={t(kisten.length === 0 ? 'etiketten.nichts_keine_kisten' : 'etiketten.nichts_auswahl')}
            />
          </div>
        ) : null}

        <div
          ref={vorschauRef}
          className="etk-vorschau flex flex-col gap-4 overflow-x-auto rounded-karte bg-raised p-3"
          style={{ display: seiten.length === 0 ? 'none' : undefined }}
        >
          {seiten.map((seite, si) => (
            <div
              key={si}
              className="etk-seite mx-auto shrink-0"
              style={{
                position: 'relative',
                width: `${(blatt.seitenB * MM * zoom).toFixed(1)}px`,
                height: `${(blatt.seitenH * MM * zoom).toFixed(1)}px`,
                background: '#ffffff',
                borderRadius: 2,
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.16)',
              }}
            >
              <div
                className="etk-blatt"
                dir="ltr"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: `${blatt.seitenB}mm`,
                  height: `${blatt.seitenH}mm`,
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${blatt.rand}mm`,
                    top: `${blatt.rand}mm`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${blatt.spalten}, ${blatt.zelleB}mm)`,
                    gridTemplateRows: `repeat(${blatt.zeilen}, ${blatt.zelleH}mm)`,
                  }}
                >
                  {ansicht === 'tuer'
                    ? seite.map((d) => (
                        <TuerEtikett
                          key={d.id}
                          name={lagerName}
                          adresse={tuerAdresse}
                          w={blatt.zelleB}
                          h={blatt.zelleH}
                          mini={blatt.mini}
                          rahmen={cfg.rahmen}
                        />
                      ))
                    : seite.map((d, i) => (
                        <Etikett
                          key={`${d.id}-${si}-${i}`}
                          daten={d}
                          w={blatt.zelleB}
                          h={blatt.zelleH}
                          mini={blatt.mini}
                          optionen={optionen}
                        />
                      ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
