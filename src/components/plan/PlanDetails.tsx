import { useEffect, useId, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { cmText } from '../../lib/geometrie'
import { useSprache } from '../../lib/i18n'
import type { GrundrissDaten, Item } from '../../lib/types'
import { cx } from '../../lib/util'
import { zielFuerItem } from '../ItemRow'
import MoebelKarte from '../plan3d/MoebelKarte'
import { BLATT_KLASSEN, kistenAuf, traegerKarte } from '../plan3d/moebelInfo'
import { Button, CodeChip, IconButton } from '../ui'
import { FachAnsicht } from './FachAnsicht'
import { schnellUebersicht, type SchnellUebersicht } from './handyMessen'
import { flaecheQm, raumTitel, type PlanTreffer } from './hilfe'

/* Was im Grundriss beim Ansehen angetippt ist (E94), fuer die Seite unter
 * dem Plan (form 'block') und die grosse Ansicht (form 'blatt', ein Blatt
 * von unten, hoechstens halb so hoch, der Plan bleibt zu sehen):
 *
 *   objekt    Moebel, Regal oder Schrank: die Moebelkarte aus der
 *             3D-Begehung (MoebelKarte.tsx, ohne three) mit Name, Masse,
 *             Hoehe ueber dem Boden, Material, Zimmer, Preis, Link, Kisten
 *             darauf und dem Weg zur Moebelseite; Regal und Schrank dazu
 *             mit ihren Faechern (FachAnsicht).
 *   kiste     die kleine Karte wie bisher (Nummer, Hoehe, Zur Kiste).
 *   raum      Name, Nutzflaeche (flaecheQm, an der Innenseite der Wand)
 *             und Raumhoehe. Nur in der grossen Ansicht: unter dem Plan
 *             waehlt ein Tipp auf einen Raum den Raum (wie bisher).
 *   oeffnung  Tuer, Durchgang oder Fenster mit Lichte und den Abstaenden
 *             bis zur Innenecke (dieselben Schnellmasse wie beim Messen,
 *             im Plan gezeichnet). Bei einer Tuer statt der Lichte zwei
 *             Breiten: frei fuer Moebel (zwischen der Zarge) und die
 *             Maueroeffnung (E88). Links und rechts gelten im jeweiligen
 *             Raum mit Blick zur Wand, das steht darunter.
 *
 * Alles kommt aus dem Plan, der schon geladen ist: kein Laden, kein
 * Ladefehler. Fehlt das Angetippte inzwischen (neue Daten), zeigt die
 * Moebelkarte das selbst; Kiste, Raum und Oeffnung zeigen dann nichts.
 */

interface TippDetailsProps {
  daten: GrundrissDaten
  tipp: PlanTreffer | null
  /** Der offene Umzug: der Weg zur Moebelseite nur, wenn der Plan zu ihm
   *  gehoert. */
  projektId: string
  /** Die gesuchte Kiste (rot in den Faechern). */
  hervor: string | null
  form: 'blatt' | 'block'
  onZu(): void
  /** "Moebelseite oeffnen" mit dem Pfad in der App. */
  onSeite(pfad: string): void
}

export function TippDetails({ daten, tipp, projektId, hervor, form, onZu, onSeite }: TippDetailsProps) {
  const { t, lang } = useSprache()
  const traeger = useMemo(() => traegerKarte(daten.kisten), [daten.kisten])
  if (!tipp) return null

  if (tipp.art === 'objekt') {
    const o = daten.objekte.find((x) => x.id === tipp.id) ?? null
    const raum = o ? (daten.raeume.find((r) => r.id === o.raum_id) ?? null) : null
    const seite =
      o?.item_id && daten.grundriss.project_id === projektId
        ? zielFuerItem(projektId, { id: o.item_id, kind: 'furniture' } as Item)
        : null
    return (
      <MoebelKarte
        form={form}
        objekt={o}
        raumName={raum ? raumTitel(raum) || null : null}
        kisten={o ? kistenAuf(traeger, o.id) : 0}
        seite={seite}
        onZurueck={onZu}
        onSeite={onSeite}
      >
        {o && o.art !== 'moebel' ? <FachAnsicht objekt={o} kisten={daten.kisten} hervor={hervor} /> : null}
      </MoebelKarte>
    )
  }

  if (tipp.art === 'kiste') {
    const k = daten.kisten.find((x) => x.id === tipp.id)
    if (!k) return null
    const inhalt = (
      <div data-plan-kiste={k.id} className={cx('flex flex-wrap items-center gap-3', form === 'block' && 'rounded-2xl border border-line bg-surface p-3')}>
        <CodeChip code={k.code} />
        <span className="t-sub min-w-0 flex-1">{t('lage.hoehe', { von: k.unten_cm, bis: k.oben_cm })}</span>
        <Link to={`/app/p/${projektId}/kisten/${k.id}`}>
          <Button size="sm" variant="outline" className="min-h-11">
            {t('suche.zur_kiste')}
          </Button>
        </Link>
      </div>
    )
    // Unter dem Plan wie bisher, ohne eigenen Rahmen zum Schliessen.
    return form === 'block' ? inhalt : <Blatt titel={k.code} art="kiste" onZu={onZu}>{inhalt}</Blatt>
  }

  if (tipp.art === 'raum') {
    const r = daten.raeume.find((x) => x.id === tipp.id)
    if (!r) return null
    const qm = flaecheQm(r.punkte)
    const qmText = lang === 'ar' ? String(qm) : String(qm).replace('.', ',')
    const inhalt = (
      <dl className="divide-y divide-line border-b border-line">
        <Zeile begriff={t('grundriss.raum_flaeche')}>
          {/* Wie im Plan: Monoschrift; im Arabischen mit eigener Leserichtung
              (style schlaegt die ltr der Klasse t-serial), damit "4.47 م²"
              nicht zerfaellt. */}
          <span data-plan-flaeche={qm} className="t-serial" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            {t('plan.m2', { n: qmText })}
          </span>
        </Zeile>
        <Zeile begriff={t('grundriss.raum_hoehe')}>
          {/* Dieselbe Leserichtung wie die Flaeche darueber und das Etikett
              im Plan: im Arabischen steht "م" links der Zahl. */}
          <span data-plan-hoehe={r.hoehe_cm} className="t-serial" style={{ direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            {cmText(r.hoehe_cm, lang)}
          </span>
        </Zeile>
      </dl>
    )
    return (
      <Huelle form={form} titel={raumTitel(r) || t('plan.raum_ohne_name')} art="raum" onZu={onZu}>
        {inhalt}
      </Huelle>
    )
  }

  // Tuer, Durchgang oder Fenster.
  const o = daten.oeffnungen.find((x) => x.id === tipp.id)
  const r = o ? daten.raeume.find((x) => x.id === o.raum_id) : null
  const u = o ? schnellUebersicht(daten, o.id) : null
  if (!o || !r || !u) return null
  const was = o.art === 'tuer' ? t('plan.tuer') : o.art === 'fenster' ? t('plan.fenster') : t('plan.durchgang')
  const raumName = raumTitel(r)
  return (
    <Huelle form={form} titel={raumName ? t('grundriss.oeffnung_name', { was, raum: raumName }) : was} art="oeffnung" onZu={onZu}>
      <SchnellListe u={u} />
    </Huelle>
  )
}

/** Eine Zeile mit Begriff und Wert (wie in der Moebelkarte). */
function Zeile({ begriff, children }: { begriff: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
      <dt className="t-sub min-w-28 shrink-0">{begriff}</dt>
      <dd className="min-w-0 flex-1 break-words text-base font-semibold">{children}</dd>
    </div>
  )
}

/** Unter dem Plan ein Kasten mit Titel und X, in der grossen Ansicht das Blatt. */
function Huelle({ form, titel, art, onZu, children }: { form: 'blatt' | 'block'; titel: string; art: string; onZu(): void; children: ReactNode }) {
  const { t } = useSprache()
  if (form === 'blatt') {
    return (
      <Blatt titel={titel} art={art} onZu={onZu}>
        {children}
      </Blatt>
    )
  }
  return (
    <section data-plan-blatt={art} className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <h2 dir="auto" className="t-name min-w-0 flex-1 break-words">
          {titel}
        </h2>
        <IconButton label={t('aktion.schliessen')} onClick={onZu}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </section>
  )
}

/** Das Blatt in der grossen Ansicht (wie die Moebelkarte in form
 *  'blatt'): unten in der Spalte unter dem Plan, hoechstens halb so hoch,
 *  rollt selbst, eigener Knopf zum Schliessen; ab md eine Leiste neben
 *  dem Plan. Der Fokus steht beim Oeffnen auf "Schliessen". Tippen und
 *  Rollen darauf erreicht den Plan nicht. */
function Blatt({ titel, art, onZu, children }: { titel: string; art: string; onZu(): void; children: ReactNode }) {
  const { t, dir } = useSprache()
  const titelId = useId()
  const zuId = useId()
  useEffect(() => {
    document.getElementById(zuId)?.focus({ preventScroll: true })
  }, [zuId])
  return (
    <div
      role="dialog"
      aria-labelledby={titelId}
      dir={dir}
      data-plan-blatt={art}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className={cx('animate-in flex flex-col overflow-hidden border border-line bg-surface text-ink', BLATT_KLASSEN)}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5 [@media(max-height:30rem)]:py-1.5">
        <Button id={zuId} variant="outline" onClick={onZu} className="shrink-0">
          <X size={20} className="shrink-0" />
          {t('aktion.schliessen')}
        </Button>
        {/* Bricht um (wie die Moebelkarte): "Fenster Kinderzimmer" passt
            neben "Schliessen" am Handy nicht in eine Zeile. */}
        <h2 id={titelId} dir="auto" className="t-name min-w-0 flex-1 break-words">
          {titel}
        </h2>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-3">
        {children}
      </div>
    </div>
  )
}

/** Eine Zahl in cm, immer links nach rechts. */
function Cm({ n }: { n: number }) {
  return (
    <span dir="ltr" className="t-serial whitespace-nowrap">
      {n} cm
    </span>
  )
}

/** Die Schnellmasse einer Oeffnung als Text: Lichte (bei einer Tuer frei
 *  fuer Moebel und die Maueroeffnung), links und rechts bis zur Innenecke,
 *  dasselbe auf der anderen Wandseite. kompakt: zwei fliessende Zeilen mit
 *  kurzen Woertern fuer die Leiste beim Messen, sonst eine Liste mit dem
 *  Satz, von wo aus links und rechts gelten. */
export function SchnellListe({ u, kompakt = false }: { u: SchnellUebersicht; kompakt?: boolean }) {
  const { t } = useSprache()
  type Eintrag = { k: string; begriff: string; n: number }
  // Die Breiten: bei einer Tuer zuerst, was fuer Moebel frei ist, dann die
  // Maueroeffnung zwischen den Enden (E88: DL 80 ergibt 88); sonst die Lichte.
  const breiten = [
    u.durchgang !== null ? { k: 'durchgang', begriff: t('plan.messen.durchgang'), n: u.durchgang } : null,
    u.lichte !== null
      ? { k: 'lichte', begriff: u.durchgang !== null ? t('plan.messen.maueroeffnung') : t('plan.messen.lichte'), n: u.lichte }
      : null,
  ].filter((x): x is Eintrag => x !== null)
  const eintraege = (seite: { links: number | null; rechts: number | null }, mitBreite: boolean) =>
    [
      ...(mitBreite ? breiten : []),
      seite.links !== null ? { k: 'links', begriff: t('grundriss.schnell_links'), n: seite.links } : null,
      seite.rechts !== null ? { k: 'rechts', begriff: t('grundriss.schnell_rechts'), n: seite.rechts } : null,
    ].filter((x): x is Eintrag => x !== null)
  const innen = eintraege(u, true)
  const gegen = u.gegenueber ? eintraege(u.gegenueber, false) : []
  const mitSeiten = innen.some((e) => e.k === 'links' || e.k === 'rechts') || gegen.length > 0
  if (kompakt) {
    // In der Leiste beim Messen zaehlt jede Zeile: "Lichte 90 cm  Bis zur
    // Ecke: links 54 cm  rechts 244 cm", darunter die andere Wandseite.
    const kurz = (seite: { links: number | null; rechts: number | null }, schluessel: string) => [
      seite.links !== null ? (
        <span key="links" data-schnell-mass={`${schluessel}-links`} className="inline-flex items-baseline gap-1">
          <span className="text-muted">{t('plan.messen.links')}</span> <Cm n={seite.links} />
        </span>
      ) : null,
      seite.rechts !== null ? (
        <span key="rechts" data-schnell-mass={`${schluessel}-rechts`} className="inline-flex items-baseline gap-1">
          <span className="text-muted">{t('plan.messen.rechts')}</span> <Cm n={seite.rechts} />
        </span>
      ) : null,
    ]
    const ecke = (seite: { links: number | null; rechts: number | null }) => seite.links !== null || seite.rechts !== null
    return (
      <div data-schnell-liste="kompakt" className="mt-1 space-y-0.5 text-sm">
        <p data-schnell="innen" className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          {breiten.map((e) => (
            <span key={e.k} data-schnell-mass={`innen-${e.k}`} className="inline-flex items-baseline gap-1">
              <span className="text-muted">{e.begriff}</span> <Cm n={e.n} />
            </span>
          ))}
          {ecke(u) ? <span className="font-bold">{t('grundriss.schnell_ecke')}</span> : null}
          {kurz(u, 'innen')}
        </p>
        {u.gegenueber && ecke(u.gegenueber) ? (
          <p data-schnell="gegen" className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="font-bold">{t('grundriss.schnell_gegen_ecke')}</span>
            {kurz(u.gegenueber, 'gegen')}
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <div data-schnell-liste="">
      <dl className="divide-y divide-line border-b border-line">
        {innen.map((e) => (
          <Zeile key={e.k} begriff={e.begriff}>
            <span data-schnell-mass={`innen-${e.k}`}>
              <Cm n={e.n} />
            </span>
          </Zeile>
        ))}
      </dl>
      {gegen.length ? (
        <>
          <h3 className="t-sub mt-3 mb-1 font-bold">{t('grundriss.schnell_gegenueber')}</h3>
          <dl className="divide-y divide-line border-y border-line">
            {gegen.map((e) => (
              <Zeile key={e.k} begriff={e.begriff}>
                <span data-schnell-mass={`gegen-${e.k}`}>
                  <Cm n={e.n} />
                </span>
              </Zeile>
            ))}
          </dl>
        </>
      ) : null}
      {mitSeiten ? (
        <p data-schnell-blick="" className="t-sub mt-2">
          {t('grundriss.schnell_blick')}
        </p>
      ) : null}
    </div>
  )
}
