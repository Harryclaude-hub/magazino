import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, Map as KarteIcon, Package, Search, X } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Ausschnitt } from '../components/Ausschnitt'
import { PunktBild } from '../components/PunktBild'
import { Fundort } from '../components/raumplan/Fundort'
import { Badge, Button, CodeChip, Empty, ErrorBox, Input, Loading, Modal, Spinner, StatusPill } from '../components/ui'
import { inhaltSuchen } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { signedUrls, type Rahmen } from '../lib/media'
import type { ItemContent, ItemPhoto, SuchTreffer } from '../lib/types'

/* Suchen ueber alle Umzuege.
 *
 * "Kleber" eintippen, und es kommt das Bild des Klebers, und darunter,
 * wo er ist: welcher Umzug, welches Zimmer, welche Kiste, welche Schicht,
 * und in welcher Hoehe. Ein Tipp zeigt den Fundort mit dem kleinen
 * Raumplan, von dort geht es in die Kiste, ins Foto oder in den ganzen
 * Plan.
 *
 * Gesucht wird in der Datenbank (inhalt_suchen, 0024), auch mit
 * Tippfehlern und auf Arabisch. Die Anfrage steht in der Adresse: wer aus
 * einer Kiste zurueckkommt, findet seine Treffer wieder.
 */

const WARTEN_MS = 300
/** So viele Treffer zeigt die Seite. Einer mehr wird geholt, um zu
 *  wissen, ob es noch weitere gibt. */
const MAX_TREFFER = 60

function rahmenAus(z: SuchTreffer): Rahmen | null {
  if (z.box_x0 === null || z.box_y0 === null || z.box_x1 === null || z.box_y1 === null) return null
  return { x0: z.box_x0, y0: z.box_y0, x1: z.box_x1, y1: z.box_y1 }
}

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
  }
}

export default function Suche() {
  const { t } = useSprache()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const suchwort = q.trim()

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
  const [fotoUrls, setFotoUrls] = useState<Map<string, string>>(new Map())
  const [offen, setOffen] = useState<SuchTreffer | null>(null)
  const [fotoOffen, setFotoOffen] = useState(false)

  useEffect(() => {
    const neu = text.trim()
    if (neu === suchwort) return
    const zeit = window.setTimeout(() => adresse(neu), WARTEN_MS)
    return () => window.clearTimeout(zeit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, suchwort])

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
        const liste = alle.slice(0, MAX_TREFFER)
        setTreffer(liste)
        setMehr(alle.length > MAX_TREFFER)
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

  function ortText(z: SuchTreffer): string | null {
    if (!z.room_id || z.item_kind === 'furniture') return null
    if (z.plan_x === null) return t('suche.ohne_platz')
    if (z.regal_boden !== null) {
      return t('suche.regal_brett', {
        regal: z.regal_name || t('raumplan.regal_ohne_name'),
        brett: z.regal_boden,
      })
    }
    return t('suche.boden')
  }

  function hoeheText(z: SuchTreffer): string | null {
    if (z.hoehe_von === null || z.hoehe_bis === null) return null
    return t('raumplan.hoehe_bereich', {
      von: Math.round(Number(z.hoehe_von)),
      bis: Math.round(Number(z.hoehe_bis)),
    })
  }

  function zurKiste(z: SuchTreffer) {
    if (z.item_kind === 'furniture') nav(`/app/p/${z.project_id}/moebel/${z.item_id}`)
    else nav(`/app/p/${z.project_id}/kisten/${z.item_id}?inhalt=${z.content_id}`)
  }

  function zumPlan(z: SuchTreffer) {
    if (!z.room_id) return
    nav(`/app/p/${z.project_id}/zimmer/${z.room_id}/plan?kiste=${z.item_id}`)
  }

  const zuKurz = text.trim().length === 1

  return (
    <>
      <AppHeader title={t('suche.titel')} subtitle={t('suche.untertitel')} />
      <Page>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const neu = text.trim()
            if (neu !== suchwort) adresse(neu)
            feld.current?.blur()
          }}
          className="relative mb-4"
        >
          <Search
            size={20}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <Input
            ref={feld}
            type="search"
            enterKeyHint="search"
            autoFocus={!q}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('suche.platzhalter')}
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
              className="absolute end-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-muted transition hover:bg-raised hover:text-ink"
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
            hint={t('suche.hinweis')}
          />
        ) : fehler ? (
          <ErrorBox error={fehler} onRetry={() => setVersuch((v) => v + 1)} />
        ) : treffer === null || (treffer.length === 0 && laedt) ? (
          <Loading />
        ) : treffer.length === 0 ? (
          <Empty icon={<Package size={36} />} title={t('suche.nichts')} />
        ) : (
          <>
            <p className="t-sub mb-2 flex items-center gap-2" aria-live="polite">
              {mehr
                ? t('suche.treffer.mehr', { n: MAX_TREFFER })
                : treffer.length === 1
                  ? t('suche.treffer.eins')
                  : t('suche.treffer.viele', { n: treffer.length })}
              {laedt ? <Spinner /> : null}
            </p>
            <ul className={laedt ? 'space-y-2 opacity-60 transition' : 'space-y-2 transition'}>
              {treffer.map((z) => {
                const ort = ortText(z)
                const hoehe = hoeheText(z)
                return (
                  <li key={z.content_id}>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoOffen(false)
                        setOffen(z)
                      }}
                      className="flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-start transition hover:bg-raised active:scale-[0.99]"
                    >
                      <Ausschnitt
                        pfad={z.ausschnitt_pfad}
                        fotoUrl={z.foto_pfad ? (fotoUrls.get(z.foto_pfad) ?? null) : null}
                        rahmen={rahmenAus(z)}
                        groesse={76}
                        alt={z.inhalt}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="t-name block break-words">
                          {z.menge > 1 ? <><span className="t-serial">{z.menge}x</span>{' '}</> : null}
                          {z.inhalt}
                        </span>
                        <span className="t-sub block truncate">{z.project_name}</span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <CodeChip code={z.item_code} size="sm" />
                          <Badge color={z.room_color ?? undefined}>
                            {z.room_name ?? t('suche.ohne_zimmer')}
                          </Badge>
                          {z.schicht ? <Badge>{t('schichten.schicht_n', { n: z.schicht })}</Badge> : null}
                          {/* Der Platz im Raumplan ist das Ziel. Solange die
                              Kiste nicht da ist, steht sie noch woanders. */}
                          {z.item_status !== 'arrived' ? <StatusPill status={z.item_status} size="sm" /> : null}
                          {z.bestaetigt === false ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-danger/15 px-2 py-0.5 text-sm font-black text-danger">{t('schichten.verneint')}</span>
                          ) : null}
                        </span>
                        {ort || hoehe ? (
                          <span className="t-sub mt-1 block">
                            {ort && hoehe ? t('suche.ort_und_hoehe', { ort, hoehe }) : (ort ?? hoehe)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Page>

      {/* Der Fundort. Er bleibt offen, waehrend das Foto darueber liegt:
          sonst luede der kleine Plan beim Zurueckkommen neu, und der Dialog
          stuende wieder oben. Schliessen (auch Escape) wirkt dann nur aufs
          Foto, der Dialog wartet. */}
      <Modal
        open={offen !== null}
        onClose={() => {
          if (!fotoOffen) setOffen(null)
        }}
        title={offen?.inhalt ?? ''}
        wide
      >
        {offen ? (
          <Fundblatt
            z={offen}
            fotoUrl={offen.foto_pfad ? (fotoUrls.get(offen.foto_pfad) ?? null) : null}
            ort={ortText(offen)}
            hoehe={hoeheText(offen)}
            onFoto={() => setFotoOffen(true)}
            onKiste={() => zurKiste(offen)}
            onPlan={() => zumPlan(offen)}
          />
        ) : null}
      </Modal>

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

/** Der Inhalt des Fundort-Dialogs: Bild, wo es ist, der kleine Plan, und
 *  die Wege weiter. */
function Fundblatt({
  z,
  fotoUrl,
  ort,
  hoehe,
  onFoto,
  onKiste,
  onPlan,
}: {
  z: SuchTreffer
  fotoUrl: string | null
  ort: string | null
  hoehe: string | null
  onFoto: () => void
  onKiste: () => void
  onPlan: () => void
}) {
  const { t } = useSprache()
  const moebel = z.item_kind === 'furniture'
  const imPlan = z.room_id !== null && !moebel
  const hatFoto = z.photo_id !== null && z.foto_pfad !== null

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Ausschnitt
          pfad={z.ausschnitt_pfad}
          fotoUrl={fotoUrl}
          rahmen={rahmenAus(z)}
          groesse={112}
          alt={z.inhalt}
        />
        <div className="min-w-0 flex-1 space-y-2">
          {z.menge > 1 ? (
            <p className="t-name">
              <span className="t-serial">{z.menge}x</span>{' '}
              {z.inhalt}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <StatusPill status={z.item_status} size="sm" />
            {z.bestaetigt === false ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-danger/15 px-2 py-0.5 text-sm font-black text-danger">{t('schichten.verneint')}</span>
            ) : null}
          </div>
          {/* Der Raumplan zeigt das Ziel. Solange die Kiste nicht
              angekommen ist, steht sie noch woanders. */}
          {z.item_status !== 'arrived' && imPlan && z.plan_x !== null ? (
            <p className="t-sub">{t('suche.noch_nicht_da')}</p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
        <dt className="text-muted">{t('suche.umzug')}</dt>
        <dd className="t-name min-w-0 break-words">{z.project_name}</dd>

        <dt className="text-muted">{t('suche.zimmer')}</dt>
        <dd className="min-w-0">
          {z.room_name ? (
            <Badge color={z.room_color ?? undefined}>{z.room_name}</Badge>
          ) : (
            <span className="text-muted">{t('suche.ohne_zimmer')}</span>
          )}
        </dd>

        <dt className="text-muted">{t(`art.${z.item_kind}`)}</dt>
        <dd className="flex min-w-0 flex-wrap items-center gap-2">
          <CodeChip code={z.item_code} size="sm" />
          {z.item_title ? <span className="break-words">{z.item_title}</span> : null}
        </dd>

        {z.schicht ? (
          <>
            <dt className="text-muted">{t('suche.schicht')}</dt>
            <dd>{t('schichten.schicht_n', { n: z.schicht })}</dd>
          </>
        ) : null}

        {ort ? (
          <>
            <dt className="text-muted">{t('suche.platz')}</dt>
            <dd className="min-w-0 break-words">{ort}</dd>
          </>
        ) : null}

        {hoehe ? (
          <>
            <dt className="text-muted">{t('suche.hoehe')}</dt>
            <dd className="t-name min-w-0">{hoehe}</dd>
          </>
        ) : null}
      </dl>

      {imPlan && z.room_id ? (
        <Fundort
          projectId={z.project_id}
          roomId={z.room_id}
          itemId={z.item_id}
          farbe={z.room_color ?? '#888888'}
          angekommen={z.item_status === 'arrived'}
          onOeffnen={onPlan}
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {hatFoto ? (
          <Button variant="outline" full onClick={onFoto}>
            <Camera size={18} /> {t('suche.im_foto')}
          </Button>
        ) : null}
        <Button full onClick={onKiste}>
          <Package size={18} /> {moebel ? t('suche.zum_moebel') : t('suche.zur_kiste')}
        </Button>
        {imPlan ? (
          <Button variant="outline" full onClick={onPlan}>
            <KarteIcon size={18} /> {t('raumplan.zeigen')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
