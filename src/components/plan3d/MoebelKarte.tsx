import { useEffect, useId, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react'
import { ArrowLeft, ChevronRight, ExternalLink, Footprints, MapPin, SearchX, X } from 'lucide-react'
import { useSprache } from '../../lib/i18n'
import type { Objekt } from '../../lib/types'
import { cx } from '../../lib/util'
import { Button } from '../ui'
import { BLATT_KLASSEN, masseText, preisText, shopLink } from './moebelInfo'

/* Karte eines Moebels in der 3D-Begehung (E92), wie die Kistenkarte
 * (KistenKarte.tsx): Rechtsklick (am Handy langes Druecken) auf ein Moebel,
 * Regal oder einen Schrank, im Menue "Details". Zu sehen: Name, Art,
 * Masse (und wie hoch es haengt), Material, Zimmer, Preis, Link zum Shop,
 * wie viele Kisten darauf oder darin stehen und, wenn es zu einem Eintrag
 * der Moebel gehoert und ein Umzug offen ist, der Weg zur Moebelseite.
 * "Zurueck" fuehrt in die Begehung. Am Handy ein Blatt von unten, ab md
 * eine Leiste rechts.
 *
 * Wie die Kistenkarte liegt sie absolut in ihrem Elternteil, ohne Portal
 * (im Vollbild laege alles an body unsichtbar dahinter). Alles kommt aus
 * dem Plan, der schon geladen ist: es gibt nichts nachzuladen, also auch
 * kein Laden und keinen Ladefehler. Fehlt das Moebel (inzwischen geloescht,
 * neue Daten), steht das klar da statt einer leeren Karte. Fehlen Preis,
 * Material und Shop, sagt ein Satz, dass sie nicht eingetragen sind.
 * Escape regelt die einbindende Seite.
 *
 * E94: Auch der Grundriss (Ansehen, am Handy) zeigt sie, wenn man ein
 * Moebel, Regal oder einen Schrank antippt. form sagt wo: 'blatt' in der
 * grossen Ansicht (unten in der Spalte unter dem Plan, hoechstens halb so
 * hoch, der Plan rueckt darueber zusammen; ab md eine Leiste daneben),
 * 'block' unter dem Plan im Fluss der Seite. In beiden heisst der Knopf oben "Schliessen", unten
 * steht nur der Weg zur Moebelseite (wenn es sie gibt). children stehen
 * unter den Angaben (Regal und Schrank: die Faecher, FachAnsicht).
 */

export interface MoebelKarteProps {
  /** Das Objekt aus dem Plan, oder null, wenn es das nicht mehr gibt. */
  objekt: Objekt | null
  /** Name des Raums im Grundriss, in dem es steht, oder null. */
  raumName: string | null
  /** Wie viele Kisten darauf oder darin stehen (auch gestapelte). */
  kisten: number
  /** Pfad der Moebelseite in der App, oder null (kein Eintrag, kein Umzug). */
  seite: string | null
  /** Beide Zurueck-Knoepfe: Karte zu, weiter in der Begehung. */
  onZurueck(): void
  /** "Moebelseite oeffnen": der Pfad aus seite. */
  onSeite(pfad: string): void
  /** Kam man aus dem Begehen? Dann heisst der untere Knopf "Zurueck zur
   *  Begehung", sonst "Zurueck zur 3D-Ansicht". Ohne Angabe: ja. */
  begehen?: boolean
  /** Wo die Karte steht (E94): 'begehen' (Standard, 3D), 'blatt' (grosse
   *  Ansicht des Grundrisses) oder 'block' (unter dem Plan). */
  form?: 'begehen' | 'blatt' | 'block'
  /** Unter den Angaben, etwa die Faecher eines Regals (E94). */
  children?: ReactNode
}

/** Nichts, was auf der Karte passiert, darf in der Szene ankommen: ein
 *  Tippen oder Scrollen hier soll weder umschauen noch zoomen. */
function anhalten(e: SyntheticEvent) {
  e.stopPropagation()
}

/** Tasten auf der Karte gehoeren der Karte (wie bei der Kistenkarte).
 *  Escape geht weiter: das schliesst die Karte, das regelt die Seite. */
function tastenHalten(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'Escape') e.stopPropagation()
}

export default function MoebelKarte(props: MoebelKarteProps) {
  /* Ein anderes Moebel ist eine neue Karte: der Schluessel setzt alles
   * zurueck, auch den Fokus. */
  return <Karte key={props.objekt?.id ?? 'weg'} {...props} />
}

/** Eine Zeile mit Begriff und Wert. */
function Zeile({ begriff, children }: { begriff: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
      <dt className="t-sub min-w-28 shrink-0">{begriff}</dt>
      <dd className="min-w-0 flex-1 break-words text-base font-semibold">{children}</dd>
    </div>
  )
}

function Karte({ objekt, raumName, kisten, seite, onZurueck, onSeite, begehen = true, form = 'begehen', children }: MoebelKarteProps) {
  const { t, tn, dir } = useSprache()
  const titelId = useId()
  const zurueckId = useId()

  // Beim Oeffnen steht der Fokus auf "Zurueck": ein Enter, und man geht weiter.
  useEffect(() => {
    document.getElementById(zurueckId)?.focus({ preventScroll: true })
  }, [zurueckId])

  const farbe = objekt?.farbe ?? 'var(--line)'
  const preis = objekt ? preisText(objekt.preis_cent) : null
  const link = objekt ? shopLink(objekt.link) : null
  const material = objekt?.material ?? null
  const boden = objekt ? Math.round(objekt.boden_cm ?? 0) : 0
  // Im Grundriss (E94) schliesst die Karte nur, es geht nirgends zurueck.
  const imPlan = form !== 'begehen'

  return (
    <div
      role="dialog"
      aria-labelledby={titelId}
      dir={dir}
      data-moebel-karte={form}
      onPointerDown={anhalten}
      onWheel={anhalten}
      onKeyDown={tastenHalten}
      className={cx(
        'animate-in flex flex-col overflow-hidden border border-line bg-surface text-ink',
        form === 'block'
          ? // Unter dem Plan, im Fluss der Seite (E94).
            'relative rounded-2xl'
          : form === 'blatt'
            ? // Grosse Ansicht (E94): unter dem Plan in derselben Spalte, hoechstens
              // halb so hoch; der Plan rueckt darueber zusammen, das Angetippte
              // bleibt zu sehen. Ab md eine Leiste neben dem Plan.
              cx(BLATT_KLASSEN)
            : cx(
                'absolute bottom-0 left-0 right-0 z-40 max-h-[70%] rounded-t-3xl border-b-0 shadow-dialog',
                // Ab md eine Leiste rechts, oben bis unten mit Rand (wie die Kistenkarte).
                'md:bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:left-auto md:right-[calc(env(safe-area-inset-right,0px)+0.75rem)] md:top-[calc(env(safe-area-inset-top,0px)+0.75rem)]',
                'md:max-h-none md:w-96 md:max-w-[calc(100%-1.5rem)] md:rounded-karte md:border-b',
              ),
      )}
    >
      {/* Farbstreifen: die Farbe des Moebels im Plan, sonst neutral. */}
      <div aria-hidden="true" className="h-1.5 shrink-0" style={{ background: farbe }} />

      {/* Kopfleiste: Zurueck und, wenn verknuepft, die Nummer des Eintrags. */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 [@media(max-height:30rem)]:py-1.5">
        <Button id={zurueckId} variant="outline" onClick={onZurueck} className="shrink-0">
          {imPlan ? <X size={20} className="shrink-0" /> : <ArrowLeft size={20} className="spiegeln shrink-0" />}
          {imPlan ? t('aktion.schliessen') : t('aktion.zurueck')}
        </Button>
        <span className="min-w-0 flex-1" />
        {objekt?.item_code ? (
          // Nummern immer links nach rechts.
          <span dir="ltr" data-moebel-nummer="" className="t-serial shrink-0 rounded-lg border-2 border-line bg-raised px-2.5 py-1 text-lg leading-none">
            {objekt.item_code}
          </span>
        ) : null}
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {!objekt ? (
          // Veraltet: das Moebel ist nicht mehr im Plan.
          <>
            <h2 id={titelId} className="sr-only">
              {t('plan3d.menue_details')}
            </h2>
            <p role="status" data-moebel-weg="" className="flex items-start gap-2 py-4 text-base text-muted">
              <SearchX size={20} className="mt-0.5 shrink-0" />
              <span dir="auto">{t('plan3d.moebel_weg')}</span>
            </p>
          </>
        ) : (
          <>
            <h2 id={titelId} dir="auto" data-moebel-name="" className="t-name-lg break-words">
              {objekt.name || t(`plan.${objekt.art}`)}
            </h2>
            {raumName ? (
              <p className="t-sub mt-1 flex items-center gap-1.5">
                <MapPin size={15} className="shrink-0" />
                <span dir="auto" className="min-w-0 truncate">
                  {raumName}
                </span>
              </p>
            ) : null}

            <dl className="mt-3 divide-y divide-line border-y border-line">
              <Zeile begriff={t('plan3d.moebel_art')}>{t(`plan.${objekt.art}`)}</Zeile>
              <Zeile begriff={t('moebel.masse')}>
                <span dir="ltr" data-moebel-masse="" className="t-serial">
                  {masseText(objekt)}
                </span>
                <span className="t-sub block">{t('moebel.masse_platzhalter')}</span>
                {boden > 0 ? (
                  <span dir="auto" data-moebel-haengt="" className="t-sub block">
                    {t('plan3d.moebel_haengt', { n: boden })}
                  </span>
                ) : null}
              </Zeile>
              {material ? <Zeile begriff={t('plan3d.moebel_material')}>{t(`plan3d.material.${material}`)}</Zeile> : null}
              {preis ? (
                <Zeile begriff={t('plan3d.moebel_preis')}>
                  <span dir="ltr" data-moebel-preis="" className="t-serial">
                    {preis}
                  </span>
                </Zeile>
              ) : null}
              {objekt.link ? (
                <Zeile begriff={t('plan3d.moebel_shop')}>
                  {link ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-moebel-shop=""
                      title={t('plan3d.moebel_shop_neu', { host: link.host })}
                      aria-label={t('plan3d.moebel_shop_neu', { host: link.host })}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border-2 border-ink px-2.5 py-1 text-sm font-bold text-ink hover:bg-raised"
                    >
                      <ExternalLink size={14} className="shrink-0" />
                      <span dir="ltr" className="min-w-0 truncate">
                        {link.host}
                      </span>
                    </a>
                  ) : (
                    // Nicht still: der Link steht da, ist aber kein Link.
                    <span dir="auto" className="break-all text-sm text-danger">
                      {t('plan3d.moebel_shop_ungueltig', { link: objekt.link })}
                    </span>
                  )}
                </Zeile>
              ) : null}
              <Zeile begriff={t('plan3d.moebel_kisten')}>
                <span data-moebel-kisten={kisten}>{kisten > 0 ? tn('begriff.kisten_anzahl', kisten) : t('plan3d.moebel_keine_kisten')}</span>
              </Zeile>
            </dl>
            {!material && !preis && !objekt.link ? <p className="t-sub mt-3">{t('plan3d.moebel_ohne_angaben')}</p> : null}
            {children ? <div className="mt-3">{children}</div> : null}
          </>
        )}
      </div>

      {/* Fussleiste: zur Moebelseite (wenn es sie gibt) und zurueck. Bei
          sehr wenig Hoehe (Handy quer) faellt neben der Moebelseite das
          untere Zurueck weg, das obere tut dasselbe. Im Grundriss (E94)
          nur der Weg zur Moebelseite, ohne ihn keine Fussleiste. */}
      {imPlan ? (
        objekt && seite ? (
          // Bei wenig Hoehe (Handy quer) schmaler, wie die Fussleiste beim Begehen.
          <div
            className={cx(
              'shrink-0 border-t border-line bg-surface px-3 py-3 [@media(max-height:30rem)]:pt-2',
              form === 'blatt' && 'pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-3 [@media(max-height:30rem)]:pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]',
            )}
          >
            <Button full variant="outline" data-moebel-seite="" onClick={() => onSeite(seite)}>
              {t('plan3d.moebel_seite')}
              <ChevronRight size={18} className="spiegeln shrink-0" />
            </Button>
          </div>
        ) : null
      ) : (
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line bg-surface px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-3 [@media(max-height:30rem)]:pt-2 [@media(max-height:30rem)]:pb-2">
        {objekt && seite ? (
          <Button full size="sm" variant="outline" data-moebel-seite="" onClick={() => onSeite(seite)}>
            {t('plan3d.moebel_seite')}
            <ChevronRight size={18} className="spiegeln shrink-0" />
          </Button>
        ) : null}
        <Button
          full
          size="sm"
          variant="outline"
          onClick={onZurueck}
          className={objekt && seite ? '[@media(max-height:30rem)]:hidden' : 'col-span-2'}
        >
          <Footprints size={18} className="shrink-0" />
          {begehen ? t('schnell.zur_begehung') : t('schnell.zur_ansicht')}
        </Button>
      </div>
      )}
    </div>
  )
}
