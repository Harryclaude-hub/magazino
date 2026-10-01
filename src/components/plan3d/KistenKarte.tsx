import { useEffect, useId, useState, type KeyboardEvent, type SyntheticEvent } from 'react'
import { ArrowLeft, ChevronRight, Footprints, ImageOff, MapPin, Package, PackageOpen } from 'lucide-react'
import { ladeKistenKarte } from '../../lib/api'
import { useSprache } from '../../lib/i18n'
import { signedUrl } from '../../lib/media'
import type { Item, ItemContent, PlanKiste } from '../../lib/types'
import { cx } from '../../lib/util'
import { zielFuerItem } from '../ItemRow'
import { FuellBalken } from '../Fuellstand'
import { Button, ErrorBox, Spinner, StatusPill } from '../ui'

/* Karte einer Kiste in der 3D-Begehung (E82).
 *
 * Wer beim Begehen auf eine Kiste tippt, sieht hier, was fuer eine Kiste
 * das ist, kann sie oeffnen und kommt mit "Zurueck" wieder in die
 * Begehung. Am Handy ein Blatt von unten, ab md eine Leiste rechts.
 *
 * Die Karte liegt absolut in ihrem Elternteil, ohne Portal: die 3D-Ansicht
 * kann im Vollbild sein, und alles, was an body haengt, laege dann
 * unsichtbar dahinter. Wer die Flaeche begrenzen will (etwa unter der
 * Leiste im Vollbild), legt sie in ein eigenes, positioniertes Kaestchen.
 *
 * Der Kopf steht sofort da, aus den Angaben im Plan (PlanKiste). Nur Bild
 * und Inhalt werden nachgeladen, mit drei getrennten Zustaenden: laedt,
 * Fehler mit "Nochmal", leer. Escape regelt die einbindende Seite.
 */

export interface KistenKarteProps {
  kiste: PlanKiste
  /** Name des Raums im Grundriss, in dem die Kiste steht, oder null. */
  raumName: string | null
  projectId: string
  /** Ist die Kiste in der Szene gerade offen? Bestimmt den Hauptknopf. */
  offen: boolean
  /** Hauptknopf: oeffnet die Kiste, oder schliesst sie, wenn sie offen ist. */
  onOeffnen(): void
  /** Beide Zurueck-Knoepfe: Karte zu, weiter in der Begehung. */
  onZurueck(): void
  /** "Ganz oeffnen": die volle Seite dieser Kiste, als Pfad in der App. */
  onGanzOeffnen(pfad: string): void
  /** Kam man aus dem Begehen? Dann heisst der untere Knopf "Zurueck zur
   *  Begehung", sonst "Zurueck zur 3D-Ansicht". Ohne Angabe: ja. */
  begehen?: boolean
}

interface Geladen {
  item: Item
  contents: ItemContent[]
  coverPath: string | null
}

/** Nichts, was auf der Karte passiert, darf in der Szene ankommen: ein
 *  Tippen oder Scrollen hier soll weder umschauen noch zoomen. */
function anhalten(e: SyntheticEvent) {
  e.stopPropagation()
}

/** Tasten auf der Karte gehoeren der Karte. Sonst liefe man mit den
 *  Pfeiltasten los, statt die Liste zu blaettern, und Leertaste oder Enter
 *  auf einem Knopf kaemen auch beim Motor an. Escape geht weiter: das
 *  schliesst die Karte, und das regelt die einbindende Seite. */
function tastenHalten(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Escape') e.stopPropagation()
}

export default function KistenKarte(props: KistenKarteProps) {
  /* Eine andere Kiste ist eine neue Karte. Der Schluessel setzt dabei
   * allen Zustand zurueck, auch Bild und Fehler der vorigen Kiste: sonst
   * stuende kurz der Inhalt der falschen Kiste da. */
  return <Karte key={props.kiste.id} {...props} />
}

function Karte({
  kiste,
  raumName,
  projectId,
  offen,
  onOeffnen,
  onZurueck,
  onGanzOeffnen,
  begehen = true,
}: KistenKarteProps) {
  const { t, dir } = useSprache()
  const titelId = useId()
  const zurueckId = useId()

  const [daten, setDaten] = useState<Geladen | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [bild, setBild] = useState<string | null>(null)
  const [bildFehler, setBildFehler] = useState(false)
  /** Zaehlt "Nochmal" hoch und laedt damit neu. */
  const [versuch, setVersuch] = useState(0)

  // Beim Oeffnen steht der Fokus auf "Zurueck": ein Enter, und man geht weiter.
  useEffect(() => {
    document.getElementById(zurueckId)?.focus({ preventScroll: true })
  }, [zurueckId])

  useEffect(() => {
    let lebt = true
    void (async () => {
      try {
        const d = await ladeKistenKarte(kiste.id)
        if (!lebt) return
        setDaten(d)
        setLaedt(false)
        if (!d.coverPath) return
        // Das Bild darf scheitern, ohne den Inhalt mitzunehmen. Es meldet
        // sich dann an seiner Stelle, nicht still.
        try {
          const url = await signedUrl('item-photos', d.coverPath)
          if (!lebt) return
          if (url) setBild(url)
          else setBildFehler(true)
        } catch (err) {
          console.warn('[kistenkarte] Deckbild nicht geladen:', err)
          if (lebt) setBildFehler(true)
        }
      } catch (err) {
        if (!lebt) return
        setFehler(err instanceof Error ? err.message : String(err))
        setLaedt(false)
      }
    })()
    return () => {
      lebt = false
    }
  }, [kiste.id, versuch])

  function nochmal() {
    setDaten(null)
    setFehler(null)
    setBild(null)
    setBildFehler(false)
    setLaedt(true)
    setVersuch((v) => v + 1)
  }

  function ganzOeffnen() {
    /* Mit geladener Kiste genau der Weg jeder Liste. Vorher genuegen
     * Nummer und Art aus dem Plan, mehr liest zielFuerItem nicht. So gibt
     * es den Weg nur an einer Stelle. */
    const quelle: Pick<Item, 'id' | 'kind'> = daten?.item ?? { id: kiste.id, kind: kiste.kind }
    onGanzOeffnen(zielFuerItem(projectId, quelle as Item))
  }

  // Sobald die Kiste geladen ist, gelten ihre frischen Angaben. Bis dahin
  // die aus dem Plan; die Raumfarbe kennt nur der Plan.
  const item = daten?.item ?? null
  const prefix = item ? item.prefix : kiste.prefix
  const groesse = item ? item.size : kiste.size
  const seq = item ? item.seq : kiste.seq
  const code = item ? item.code : kiste.code
  const art = item ? item.kind : kiste.kind
  const titel = (item ? item.title : kiste.title) || t(`art.${art}`)
  const status = item ? item.status : kiste.status
  const fuellstand = item ? item.fuellstand : (kiste.fuellstand ?? null)
  const farbe = (item ? item.mark_color : kiste.mark_color) ?? kiste.room_color ?? 'var(--line)'
  const inhalt = daten?.contents ?? []

  return (
    <div
      role="dialog"
      aria-labelledby={titelId}
      dir={dir}
      onPointerDown={anhalten}
      onWheel={anhalten}
      onKeyDown={tastenHalten}
      className={cx(
        'animate-in absolute bottom-0 left-0 right-0 z-40 flex max-h-[70%] flex-col overflow-hidden',
        'rounded-t-3xl border border-b-0 border-line bg-surface text-ink shadow-dialog',
        // Ab md eine Leiste rechts, oben bis unten mit Rand. Quer gehaltene
        // Handys sind auch md: dann zaehlen die Aussparungen am Rand mit.
        'md:bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:left-auto md:right-[calc(env(safe-area-inset-right,0px)+0.75rem)] md:top-[calc(env(safe-area-inset-top,0px)+0.75rem)]',
        'md:max-h-none md:w-96 md:max-w-[calc(100%-1.5rem)] md:rounded-karte md:border-b',
      )}
    >
      {/* Farbstreifen der Kiste: Markierung, sonst Zimmerfarbe. */}
      <div aria-hidden="true" className="h-1.5 shrink-0" style={{ background: farbe }} />

      {/* Kopfleiste: Zurueck und Nummer. Bleibt stehen, auch wenn die
          Liste darunter blaettert. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 [@media(max-height:30rem)]:py-1.5">
        <Button id={zurueckId} variant="outline" onClick={onZurueck} className="shrink-0">
          <ArrowLeft size={20} className="spiegeln shrink-0" />
          {t('aktion.zurueck')}
        </Button>
        <span className="min-w-0 flex-1" />
        {/* Die Nummer wie auf dem Etikett, immer links nach rechts. */}
        <span
          dir="ltr"
          title={code}
          className="t-serial inline-flex shrink-0 items-baseline rounded-lg border-2 bg-raised px-2.5 py-1 text-2xl leading-none"
          style={{ borderColor: farbe }}
        >
          {prefix}
          <span className="opacity-40">-</span>
          <span className="text-danger">{groesse}</span>
          <span className="opacity-40">-</span>
          {String(seq).padStart(3, '0')}
        </span>
      </div>

      {/* Alles dazwischen blaettert. So bleibt auch am quer gehaltenen
          Handy mit wenig Hoehe Platz fuer den Inhalt. */}
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <h2 id={titelId} dir="auto" className="t-name-lg break-words">
          {titel}
        </h2>
        {raumName ? (
          <p className="t-sub mt-1 flex items-center gap-1.5">
            <MapPin size={15} className="shrink-0" />
            <span dir="auto" className="min-w-0 truncate">
              {raumName}
            </span>
          </p>
        ) : null}

        {/* Status, zerbrechlich und Fuellstand in einer Zeile: am Handy
            bleibt so Hoehe fuer Bild und Inhalt. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusPill status={status} />
          {item?.fragile ? (
            <span className="rounded-lg border-2 border-warn/40 bg-warn/10 px-2 py-0.5 text-sm font-black text-warn">
              {t('begriff.zerbrechlich')}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <span className="t-sub">{t('fuellstand.titel')}</span>
            <FuellBalken wert={fuellstand} />
          </span>
        </div>

        {/* Nachgeladen: Deckbild und Inhalt. */}
        <div className="mt-4 border-t border-line pt-4">
          {laedt ? (
            <p role="status" className="t-sub flex items-center gap-2 py-4">
              <Spinner />
              {t('schnell.inhalt_laedt')}
            </p>
          ) : fehler ? (
            <ErrorBox error={fehler} onRetry={nochmal} />
          ) : daten ? (
            <>
              {daten.coverPath ? (
                bildFehler ? (
                  <p className="t-sub mb-4 flex items-center gap-2 rounded-karte border border-dashed border-line px-3 py-3">
                    <ImageOff size={18} className="shrink-0" />
                    {t('kisten.bild_fehlt')}
                  </p>
                ) : bild ? (
                  <img
                    src={bild}
                    alt={t('schnell.deckbild')}
                    loading="lazy"
                    decoding="async"
                    onError={() => setBildFehler(true)}
                    className="mb-4 h-36 w-full rounded-karte border border-line object-cover sm:h-44 md:h-48"
                  />
                ) : (
                  <span aria-hidden="true" className="skelett mb-4 h-36 w-full rounded-karte sm:h-44 md:h-48" />
                )
              ) : null}

              <p className="t-sub mb-1.5">
                {t('begriff.inhalt')}
                {inhalt.length > 0 ? ` (${inhalt.length})` : ''}
              </p>
              {inhalt.length === 0 ? (
                <p className="text-base text-muted">{t('schnell.inhalt_leer')}</p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-karte border border-line">
                  {inhalt.map((c) => (
                    <li key={c.id} className="flex items-baseline gap-3 px-3 py-2">
                      {/* Die Menge vorn und gross: "3x Zwiebel". */}
                      <span className="t-serial min-w-9 shrink-0 text-center text-lg">{c.qty}x</span>
                      <span
                        dir="auto"
                        className={cx(
                          'min-w-0 flex-1 break-words text-base font-semibold',
                          c.checked && 'text-muted line-through',
                        )}
                      >
                        {c.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Fussleiste: die drei Wege, immer erreichbar. Am Handy mit Abstand
          zur Leiste unten am Bildschirm. Die beiden kleinen Knoepfe stehen
          zu zweit, damit Hoehe fuer den Inhalt bleibt; ein langer Name
          bricht im Knopf um. Bei sehr wenig Hoehe (Handy quer) steht alles
          in einer Reihe, und das untere Zurueck faellt weg: das obere tut
          dasselbe und bleibt immer sichtbar. */}
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line bg-surface px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-3 [@media(max-height:30rem)]:pt-2 [@media(max-height:30rem)]:pb-2">
        <Button full onClick={onOeffnen} className="col-span-2 [@media(max-height:30rem)]:col-span-1">
          {offen ? <Package size={20} className="shrink-0" /> : <PackageOpen size={20} className="shrink-0" />}
          {offen ? t('schnell.kiste_schliessen') : t('schnell.kiste_oeffnen')}
        </Button>
        <Button full size="sm" variant="outline" onClick={ganzOeffnen}>
          {t('schnell.oeffnen')}
          <ChevronRight size={18} className="spiegeln shrink-0" />
        </Button>
        <Button full size="sm" variant="outline" onClick={onZurueck} className="[@media(max-height:30rem)]:hidden">
          <Footprints size={18} className="shrink-0" />
          {begehen ? t('schnell.zur_begehung') : t('schnell.zur_ansicht')}
        </Button>
      </div>
    </div>
  )
}
