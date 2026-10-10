import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react'
import { Check, ChevronDown, Circle, CircleHelp, ExternalLink, Package, Plus, Search, Sofa, X } from 'lucide-react'
import { FachAnsicht } from '../components/plan/FachAnsicht'
import { objektName } from '../components/plan/lage'
import { Button, CodeChip, ErrorBox, Input, Spinner } from '../components/ui'
import { UEBERSTAND_MAX_CM, type Unterlage } from '../lib/geometrie'
import { useSprache } from '../lib/i18n'
import type { EigeneGroesse, Item, Objekt, PlanKiste, SymbolArt } from '../lib/types'
import { euroText } from '../lib/preis'
import { createItem } from '../lib/api'
import { groesseSatz, useKistenGroessen } from '../lib/groessen'
import { useProject } from '../pages/ProjectLayout'
import { cx } from '../lib/util'
import { MassFeld } from './Eigenschaften'
import { FaecherEditor } from './FaecherEditor'
import { ausEigenerGroesse, gehoertZu, KATALOG, KATALOG_BAD, KATALOG_KUECHE, KATALOG_SCHLAFEN, KATALOG_SONST } from './katalog'
import { MoebelVorschau } from '../components/plan/moebelSymbol'
import { SYMBOL_ARTEN } from './werkzeuge/strom'
import { neuesObjekt, type Dok, type Vorlage } from './dok'

/** Kleines 3D-Modell im Katalog, eigener Code-Teil samt three. */
const Vorschau3D = lazy(() => import('../components/plan3d/Vorschau3D'))
import type { KisteInHand, WerkzeugName } from './werkzeuge/typen'

/* Die rechte Spalte des Zeichners, je nach Werkzeug: Assistent, Katalog
 * und Vorlage fuer Moebel, Regal, Schrank, Kisten ohne Platz und die
 * Auswahl der Unterlage. */

export function Kopf({ titel, hilfe }: { titel: string; hilfe?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-black uppercase tracking-wider text-muted">{titel}</h3>
      {hilfe ? <p className="t-sub mt-1">{hilfe}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------ Assistent */

/** "So geht es" weggeklickt? Nur eine Bequemlichkeit je Geraet: ohne
 *  Speicher ist der Kasten einfach wieder offen. */
const ASSISTENT_ZU = 'kistly.zeichner.assistent_zu'

function assistentZuGemerkt(): boolean {
  try {
    return localStorage.getItem(ASSISTENT_ZU) === '1'
  } catch {
    return false
  }
}

function assistentZuMerken(zu: boolean) {
  try {
    if (zu) localStorage.setItem(ASSISTENT_ZU, '1')
    else localStorage.removeItem(ASSISTENT_ZU)
  } catch {
    /* ohne Speicher gilt es nur bis zum Neuladen */
  }
}

export function Assistent({
  dok,
  onWerkzeug,
}: {
  dok: Dok
  onWerkzeug: (name: WerkzeugName, rechteck?: boolean) => void
}) {
  const { t } = useSprache()
  const [zu, setZu] = useState(assistentZuGemerkt)
  const umschalten = (neu: boolean) => {
    setZu(neu)
    assistentZuMerken(neu)
  }
  const zuHoch =
    dok.objekte.some((o) => o.hoehe_cm > (dok.raeume.find((r) => r.id === o.raum_id)?.hoehe_cm ?? Infinity)) ||
    dok.kisten.some((k) => k.oben_cm > k.grenze_cm)
  const schritte: { text: string; hilfe: string; fertig: boolean; knopf?: () => void; knopfText?: string }[] = [
    {
      text: t('zeichner.assistent.umriss'),
      hilfe: t('zeichner.assistent.umriss_hilfe'),
      fertig: dok.raeume.length > 0,
      knopf: () => onWerkzeug('raum', true),
      knopfText: t('zeichner.werkzeug.rechteck'),
    },
    {
      text: t('zeichner.assistent.teilen'),
      hilfe: t('zeichner.assistent.teilen_hilfe'),
      fertig: dok.raeume.length > 1,
      knopf: () => onWerkzeug('teilen'),
      knopfText: t('zeichner.werkzeug.teilen'),
    },
    {
      text: t('zeichner.assistent.zimmer'),
      hilfe: t('zeichner.assistent.zimmer_hilfe'),
      fertig: dok.raeume.length > 0 && dok.raeume.every((r) => r.tag_id || r.name.trim()),
    },
    {
      text: t('zeichner.assistent.oeffnungen'),
      hilfe: t('zeichner.assistent.oeffnungen_hilfe'),
      fertig: dok.oeffnungen.some((o) => o.art === 'tuer'),
      knopf: () => onWerkzeug('tuer'),
      knopfText: t('zeichner.werkzeug.tuer'),
    },
    {
      text: t('zeichner.assistent.hoehen'),
      hilfe: t('zeichner.assistent.hoehen_hilfe'),
      fertig: dok.raeume.length > 0 && !zuHoch,
    },
  ]
  if (zu) {
    return (
      <Button size="sm" variant="soft" onClick={() => umschalten(false)}>
        <CircleHelp size={16} />
        {t('zeichner.assistent.zeigen')}
      </Button>
    )
  }
  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Kopf titel={t('zeichner.assistent.titel')} hilfe={t('zeichner.assistent.einleitung')} />
        </div>
        <button
          type="button"
          onClick={() => umschalten(true)}
          aria-label={t('zeichner.assistent.ausblenden')}
          title={t('zeichner.assistent.ausblenden')}
          className="-me-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-ink"
        >
          <X size={18} />
        </button>
      </div>
      <ol className="space-y-3">
        {schritte.map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className={cx('mt-0.5 shrink-0', s.fertig ? 'text-ok' : 'text-muted')}>
              {s.fertig ? <Check size={20} /> : <Circle size={20} />}
            </span>
            <div className="min-w-0">
              <p className="font-bold">
                <span className="t-serial">{i + 1}</span> {s.text}
              </p>
              <p className="t-sub">{s.hilfe}</p>
              {s.knopf && !s.fertig ? (
                <Button size="sm" variant="soft" className="mt-1.5" onClick={s.knopf}>
                  {s.knopfText}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------------------------------------------------------------- Suche */

/** Suche oben rechts (E67): Moebel nach Name, Kisten nach Nummer oder
 *  Name. Ein Treffer waehlt aus und zeigt ihn. */
export function PlanSuche({
  objekte,
  kisten,
  onObjekt,
  onKiste,
}: {
  objekte: Objekt[]
  kisten: PlanKiste[]
  onObjekt: (id: string) => void
  onKiste: (id: string) => void
}) {
  const { t } = useSprache()
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const moebel = s ? objekte.filter((o) => (o.name ?? '').toLowerCase().includes(s)).slice(0, 12) : []
  const boxen = s ? kisten.filter((k) => k.code.toLowerCase().includes(s) || (k.title ?? '').toLowerCase().includes(s)).slice(0, 12) : []
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('zeichner.suche.platzhalter')} className="py-2 ps-9" aria-label={t('zeichner.suche.platzhalter')} />
      </div>
      {s ? (
        moebel.length + boxen.length === 0 ? (
          <p className="t-sub text-sm">{t('zustand.nichts_gefunden')}</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {moebel.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => onObjekt(o.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-raised">
                  <Sofa size={15} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate font-bold">{o.name}</span>
                  {o.preis_cent != null ? <span className="t-serial shrink-0 text-xs">{euroText(o.preis_cent)} €</span> : null}
                </button>
              </li>
            ))}
            {boxen.map((k) => (
              <li key={k.id}>
                <button type="button" onClick={() => onKiste(k.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-raised">
                  <Package size={15} className="shrink-0 text-muted" />
                  <CodeChip code={k.code} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{k.title ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- Vorlagen */

/** Summe der bekannten Preise in Cent. */
function preisSumme(liste: Objekt[]): number {
  return liste.reduce((s, o) => s + (o.preis_cent ?? 0), 0)
}

export function MoebelKatalog({
  wahl,
  onWahl,
  eigene,
  eigeneFehler,
  eigeneNochmal,
  objekte = [],
  onZeigen,
}: {
  wahl: Vorlage | null
  onWahl: (v: Vorlage) => void
  eigene: EigeneGroesse[] | null
  eigeneFehler: string | null
  eigeneNochmal: () => void
  /** Moebel im Plan: Stueckzahl je Eintrag, Liste mit Link und Preis. */
  objekte?: Objekt[]
  onZeigen?: (id: string) => void
}) {
  const { t } = useSprache()
  const [offen, setOffen] = useState<string | null>(null)
  const knopf = (v: Vorlage, name: string) => {
    const da = objekte.filter((o) => gehoertZu(o, v, name))
    const summe = preisSumme(da)
    return (
      <div key={v.schluessel}>
        <div className="flex items-stretch gap-1">
          <button
            type="button"
            onClick={() => onWahl({ ...v, name })}
            aria-pressed={wahl?.schluessel === v.schluessel}
            className={cx(
              'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-start transition',
              wahl?.schluessel === v.schluessel ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/35',
            )}
          >
            <MoebelVorschau v={v} name={name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{name}</span>
              <span className="block text-xs opacity-75">
                {t('zeichner.katalog.anzahl', { n: da.length })}
                {summe ? ` · ${euroText(summe)} €` : ''}
              </span>
            </span>
            <span className="t-serial shrink-0 text-sm opacity-80">
              {v.breite_cm} x {v.tiefe_cm}
            </span>
          </button>
          {da.length ? (
            <button
              type="button"
              onClick={() => setOffen((x) => (x === v.schluessel ? null : v.schluessel))}
              aria-expanded={offen === v.schluessel}
              aria-label={t('zeichner.katalog.liste')}
              className="flex w-9 items-center justify-center rounded-xl border-2 border-line bg-surface hover:border-ink/35"
            >
              <ChevronDown size={16} className={cx('transition', offen === v.schluessel && 'rotate-180')} />
            </button>
          ) : null}
        </div>
        {offen === v.schluessel && da.length ? (
          <ul className="mt-1 space-y-1 ps-2">
            {da.map((o) => (
              <li key={o.id} className="flex items-center gap-1.5 rounded-lg bg-raised px-2 py-1.5 text-sm">
                <button type="button" onClick={() => onZeigen?.(o.id)} className="min-w-0 flex-1 truncate text-start font-bold hover:underline">
                  {o.name}
                </button>
                {o.preis_cent != null ? <span className="t-serial shrink-0">{euroText(o.preis_cent)} €</span> : null}
                {o.link ? (
                  <a href={o.link} target="_blank" rel="noopener noreferrer" aria-label={t('zeichner.eig.zum_produkt')} className="shrink-0 rounded p-1 hover:bg-surface">
                    <ExternalLink size={14} />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }
  const alleMoebel = objekte.length
  const gesamt = preisSumme(objekte)
  const moebel = (eigene ?? []).filter((g) => g.art === 'moebel')
  const vorschau = useMemo(() => (wahl ? neuesObjekt(wahl, 'vorschau', 'vorschau', { x: 0, y: 0 }, 0) : null), [wahl])
  const lForm = wahl?.form === 'l'
  return (
    <div className="space-y-4">
      {alleMoebel ? (
        <p className="rounded-xl bg-raised px-3 py-2 text-sm font-bold">
          {t('zeichner.katalog.im_plan', { n: alleMoebel })}
          {gesamt ? ` · ${t('zeichner.katalog.summe', { betrag: euroText(gesamt) })}` : ''}
        </p>
      ) : null}
      {wahl && vorschau ? (
        // Gewaehlt: so sieht es aus, Groesse vor dem Hinstellen einstellen (E66).
        <div className="space-y-2 rounded-xl border-2 border-ink p-2.5">
          <p className="font-bold">{wahl.name}</p>
          <Suspense fallback={<div className="h-44 animate-pulse rounded-xl bg-raised" />}>
            <Vorschau3D objekt={vorschau} />
          </Suspense>
          <MassFeld
            label={t('zeichner.eig.breite')}
            wert={wahl.breite_cm}
            min={lForm ? (wahl.ausschnitt_breite_cm ?? 0) + 1 : 5}
            max={2000}
            onSetzen={(v) => onWahl({ ...wahl, breite_cm: v })}
          />
          <MassFeld
            label={t('zeichner.eig.tiefe')}
            wert={wahl.tiefe_cm}
            min={lForm ? (wahl.ausschnitt_tiefe_cm ?? 0) + 1 : 5}
            max={2000}
            onSetzen={(v) => onWahl({ ...wahl, tiefe_cm: v })}
          />
          {wahl.art === 'moebel' ? (
            <MassFeld label={t('zeichner.eig.hoehe')} wert={wahl.hoehe_cm} min={1} max={600} onSetzen={(v) => onWahl({ ...wahl, hoehe_cm: v })} />
          ) : null}
          <MassFeld label={t('zeichner.eig.boden')} wert={wahl.boden_cm ?? 0} min={0} max={600} onSetzen={(v) => onWahl({ ...wahl, boden_cm: v })} />
          <p className="t-sub text-sm">{t('zeichner.katalog.dann_klicken')}</p>
        </div>
      ) : null}
      <div>
        <Kopf titel={t('zeichner.katalog.titel')} hilfe={t('zeichner.katalog.hilfe')} />
        <div className="space-y-1.5">{KATALOG.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.schlafen_titel')} />
        <div className="space-y-1.5">{KATALOG_SCHLAFEN.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.bad_titel')} />
        <div className="space-y-1.5">{KATALOG_BAD.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.kueche_titel')} hilfe={t('zeichner.katalog.kueche_hilfe')} />
        <div className="space-y-1.5">{KATALOG_KUECHE.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.sonst_titel')} />
        <div className="space-y-1.5">{KATALOG_SONST.map((v) => knopf(v, t(`zeichner.katalog.${v.schluessel}`)))}</div>
      </div>
      <div>
        <Kopf titel={t('zeichner.katalog.eigene')} />
        {eigeneFehler ? (
          <ErrorBox error={eigeneFehler} onRetry={eigeneNochmal} />
        ) : eigene === null ? (
          <div className="space-y-1.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-raised" />
            ))}
          </div>
        ) : moebel.length === 0 ? (
          <p className="t-sub">{t('zeichner.katalog.eigene_leer')}</p>
        ) : (
          <div className="space-y-1.5">{moebel.map((g) => knopf(ausEigenerGroesse(g), g.name))}</div>
        )}
      </div>
    </div>
  )
}

export function RegalVorlage({ wert, onAendern }: { wert: Vorlage; onAendern: (v: Vorlage) => void }) {
  const { t } = useSprache()
  return (
    <div className="space-y-3">
      <Kopf titel={t(wert.art === 'regal' ? 'zeichner.vorlage.regal' : 'zeichner.vorlage.schrank')} hilfe={t('zeichner.vorlage.hilfe')} />
      <MassFeld label={t('zeichner.eig.breite')} wert={wert.breite_cm} min={5} max={2000} onSetzen={(v) => onAendern({ ...wert, breite_cm: v })} />
      <MassFeld label={t('zeichner.eig.tiefe')} wert={wert.tiefe_cm} min={5} max={2000} onSetzen={(v) => onAendern({ ...wert, tiefe_cm: v })} />
      <FaecherEditor
        wert={{ brett_cm: wert.brett_cm ?? [0], hoehe_cm: wert.hoehe_cm, spalten: wert.spalten }}
        breite_cm={wert.breite_cm}
        name={wert.name}
        art={wert.art}
        onSetzen={(f) => onAendern({ ...wert, brett_cm: f.brett_cm, hoehe_cm: f.hoehe_cm, spalten: f.spalten })}
      />
    </div>
  )
}

/* ------------------------------------------------------------ Kisten */

/** Schnell eine Kiste anlegen (E66): Zimmer und Groesse, sonst nichts.
 *  Die Nummer vergibt die Datenbank; danach liegt sie in der Hand. */
function NeueKisteKurz({ onAngelegt, onZu }: { onAngelegt: (i: Item) => void; onZu: () => void }) {
  const { t, lang } = useSprache()
  const { project, rooms } = useProject()
  const tab = useKistenGroessen()
  const [raum, setRaum] = useState(rooms[0]?.id ?? '')
  const [groesse, setGroesse] = useState(4)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  // Wird bei jedem Oeffnen neu eingehaengt: der Zustand faengt leer an.
  async function anlegen(e: FormEvent) {
    e.preventDefault()
    if (!raum) {
      setFehler(t('kisten.zimmer_waehlen_pflicht'))
      return
    }
    setBusy(true)
    setFehler(null)
    try {
      const i = await createItem({ project_id: project.id, kind: 'box', room_id: raum, code_source: 'room', size: groesse })
      onAngelegt(i)
      onZu()
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }
  return (
    <form onSubmit={(e) => void anlegen(e)} className="space-y-2 rounded-xl border-2 border-line p-2.5">
      <p className="text-sm font-bold">{t('zeichner.kisten.neu_titel')}</p>
      {fehler ? <ErrorBox error={fehler} /> : null}
      <label className="block text-sm">
        <span className="font-bold">{t('zeichner.kisten.neu_zimmer')}</span>
        <select value={raum} onChange={(e) => setRaum(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-line bg-surface px-2 py-1.5">
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-bold">{t('zeichner.kisten.neu_groesse')}</span>
        <select value={groesse} onChange={(e) => setGroesse(Number(e.target.value))} className="mt-1 w-full rounded-lg border-2 border-line bg-surface px-2 py-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {groesseSatz(t, lang, n, 'box', tab)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <Button size="sm" type="submit" loading={busy}>
          {t('zeichner.kisten.neu_anlegen')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onZu}>
          {t('aktion.abbrechen')}
        </Button>
      </div>
    </form>
  )
}

export function KistenListe({
  liste,
  fehler,
  nochmal,
  inHand,
  masse,
  onNehmen,
  platziert = [],
  onAngelegt,
}: {
  liste: Item[] | null
  fehler: string | null
  nochmal: () => void
  inHand: KisteInHand | null
  masse: (i: Item) => { laenge_cm: number; breite_cm: number; hoehe_cm: number }
  onNehmen: (k: KisteInHand) => void
  /** Kisten, die schon im Plan stehen: per Suche finden und umstellen. */
  platziert?: PlanKiste[]
  /** Eine neue Kiste wurde angelegt (Schnell-Anlegen). */
  onAngelegt?: (i: Item) => void
}) {
  const { t } = useSprache()
  const [q, setQ] = useState('')
  const [neu, setNeu] = useState(false)
  const gefiltert = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!liste) return null
    return s ? liste.filter((i) => i.code.toLowerCase().includes(s) || (i.title ?? '').toLowerCase().includes(s)) : liste
  }, [liste, q])
  const imPlan = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return platziert.filter((k) => k.code.toLowerCase().includes(s) || (k.title ?? '').toLowerCase().includes(s)).slice(0, 30)
  }, [platziert, q])
  return (
    <div className="space-y-3">
      <Kopf titel={t('zeichner.kisten.titel')} hilfe={t('zeichner.kisten.hilfe')} />
      {onAngelegt ? (
        neu ? (
          <NeueKisteKurz onAngelegt={onAngelegt} onZu={() => setNeu(false)} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => setNeu(true)}>
            <Plus size={15} /> {t('zeichner.kisten.neu')}
          </Button>
        )
      ) : null}
      {inHand ? (
        <div className="rounded-xl border-2 border-ink p-2.5">
          <p className="text-sm font-bold">{t('zeichner.kisten.in_der_hand')}</p>
          <div className="mt-1 flex items-center gap-2">
            <CodeChip code={inHand.code} size="sm" />
            <span className="t-serial text-sm text-muted">
              {inHand.laenge_cm} x {inHand.breite_cm} x {inHand.hoehe_cm}
            </span>
          </div>
          <p className="t-sub mt-1">{t('zeichner.kisten.klick_setzt')}</p>
        </div>
      ) : null}
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('zeichner.kisten.suchen')} className="py-2" />
      {fehler ? (
        <ErrorBox error={fehler} onRetry={nochmal} />
      ) : gefiltert === null ? (
        <div className="flex items-center gap-2 text-muted">
          <Spinner /> {t('zustand.laedt')}
        </div>
      ) : gefiltert.length === 0 ? (
        <p className="t-sub">{liste && liste.length === 0 ? t('zeichner.kisten.alle_haben_platz') : t('zustand.nichts_gefunden')}</p>
      ) : (
        <ul className="space-y-1.5">
          {gefiltert.map((i) => {
            const m = masse(i)
            const an = inHand?.id === i.id
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onNehmen({ id: i.id, code: i.code, ...m })}
                  aria-pressed={an}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-start transition',
                    an ? 'border-ink bg-raised' : 'border-line bg-surface hover:border-ink/35',
                  )}
                >
                  <Package size={16} className="shrink-0 text-muted" />
                  <CodeChip code={i.code} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{i.title ?? ''}</span>
                  <span className="t-serial shrink-0 text-xs text-muted">
                    {m.laenge_cm}x{m.breite_cm}x{m.hoehe_cm}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {imPlan.length ? (
        <div className="space-y-1.5">
          <p className="text-sm font-bold">{t('zeichner.kisten.im_plan')}</p>
          <ul className="space-y-1.5">
            {imPlan.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  onClick={() => onNehmen({ id: k.id, code: k.code, laenge_cm: k.laenge_cm, breite_cm: k.breite_cm, hoehe_cm: k.hoehe_cm })}
                  aria-pressed={inHand?.id === k.id}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-start transition',
                    inHand?.id === k.id ? 'border-ink bg-raised' : 'border-line bg-surface hover:border-ink/35',
                  )}
                >
                  <Package size={16} className="shrink-0 text-muted" />
                  <CodeChip code={k.code} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{k.title ?? ''}</span>
                  <span className="shrink-0 text-xs text-muted">{t('zeichner.kisten.umstellen')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function UnterlagenWahl({
  dok,
  code,
  liste,
  wahl,
  onWahl,
  ueberlappt,
  busy,
  fehler,
  onSetzen,
  onAbbrechen,
}: {
  dok: Dok
  code: string
  liste: Unterlage[]
  wahl: number
  onWahl: (i: number) => void
  ueberlappt: string[]
  busy: boolean
  fehler: string | null
  onSetzen: () => void
  onAbbrechen: () => void
}) {
  const { t } = useSprache()
  const text = (u: Unterlage) => {
    const von = u.unten_cm
    const bis = u.oben_cm
    const o = u.objektId ? dok.objekte.find((x) => x.id === u.objektId) : null
    if (u.art === 'fach' && o) return t('zeichner.unterlage.fach', { name: objektName(t, o), ebene: u.ebene ?? 0, spalte: u.spalte ?? 1, von, bis })
    if (u.art === 'objekt' && o) return t('zeichner.unterlage.objekt', { name: objektName(t, o), von, bis })
    if (u.art === 'kiste') return t('zeichner.unterlage.kiste', { code: `⁨${u.text}⁩`, von, bis })
    return t('zeichner.unterlage.boden', { von, bis })
  }
  const gewaehlt = liste[wahl]
  const fachObjekt = gewaehlt?.art === 'fach' ? dok.objekte.find((o) => o.id === gewaehlt.objektId) : null
  return (
    <div className="space-y-3">
      <Kopf titel={t('zeichner.unterlage.titel', { code })} hilfe={t('zeichner.unterlage.hilfe')} />
      <ul className="space-y-1.5">
        {liste.map((u, i) => (
          <li key={`${u.art}-${u.itemId ?? u.objektId ?? ''}-${u.ebene ?? ''}-${u.spalte ?? ''}`}>
            <button
              type="button"
              disabled={!u.passt}
              onClick={() => onWahl(i)}
              aria-pressed={i === wahl}
              className={cx(
                'w-full rounded-xl border-2 px-3 py-2 text-start transition disabled:cursor-not-allowed disabled:opacity-50',
                i === wahl ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/35',
              )}
            >
              <span className="block font-bold">{text(u)}</span>
              {!u.passt ? (
                <span className="block text-sm">
                  {u.grund === 'ueberstand'
                    ? t('zeichner.unterlage.ueberstand_zu_gross', { cm: u.ueberstand_cm ?? 0, max: UEBERSTAND_MAX_CM })
                    : t('zeichner.unterlage.passt_nicht', { grenze: u.grenze_cm })}
                </span>
              ) : u.ueberstand_cm ? (
                <span className="block text-sm">{t('zeichner.unterlage.ragt_vor', { cm: u.ueberstand_cm })}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {fachObjekt && gewaehlt ? (
        <FachAnsicht
          objekt={fachObjekt}
          kisten={dok.kisten}
          auswahl={{ ebene: gewaehlt.ebene ?? 0, spalte: gewaehlt.spalte ?? 0 }}
          onFach={(e, s) => {
            const i = liste.findIndex((u) => u.art === 'fach' && u.objektId === fachObjekt.id && u.ebene === e && u.spalte === s)
            if (i >= 0 && liste[i].passt) onWahl(i)
          }}
          maxHoehe="14rem"
        />
      ) : null}
      {ueberlappt.length ? (
        <p className="rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-sm font-bold text-warn">
          {t('zeichner.unterlage.ueberlappt', { codes: ueberlappt.join(', ') })}
        </p>
      ) : null}
      {fehler ? <ErrorBox error={fehler} /> : null}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onAbbrechen}>
          {t('aktion.abbrechen')}
        </Button>
        <Button size="sm" loading={busy} disabled={!gewaehlt?.passt} onClick={onSetzen}>
          {t('zeichner.unterlage.hinstellen')}
        </Button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Strom */

export function StromWahl({ wahl, onWahl }: { wahl: SymbolArt; onWahl: (a: SymbolArt) => void }) {
  const { t } = useSprache()
  return (
    <div>
      <Kopf titel={t('zeichner.strom.titel')} hilfe={t('zeichner.strom.hilfe')} />
      <div className="space-y-1.5">
        {SYMBOL_ARTEN.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onWahl(a)}
            aria-pressed={wahl === a}
            className={cx(
              'flex w-full items-center rounded-xl border-2 px-3 py-2 text-start font-bold transition',
              wahl === a ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/35',
            )}
          >
            {t(`zeichner.strom.${a}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
