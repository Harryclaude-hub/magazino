import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera, Plus, X } from 'lucide-react'
import { Button, Chip, ErrorBox, Field, Input, Modal, Select, useToast } from './ui'
import { addPhotoRecord, createItem, groesseFuerMasse, setCoverPhoto } from '../lib/api'
import { aufnahmeZeit, compressImage, uploadTo } from '../lib/media'
import { useSprache } from '../lib/i18n'
import { laengeLesen } from '../lib/geometrie'
import { uid } from '../lib/util'
import type { Item, Tag } from '../lib/types'

/* Einen einzelnen Gegenstand anlegen: Foto, Name, Zimmer, ungefaehre
 * Groesse. Schnell gedacht: ein Blick, ein Foto, drei Zahlen oder ein
 * Vorschlag, fertig. In der Datenbank ein Eintrag mit kind 'other'.
 *
 * Die Groesse wird eine eigene Groesse mit genau diesen Massen
 * (groesseFuerMasse), damit der Grundriss den Gegenstand in echter Groesse
 * zeigt und die Datenbank seinen Platz pruefen kann. Leer gelassen gilt
 * die mittlere Kistengroesse. */

const VORSCHLAEGE: { wort: string; l: number; b: number; h: number }[] = [
  { wort: 'gegenstand.klein', l: 30, b: 20, h: 20 },
  { wort: 'gegenstand.mittel', l: 50, b: 40, h: 40 },
  { wort: 'gegenstand.gross', l: 80, b: 60, h: 60 },
  { wort: 'gegenstand.lang', l: 30, b: 30, h: 150 },
]

interface Stand {
  name: string
  zimmer: string
  laenge: string
  breite: string
  hoehe: string
}

export function GegenstandDialog({
  offen,
  projectId,
  zimmer,
  vorZimmer,
  onClose,
  onAngelegt,
}: {
  offen: boolean
  projectId: string
  /** Die Zimmer des Umzugs (Tags mit kind 'room'). */
  zimmer: Tag[]
  /** Vorgewaehltes Zimmer, etwa auf der Zimmerseite. */
  vorZimmer?: string | null
  onClose: () => void
  onAngelegt: (item: Item) => void
}) {
  const { t } = useSprache()
  const toast = useToast()
  const leer = (): Stand => ({ name: '', zimmer: vorZimmer ?? '', laenge: '', breite: '', hoehe: '' })
  const [stand, setStand] = useState<Stand>(leer)
  const [foto, setFoto] = useState<File | null>(null)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const kamera = useRef<HTMLInputElement>(null)
  const nameFeld = useRef<HTMLInputElement>(null)

  /* Dialoge setzen sich beim Oeffnen zurueck (Hausregel). */
  useEffect(() => {
    if (!offen) return
    setStand(leer())
    setFoto(null)
    setFehler(null)
    setBusy(false)
    // Nur beim Oeffnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen])

  // Vorschaubild des gewaehlten Fotos; die Adresse wird wieder freigegeben.
  useEffect(() => {
    if (!foto) {
      setVorschau(null)
      return
    }
    const url = URL.createObjectURL(foto)
    setVorschau(url)
    return () => URL.revokeObjectURL(url)
  }, [foto])

  function setze(teil: Partial<Stand>) {
    setStand((s) => ({ ...s, ...teil }))
  }

  function fotoGewaehlt(dateien: FileList | null) {
    const datei = dateien?.[0]
    if (!datei) return
    if (!datei.type.startsWith('image/')) {
      setFehler(t('gegenstand.kein_bild'))
      return
    }
    setFehler(null)
    setFoto(datei)
  }

  /** Drei Masse in ganzen cm, null wenn alle leer; 'falsch' sonst. */
  function masse(): [number, number, number] | null | 'falsch' {
    const roh = [stand.laenge, stand.breite, stand.hoehe].map((v) => v.trim())
    if (roh.every((v) => v === '')) return null
    const werte = roh.map((v) => (v === '' ? null : laengeLesen(v)))
    if (werte.some((v) => v === null || v < 1 || v > 1000)) return 'falsch'
    return werte.map((v) => Math.round(v as number)) as [number, number, number]
  }

  async function speichern(e: FormEvent, nochEiner = false) {
    e.preventDefault()
    if (busy) return
    const name = stand.name.trim()
    if (!name) {
      setFehler(t('gegenstand.name_fehlt'))
      return
    }
    if (!stand.zimmer) {
      setFehler(t('gegenstand.zimmer_fehlt'))
      return
    }
    const m = masse()
    if (m === 'falsch') {
      setFehler(t('gegenstand.mass_falsch'))
      return
    }
    setFehler(null)
    setBusy(true)
    let item: Item
    try {
      const groesse = m ? await groesseFuerMasse(projectId, m[0], m[1], m[2]) : null
      item = await createItem({
        project_id: projectId,
        kind: 'other',
        title: name,
        room_id: stand.zimmer,
        code_source: 'room',
        size: 5,
        eigene_groesse_id: groesse?.id ?? null,
      })
    } catch (err) {
      setFehler(err instanceof Error ? err.message : String(err))
      setBusy(false)
      return
    }
    /* Das Foto ist ein zweiter Schritt. Scheitert es, steht der Gegenstand
     * trotzdem; das wird gesagt, nicht verschwiegen. */
    if (foto) {
      try {
        const blob = await compressImage(foto)
        const pfad = `${projectId}/${item.id}/${uid()}.jpg`
        await uploadTo('item-photos', pfad, blob, 'image/jpeg')
        const zeile = await addPhotoRecord(projectId, item.id, pfad, undefined, 'foto', undefined, null, await aufnahmeZeit(foto))
        item = await setCoverPhoto(item.id, zeile.id)
      } catch (err) {
        toast(
          t('gegenstand.foto_fehler', { code: item.code, grund: err instanceof Error ? err.message : String(err) }),
          'error',
        )
      }
    }
    toast(t('gegenstand.angelegt', { code: item.code }), 'ok')
    onAngelegt(item)
    setBusy(false)
    if (nochEiner) {
      // Zimmer bleibt, der Rest wird frisch; weiter mit dem Namen.
      setStand((s) => ({ ...leer(), zimmer: s.zimmer }))
      setFoto(null)
      nameFeld.current?.focus()
    } else {
      onClose()
    }
  }

  const massFeld = (feld: 'laenge' | 'breite' | 'hoehe', wort: string) => (
    <Field label={t(wort)}>
      <Input
        inputMode="decimal"
        dir="ltr"
        className="t-serial"
        value={stand[feld]}
        onChange={(e) => setze({ [feld]: e.target.value })}
      />
    </Field>
  )

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('gegenstand.titel')}
      footer={
        <>
          {/* Kein eigenes Abbrechen: das X oben schliesst, sonst passten am
              Handy die Knoepfe nicht in eine Zeile. */}
          <Button variant="outline" disabled={busy} onClick={(e) => void speichern(e, true)}>
            <Plus size={16} />
            {t('gegenstand.und_noch_einer')}
          </Button>
          <Button form="gegenstand-form" type="submit" loading={busy}>
            {t('gegenstand.speichern')}
          </Button>
        </>
      }
    >
      <form id="gegenstand-form" onSubmit={(e) => void speichern(e)} className="space-y-4">
        {fehler ? <ErrorBox error={fehler} /> : null}

        <div>
          <p className="mb-2 text-[0.9375rem] font-bold">{t('gegenstand.foto')}</p>
          <input
            ref={kamera}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              fotoGewaehlt(e.target.files)
              e.target.value = ''
            }}
          />
          {vorschau ? (
            <div className="flex items-center gap-3">
              <img src={vorschau} alt="" className="h-24 w-24 rounded-2xl border border-line object-cover" />
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => kamera.current?.click()}>
                  <Camera size={16} />
                  {t('gegenstand.foto_anderes')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setFoto(null)}>
                  <X size={16} />
                  {t('gegenstand.foto_weg')}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => kamera.current?.click()}>
              <Camera size={18} />
              {t('gegenstand.foto_machen')}
            </Button>
          )}
        </div>

        <Field label={t('gegenstand.name')} required>
          <Input
            ref={nameFeld}
            value={stand.name}
            maxLength={120}
            onChange={(e) => setze({ name: e.target.value })}
            placeholder={t('gegenstand.name_platzhalter')}
            autoFocus
          />
        </Field>

        <Field label={t('gegenstand.zimmer')} required>
          <Select value={stand.zimmer} onChange={(e) => setze({ zimmer: e.target.value })}>
            <option value="">{t('gegenstand.zimmer_waehlen')}</option>
            {zimmer.map((z) => (
              <option key={z.id} value={z.id}>
                {z.short} · {z.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-2 text-[0.9375rem] font-bold">{t('gegenstand.groesse')}</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {VORSCHLAEGE.map((v) => (
              <Chip
                key={v.wort}
                active={stand.laenge === String(v.l) && stand.breite === String(v.b) && stand.hoehe === String(v.h)}
                onClick={() => setze({ laenge: String(v.l), breite: String(v.b), hoehe: String(v.h) })}
              >
                {t(v.wort)}
                <span className="t-serial opacity-70" dir="ltr">
                  {v.l}×{v.b}×{v.h}
                </span>
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {massFeld('laenge', 'gegenstand.laenge')}
            {massFeld('breite', 'gegenstand.breite')}
            {massFeld('hoehe', 'gegenstand.hoehe')}
          </div>
          <p className="t-sub mt-2">{t('gegenstand.groesse_hinweis')}</p>
        </div>
      </form>
    </Modal>
  )
}
