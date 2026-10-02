import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Building2, ChevronRight, DoorOpen, Search, Users, X } from 'lucide-react'
import { AppHeader } from '../components/AppShell'
import { Ansicht3D } from '../components/plan3d/oeffnen'
import type { Raum3DLive, Raum3DSteuer } from '../components/plan3d/Raum3D'
import type { Farben3D } from '../components/plan3d/szene'
import type { Sprungziel3D, Welt3D } from '../components/plan3d/vertrag3d'
import SiedlungLeute from '../components/SiedlungLeute'
import { Button, Empty, ErrorBox, IconButton, Input, Loading } from '../components/ui'
import { ladeSiedlung, siedlungMitglieder } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useSprache } from '../lib/i18n'
import { siedlungWoerter } from '../lib/i18n/bausteine/siedlung'
import { woerterNachladen } from '../lib/i18n/woerter'
import { OSM_HINWEIS } from '../lib/osm'
import type { GrundrissDaten } from '../lib/types'
import { useAsync } from '../lib/util'

// Die Saetze der Siedlung kommen erst mit dieser Seite (siehe siedlung.ts).
woerterNachladen(siedlungWoerter)

/* Eine Siedlung in 3D (E83).
 *
 * Laedt die Siedlung und, wenn eine eigene Wohnung darin liegt, deren
 * Grundriss. Die Wohnung ist die Szene, die Raum3D immer zeigt (Ursprung
 * des Plans bei 0, Boden bei 0); die Siedlung kommt als eigene Welt dazu
 * (siedlung3d.ts) und wird dort um die Wohnung herum gelegt. Ohne Wohnung
 * steht man in der Mitte der Siedlung.
 *
 * Nichts davon laedt beim Start der App: diese Seite ist ein eigener Teil
 * (App.tsx), three kommt mit Raum3D (oeffnen.tsx) und siedlung3d.ts hier
 * per import(), beides erst, wenn die Seite offen ist. Laden, Fehler und
 * "gibt es nicht" sind eigene Zustaende.
 *
 * E84: Oben der Knopf "Wohnungen". Er oeffnet die Liste der Sprungziele,
 * die die Welt mitbringt (am Handy ein Blatt von unten, am Computer eine
 * Leiste am Rand); Tippen schliesst sie und bringt einen beim Begehen
 * dorthin. Solange die Welt nicht gebaut ist, ist der Knopf aus; hat sie
 * keine Ziele, steht in der Liste ein Hinweis. Der Name oben ist der
 * gespeicherte Name der Siedlung, nie ein fester Text.
 *
 * E86: Die Siedlung ist gemeinsam. Der Besitzer laedt registrierte Leute
 * ein (Knopf "Leute", SiedlungLeute.tsx); Gaeste kommen ueber dieselbe
 * Seite herein (listSiedlungen gibt ihnen die Siedlung). Wer gerade da
 * ist, geht in 3D als Figur mit und ist zu hoeren (Raum3D, live), sobald
 * ausser einem selbst noch jemand dazugehoert. Die eingerichtete Wohnung
 * des Besitzers liegt in seinem Umzug: ein Gast, der sie nicht laden darf,
 * sieht die Siedlung ohne sie (kein Fehler, das ist so gewollt), mit allen
 * Haeusern und den geplanten Wohnungen. Die Lage der Wohnung bleibt dabei
 * stehen: sie legt den Ursprung der Welt fest, und alle muessen dieselben
 * Weltkoordinaten haben, sonst stuenden die Figuren woanders.
 *
 * Seit E86 (Entscheidung von Karam) gilt das fuer alle, auch fuer den
 * Besitzer: Siedlung und eingerichtete Wohnung sind zwei getrennte Dinge.
 * In der Siedlung ist die eigene Wohnung leer wie jede andere (die
 * geplante aus innen); eingerichtet sieht man sie nur im Umzug, im
 * Grundriss. Darum laedt diese Seite keinen Grundriss, und alle bekommen
 * dieselbe Welt. Das Begehen beginnt am Sprungziel 'Start' (Raum3D). */

/** Keine Wohnung in der Szene: nur die Welt (die Siedlung) drumherum. */
const OHNE_WOHNUNG: GrundrissDaten = {
  grundriss: { id: 'siedlung-ohne-wohnung', project_id: '', name: '', sort: 0, version: 0, created_at: '', updated_at: '' },
  raeume: [],
  oeffnungen: [],
  objekte: [],
  kisten: [],
}

type Teil = typeof import('../components/plan3d/siedlung3d')
type TeilLaden = { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'fertig'; teil: Teil }

export default function SiedlungAnsicht() {
  const { t } = useSprache()
  const nav = useNavigate()
  const { sid = '' } = useParams()
  const { user } = useAuth()
  const ich = user?.id ?? null

  const zustand = useAsync(async () => {
    const siedlung = await ladeSiedlung(sid)
    if (!siedlung) return null
    return { siedlung, besitzer: !!ich && siedlung.owner_id === ich }
  }, [sid, ich])
  // Wer dazugehoert (E86): fuer die Figuren in 3D und den Dialog "Leute".
  const mitglieder = useAsync(() => siedlungMitglieder(sid), [sid])

  // Der Bau der Haeuser (mit three) laedt gleichzeitig mit den Daten.
  const [teil, setTeil] = useState<TeilLaden>({ art: 'laedt' })
  const [versuch, setVersuch] = useState(0)
  useEffect(() => {
    let alive = true
    import('../components/plan3d/siedlung3d')
      .then((m) => alive && setTeil({ art: 'fertig', teil: m }))
      .catch((err: unknown) => alive && setTeil({ art: 'fehler', text: err instanceof Error ? err.message : String(err) }))
    return () => {
      alive = false
    }
  }, [versuch])

  const ergebnis = zustand.data
  const besitzer = ergebnis?.besitzer ?? false
  // Die Lage der Wohnung legt fuer alle denselben Ursprung der Welt fest
  // (E86). Nur wenn ihr Haus fehlt, faellt sie weg, sonst liesse sich die
  // Welt nicht bauen.
  const siedlung = useMemo(() => {
    if (!ergebnis) return null
    const s = ergebnis.siedlung
    const w = s.wohnung
    if (!w || s.gebaeude.some((g) => g.id === w.gebaeudeId)) return s
    return { ...s, wohnung: null }
  }, [ergebnis])
  const baue = teil.art === 'fertig' ? teil.teil.baueSiedlung : null
  // Stabil, damit Raum3D die Welt nur bei neuen Daten oder Farben neu baut.
  // Ohne Rahmen: nichts wird ausgeschnitten, die Wohnung ist die geplante.
  const welt = useMemo(
    () => (baue && siedlung ? (farben: Farben3D): Welt3D => baue({ siedlung, farben, wohnungRahmen: null }) : undefined),
    [baue, siedlung],
  )

  const steuer = useRef<Raum3DSteuer>(null)
  const [ebene, setEbene] = useState<string | null>(null)

  // Sprungziele (E84), gemerkt zu der Welt, fuer die Raum3D sie gebaut hat:
  // eine neue Welt beginnt wieder bei "noch nicht gebaut" (Knopf aus).
  // Raum3D meldet sie in einem Effekt, also nach dem Setzen der Ref hier.
  const [ziele, setZiele] = useState<{ fuer: unknown; liste: Sprungziel3D[]; ebenen: string[] } | null>(null)
  const weltJetzt = useRef(welt)
  useLayoutEffect(() => {
    weltJetzt.current = welt
  })
  const zieleMelden = useCallback((liste: Sprungziel3D[], ebenen: string[]) => setZiele({ fuer: weltJetzt.current, liste, ebenen }), [])
  const sprung = ziele && welt && ziele.fuer === welt ? ziele : null
  // Offen fuer genau diese Welt: kommt eine neue, geht die Liste zu.
  const [listeFuer, setListeFuer] = useState<unknown>(null)
  const listeAuf = !!sprung && listeFuer === welt
  const listeZu = useCallback(() => setListeFuer(null), [])
  // Dialog "Leute" (E86).
  const [leuteAuf, setLeuteAuf] = useState(false)
  const leuteZu = useCallback(() => setLeuteAuf(false), [])
  const hingehen = useCallback((i: number) => {
    setListeFuer(null)
    steuer.current?.springen(i)
  }, [])

  // Die eigene Wohnung fuer die Zeile oben, nur beim Besitzer.
  const wohnung = besitzer ? (siedlung?.wohnung ?? null) : null
  const haus = wohnung ? siedlung?.gebaeude.find((g) => g.id === wohnung.gebaeudeId) : undefined
  const stock = wohnung ? (wohnung.geschoss === 0 ? t('siedlung.geschoss_eg') : t('siedlung.geschoss_n', { n: wohnung.geschoss })) : null
  // Unter dem Namen: beim Gehen das Stockwerk, sonst Haus und Stockwerk der
  // Wohnung (kurz, die Zeile ist am Handy schmal).
  const unterzeile = ebene
    ? t('siedlung.ebene_jetzt', { name: ebene })
    : wohnung && haus && stock
      ? t('siedlung.haus_stock', { haus: haus.name, stock })
      : siedlung && !besitzer
        ? t('siedlung.zu_gast')
        : null
  const bereit = Boolean(welt) && !!siedlung

  // Zusammen in 3D (E86): live, sobald ausser einem selbst noch jemand
  // dazugehoert; laesst sich die Liste nicht laden, trotzdem (der Kanal
  // laesst ohnehin nur Mitglieder hinein, Fehler zeigt Raum3D).
  const siedlungId = siedlung?.id ?? null
  const leute = useMemo(
    () => (mitglieder.data ?? []).filter((m) => m.user_id !== ich).map((m) => ({ uid: m.user_id, name: m.name, look: m.avatar3d })),
    [mitglieder.data, ich],
  )
  const mitAnderen = leute.length > 0 || !!mitglieder.error
  const live = useMemo<Raum3DLive | null>(
    () => (siedlungId && ich && mitAnderen ? { kanal: `siedlung:${siedlungId}`, uid: ich, leute } : null),
    [siedlungId, ich, mitAnderen, leute],
  )

  return (
    // Die Hoehe laesst der unteren Leiste (Handy) und der Suchzeile (Computer)
    // ihren Platz, wie im Chat.
    <div className="flex h-[calc(100dvh-var(--nav-h,6rem))] flex-col lg:h-[calc(100dvh-3rem-1px)]">
      <AppHeader
        title={siedlung?.name || t('siedlung.titel')}
        subtitle={unterzeile}
        back="/app"
        sticky={false}
        actions={
          siedlung ? (
            <>
              {/* Zuerst die Leute (E86): am Handy bleibt nur der erste Knopf
                  sichtbar, der Rest steht unter "Mehr". Mit der Zahl der
                  anderen; laesst sich die Liste nicht laden, ein Warnzeichen. */}
              <Button
                size="sm"
                variant="outline"
                aria-label={t('siedlung.leute')}
                title={mitglieder.error ? t('siedlung.leute_fehler_kurz') : t('siedlung.leute_hilfe')}
                aria-haspopup="dialog"
                aria-expanded={leuteAuf}
                onClick={() => setLeuteAuf(true)}
              >
                <Users size={18} />
                <span className="hidden sm:inline">{t('siedlung.leute')}</span>
                {leute.length > 0 ? <span className="t-serial">{leute.length}</span> : null}
                {mitglieder.error ? <AlertTriangle size={15} className="text-danger" aria-hidden="true" /> : null}
              </Button>
              {/* Wohnungen: aus, bis die Welt gebaut ist. */}
              <Button
                size="sm"
                variant="outline"
                aria-label={t('siedlung.wohnungen')}
                title={sprung ? t('siedlung.wohnungen_hilfe') : t('siedlung.wohnungen_laedt')}
                aria-haspopup="dialog"
                aria-expanded={listeAuf}
                disabled={!sprung}
                // welt ist eine Funktion: in eine Funktion verpackt, sonst
                // haelt React sie fuer eine Aenderungsvorschrift und ruft sie.
                onClick={() => setListeFuer(() => welt)}
              >
                <DoorOpen size={18} />
                <span className="hidden sm:inline">{t('siedlung.wohnungen')}</span>
              </Button>
            </>
          ) : null
        }
      />
      {sprung && listeAuf ? (
        <WohnungenBlatt ziele={sprung.liste} ebenen={sprung.ebenen} onWahl={hingehen} onClose={listeZu} />
      ) : null}
      {siedlung && ich ? (
        <SiedlungLeute
          open={leuteAuf}
          onClose={leuteZu}
          siedlungId={siedlung.id}
          siedlungName={siedlung.name}
          ich={ich}
          besitzer={besitzer}
          mitglieder={mitglieder}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        {zustand.loading ? (
          <Loading label={t('siedlung.ansicht_laedt')} />
        ) : zustand.error ? (
          <div className="p-4">
            <ErrorBox error={zustand.error} onRetry={zustand.reload} />
          </div>
        ) : !siedlung ? (
          <div className="p-4">
            <Empty
              zeichnung="keine"
              icon={<Building2 size={34} />}
              title={t('siedlung.nicht_gefunden')}
              action={
                <Button variant="outline" onClick={() => nav('/app')}>
                  {t('siedlung.zurueck_start')}
                </Button>
              }
            />
          </div>
        ) : teil.art === 'fehler' ? (
          <div className="p-4">
            <ErrorBox
              error={t('siedlung.3d_fehler', { fehler: teil.text })}
              onRetry={() => {
                setTeil({ art: 'laedt' })
                setVersuch((v) => v + 1)
              }}
            />
          </div>
        ) : !bereit ? (
          <Loading label={t('siedlung.ansicht_laedt')} />
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <Ansicht3D daten={OHNE_WOHNUNG} welt={welt} onEbene={setEbene} onSprungziele={zieleMelden} steuer={steuer} live={live} />
            </div>
            {/* Pflichtangabe der Kartendaten (ODbL), unter dem Bild statt darauf. */}
            <p dir="ltr" className="shrink-0 border-t border-line bg-surface px-3 py-1 text-[0.6875rem] text-muted">
              {OSM_HINWEIS}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------ Liste der Wohnungen (E84) */

/** Die Liste ueber der Seite: am Handy ein Blatt von unten, am Computer
 *  eine Leiste am Rand, damit das Bild daneben zu sehen bleibt. Sie
 *  entsteht bei jedem Oeffnen neu, die Suche beginnt also leer. Ohne
 *  Unschaerfe dahinter (kostet bei 3D Rechenzeit, wie Fenster3D). Tasten
 *  bleiben im Blatt, sonst ginge man mit den Pfeilen in 3D los. */
function WohnungenBlatt({
  ziele,
  ebenen,
  onWahl,
  onClose,
}: {
  ziele: Sprungziel3D[]
  ebenen: string[]
  onWahl: (index: number) => void
  onClose: () => void
}) {
  const { t } = useSprache()
  const [suche, setSuche] = useState('')
  const feld = useRef<HTMLInputElement>(null)
  const blatt = useRef<HTMLDivElement>(null)
  const zu = useRef(onClose)
  useLayoutEffect(() => {
    zu.current = onClose
  })
  useEffect(() => {
    // Esc auch dann, wenn der Fokus nicht im Blatt liegt.
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') zu.current()
    }
    document.addEventListener('keydown', taste)
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Am Computer gleich ins Suchfeld; am Handy nicht, sonst deckt die
    // Tastatur die Liste zu.
    if (window.matchMedia('(pointer: fine)').matches) feld.current?.focus()
    else blatt.current?.focus()
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [])

  // Portal an body, wie Modal: sonst liegt das Blatt unter der Kopfzeile.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end">
      <div className="absolute inset-0 bg-black/45 lg:bg-black/20" aria-hidden="true" onClick={onClose} />
      <div
        ref={blatt}
        role="dialog"
        aria-modal="true"
        aria-label={t('siedlung.wohnungen')}
        tabIndex={-1}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') onClose()
        }}
        className="animate-in relative flex max-h-[85dvh] w-full flex-col rounded-t-karte border border-b-0 border-line bg-surface shadow-dialog outline-none sm:max-w-lg lg:h-full lg:max-h-none lg:w-96 lg:max-w-none lg:rounded-none lg:border-y-0 lg:border-e-0"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <DoorOpen size={19} className="shrink-0 text-muted" />
          <h2 className="min-w-0 flex-1 truncate text-base font-bold">{t('siedlung.wohnungen')}</h2>
          <IconButton size="sm" label={t('aktion.schliessen')} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              ref={feld}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder={t('siedlung.wohnungen_suchen')}
              aria-label={t('siedlung.wohnungen_suchen')}
              className="ps-10"
            />
          </div>
          <p className="t-sub mt-2">{t('siedlung.springen_hinweis')}</p>
        </div>
        <div className="scrollbar-thin safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <WohnungenListe ziele={ziele} ebenen={ebenen} suche={suche} onWahl={onWahl} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface Gruppe {
  /** Name der Ebene der Welt (Haus und Stockwerk, wie die Welt sie nennt). */
  titel: string | null
  /** i: Nummer in der ganzen Liste, fuer steuer.springen. */
  ziele: { i: number; name: string }[]
}

/** Teilt die Ziele in der gegebenen Reihenfolge in Gruppen: wechselt die
 *  Ebene, beginnt eine neue, mit dem Namen der Ebene als Ueberschrift. Aus
 *  den Namen wird nichts gelesen. Suche: jedes Wort muss im Namen stehen,
 *  gross oder klein ist egal. */
function gruppieren(ziele: Sprungziel3D[], ebenen: string[], suche: string): Gruppe[] {
  const woerter = suche.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const out: Gruppe[] = []
  let ebeneVorher: number | null = null
  ziele.forEach((z, i) => {
    const name = z.name.toLocaleLowerCase()
    if (!woerter.every((w) => name.includes(w))) return
    if (out.length === 0 || z.ebene !== ebeneVorher) {
      out.push({ titel: ebenen[z.ebene] ?? null, ziele: [] })
      ebeneVorher = z.ebene
    }
    out[out.length - 1].ziele.push({ i, name: z.name })
  })
  return out
}

/** Der Inhalt der Liste: ohne Ziele ein Hinweis, ohne Treffer ein anderer,
 *  sonst die Gruppen. Eigene Komponente, damit sie ohne Browser geprueft
 *  werden kann (scripts/siedlung-wohnungen-pruefen.mjs). */
export function WohnungenListe({
  ziele,
  ebenen,
  suche,
  onWahl,
}: {
  ziele: Sprungziel3D[]
  ebenen: string[]
  suche: string
  onWahl: (index: number) => void
}) {
  const { t } = useSprache()
  const gruppen = useMemo(() => gruppieren(ziele, ebenen, suche), [ziele, ebenen, suche])
  if (ziele.length === 0) {
    return (
      <p role="status" className="px-4 py-8 text-center text-muted">
        {t('siedlung.wohnungen_leer')}
      </p>
    )
  }
  if (gruppen.length === 0) {
    return (
      <p role="status" className="px-4 py-8 text-center text-muted">
        {t('siedlung.wohnungen_keine_treffer', { suche: suche.trim() })}
      </p>
    )
  }
  return (
    <div className="pb-2">
      {gruppen.map((g, gi) => (
        <section key={gi} aria-label={g.titel ?? undefined}>
          {g.titel ? (
            <h3 dir="auto" className="t-sub sticky top-0 z-10 border-b border-line bg-surface px-4 pb-1.5 pt-3 font-bold">
              {g.titel}
            </h3>
          ) : null}
          <ul>
            {g.ziele.map((z) => (
              <li key={z.i}>
                <button
                  type="button"
                  data-ziel={z.i}
                  aria-label={t('siedlung.springen_zu', { name: z.name === 'Start' ? t('siedlung.start') : z.name })}
                  onClick={() => onWahl(z.i)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-start font-bold text-ink hover:bg-raised focus-visible:bg-raised focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                >
                  <DoorOpen size={18} className="shrink-0 text-muted" />
                  <span dir="auto" className="min-w-0 flex-1 truncate">
                    {z.name === 'Start' ? t('siedlung.start') : z.name}
                  </span>
                  <span className="t-sub hidden lg:inline">{t('siedlung.springen')}</span>
                  <ChevronRight size={18} className="spiegeln shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
