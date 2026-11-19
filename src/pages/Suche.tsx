import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Map as KarteIcon, Package, Search, X } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Ausschnitt } from '../components/Ausschnitt'
import { FuellBalken } from '../components/Fuellstand'
import { PunktBild } from '../components/PunktBild'
import { trefferOrt } from '../components/plan/lage'
import { Badge, Button, Card, CodeChip, Empty, ErrorBox, Input, Loading, SectionTitle, Spinner } from '../components/ui'
import { ZustandPill } from '../components/BestandDialoge'
import { inhaltSuchen, listBestand, listKategorien, listProjects } from '../lib/api'
import { mengeText } from '../lib/lager'
import { useIstDesktop } from '../lib/desktop'
import { useSprache } from '../lib/i18n'
import { signedUrls } from '../lib/media'
import { rahmenVon } from '../lib/rahmen'
import type { Bestand, ItemContent, ItemPhoto, SuchTreffer } from '../lib/types'
import { cx } from '../lib/util'

/* Suchen ueber alle Lager (E105): Kisten (Inhalt) und Produkte (Bestand).
 *
 * "Kleber" eintippen, und es kommt zuerst, ob es ihn als Produkt gibt (im
 * Lager, nur noch X, gibt es nicht mehr, mit Lager und Bereich), und dann
 * das Bild des Klebers in einer Kiste, und darunter, wo sie ist: welches
 * Lager, welcher Bereich, welche Kiste, und Platz und Hoehe im Grundriss.
 * Produkte (Bestand) sucht die Seite im Browser ueber die Lager, in denen
 * man Mitglied ist; Kisten sucht die Datenbank (inhalt_suchen).
 *
 * Am Handy fuehrt ein Tipp direkt in die Kiste bzw. das Moebel, mit
 * ?inhalt=<id>: oben das Band mit dem Bild, die Zeile gerahmt, unten der
 * Lageplan. Am Computer steht links die Liste und rechts der gewaehlte
 * Treffer (Foto mit Rahmen, Fakten, Lageplan); die Wahl steht in der
 * Adresse (?t=<id>).
 *
 * Gesucht wird in der Datenbank (inhalt_suchen, 0030), auch mit
 * Tippfehlern und auf Arabisch. Die Anfrage steht in der Adresse: wer aus
 * einer Kiste zurueckkommt, findet seine Treffer wieder.
 */

/* Der Lageplan (Plan, Regal, Stapel) laedt erst, wenn ein Treffer offen
 * ist: das Hauptbuendel bleibt klein, und wer nur sucht, laedt ihn nie. */
const Lageplan = lazy(() => import('../components/plan/Lageplan').then((m) => ({ default: m.Lageplan })))

const WARTEN_MS = 300
/** So viele Produkte zeigt die Seite. */
const MAX_PRODUKTE = 20

/** Ein Ding aus dem Bestand mit dem Lager und dem Bereich, in dem es liegt. */
interface Produkt {
  b: Bestand
  lager: string
  bereich: string | null
}

/** Alle Woerter der Anfrage muessen im Namen oder Ort stehen. */
function passt(p: Produkt, woerter: string[]): boolean {
  const heu = `${p.b.name} ${p.b.ort ?? ''}`.toLowerCase()
  return woerter.every((w) => heu.includes(w))
}
/** So viele Treffer zeigt die Seite. Einer mehr wird geholt, um zu
 *  wissen, ob es noch weitere gibt. */
const MAX_TREFFER = 60

/** Der Treffer als Eintrag, damit das Fotobild ihn zeigen kann. Nur
 *  lesend: was hier fehlt, braucht das Bild nicht. */
function alsEintrag(z: SuchTreffer): ItemContent {
  return {
    id: z.content_id,
    item_id: z.item_id,
    project_id: z.project_id,
    text: z.inhalt,
    qty: z.menge,
    checked: false,
    sort: 0,
    quelle: 'hand',
    photo_id: z.photo_id,
    schicht: z.schicht,
    punkt_x: z.punkt_x,
    punkt_y: z.punkt_y,
    bestaetigt: z.bestaetigt,
    box_x0: z.box_x0,
    box_y0: z.box_y0,
    box_x1: z.box_x1,
    box_y1: z.box_y1,
    suchwoerter: [],
    ausschnitt_pfad: z.ausschnitt_pfad,
    sicherheit: null,
    created_at: '',
    geaendert_at: '',
    geaendert_was: null,
  }
}

function alsFoto(z: SuchTreffer): ItemPhoto | null {
  if (!z.photo_id || !z.foto_pfad) return null
  return {
    id: z.photo_id,
    item_id: z.item_id,
    tag_id: null,
    project_id: z.project_id,
    path: z.foto_pfad,
    art: 'foto',
    seite: null,
    schicht: z.schicht,
    caption: null,
    created_by: null,
    created_at: '',
    aufgenommen_at: null,
  }
}

export default function Suche() {
  const { t } = useSprache()
  const nav = useNavigate()
  const desktop = useIstDesktop()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const suchwort = q.trim()
  const sucht = suchwort.length >= 2
  const gewaehltId = params.get('t')

  /* Das Feld hat seinen eigenen Text, die Adresse folgt ihm verzoegert.
   * Aendert sich die Adresse von aussen (der Reiter unten, Zurueck), folgt
   * das Feld ihr. Was die Seite selbst geschrieben hat, merkt sich
   * geschrieben: sonst schnitte beim schnellen Tippen die eigene, spaete
   * Adresse Buchstaben ab. */
  const [text, setText] = useState(q)
  const geschrieben = useRef(q)
  const feld = useRef<HTMLInputElement>(null)

  function adresse(neu: string) {
    geschrieben.current = neu
    // Ein neues Suchwort nimmt die Wahl mit weg.
    setParams(neu ? { q: neu } : {}, { replace: true })
  }

  useEffect(() => {
    if (q === geschrieben.current) return
    geschrieben.current = q
    setText(q)
  }, [q])

  const [treffer, setTreffer] = useState<SuchTreffer[] | null>(null)
  /** Es gibt mehr Treffer, als die Liste zeigt. */
  const [mehr, setMehr] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [versuch, setVersuch] = useState(0)
  /* Der Bestand aller Lager, einmal geladen, sobald gesucht wird. */
  const [produkte, setProdukte] = useState<Produkt[] | null>(null)
  const [produkteLaedt, setProdukteLaedt] = useState(false)
  const [produkteFehler, setProdukteFehler] = useState<string | null>(null)
  const [produkteVersuch, setProdukteVersuch] = useState(0)
  const [fotoUrls, setFotoUrls] = useState<Map<string, string>>(new Map())
  const [fotoOffen, setFotoOffen] = useState(false)

  useEffect(() => {
    const neu = text.trim()
    if (neu === suchwort) return
    const zeit = window.setTimeout(() => adresse(neu), WARTEN_MS)
    return () => window.clearTimeout(zeit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, suchwort])

  /* Bestand holen: ein Mal je Besuch (und bei "Nochmal"). Ein Fehler steht
   * sichtbar da; die Kistensuche laeuft trotzdem weiter. */
  useEffect(() => {
    if (suchwort.length < 2 || produkte !== null) return
    let alive = true
    setProdukteLaedt(true)
    setProdukteFehler(null)
    ;(async () => {
      const lager = await listProjects()
      const teile = await Promise.all(
        lager.map(async (l) => {
          const [bestand, kat] = await Promise.all([listBestand(l.project.id), listKategorien(l.project.id)])
          return bestand.map<Produkt>((b) => ({
            b,
            lager: l.project.name,
            bereich: kat.find((k) => k.id === b.kategorie_id)?.name ?? null,
          }))
        }),
      )
      return teile.flat()
    })()
      .then((alle) => {
        if (alive) setProdukte(alle)
      })
      .catch((err: unknown) => {
        if (alive) setProdukteFehler(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setProdukteLaedt(false)
      })
    return () => {
      alive = false
    }
    // produkte gehoert nicht in die Liste: einmal geladen, nie wieder.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucht, produkteVersuch])

  const woerter = suchwort.toLowerCase().split(/\s+/).filter(Boolean)
  const produktTreffer =
    suchwort.length >= 2 && produkte ? produkte.filter((p) => passt(p, woerter)).slice(0, MAX_PRODUKTE) : []

  /* Suchen. Eine alte Antwort, die nach einer neueren ankommt, wird
   * verworfen. Die alten Treffer bleiben stehen, bis die neuen da sind:
   * beim Tippen springt die Liste sonst bei jedem Buchstaben weg. */
  useEffect(() => {
    if (suchwort.length < 2) {
      setTreffer(null)
      setMehr(false)
      setFehler(null)
      setLaedt(false)
      return
    }
    let alive = true
    setLaedt(true)
    setFehler(null)
    inhaltSuchen(suchwort, MAX_TREFFER + 1)
      .then(async (alle) => {
        if (!alive) return
        // Moebel gibt es in Magazino nicht mehr; alte Eintraege bleiben stumm.
        const ohneMoebel = alle.filter((z) => z.item_kind !== 'furniture')
        const liste = ohneMoebel.slice(0, MAX_TREFFER)
        setTreffer(liste)
        setMehr(ohneMoebel.length > MAX_TREFFER)
        /* Fuer Treffer ohne gespeicherten Ausschnitt wird der Rahmen live
         * aus dem Foto geschnitten. Dafuer braucht es die Adressen. */
        const pfade = [
          ...new Set(
            liste
              .filter((z) => !z.ausschnitt_pfad && z.foto_pfad && z.box_x0 !== null)
              .map((z) => z.foto_pfad as string),
          ),
        ]
        if (pfade.length) {
          const urls = await signedUrls('item-photos', pfade)
          if (alive) setFotoUrls((alt) => new Map([...alt, ...urls]))
        }
      })
      .catch((err: unknown) => {
        if (!alive) return
        setTreffer(null)
        setFehler(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLaedt(false)
      })
    return () => {
      alive = false
    }
  }, [suchwort, versuch])

  /** Platz und Hoehe in einer Zeile, oder "noch ohne Platz". */
  function ortText(z: SuchTreffer): string {
    return trefferOrt(z, t) ?? t('suche.ohne_platz')
  }

  function zurKiste(z: SuchTreffer) {
    nav(`/app/p/${z.project_id}/kisten/${z.item_id}?inhalt=${z.content_id}`)
  }

  function zumPlan(z: SuchTreffer) {
    if (z.grundriss_id && z.raum_id) {
      nav(`/app/p/${z.project_id}/grundriss/${z.grundriss_id}?raum=${z.raum_id}&kiste=${z.item_id}`)
    } else {
      // Die Weiche findet Grundriss und Raum selbst ueber den Platz (kiste_lage).
      nav(`/app/p/${z.project_id}/grundriss?kiste=${z.item_id}`)
    }
  }

  /** Handy: gleich in die Kiste. Computer: rechts zeigen. */
  function tippen(z: SuchTreffer) {
    if (!desktop) {
      zurKiste(z)
      return
    }
    setFotoOffen(false)
    setParams({ q: suchwort, t: z.content_id }, { replace: true })
  }

  const zuKurz = text.trim().length === 1
  const offen = desktop && treffer && gewaehltId ? (treffer.find((z) => z.content_id === gewaehltId) ?? null) : null

  const produktListe =
    produktTreffer.length > 0 ? (
      <section className="mb-5">
        <SectionTitle>
          {t('lager.suche_produkte')} ({produktTreffer.length})
        </SectionTitle>
        <ul className="space-y-2">
          {produktTreffer.map((p) => (
            <li key={p.b.id}>
              <ProduktZeile
                p={p}
                onTipp={() => nav(`/app/p/${p.b.project_id}/bestand?q=${encodeURIComponent(p.b.name)}`)}
              />
            </li>
          ))}
        </ul>
      </section>
    ) : null

  const liste =
    treffer && treffer.length > 0 ? (
      <>
        <SectionTitle>{t('lager.suche_kisten')}</SectionTitle>
        <p className="t-sub mb-2 flex items-center gap-2" aria-live="polite">
          {mehr
            ? t('suche.treffer.mehr', { n: MAX_TREFFER })
            : treffer.length === 1
              ? t('suche.treffer.eins')
              : t('suche.treffer.viele', { n: treffer.length })}
          {laedt ? <Spinner /> : null}
        </p>
        <ul className={cx('space-y-2 transition', laedt && 'opacity-60')}>
          {treffer.map((z) => (
            <li key={z.content_id}>
              <TrefferZeile
                z={z}
                ort={ortText(z)}
                fotoUrl={z.foto_pfad ? (fotoUrls.get(z.foto_pfad) ?? null) : null}
                gewaehlt={offen?.content_id === z.content_id}
                onTipp={() => tippen(z)}
              />
            </li>
          ))}
        </ul>
      </>
    ) : null

  return (
    <>
      <AppHeader title={t('suche.titel')} subtitle={t('lager.suche_untertitel')} />
      <Page wide={desktop}>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const neu = text.trim()
            if (neu !== suchwort) adresse(neu)
            feld.current?.blur()
          }}
          className="relative mb-4 lg:max-w-3xl"
        >
          <Search
            size={20}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input data-tour="suche-feld"
            ref={feld}
            type="search"
            enterKeyHint="search"
            autoFocus={!q}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('lager.suche_platzhalter')}
            aria-label={t('suche.feld')}
            className="h-14 ps-11 pe-12 text-lg [&::-webkit-search-cancel-button]:hidden"
          />
          {text ? (
            <button
              type="button"
              onClick={() => {
                setText('')
                adresse('')
                feld.current?.focus()
              }}
              aria-label={t('suche.leeren')}
              title={t('suche.leeren')}
              className="absolute end-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-raised hover:text-ink"
            >
              <X size={20} />
            </button>
          ) : null}
        </form>

        {/* Vier Zustaende, jeder fuer sich: noch nichts gesucht, laedt,
            Fehler, nichts gefunden. Und dann die Treffer. */}
        {suchwort.length < 2 ? (
          <Empty
            icon={<Search size={36} />}
            title={zuKurz ? t('suche.zu_kurz') : t('suche.feld')}
            hint={t('lager.suche_hinweis')}
          />
        ) : (
          <>
            {produkteFehler ? (
              <div className="mb-4">
                <ErrorBox
                  error={produkteFehler}
                  onRetry={() => {
                    setProdukte(null)
                    setProdukteVersuch((v) => v + 1)
                  }}
                />
              </div>
            ) : null}
            {fehler ? (
              <div className="mb-4">
                <ErrorBox error={fehler} onRetry={() => setVersuch((v) => v + 1)} />
              </div>
            ) : null}
            {produktListe}
            {fehler ? null : treffer === null || (treffer.length === 0 && laedt) ? (
              produktTreffer.length === 0 ? <Loading /> : null
            ) : treffer.length === 0 ? (
              produktTreffer.length === 0 && !produkteLaedt && !produkteFehler ? (
                <Empty icon={<Package size={36} />} title={t('suche.nichts')} />
              ) : null
            ) : desktop ? (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-6">
            <div className="min-w-0">{liste}</div>
            <div className="sticky top-16 min-w-0">
              {offen ? (
                <TrefferDetail
                  key={offen.content_id}
                  z={offen}
                  ort={ortText(offen)}
                  fotoUrl={offen.foto_pfad ? (fotoUrls.get(offen.foto_pfad) ?? null) : null}
                  onFoto={() => setFotoOffen(true)}
                  onKiste={() => zurKiste(offen)}
                  onPlan={() => zumPlan(offen)}
                />
              ) : (
                <Empty icon={<Package size={32} />} title={t('suche.waehlen')} />
              )}
            </div>
          </div>
        ) : (
          liste
        )}
          </>
        )}
      </Page>

      <PunktBild
        offen={offen !== null && fotoOffen}
        onClose={() => setFotoOffen(false)}
        eintrag={offen ? alsEintrag(offen) : null}
        geschwister={[]}
        foto={offen ? alsFoto(offen) : null}
        canEdit={false}
        onAntwort={() => {}}
      />
    </>
  )
}

/** Eine Zeile der Trefferliste: Ding, Kiste, Schicht, Zimmer, Platz und
 *  Hoehe. */
function TrefferZeile({
  z,
  ort,
  fotoUrl,
  gewaehlt,
  onTipp,
}: {
  z: SuchTreffer
  ort: string
  fotoUrl: string | null
  gewaehlt: boolean
  onTipp: () => void
}) {
  const { t } = useSprache()
  return (
    <button
      type="button"
      onClick={onTipp}
      aria-current={gewaehlt ? 'true' : undefined}
      className={cx(
        'flex w-full items-start gap-3 rounded-2xl border-2 bg-surface p-3 text-start transition hover:bg-raised active:scale-[0.99]',
        gewaehlt ? 'border-ink' : 'border-line',
      )}
    >
      <Ausschnitt pfad={z.ausschnitt_pfad} fotoUrl={fotoUrl} rahmen={rahmenVon(z)} groesse={76} alt={z.inhalt} />
      <span className="min-w-0 flex-1">
        <span className="t-name block break-words">
          {z.menge > 1 ? (
            <>
              <span className="t-serial">{z.menge}x</span>{' '}
            </>
          ) : null}
          {z.inhalt}
        </span>
        <span className="t-sub block truncate">{z.project_name}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CodeChip code={z.item_code} size="sm" />
          <FuellBalken wert={z.item_fuellstand} groesse="klein" ohneWert="nichts" />
          <Badge color={z.room_color ?? undefined}>{z.room_name ?? t('lager.bestand_ohne_bereich')}</Badge>
          {z.schicht ? <Badge>{t('schichten.schicht_n', { n: z.schicht })}</Badge> : null}
          {z.bestaetigt === false ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-danger/15 px-2 py-0.5 text-sm font-black text-danger">
              {t('schichten.verneint')}
            </span>
          ) : null}
        </span>
        <span className={cx('mt-1 block text-[0.9375rem]', z.raum_id ? 'font-semibold text-ink' : 'text-muted')}>
          {ort}
        </span>
      </span>
    </button>
  )
}

/** Rechts am Computer: das Ding gross, wo es ist, der Lageplan, und die
 *  Wege weiter. */
function TrefferDetail({
  z,
  ort,
  fotoUrl,
  onFoto,
  onKiste,
  onPlan,
}: {
  z: SuchTreffer
  ort: string
  fotoUrl: string | null
  onFoto: () => void
  onKiste: () => void
  onPlan: () => void
}) {
  const { t } = useSprache()
  const imPlan = z.raum_id !== null
  const hatFoto = z.photo_id !== null && z.foto_pfad !== null

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-4">
        {hatFoto ? (
          <button type="button" onClick={onFoto} aria-label={t('suche.foto_gross')} className="shrink-0 transition active:scale-95">
            <Ausschnitt pfad={z.ausschnitt_pfad} fotoUrl={fotoUrl} rahmen={rahmenVon(z)} groesse={144} alt={z.inhalt} />
          </button>
        ) : (
          <Ausschnitt pfad={z.ausschnitt_pfad} fotoUrl={fotoUrl} rahmen={rahmenVon(z)} groesse={144} alt={z.inhalt} />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="t-name-lg break-words">
            {z.menge > 1 ? (
              <>
                <span className="t-serial">{z.menge}x</span>{' '}
              </>
            ) : null}
            {z.inhalt}
          </p>
          {z.bestaetigt === false ? (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-danger/15 px-2 py-0.5 text-sm font-black text-danger">
                {t('schichten.verneint')}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
        <dt className="text-muted">{t('lager.suche_lager')}</dt>
        <dd className="t-name min-w-0 break-words">{z.project_name}</dd>

        <dt className="text-muted">{t('lager.bereich')}</dt>
        <dd className="min-w-0">
          {z.room_name ? (
            <Badge color={z.room_color ?? undefined}>{z.room_name}</Badge>
          ) : (
            <span className="text-muted">{t('lager.bestand_ohne_bereich')}</span>
          )}
        </dd>

        <dt className="text-muted">{t(`art.${z.item_kind}`)}</dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-2">
          <CodeChip code={z.item_code} size="sm" />
          {z.item_title ? <span className="break-words">{z.item_title}</span> : null}
        </dd>

        {z.item_fuellstand !== null ? (
          <>
            <dt className="text-muted">{t('fuellstand.titel')}</dt>
            <dd className="min-w-0">
              <FuellBalken wert={z.item_fuellstand} />
            </dd>
          </>
        ) : null}

        {z.schicht ? (
          <>
            <dt className="text-muted">{t('suche.schicht')}</dt>
            <dd>{t('schichten.schicht_n', { n: z.schicht })}</dd>
          </>
        ) : null}

        {/* Mit Platz sagt es der Lageplan darunter, ohne steht es hier. */}
        {!imPlan ? (
          <>
            <dt className="text-muted">{t('suche.platz')}</dt>
            <dd className="min-w-0 break-words text-muted">{ort}</dd>
          </>
        ) : null}
      </dl>

      {imPlan ? (
        <Suspense
          fallback={
            <div className="flex items-center gap-2 rounded-2xl border border-line p-4 text-muted">
              <Spinner /> {t('lage.laedt')}
            </div>
          }
        >
          <Lageplan itemId={z.item_id} projectId={z.project_id} angekommen />
        </Suspense>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onKiste}>
          <Package size={18} /> {t('suche.zur_kiste')}
        </Button>
        {hatFoto ? (
          <Button variant="outline" onClick={onFoto}>
            <Camera size={18} /> {t('suche.foto_gross')}
          </Button>
        ) : null}
        {imPlan ? (
          <Button variant="outline" onClick={onPlan}>
            <KarteIcon size={18} /> {t('lage.im_grundriss')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Ein Produkt aus dem Bestand: Zustand, Menge, Lager und Bereich. Ein Tipp
 *  fuehrt in den Bestand dieses Lagers, schon auf den Namen gesucht. */
function ProduktZeile({ p, onTipp }: { p: Produkt; onTipp: () => void }) {
  const ort = [p.lager, p.bereich, p.b.ort].filter(Boolean).join(' . ')
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={onTipp}
        className="flex w-full items-start gap-3 rounded-karte p-3 text-start transition hover:bg-raised active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="t-name block break-words">{p.b.name}</span>
          <span className="t-sub mt-0.5 block break-words">{ort}</span>
          <span className="mt-2 block">
            <ZustandPill b={p.b} suche />
          </span>
        </span>
        <span className="shrink-0 text-end text-xl font-black tabular-nums" dir="ltr">
          {mengeText(p.b.menge)} <span className="text-sm font-bold text-muted">{p.b.einheit}</span>
        </span>
      </button>
    </Card>
  )
}
