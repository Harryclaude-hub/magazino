import { lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Camera,
  Check,
  Copy,
  Crosshair,
  ImagePlus,
  Layers,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Printer,
  Sparkles,
  Star,
  Trash2,
  Upload,
  MoveRight,
  Palette,
  X,
} from 'lucide-react'
import { FuellstandFeld } from '../components/Fuellstand'
import { AppHeader, Page } from '../components/AppShell'
import { Ausschnitt } from '../components/Ausschnitt'
import { BildLesen } from '../components/BildLesen'
import { PunktBild } from '../components/PunktBild'
import { InhaltVerschieben } from '../components/InhaltVerschieben'
import { NahLaden, NahPlatzhalter } from '../components/NahLaden'
import { SuchBand } from '../components/SuchBand'
import { MarkIcon, MarkPicker } from '../components/Mark'
import {
  Avatar,
  Button,
  Card,
  Chip,
  ConfirmDialog,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Loading,
  Modal,
  QrPanel,
  Select,
  SectionTitle,
  Skelett,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { SizePicker } from '../components/SizePicker'
import { ARTEN } from '../lib/arten'
import { useProject } from './ProjectLayout'
import {
  addContent,
  addPhotoRecord,
  deleteContent,
  deleteItem,
  deletePhoto,
  getItem,
  listContents,
  listItemEvents,
  listPhotos,
  setCoverPhoto,
  setPhotoSchicht,
  setzeRahmen,
  updateContent,
  updateItem,
} from '../lib/api'
import { useSprache } from '../lib/i18n'
import { groesseSatz, useEigeneGroessen, useKistenGroessen } from '../lib/groessen'
import { zahlLesen } from '../lib/geometrie'
import { markFlaeche } from '../lib/marken'
import {
  aufnahmeZeit,
  ausschnittErstellen,
  compressImage,
  signedUrls,
  uploadTo,
  type Rahmen,
} from '../lib/media'
import { rahmenVon } from '../lib/rahmen'
import { notifyItemStatus } from '../lib/push'
import {
  STATUS_COLOR,
  type Item,
  type ItemContent,
  type ItemKind,
  type ItemPhoto,
  type ItemStatus,
  type Tag,
  type TagKind,
} from '../lib/types'
import { appUrl, contrastOn, cx, fmtDate, fmtDateTime, relTime, rollenArt, uid, useAsync } from '../lib/util'
import { alterText } from '../lib/alter'
import { displayNameOf, useAuth } from '../lib/auth'

/* "Wo steht die Kiste" (Lageplan mit Knoepfen) laedt als eigener Teil,
 * erst wenn der Abschnitt in die Naehe kommt. */
const KistenLage = lazy(() => import('../components/plan/KistenLage'))

function labelUrl(itemId: string): string {
  return appUrl(`s/${itemId}`)
}

const STATI: ItemStatus[] = ['open', 'transit', 'arrived']

/** Ein Verlaufseintrag kann einen Status tragen, den diese Fassung noch
 *  nicht kennt. Dann steht der rohe Wert da, nie ein nackter Schluessel. */
function istStatus(wert: string): wert is ItemStatus {
  return (STATI as string[]).includes(wert)
}

/** Die Nummer ist das groesste Element der Seite, muss aber auf ein schmales
 *  Handy passen. Darum waechst die Schrift mit der Breite und schrumpft bei
 *  langen Codes, statt aus dem Bild zu laufen. Der Faktor 1.7 kommt aus der
 *  Zeichenbreite der Monospace-Schrift. */
function serialSize(chars: number): string {
  return `clamp(2.5rem, calc((100vw - 5rem) / ${Math.max(chars, 1)} * 1.7), 4.5rem)`
}

/** Zimmer und Person als grosse Kachel: Kuerzel und voller Name, beide gross
 *  genug, um sie beim Tragen einer Kiste zu lesen. */
function TagTile({ role, tag }: { role: string; tag: Tag }) {
  const fg = contrastOn(tag.color)
  const badge = fg === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)'
  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3"
      style={{ background: tag.color, color: fg }}
    >
      <span
        className="t-serial grid h-12 min-w-12 shrink-0 place-items-center rounded-xl px-2 text-xl"
        style={{ background: badge }}
      >
        {tag.short}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold uppercase tracking-wide opacity-80">{role}</span>
        <span className="t-name block break-words">{tag.name}</span>
      </span>
    </div>
  )
}

export default function ItemDetail() {
  const { iid = '' } = useParams()
  /* Kommt man aus der Suche, steht das gesuchte Ding in der Adresse. */
  const [params, setParams] = useSearchParams()
  const gesuchtInhalt = params.get('inhalt')
  const gesuchtGezeigt = useRef<string | null>(null)
  const { project, rooms, people, tagById, canEdit, members } = useProject()
  const { user } = useAuth()
  const { t, tn, lang } = useSprache()
  const groessen = useKistenGroessen()
  const toast = useToast()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contents, setContents] = useState<ItemContent[]>([])
  const [photos, setPhotos] = useState<ItemPhoto[]>([])
  /* Einen Eintrag in eine andere Kiste umhaengen, und die Zeile selbst
   * markieren. Beides sind eigene Dialoge, damit die Seite ruhig bleibt. */
  const [umhaengen, setUmhaengen] = useState<ItemContent | null>(null)
  /* In welche Schicht der Kiste die naechsten Fotos gehoeren. Gilt fuer
   * das Aufnehmen, nicht fuer das, was schon liegt. */
  const [neueSchicht, setNeueSchicht] = useState<number | null>(null)
  /* Der Eintrag, dessen Stelle im Bild gerade gezeigt wird. */
  const [punktEintrag, setPunktEintrag] = useState<ItemContent | null>(null)
  /* Das Foto, auf dem gerade ein neues Ding von Hand markiert wird. */
  const [markierFoto, setMarkierFoto] = useState<ItemPhoto | null>(null)
  const [markieren, setMarkieren] = useState(false)
  const [bildLesen, setBildLesen] = useState(false)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [newEntry, setNewEntry] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  /* Das Feld fuer die eigene Hoehe, mit Fehler. Beim Oeffnen des
   * Dialogs frisch aus der Kiste. */
  const [hoeheFehler, setHoeheFehler] = useState<string | null>(null)
  const [hoeheText, setHoeheText] = useState('')
  useEffect(() => {
    if (!editOpen) return
    setHoeheFehler(null)
    setHoeheText(item?.eigene_hoehe_cm != null ? String(item.eigene_hoehe_cm) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen])
  /* Eigene Groessen des Umzugs, nur solange der Bearbeiten-Dialog offen ist. */
  const eigene = useEigeneGroessen(editOpen ? project.id : null)
  const [delOpen, setDelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // Beim Ziehen ueber Kindelemente feuert dragleave staendig. Der Zaehler
  // sorgt dafuer, dass die Ueberlagerung nicht flackert.
  const dragDepth = useRef(0)

  const events = useAsync(() => listItemEvents(iid, 25), [iid])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [i, c, p] = await Promise.all([getItem(iid), listContents(iid), listPhotos(iid)])
      setItem(i)
      setContents(c)
      setPhotos(p)
      if (p.length) setUrls(await signedUrls('item-photos', p.map((x) => x.path)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [iid])

  useEffect(() => {
    void reload()
  }, [reload])

  /* Das gesuchte Ding einmal in den Blick holen, sobald die Liste wirklich
   * dasteht. Die Inhalte kommen vor den Bildadressen an; solange die noch
   * laden, zeigt die Seite nur "Laedt", und die Zeile gibt es noch nicht.
   * Darum haengt es an loading, und als gezeigt gilt es erst, wenn die
   * Zeile gefunden wurde. */
  useEffect(() => {
    if (loading || !gesuchtInhalt || gesuchtGezeigt.current === gesuchtInhalt) return
    if (!contents.some((c) => c.id === gesuchtInhalt)) return
    requestAnimationFrame(() => {
      const zeile = document.getElementById(`inhalt-${gesuchtInhalt}`)
      if (!zeile) return
      gesuchtGezeigt.current = gesuchtInhalt
      zeile.scrollIntoView({ block: 'center' })
    })
  }, [gesuchtInhalt, contents, loading])

  /** Gibt zurueck, ob es geklappt hat. Wer danach etwas anzeigt, muss
   *  das wissen, etwa das Feld fuer die eigene Hoehe. */
  async function patch(p: Partial<Item>): Promise<boolean> {
    if (!item) return false
    const before = item
    setItem({ ...item, ...p })
    try {
      const next = await updateItem(item.id, p)
      setItem(next)
      events.reload()
      if (p.status === 'arrived' && before.status !== 'arrived') {
        void notifyItemStatus(
          project.id,
          project.name,
          t('kisten.ist_angekommen', { code: next.code }),
        )
      }
      return true
    } catch (err) {
      setItem(before)
      toast(err instanceof Error ? err.message : String(err), 'error')
      return false
    }
  }

  /** Menge um eins aendern (E81): eins rausgenommen, eins dazu. Unter
   *  eins geht es nicht, dafuer gibt es den Papierkorb. Die Zeit der
   *  Aenderung setzt die Datenbank; hier nur vorweg, damit sie sofort
   *  dasteht. */
  function mengeAendern(c: ItemContent, um: 1 | -1) {
    const neu = c.qty + um
    if (neu < 1 || neu > 999) return
    const vorher = { qty: c.qty, geaendert_at: c.geaendert_at, geaendert_was: c.geaendert_was }
    setContents((list) =>
      list.map((x) => (x.id === c.id ? { ...x, qty: neu, geaendert_at: new Date().toISOString(), geaendert_was: 'menge' } : x)),
    )
    void updateContent(c.id, { qty: neu }).catch((err: unknown) => {
      setContents((list) => list.map((x) => (x.id === c.id ? { ...x, ...vorher } : x)))
      toast(err instanceof Error ? err.message : String(err), 'error')
    })
  }

  /** Was unter einem Eintrag klein steht: wann zuletzt geaendert und wie
   *  alt das Foto ist, aus dem er stammt. */
  function zeitZeile(c: ItemContent): { text: string; titel: string } {
    const teile: string[] = []
    const titel: string[] = []
    const wann = alterText(t, tn, c.geaendert_at)
    teile.push(c.geaendert_was ? t(`kisten.geaendert_${c.geaendert_was}`, { wann }) : t('kisten.eingetragen', { wann }))
    titel.push(fmtDateTime(c.geaendert_at))
    const foto = c.photo_id ? photos.find((p) => p.id === c.photo_id) : undefined
    if (foto) {
      teile.push(t('kisten.foto_alter', { wann: alterText(t, tn, foto.aufgenommen_at ?? foto.created_at) }))
      titel.push(
        foto.aufgenommen_at
          ? t('kisten.foto_vom', { datum: fmtDate(foto.aufgenommen_at) })
          : t('kisten.foto_hochgeladen', { datum: fmtDate(foto.created_at) }),
      )
    }
    return { text: teile.join(' · '), titel: titel.join(' · ') }
  }

  async function onAddEntry() {
    const text = newEntry.trim()
    if (!text || !item) return
    setNewEntry('')
    try {
      const row = await addContent(project.id, item.id, text)
      setContents((c) => [...c, row])
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
      setNewEntry(text)
    }
  }

  /** Ein Weg fuer alle drei Quellen: Dateiknopf, Ziehen und Ablegen,
   *  Einfuegen aus der Zwischenablage. */
  const onFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || !item) return
      const all = Array.from(list)
      const images = all.filter((f) => f.type.startsWith('image/'))
      const skipped = all.length - images.length
      // Was kein Bild ist, wird gemeldet statt still verworfen.
      if (skipped > 0) {
        toast(tn('kisten.kein_bild', skipped), 'error')
      }
      if (images.length === 0) return

      setUploading(true)
      let ok = 0
      const failed: string[] = []
      for (const file of images) {
        try {
          const blob = await compressImage(file)
          const path = `${project.id}/${item.id}/${uid()}.jpg`
          await uploadTo('item-photos', path, blob, 'image/jpeg')
          const row = await addPhotoRecord(
            project.id,
            item.id,
            path,
            undefined,
            'foto',
            undefined,
            neueSchicht,
            await aufnahmeZeit(file),
          )
          setPhotos((p) => [...p, row])
          const u = await signedUrls('item-photos', [path])
          setUrls((m) => new Map([...m, ...u]))
          ok++
        } catch (err) {
          failed.push(
            `${file.name || t('kisten.bild')}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      }
      setUploading(false)
      if (ok) toast(tn('kisten.fotos_hinzugefuegt', ok), 'ok')
      // Fehlgeschlagene Uploads werden gemeldet, nicht verschwiegen.
      if (failed.length) toast(t('kisten.upload_fehler', { liste: failed.join(' | ') }), 'error')
    },
    [item, project.id, toast, t, tn, neueSchicht],
  )

  // Der Aufhaenger fuer das Einfuegen liegt auf dem Dokument, damit ein Bild
  // aus der Zwischenablage ankommt, egal worauf gerade der Fokus steht.
  useEffect(() => {
    if (!canEdit) return
    const handler = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length === 0) return
      e.preventDefault()
      void onFiles(files)
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [canEdit, onFiles])

  /** Pfad fuer ein neues Ausschnittbild. Immer ein neuer Name: der
   *  Speicher erlaubt kein Ueberschreiben. */
  function ausschnittPfad(): string {
    return `${project.id}/${iid}/ausschnitt-${uid()}.jpg`
  }

  /** Einen neu gezogenen Rahmen speichern, mit neuem Ausschnitt. Scheitert
   *  nur der Ausschnitt, bleibt der Rahmen und das Bild wird live aus dem
   *  Foto geschnitten. */
  async function rahmenSpeichern(eintrag: ItemContent, r: Rahmen) {
    const foto = photos.find((p) => p.id === eintrag.photo_id)
    if (!foto) return
    let pfad: string | null = null
    try {
      pfad = await ausschnittErstellen(foto.path, r, ausschnittPfad())
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
    try {
      const neu = await setzeRahmen(eintrag, r, pfad)
      setContents((list) => list.map((x) => (x.id === neu.id ? neu : x)))
      setPunktEintrag((cur) => (cur?.id === neu.id ? neu : cur))
      toast(t('schichten.rahmen_gespeichert'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  /** Ein Ding, das die Erkennung uebersehen hat, von Hand im Bild
   *  markieren: neuer Eintrag mit Rahmen, Schicht des Fotos und Ausschnitt. */
  async function dingMarkieren(name: string, r: Rahmen) {
    const foto = markierFoto
    if (!foto || !item) return
    try {
      let neu = await addContent(
        project.id,
        item.id,
        name,
        1,
        'hand',
        { photo_id: foto.id, schicht: foto.schicht, rahmen: r },
        { suchwoerter: [name] },
      )
      try {
        const pfad = await ausschnittErstellen(foto.path, r, ausschnittPfad())
        neu = await setzeRahmen(neu, r, pfad)
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
      }
      setContents((c) => [...c, neu])
      toast(t('schichten.markiert'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(labelUrl(id))
      toast(t('kisten.link_kopiert'), 'ok')
    } catch (err) {
      toast(
        t('kisten.kopieren_fehler', {
          grund: err instanceof Error ? err.message : String(err),
        }),
        'error',
      )
    }
  }

  /* Laden und Fehler behalten den Kopf mit Zurueck: wer hier festhaengt,
   * kommt immer zur Liste. */
  const kopfOhneKiste = (
    <AppHeader wide title={t('nav.kisten')} back={`/app/p/${project.id}/kisten`} />
  )

  if (loading)
    return (
      <>
        {kopfOhneKiste}
        <Page wide>
          <Skelett art="seite" label={t('kisten.kiste_laedt')} />
        </Page>
      </>
    )

  if (error || !item)
    return (
      <>
        {kopfOhneKiste}
        <Page>
          <ErrorBox error={error ?? t('kisten.nicht_gefunden')} onRetry={() => void reload()} />
          <Link to={`/app/p/${project.id}/kisten`} className="mt-4 inline-block">
            <Button variant="outline">{t('kisten.zur_liste')}</Button>
          </Link>
          <div className="h-6" />
        </Page>
      </>
    )

  const room = tagById(item.room_id)
  const person = tagById(item.person_id)
  const color = room?.color ?? person?.color ?? '#94a3b8'
  const seq = String(item.seq).padStart(3, '0')
  const serial = `${item.prefix}-${item.size}-${seq}`
  const nameOf = (id: string | null) =>
    displayNameOf(members.find((m) => m.user_id === id)?.profile, t('kisten.jemand'))
  const printHref = `/app/p/${project.id}/etiketten?item=${item.id}`
  const gesucht = gesuchtInhalt ? (contents.find((c) => c.id === gesuchtInhalt) ?? null) : null
  const gesuchtFoto = gesucht?.photo_id ? (photos.find((p) => p.id === gesucht.photo_id) ?? null) : null
  const zurLage = () => document.getElementById('lage')?.scrollIntoView({ behavior: rollenArt(), block: 'start' })
  // Eine signierte Adresse kann fehlen, ohne dass ein Fehler geworfen wird.
  // Ohne diese Zaehlung bliebe die Kachel stumm auf "laedt" stehen.
  const missingPhotos = uploading ? 0 : photos.filter((p) => !urls.get(p.path)).length

  return (
    <>
      <AppHeader
        wide
        title={item.code}
        subtitle={item.title || t(`art.${item.kind}`)}
        back={`/app/p/${project.id}/kisten`}
        actions={
          canEdit ? (
            <>
              <IconButton data-tour="kiste-markieren" label={t('marken.markieren')} size="sm" onClick={() => setMarkieren(true)}>
                <Palette size={19} />
              </IconButton>
              <IconButton data-tour="kiste-bearbeiten" label={t('kisten.bearbeiten')} size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={19} />
              </IconButton>
              <IconButton data-tour="kiste-loeschen"
                label={t('kisten.loeschen')}
                tone="danger"
                size="sm"
                onClick={() => setDelOpen(true)}
              >
                <Trash2 size={19} />
              </IconButton>
            </>
          ) : null
        }
      />

      <Page wide>
        {/* Aus der Suche: was gesucht war, mit Bild und Weg zum Lageplan. */}
        {gesuchtInhalt ? (
          <SuchBand
            eintrag={gesucht}
            fotoUrl={gesuchtFoto ? (urls.get(gesuchtFoto.path) ?? null) : null}
            onFoto={gesucht?.photo_id ? () => setPunktEintrag(gesucht) : undefined}
            onLage={zurLage}
            onWeg={() => {
              const rest = new URLSearchParams(params)
              rest.delete('inhalt')
              setParams(rest, { replace: true })
            }}
          />
        ) : null}

        {/* Am Handy eine Spalte in der Reihenfolge Nummer und Status, Fotos,
            Inhalt, Eigenschaften, Verlauf, Lageplan. Am Computer drei
            Spalten: Inhalt und Fotos | Lageplan | Eigenschaften. Die
            Spalten-Huellen sind am Handy unsichtbar (display: contents),
            damit ihre Teile frei geordnet werden koennen. */}
        <div className="kistenseite flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(300px,0.85fr)] lg:items-start lg:gap-6">
          {/* Spalte 1: Inhalt und Fotos */}
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
            <section className="order-3 min-w-0 lg:order-none">
              {/* Inhalt */}
              <SectionTitle
                action={
                  canEdit && photos.some((p) => p.art === 'foto') ? (
                    <Button data-tour="kiste-foto-lesen" size="sm" variant="outline" onClick={() => setBildLesen(true)}>
                      <Sparkles size={16} />
                      {t('bildki.knopf_kurz')}
                    </Button>
                  ) : null
                }
              >
                {t('begriff.inhalt')}
                {contents.length > 0 ? ` (${contents.length})` : ''}
              </SectionTitle>
              <Card className="overflow-hidden">
                {contents.length === 0 ? (
                  <p className="px-4 py-6 text-center text-base text-muted">{t('kisten.inhalt_leer')}</p>
                ) : (
                  <ul className="zebra divide-y divide-line">
                    {contents.map((c) => (
                      <li
                        key={c.id}
                        id={`inhalt-${c.id}`}
                        className={cx(
                          'flex items-center gap-3 px-3 py-2.5',
                          c.id === gesuchtInhalt && 'ring-4 ring-inset ring-danger',
                        )}
                      >
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            const next = !c.checked
                            setContents((list) =>
                              list.map((x) => (x.id === c.id ? { ...x, checked: next } : x)),
                            )
                            void updateContent(c.id, { checked: next }).catch((err: unknown) => {
                              setContents((list) =>
                                list.map((x) => (x.id === c.id ? { ...x, checked: !next } : x)),
                              )
                              toast(err instanceof Error ? err.message : String(err), 'error')
                            })
                          }}
                          aria-label={c.checked ? t('kisten.haken_entfernen') : t('kisten.abhaken')}
                          title={c.checked ? t('kisten.haken_entfernen') : t('kisten.abhaken')}
                          className={cx(
                            'grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 transition active:scale-95',
                            'disabled:cursor-not-allowed disabled:opacity-45',
                            c.checked ? 'border-ok bg-ok text-paper' : 'border-line bg-surface',
                          )}
                        >
                          {c.checked ? <Check size={20} strokeWidth={3} /> : null}
                        </button>

                        {/* Hat der Eintrag eine Stelle auf einem Bild, fuehrt
                            ein Tippen dorthin. Sonst steht hier nur Text: ein
                            Knopf, der nichts tut, waere gelogen. */}
                        {/* Das kleine Bild des Dings, wenn es eines gibt. Ein
                            Tippen darauf zeigt es im Foto. */}
                        {c.ausschnitt_pfad || (c.photo_id && c.box_x0 !== null) ? (
                          <button
                            type="button"
                            onClick={() => setPunktEintrag(c)}
                            aria-label={c.text}
                            className="shrink-0 transition active:scale-95"
                          >
                            <Ausschnitt
                              pfad={c.ausschnitt_pfad}
                              fotoUrl={(() => {
                                const f = photos.find((p) => p.id === c.photo_id)
                                return f ? (urls.get(f.path) ?? null) : null
                              })()}
                              rahmen={rahmenVon(c)}
                              groesse={44}
                              alt={c.text}
                            />
                          </button>
                        ) : null}

                        {/* Text oben, Schicht und Antwort klein darunter. Neben
                            dem Text blieben auf einem schmalen Handy sonst nur
                            drei Buchstaben je Zeile. */}
                        <div className="min-w-0 flex-1">
                          {c.photo_id ? (
                            <button
                              type="button"
                              onClick={() => setPunktEintrag(c)}
                              className={cx(
                                'block w-full break-words text-start text-lg font-semibold underline decoration-line decoration-2 underline-offset-4',
                                c.checked && 'text-muted line-through',
                              )}
                            >
                              {c.qty > 1 && !canEdit ? <><span className="t-serial">{c.qty}x</span>{' '}</> : null}
                              {c.text}
                            </button>
                          ) : (
                            <span
                              className={cx(
                                'block break-words text-lg font-semibold',
                                c.checked && 'text-muted line-through',
                              )}
                            >
                              {c.qty > 1 && !canEdit ? <><span className="t-serial">{c.qty}x</span>{' '}</> : null}
                              {c.text}
                            </span>
                          )}

                          {c.schicht || c.bestaetigt !== null ? (
                            <span className="mt-1 flex flex-wrap items-center gap-1.5">
                              {c.schicht ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-raised px-2 py-0.5 text-sm font-black">
                                  <Layers size={13} />
                                  {t('schichten.schicht_n', { n: c.schicht })}
                                </span>
                              ) : null}
                              {c.bestaetigt === true ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-ok/15 px-2 py-0.5 text-sm font-black text-ok">
                                  <Check size={13} strokeWidth={3} />
                                  {t('schichten.bestaetigt')}
                                </span>
                              ) : null}
                              {c.bestaetigt === false ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-danger/15 px-2 py-0.5 text-sm font-black text-danger">
                                  <X size={13} strokeWidth={3} />
                                  {t('schichten.verneint')}
                                </span>
                              ) : null}
                            </span>
                          ) : null}

                          {/* Menge und Zeit (E81). Der Zaehler steht unter dem
                              Namen, damit der Name die Breite behaelt. */}
                          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {canEdit ? (
                              <span className="inline-flex items-center rounded-lg border-2 border-line bg-surface" role="group" aria-label={t('kisten.menge')} dir="ltr">
                                <button
                                  type="button"
                                  disabled={c.qty <= 1}
                                  onClick={() => mengeAendern(c, -1)}
                                  aria-label={t('kisten.menge_weniger')}
                                  title={t('kisten.menge_weniger')}
                                  className="grid h-8 w-9 place-items-center rounded-s-md text-ink transition hover:bg-raised active:scale-95 disabled:opacity-35"
                                >
                                  <Minus size={16} strokeWidth={3} />
                                </button>
                                <span className="t-serial min-w-8 px-1 text-center text-base font-black" aria-live="polite">{c.qty}</span>
                                <button
                                  type="button"
                                  disabled={c.qty >= 999}
                                  onClick={() => mengeAendern(c, 1)}
                                  aria-label={t('kisten.menge_mehr')}
                                  title={t('kisten.menge_mehr')}
                                  className="grid h-8 w-9 place-items-center rounded-e-md text-ink transition hover:bg-raised active:scale-95 disabled:opacity-35"
                                >
                                  <Plus size={16} strokeWidth={3} />
                                </button>
                              </span>
                            ) : null}
                            {(() => {
                              const z = zeitZeile(c)
                              return (
                                <span className="t-sub text-sm" title={z.titel}>
                                  {z.text}
                                </span>
                              )
                            })()}
                          </span>
                        </div>

                        {canEdit ? (
                          <IconButton
                            label={t('inhalt.verschieben')}
                            size="sm"
                            onClick={() => setUmhaengen(c)}
                          >
                            <MoveRight size={16} className="spiegeln" />
                          </IconButton>
                        ) : null}

                        {canEdit ? (
                          <IconButton
                            label={t('kisten.eintrag_loeschen')}
                            tone="danger"
                            size="sm"
                            onClick={() => {
                              setContents((list) => list.filter((x) => x.id !== c.id))
                              void deleteContent(c.id, c.ausschnitt_pfad).catch((err: unknown) => {
                                toast(err instanceof Error ? err.message : String(err), 'error')
                                void reload()
                              })
                            }}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {canEdit ? (
                  <div className="flex gap-2 border-t border-line p-3">
                    <Input data-tour="kiste-eintrag"
                      className="min-w-0"
                      value={newEntry}
                      onChange={(e) => setNewEntry(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void onAddEntry()
                        }
                      }}
                      placeholder={t('kisten.inhalt_platzhalter')}
                    />
                    <IconButton
                      label={t('kisten.eintrag_hinzufuegen')}
                      disabled={!newEntry.trim()}
                      onClick={() => void onAddEntry()}
                    >
                      <Plus size={20} />
                    </IconButton>
                  </div>
                ) : null}
              </Card>
            </section>

            <section className="order-2 min-w-0 lg:order-none">
              {/* Fotos */}
              <SectionTitle
                action={
                  canEdit ? (
                    <Button data-tour="kiste-foto"
                      size="sm"
                      variant="soft"
                      loading={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImagePlus size={16} /> {t('kisten.foto')}
                    </Button>
                  ) : null
                }
              >
                {t('begriff.fotos')}
                {photos.length > 0 ? ` (${photos.length})` : ''}
              </SectionTitle>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                hidden
                onChange={(e) => {
                  void onFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              {/* Schicht fuer die naechsten Fotos. Sie steht ueber dem
                  Fotobereich, weil sie sich auf das Aufnehmen bezieht und nicht
                  auf ein einzelnes Bild. */}
              {canEdit ? (
                <Card className="mb-3 p-4">
                  <p className="t-name flex items-center gap-2">
                    <Layers size={18} /> {t('schichten.waehlen')}
                  </p>
                  <p className="t-sub mt-1.5">{t('schichten.hinweis')}</p>
                  <div data-tour="kiste-schicht" className="-mx-1 mt-3 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1">
                    <Chip active={neueSchicht === null} onClick={() => setNeueSchicht(null)}>
                      {t('schichten.ohne')}
                    </Chip>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Chip key={n} active={neueSchicht === n} onClick={() => setNeueSchicht(n)}>
                        <span className="t-serial">{t('schichten.schicht_n', { n })}</span>
                      </Chip>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card
                className="relative p-3"
                onDragEnter={(e) => {
                  if (!canEdit) return
                  e.preventDefault()
                  dragDepth.current += 1
                  setDragOver(true)
                }}
                onDragOver={(e) => {
                  if (!canEdit) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                }}
                onDragLeave={() => {
                  if (!canEdit) return
                  dragDepth.current = Math.max(0, dragDepth.current - 1)
                  if (dragDepth.current === 0) setDragOver(false)
                }}
                onDrop={(e) => {
                  if (!canEdit) return
                  e.preventDefault()
                  dragDepth.current = 0
                  setDragOver(false)
                  void onFiles(e.dataTransfer.files)
                }}
              >
                {dragOver ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-ink bg-paper/92">
                    <Upload size={34} />
                    <span className="t-name">{t('kisten.hier_ablegen')}</span>
                  </div>
                ) : null}

                {photos.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center">
                    <Camera size={28} className="text-muted" />
                    <p className="t-name">{t('kisten.fotos_leer')}</p>
                    <p className="t-sub max-w-xs">{t('kisten.fotos_hinweis')}</p>
                    {canEdit ? (
                      <Button variant="soft" loading={uploading} onClick={() => fileRef.current?.click()}>
                        <ImagePlus size={18} /> {t('kisten.foto_aufnehmen')}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {missingPhotos > 0 ? (
                      <div className="mb-2">
                        <ErrorBox
                          error={tn('kisten.fotos_fehlen', missingPhotos)}
                          onRetry={() => void reload()}
                        />
                      </div>
                    ) : null}
                    <div className="foto-reihe -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
                      {photos.map((p) => {
                        const url = urls.get(p.path)
                        return (
                          <div
                            key={p.id}
                            className="relative aspect-square w-40 shrink-0 snap-start overflow-hidden rounded-knopf bg-raised sm:w-48 lg:w-auto"
                          >
                            {url ? (
                              <img
                                src={url}
                                alt={p.caption ?? t('kisten.foto_alt')}
                                loading="lazy"
                                className="h-full w-full cursor-zoom-in object-cover"
                                onClick={() => setLightbox(url)}
                              />
                            ) : uploading ? (
                              <div className="flex h-full items-center justify-center text-sm text-muted">
                                {t('zustand.laedt')}
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center px-2 text-center text-sm font-bold text-danger">
                                {t('kisten.bild_fehlt')}
                              </div>
                            )}
                            {/* Das Deckbild ist das, was beim Scannen sofort
                                erscheint. Darum steht der Knopf direkt am Bild
                                und zeigt an, welches gerade gilt. */}
                            {canEdit ? (
                              <button
                                type="button"
                                aria-pressed={item.cover_photo_id === p.id}
                                aria-label={
                                  item.cover_photo_id === p.id
                                    ? t('schnell.deckbild')
                                    : t('kisten.zum_deckbild')
                                }
                                title={
                                  item.cover_photo_id === p.id
                                    ? t('schnell.deckbild')
                                    : t('kisten.zum_deckbild')
                                }
                                onClick={() => {
                                  const ziel = item.cover_photo_id === p.id ? null : p.id
                                  void setCoverPhoto(item.id, ziel)
                                    .then((neu) => {
                                      setItem(neu)
                                      toast(
                                        ziel ? t('schnell.deckbild_gesetzt') : t('kisten.deckbild_ab'),
                                        'ok',
                                      )
                                    })
                                    .catch((err: unknown) =>
                                      toast(err instanceof Error ? err.message : String(err), 'error'),
                                    )
                                }}
                                className={cx(
                                  'absolute start-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95',
                                  item.cover_photo_id === p.id
                                    ? 'bg-ink text-paper'
                                    : 'bg-black/60 text-white',
                                )}
                              >
                                <Star
                                  size={17}
                                  fill={item.cover_photo_id === p.id ? 'currentColor' : 'none'}
                                />
                              </button>
                            ) : null}
                            {canEdit ? (
                              // Immer sichtbar, denn auf dem Handy gibt es kein Ueberfahren
                              // mit der Maus und der Knopf waere sonst nicht erreichbar. Die
                              // dunkle Platte dahinter haelt ihn auf jedem Foto lesbar.
                              <span className="absolute end-1.5 top-1.5 rounded-xl bg-black/60 p-0.5">
                                <IconButton
                                  label={t('kisten.foto_loeschen')}
                                  tone="danger"
                                  size="sm"
                                  onClick={() => {
                                    setPhotos((list) => list.filter((x) => x.id !== p.id))
                                    void deletePhoto(p)
                                      .then(() =>
                                        // Die Datenbank nimmt den Zeilen den Ort (0019). Hier
                                        // genauso, sonst fuehrt ein Tippen auf sie ins Leere.
                                        setContents((list) =>
                                          list.map((x) =>
                                            x.photo_id === p.id
                                              ? {
                                                  ...x,
                                                  photo_id: null,
                                                  punkt_x: null,
                                                  punkt_y: null,
                                                  bestaetigt: null,
                                                }
                                              : x,
                                          ),
                                        ),
                                      )
                                      .catch((err: unknown) => {
                                        toast(err instanceof Error ? err.message : String(err), 'error')
                                        void reload()
                                      })
                                  }}
                                >
                                  <Trash2 size={17} />
                                </IconButton>
                              </span>
                            ) : null}

                            {/* In welcher Schicht dieses Bild aufgenommen wurde.
                                Tippen zaehlt eins weiter und nach der fuenften
                                wieder auf keine. */}
                            <button
                              type="button"
                              disabled={!canEdit}
                              title={t('schichten.foto_schicht')}
                              aria-label={t('schichten.foto_schicht')}
                              onClick={() => {
                                const naechste = p.schicht === null ? 1 : p.schicht >= 5 ? null : p.schicht + 1
                                setPhotos((list) =>
                                  list.map((x) => (x.id === p.id ? { ...x, schicht: naechste } : x)),
                                )
                                void setPhotoSchicht(p.id, naechste)
                                  .then(() => {
                                    // Die Zeilen auf diesem Foto ziehen mit, wie in der Datenbank.
                                    setContents((list) =>
                                      list.map((x) =>
                                        x.photo_id === p.id ? { ...x, schicht: naechste } : x,
                                      ),
                                    )
                                    toast(
                                      naechste === null
                                        ? t('schichten.entfernt')
                                        : t('schichten.gesetzt', { n: naechste }),
                                      'ok',
                                    )
                                  })
                                  .catch((err: unknown) => {
                                    toast(err instanceof Error ? err.message : String(err), 'error')
                                    // Ob das Foto oder erst die Zeilen scheiterten, weiss hier
                                    // niemand. Also den Stand der Datenbank holen, nicht raten.
                                    void reload()
                                  })
                              }}
                              className={cx(
                                'absolute bottom-1.5 start-1.5 flex h-9 items-center gap-1 rounded-xl px-2 text-sm font-black transition active:scale-95',
                                'disabled:cursor-not-allowed disabled:opacity-60',
                                p.schicht ? 'bg-ink text-paper' : 'bg-black/60 text-white',
                              )}
                            >
                              <Layers size={15} />
                              <span className="t-serial">{p.schicht ?? '-'}</span>
                            </button>
                            {/* Wie alt das Foto ist (E81): Aufnahme, sonst Hochladen. */}
                            <span
                              className="pointer-events-none absolute bottom-1.5 end-1.5 rounded-lg bg-black/65 px-1.5 py-1 text-xs font-bold leading-none text-white"
                              title={
                                p.aufgenommen_at
                                  ? t('kisten.foto_vom', { datum: fmtDate(p.aufgenommen_at) })
                                  : t('kisten.foto_hochgeladen', { datum: fmtDate(p.created_at) })
                              }
                            >
                              {alterText(t, tn, p.aufgenommen_at ?? p.created_at)}
                            </span>

                            {/* Ein Ding, das die Erkennung uebersehen hat, hier
                                von Hand markieren. */}
                            {canEdit && url ? (
                              <button
                                type="button"
                                onClick={() => setMarkierFoto(p)}
                                title={t('schichten.markieren')}
                                aria-label={t('schichten.markieren')}
                                className="absolute bottom-1.5 end-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white transition active:scale-95"
                              >
                                <Crosshair size={17} />
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </Card>
            </section>
          </div>

          {/* Spalte 2: Lageplan */}
          <div className="contents lg:sticky lg:top-20 lg:block lg:min-w-0">
            {/* Wo die Kiste steht (START 5.8): am Handy ganz unten, am Computer
              die mittlere Spalte, die beim Rollen stehen bleibt. */}
            <section data-tour="kiste-lage" id="lage" className="order-6 min-w-0 scroll-mt-24 lg:order-none">
              <SectionTitle>{t(item.kind === 'furniture' ? 'lage.titel_moebel' : 'lage.titel')}</SectionTitle>
              <NahLaden platzhalter={<NahPlatzhalter text={t('lage.laedt')} />}>
                <KistenLage
                  itemId={item.id}
                  projectId={project.id}
                  code={item.code}
                  moebel={item.kind === 'furniture'}
                  angekommen={item.status === 'arrived'}
                  canEdit={canEdit}
                />
              </NahLaden>
            </section>
          </div>

          {/* Spalte 3: Nummer, Status und Eigenschaften */}
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
            {/* Kopf: Nummer, Titel und Status */}
            <Card
              className="order-1 overflow-hidden lg:order-none"
              style={{ backgroundColor: markFlaeche(item.mark_color) }}
            >
              <div className="h-2.5" style={{ background: item.mark_color ?? color }} />
              {item.mark_symbol ? (
                <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-[0.9375rem] font-bold">
                  <MarkIcon symbol={item.mark_symbol} size={17} />
                  {t(`marken.symbol_${item.mark_symbol}`)}
                </p>
              ) : null}

              <div className="min-w-0 p-4 sm:p-5">
                <p
                  className="t-serial leading-none lg:!text-[2.75rem]"
                  style={{ fontSize: serialSize(serial.length) }}
                >
                  {item.prefix}
                  <span className="opacity-25">-</span>
                  <span className="text-danger">{item.size}</span>
                  <span className="opacity-25">-</span>
                  {seq}
                </p>

                <p className="t-name-lg mt-3 break-words">{item.title || t(`art.${item.kind}`)}</p>
                <p className="t-sub mt-1">
                  {t('kisten.art_und_satz', {
                    art: t(`art.${item.kind}`),
                    groesse: groesseSatz(t, lang, item.size, item.kind, groessen),
                  })}
                </p>
              </div>

              {/* Status */}
              <div className="border-t border-line p-4">
                <p className="mb-2.5 text-sm font-black uppercase tracking-wider text-muted">
                  {t('begriff.status')}
                </p>
                <div data-tour="kiste-status" className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 2xl:grid-cols-3">
                  {STATI.map((s) => (
                    <Button
                      key={s}
                      full
                      disabled={!canEdit}
                      variant={item.status === s ? 'aktiv' : 'soft'}
                      onClick={() => void patch({ status: s })}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: STATUS_COLOR[s] }}
                      />
                      <span className="truncate">{t(`status.${s}`)}</span>
                    </Button>
                  ))}
                </div>
                {item.arrived_at ? (
                  <p className="t-sub mt-2.5">
                    {t('kisten.angekommen_am', { wann: fmtDateTime(item.arrived_at) })}
                  </p>
                ) : null}
              </div>

              {/* Wie voll (0033): Tipp-Knoepfe und feiner Regler, sofort gespeichert. */}
              <div data-tour="kiste-fuellstand" className="border-t border-line p-4">
                <FuellstandFeld
                  wert={item.fuellstand ?? null}
                  canEdit={canEdit}
                  onWert={(v) => void patch({ fuellstand: v })}
                />
              </div>
            </Card>

            {/* Eigenschaften: Zimmer, Person, Etikett, Notiz */}
            <Card className="order-4 overflow-hidden lg:order-none">
              <div className="grid gap-4 p-4 sm:p-5">
                <div className="grid gap-2">
                  {room ? <TagTile role={t('begriff.zimmer')} tag={room} /> : null}
                  {/* Der Weg von der Kiste zum Zimmer: zeig mir, wo sie steht.
                      Auf der Seite selbst und fuer jede Rolle, nicht versteckt
                      im Bearbeiten: suchen muss auch, wer nur schauen darf.
                      Ein Sprung nach unten zum Lageplan. */}
                  {item.kind !== 'furniture' ? (
                    <Button data-tour="kiste-wo" variant="soft" full onClick={zurLage} className="lg:hidden">
                      <MapPin size={18} /> {t('lage.wo_steht_sie')}
                    </Button>
                  ) : null}
                  {person ? <TagTile role={t('begriff.person')} tag={person} /> : null}
                  {!room && !person ? (
                    <div className="rounded-2xl border border-dashed border-line px-3 py-3">
                      <p className="t-name">{t('kisten.ohne_zuordnung')}</p>
                      <p className="t-sub">{t('kisten.ohne_zuordnung_hinweis')}</p>
                    </div>
                  ) : null}
                  {item.fragile ? (
                    <div className="t-name rounded-2xl bg-warn/15 px-3 py-3 text-warn">
                      {t('kisten.zerbrechlich_warnung')}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-center gap-3 border-t border-line pt-4">
                  <QrPanel value={labelUrl(item.id)} code={item.code} size={168} />
                  <div className="grid w-full gap-2">
                    <Button data-tour="kiste-link" variant="soft" full onClick={() => void copyLink(item.id)}>
                      <Copy size={18} /> {t('kisten.link_kopieren')}
                    </Button>
                    <Link data-tour="kiste-druck" to={printHref} className="block">
                      <Button variant="outline" full>
                        <Printer size={18} /> {t('kisten.druckansicht')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              {item.note || item.target_room ? (
                <div className="border-t border-line p-4">
                  {item.target_room ? (
                    <p className="break-words text-base">
                      <span className="font-bold">{t('begriff.ziel')}: </span>
                      {item.target_room}
                    </p>
                  ) : null}
                  {item.note ? (
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-base text-muted">
                      {item.note}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <section className="order-5 min-w-0 lg:order-none">
              {/* Verlauf */}
              <SectionTitle>{t('begriff.verlauf')}</SectionTitle>
              <Card className="overflow-hidden">
                {events.loading ? (
                  <Loading label={t('kisten.verlauf_laedt')} />
                ) : events.error ? (
                  <div className="p-3">
                    <ErrorBox error={events.error} onRetry={events.reload} />
                  </div>
                ) : (events.data ?? []).length === 0 ? (
                  <p className="px-4 py-6 text-center text-base text-muted">{t('kisten.verlauf_leer')}</p>
                ) : (
                  <ul className="zebra divide-y divide-line">
                    {(events.data ?? []).map((ev) => {
                      const d = ev.data as Record<string, string>
                      return (
                        <li key={ev.id} className="flex items-center gap-3 px-3 py-2.5">
                          <Avatar name={nameOf(ev.user_id)} size={34} />
                          <span className="min-w-0 flex-1 break-words text-base">
                            <span className="font-bold">{nameOf(ev.user_id)}</span>{' '}
                            <span className="text-muted">
                              {ev.type === 'created' ? (
                                t('kisten.ev_created')
                              ) : ev.type === 'status' ? (
                                t('kisten.ev_status', {
                                  status: istStatus(d.to) ? t(`status.${d.to}`) : d.to,
                                })
                              ) : ev.type === 'scan' ? (
                                t('kisten.ev_scan')
                              ) : ev.type === 'inhalt_menge' ? (
                                <>
                                  {t('kisten.ev_menge')} {d.text}{' '}
                                  <span className="t-serial" dir="ltr">
                                    {String(d.von)} &rarr; {String(d.nach)}
                                  </span>
                                </>
                              ) : ev.type === 'inhalt_kiste' ? (
                                <>
                                  {t('kisten.ev_umgepackt')} {d.text}{' '}
                                  <span className="t-serial" dir="ltr">
                                    {d.von ?? '?'} &rarr; {d.nach ?? '?'}
                                  </span>
                                </>
                              ) : ev.type === 'code' ? (
                                <>
                                  {t('kisten.ev_code')}{' '}
                                  {/* Beide Nummern in einem Stueck von links nach rechts,
                                      damit der Pfeil auch im arabischen Satz vom alten
                                      auf den neuen Code zeigt. */}
                                  <span className="t-serial" dir="ltr">
                                    {d.from} &rarr; {d.to}
                                  </span>
                                </>
                              ) : (
                                ev.type
                              )}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm text-muted">{relTime(ev.created_at)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </section>
          </div>
        </div>

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>


      {/* Bearbeiten */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('kisten.bearbeiten')}
        wide
        footer={<Button onClick={() => setEditOpen(false)}>{t('aktion.fertig')}</Button>}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-raised p-3 text-base">{t('kisten.code_hinweis')}</div>

          <Field label={t('begriff.titel')}>
            <Input
              defaultValue={item.title ?? ''}
              onBlur={(e) => void patch({ title: e.target.value.trim() || null })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('begriff.zimmer')} hint={t('kisten.zimmer_regel')}>
              <Select
                value={item.room_id ?? ''}
                onChange={(e) => void patch({ room_id: e.target.value || null })}
              >
                {/* Ohne Zimmer geht nur, wenn eine Person dransteht. */}
                <option value="" disabled={!item.person_id}>
                  {t('kisten.kein_zimmer')}
                </option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('begriff.person')} hint={t('begriff.optional')}>
              <Select
                value={item.person_id ?? ''}
                onChange={(e) => void patch({ person_id: e.target.value || null })}
              >
                <option value="" disabled={!item.room_id}>
                  {t('kisten.keine_person')}
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {item.room_id && item.person_id ? (
            <Field label={t('kisten.kuerzel_im_code')}>
              <Select
                value={item.code_source}
                onChange={(e) => void patch({ code_source: e.target.value as TagKind })}
              >
                <option value="room">
                  {t('kisten.kuerzel_option_zimmer', { kuerzel: room?.short ?? '' })}
                </option>
                <option value="person">
                  {t('kisten.kuerzel_option_person', { kuerzel: person?.short ?? '' })}
                </option>
              </Select>
            </Field>
          ) : null}

          <Field label={t('begriff.groesse')}>
            {/* Eine Stufe waehlt die eigene Groesse ab. Eine eigene Groesse
                setzt die Datenbank samt Stufe und neuer Nummer; lehnt sie ab
                (etwa: der Stapel wuerde zu hoch), setzt patch zurueck. */}
            <SizePicker
              value={item.size}
              kind={item.kind}
              onChange={(size) =>
                void patch(item.eigene_groesse_id ? { size, eigene_groesse_id: null } : { size })
              }
              eigene={eigene.liste}
              eigeneFehler={eigene.fehler}
              eigeneId={item.eigene_groesse_id}
              onEigene={(id) => void patch({ eigene_groesse_id: id })}
              onEigeneNochmal={eigene.nochmal}
            />
          </Field>

          {/* Eine eigene Hoehe nur fuer Kisten, die anders hoch sind als
              ihre Groesse, etwa eine Kleiderbox. Der Grundriss stapelt mit
              dieser Hoehe (0022). Leer heisst: die Hoehe der Groesse. */}
          {item.kind !== 'furniture' ? (
            <Field
              label={t('kisten.eigene_hoehe')}
              hint={
                item.eigene_groesse_id
                  ? t('kisten.eigene_hoehe_durch_groesse')
                  : t('kisten.eigene_hoehe_hinweis', {
                      h: groessen?.get(item.size)?.hoehe_cm ?? '?',
                    })
              }
              error={item.eigene_groesse_id ? null : hoeheFehler}
            >
              <Input
                inputMode="numeric"
                dir="ltr"
                disabled={Boolean(item.eigene_groesse_id)}
                value={hoeheText}
                onChange={(e) => setHoeheText(e.target.value)}
                className="t-serial"
                onBlur={() => {
                  const vorher = item.eigene_hoehe_cm != null ? String(item.eigene_hoehe_cm) : ''
                  const roh = hoeheText.trim()
                  if (!roh) {
                    setHoeheFehler(null)
                    if (item.eigene_hoehe_cm !== null) {
                      void patch({ eigene_hoehe_cm: null }).then((ok) => {
                        if (!ok) setHoeheText(vorher)
                      })
                    }
                    return
                  }
                  const z = zahlLesen(roh)
                  if (z === null || z < 5 || z > 300) {
                    setHoeheFehler(t('kisten.eigene_hoehe_fehler'))
                    return
                  }
                  setHoeheFehler(null)
                  if (Math.round(z) !== item.eigene_hoehe_cm) {
                    // Lehnt die Datenbank ab (etwa: Stapel zu hoch), steht
                    // wieder die alte Hoehe im Feld, nicht die abgelehnte.
                    void patch({ eigene_hoehe_cm: Math.round(z) }).then((ok) => {
                      if (!ok) setHoeheText(vorher)
                    })
                  }
                }}
              />
            </Field>
          ) : null}

          <Field label={t('kisten.art')}>
            <Select
              value={item.kind}
              onChange={(e) => void patch({ kind: e.target.value as ItemKind })}
            >
              {ARTEN.map((k) => (
                <option key={k} value={k}>
                  {t(`art.${k}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('kisten.ziel')}>
            <Input
              defaultValue={item.target_room ?? ''}
              onBlur={(e) => void patch({ target_room: e.target.value.trim() || null })}
            />
          </Field>

          <Field label={t('begriff.notiz')}>
            <Textarea
              rows={3}
              defaultValue={item.note ?? ''}
              onBlur={(e) => void patch({ note: e.target.value.trim() || null })}
            />
          </Field>

          <Switch
            checked={item.fragile}
            onChange={(fragile) => void patch({ fragile })}
            label={t('begriff.zerbrechlich')}
          />
        </div>
      </Modal>

      <BildLesen
        offen={bildLesen}
        onClose={() => setBildLesen(false)}
        projectId={project.id}
        itemId={item.id}
        fotos={photos}
        fotoUrls={urls}
        art={item.kind === 'furniture' ? 'moebel' : 'kiste'}
        vorhandeneInhalte={contents}
        canEdit={canEdit}
        userId={user?.id ?? ''}
        onUebernommen={(neu) => setContents((c) => [...c, ...neu])}
      />

      <PunktBild
        offen={punktEintrag !== null || markierFoto !== null}
        onClose={() => {
          setPunktEintrag(null)
          setMarkierFoto(null)
        }}
        eintrag={punktEintrag}
        geschwister={contents}
        foto={
          punktEintrag
            ? (photos.find((p) => p.id === punktEintrag.photo_id) ?? null)
            : markierFoto
        }
        canEdit={canEdit}
        onRahmen={rahmenSpeichern}
        onNeu={dingMarkieren}
        onAntwort={(eintrag, wert) => {
          /* Sofort speichern, nicht erst beim Schliessen. Wer das
           * Fenster zuwirft, hat trotzdem geantwortet. */
          setContents((list) =>
            list.map((x) => (x.id === eintrag.id ? { ...x, bestaetigt: wert } : x)),
          )
          setPunktEintrag({ ...eintrag, bestaetigt: wert })
          void updateContent(eintrag.id, { bestaetigt: wert }).catch((err: unknown) => {
            setContents((list) =>
              list.map((x) => (x.id === eintrag.id ? { ...x, bestaetigt: eintrag.bestaetigt } : x)),
            )
            // Nur zuruecksetzen, wenn das Bild noch offen ist. Ein schon
            // geschlossenes Bild darf nicht von selbst wieder aufgehen.
            setPunktEintrag((cur) => (cur?.id === eintrag.id ? { ...eintrag } : cur))
            toast(err instanceof Error ? err.message : String(err), 'error')
          })
        }}
      />

      <InhaltVerschieben
        offen={umhaengen !== null}
        projectId={project.id}
        quelleId={item.id}
        inhalt={umhaengen}
        onClose={() => setUmhaengen(null)}
        onFertig={(inhaltId) => setContents((list) => list.filter((x) => x.id !== inhaltId))}
      />

      <Modal
        open={markieren}
        onClose={() => setMarkieren(false)}
        title={t('marken.titel')}
        footer={
          <Button variant="ghost" onClick={() => setMarkieren(false)}>
            {t('aktion.fertig')}
          </Button>
        }
      >
        <MarkPicker
          farbe={item.mark_color}
          symbol={item.mark_symbol}
          onFarbe={(c) => void patch({ mark_color: c })}
          onSymbol={(sym) => void patch({ mark_symbol: sym })}
        />
        <p className="t-sub mt-4">{t('marken.gehoert_der_zeile')}</p>
      </Modal>

      <ConfirmDialog
        open={delOpen}
        title={t('kisten.loeschen_titel', { code: item.code })}
        body={t('kisten.loeschen_text')}
        onClose={() => setDelOpen(false)}
        onConfirm={async () => {
          try {
            await deleteItem(item.id)
            toast(t('kisten.geloescht'), 'ok')
            nav(`/app/p/${project.id}/kisten`)
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />

      {lightbox ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt={t('kisten.foto_alt')}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          <IconButton
            label={t('aktion.schliessen')}
            className="absolute end-4 top-4"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </IconButton>
        </div>
      ) : null}
    </>
  )
}
