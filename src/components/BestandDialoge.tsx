import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button, Chip, ConfirmDialog, ErrorBox, Field, IconButton, Input, Modal, Segmented, Select, useToast } from './ui'
import { useProject, useProjektOptional } from '../pages/ProjectLayout'
import {
  bereichLoeschen,
  bestandAendern,
  bestandAnlegen,
  bestandBuchen,
  bestandEntfernen,
  bestandLoeschen,
  kategorieSpeichern,
  lagerBetreten,
} from '../lib/api'
import { displayNameOf } from '../lib/auth'
import { useT } from '../lib/i18n'
import { mengeText, zahl, zustandVon } from '../lib/lager'
import { cx, fmtDateTime, useLocalState } from '../lib/util'
import type { Bestand, BestandArt, BuchungsArt, LagerKategorie } from '../lib/types'

/* Die Dialoge des Bestands (E103, E105). Jeder wird nur eingehaengt, solange
 * er offen ist; damit beginnt er bei jedem Oeffnen mit frischem Zustand. */

function fehlerText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Fehlerkasten; bei "nicht eingetragen" gleich mit dem Knopf "Jetzt
 *  eintragen" (wenn der Dialog onEingetragen kennt) und dem Weg zur Tuer. */
function FehlerAnzeige({
  fehler,
  projectId,
  onEingetragen,
}: {
  fehler: string | null
  projectId?: string
  /** Nach erfolgreichem Eintragen: der Dialog raeumt den Fehler weg und sagt "bitte noch einmal". */
  onEingetragen?: () => void
}) {
  const t = useT()
  // Auf dem Start gibt es keinen Lager-Rahmen; dort kommt das Lager als projectId.
  const ctx = useProjektOptional()
  const project = projectId ? { id: projectId } : ctx?.project
  const [busy, setBusy] = useState(false)
  const [eintragFehler, setEintragFehler] = useState<string | null>(null)
  if (!fehler) return null
  const nichtDrin = project && fehler === t('fehler.db.lager.nicht_eingetragen')

  async function eintragen() {
    if (!project) return
    setEintragFehler(null)
    setBusy(true)
    try {
      await lagerBetreten(project.id)
      onEingetragen?.()
    } catch (err) {
      setEintragFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <ErrorBox error={fehler} />
      {nichtDrin ? (
        <>
          {onEingetragen ? (
            <Button full loading={busy} onClick={() => void eintragen()}>
              {t('lager.jetzt_eintragen')}
            </Button>
          ) : null}
          {eintragFehler ? <ErrorBox error={eintragFehler} /> : null}
          <Link to={`/app/p/${project.id}/tuer`}>
            <Button variant={onEingetragen ? 'ghost' : 'outline'} full>
              {t('lager.zur_tuer')}
            </Button>
          </Link>
        </>
      ) : null}
    </div>
  )
}

/** Kleine Bestaetigung unter dem Formular ("Du bist drin, bitte noch einmal"). */
function Hinweis({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p role="status" className="rounded-[12px] bg-ok/12 px-4 py-3 text-base font-semibold text-ok">
      {text}
    </p>
  )
}

/* -------------------------------------------------------- Zustand */

/** Der Zustand als ruhiger Punkt: gruen im Lager, orange knapp, grau leer. */
export function ZustandPunkt({ b, className }: { b: Bestand; className?: string }) {
  const z = zustandVon(b)
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
        z === 'da' && 'bg-ok',
        z === 'knapp' && 'bg-warn',
        z === 'leer' && 'bg-muted/45',
        className,
      )}
    />
  )
}

/** Der Zustand in einem Wort: im Lager, nur noch X, leer.
 *  In der Suche heisst leer "gibt es nicht mehr". */
export function zustandText(
  b: Bestand,
  t: (k: string, v?: Record<string, string | number>) => string,
  suche = false,
): string {
  const z = zustandVon(b)
  if (z === 'da') return t('lager.z_da')
  if (z === 'knapp') return t('lager.z_knapp', { menge: mengeText(b.menge), einheit: b.einheit })
  return t(suche ? 'lager.z_weg' : 'lager.z_leer')
}

/* ------------------------------------------------------------ Zeiten */

function lokal(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`
}

function umAchtzehn(tageDazu: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + tageDazu)
  d.setHours(18, 0, 0, 0)
  return d
}

/* --------------------------------------------------------- Mengenregler */

/** Grosse Plus- und Minus-Knoepfe mit Direkteingabe in der Mitte. max
 *  (optional) ist die Menge, die da ist: mehr geht nicht. */
function MengenRegler({
  wert,
  onChange,
  max,
  label,
}: {
  wert: string
  onChange: (v: string) => void
  max?: number
  label: string
}) {
  const v = zahl(wert)
  const gueltig = Number.isFinite(v)
  const setze = (x: number) => onChange(mengeText(max !== undefined ? Math.min(x, max) : x))
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        aria-label="-1"
        disabled={!gueltig || v <= 1}
        onClick={() => setze(Math.max(1, v - 1))}
        className="knopf grid h-14 w-14 shrink-0 place-items-center rounded-full bg-feld text-accent disabled:opacity-35"
      >
        <Minus size={26} />
      </button>
      <Input
        inputMode="decimal"
        dir="ltr"
        value={wert}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-28 px-2 text-center text-3xl font-black tabular-nums"
      />
      <button
        type="button"
        aria-label="+1"
        disabled={gueltig && max !== undefined && v >= max}
        onClick={() => setze(gueltig ? v + 1 : 1)}
        className="knopf grid h-14 w-14 shrink-0 place-items-center rounded-full bg-feld text-accent disabled:opacity-35"
      >
        <Plus size={26} />
      </button>
    </div>
  )
}

/* --------------------------------------------------------- Mitnehmen */

type Wie = 'weg' | 'zurueck'
type Schnell = 'heute' | 'morgen' | 'drei' | 'woche' | 'eigen'

const SCHNELL_TAGE: Record<Exclude<Schnell, 'eigen'>, number> = { heute: 0, morgen: 1, drei: 3, woche: 7 }

/** Eine Aktion statt Entnehmen und Ausleihen: oben "Bleibt weg" (wird
 *  verbraucht) oder "Bringe ich zurück" (mit Rückgabetermin). Der Start
 *  richtet sich nach der Art des Dings. Gebucht wird weiter ueber
 *  bestandBuchen 'entnahme' bzw. 'ausleihe'. */
export function MitnehmenDialog({
  b,
  onClose,
  onFertig,
}: {
  b: Bestand
  onClose: () => void
  onFertig: () => void
}) {
  const t = useT()
  const toast = useToast()
  // Heute Abend 18:00 geht nur, wenn es noch eine halbe Stunde hin ist.
  const [heuteMoeglich] = useState(() => umAchtzehn(0).getTime() > Date.now() + 30 * 60_000)
  const [wie, setWie] = useState<Wie>(b.art === 'ausleihe' ? 'zurueck' : 'weg')
  const [menge, setMenge] = useState('1')
  const [schnell, setSchnell] = useState<Schnell>(heuteMoeglich ? 'heute' : 'morgen')
  const [bis, setBis] = useState(() => lokal(umAchtzehn(heuteMoeglich ? 0 : 1)))
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)

  function waehle(s: Schnell) {
    setSchnell(s)
    if (s !== 'eigen') setBis(lokal(umAchtzehn(SCHNELL_TAGE[s])))
  }

  async function senden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setHinweis(null)
    const m = zahl(menge)
    if (!(m > 0)) return setFehler(t('lager.menge_ungueltig'))
    let faellig: Date | undefined
    if (wie === 'zurueck') {
      faellig = bis ? new Date(bis) : undefined
      if (!faellig || Number.isNaN(faellig.getTime())) return setFehler(t('lager.termin_fehlt'))
      if (faellig.getTime() <= Date.now()) return setFehler(t('lager.termin_vergangen'))
    }
    setBusy(true)
    try {
      await bestandBuchen(b.id, wie === 'zurueck' ? 'ausleihe' : 'entnahme', m, { faellig })
      toast(
        wie === 'zurueck' && faellig
          ? t('lager.toast_mit_zurueck', { name: b.name, bis: fmtDateTime(faellig.toISOString()) })
          : t('lager.toast_mit_weg', { name: b.name, menge: mengeText(m), einheit: b.einheit }),
        'ok',
      )
      onFertig()
    } catch (err) {
      setFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  const terminDatum = bis ? new Date(bis) : null
  const terminOk = terminDatum !== null && !Number.isNaN(terminDatum.getTime())
  return (
    <Modal
      open
      onClose={onClose}
      title={t('lager.mitnehmen_titel', { name: b.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="bestand-mitnehmen" type="submit" loading={busy}>
            {t('lager.mitnehmen')}
          </Button>
        </>
      }
    >
      <form id="bestand-mitnehmen" onSubmit={senden} className="space-y-5">
        <div className="space-y-2">
          <Segmented<Wie>
            label={t('lager.mn_wie')}
            value={wie}
            onChange={setWie}
            options={[
              { value: 'weg', label: t('lager.mn_weg') },
              { value: 'zurueck', label: t('lager.mn_zurueck') },
            ]}
          />
          <p className="t-sub px-1">{t(wie === 'weg' ? 'lager.mn_weg_hinweis' : 'lager.mn_zurueck_hinweis')}</p>
        </div>

        <div className="space-y-2">
          <MengenRegler wert={menge} onChange={setMenge} max={b.menge} label={`${t('lager.menge')} (${b.einheit})`} />
          <p className="t-sub text-center">{t('lager.da', { menge: mengeText(b.menge), einheit: b.einheit })}</p>
        </div>

        {wie === 'zurueck' ? (
          <div className="space-y-3">
            <span className="block px-1 text-sm font-semibold text-muted">{t('lager.zurueck_bis')}</span>
            <div className="flex flex-wrap gap-2">
              {heuteMoeglich ? (
                <Chip active={schnell === 'heute'} onClick={() => waehle('heute')}>
                  {t('lager.heute_abend')}
                </Chip>
              ) : null}
              <Chip active={schnell === 'morgen'} onClick={() => waehle('morgen')}>
                {t('lager.morgen')}
              </Chip>
              <Chip active={schnell === 'drei'} onClick={() => waehle('drei')}>
                {t('lager.in_3_tagen')}
              </Chip>
              <Chip active={schnell === 'woche'} onClick={() => waehle('woche')}>
                {t('lager.in_woche')}
              </Chip>
              <Chip active={schnell === 'eigen'} onClick={() => waehle('eigen')}>
                {t('lager.datum_waehlen')}
              </Chip>
            </div>
            {schnell === 'eigen' ? (
              <Input type="datetime-local" dir="ltr" value={bis} onChange={(e) => setBis(e.target.value)} aria-label={t('lager.zurueck_bis')} />
            ) : null}
            {terminOk && terminDatum ? (
              <p className="t-sub px-1">{t('lager.zurueck_bis_wann', { zeit: fmtDateTime(terminDatum.toISOString()) })}</p>
            ) : null}
          </div>
        ) : null}

        <Hinweis text={hinweis} />
        <FehlerAnzeige
          fehler={fehler}
          projectId={b.project_id}
          onEingetragen={() => {
            setFehler(null)
            setHinweis(t('lager.du_bist_drin'))
          }}
        />
      </form>
    </Modal>
  )
}


/* ------------------------------------------------- Zugang und Zaehlen */

/** Dazulegen (auch "Auffuellen" bei leeren Dingen) oder zaehlen. */
export function ZugangDialog({
  b,
  art,
  auffuellen = false,
  onClose,
  onFertig,
}: {
  b: Bestand
  art: Extract<BuchungsArt, 'zugang' | 'korrektur'>
  /** Titel "Auffuellen" statt "Zugang". */
  auffuellen?: boolean
  onClose: () => void
  onFertig: () => void
}) {
  const t = useT()
  const toast = useToast()
  const zaehlen = art === 'korrektur'
  const [menge, setMenge] = useState(zaehlen ? mengeText(b.menge) : '1')
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)

  async function senden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    setHinweis(null)
    const m = zahl(menge)
    if (zaehlen ? !(m >= 0) : !(m > 0)) return setFehler(t(zaehlen ? 'lager.menge_ungueltig_null' : 'lager.menge_ungueltig'))
    setBusy(true)
    try {
      await bestandBuchen(b.id, art, m)
      toast(
        zaehlen
          ? t('lager.toast_gezaehlt', { name: b.name, menge: mengeText(m), einheit: b.einheit })
          : t('lager.toast_zugegeben', { name: b.name, menge: mengeText(m), einheit: b.einheit }),
        'ok',
      )
      onFertig()
    } catch (err) {
      setFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(zaehlen ? 'lager.zaehlen_titel' : auffuellen ? 'lager.auffuellen_titel' : 'lager.zugang_titel', { name: b.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="bestand-zugang" type="submit" loading={busy}>
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <form id="bestand-zugang" onSubmit={senden} className="space-y-4">
        {zaehlen ? <p className="t-sub">{t('lager.zaehlen_hinweis')}</p> : null}
        {zaehlen ? (
          <Field label={`${t('lager.menge')} (${b.einheit})`}>
            <Input
              autoFocus
              inputMode="decimal"
              dir="ltr"
              value={menge}
              onChange={(e) => setMenge(e.target.value)}
              className="text-2xl font-black"
            />
          </Field>
        ) : (
          <MengenRegler wert={menge} onChange={setMenge} label={`${t('lager.menge')} (${b.einheit})`} />
        )}
        <Hinweis text={hinweis} />
        <FehlerAnzeige
          fehler={fehler}
          projectId={b.project_id}
          onEingetragen={() => {
            setFehler(null)
            setHinweis(t('lager.du_bist_drin'))
          }}
        />
      </form>
    </Modal>
  )
}

/* ---------------------------------------------------------- Entfernen */

/** Aufgebrauchtes ganz entfernen. Die Datenbank lehnt ab, solange noch
 *  etwas ausgeliehen ist; der Satz bleibt im Dialog stehen. */
export function EntfernenDialog({
  b,
  onClose,
  onFertig,
}: {
  b: Bestand
  onClose: () => void
  onFertig: () => void
}) {
  const t = useT()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function entfernen() {
    setFehler(null)
    setBusy(true)
    try {
      await bestandEntfernen(b.id)
      toast(t('lager.toast_entfernt', { name: b.name }), 'ok')
      onFertig()
    } catch (err) {
      setFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('lager.entfernen_titel', { name: b.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void entfernen()}>
            {t('aktion.entfernen')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-base">{t('lager.entfernen_text')}</p>
        <FehlerAnzeige fehler={fehler} />
      </div>
    </Modal>
  )
}

/* -------------------------------------------- Felder zu einem Ding */

function ArtWahl({ art, onChange }: { art: BestandArt; onChange: (a: BestandArt) => void }) {
  const t = useT()
  return (
    <div>
      <span className="mb-2 block text-[0.9375rem] font-bold">{t('lager.art')}</span>
      <div className="flex flex-wrap gap-2">
        <Chip active={art === 'verbrauch'} onClick={() => onChange('verbrauch')}>
          {t('lager.art_verbrauch')}
        </Chip>
        <Chip active={art === 'ausleihe'} onClick={() => onChange('ausleihe')}>
          {t('lager.art_ausleihe')}
        </Chip>
      </div>
    </div>
  )
}

/** Bereiche als Tippflaechen (schneller als ein Aufklappmenue). */
function BereichChips({
  kategorien,
  value,
  onChange,
}: {
  kategorien: LagerKategorie[]
  value: string
  onChange: (id: string) => void
}) {
  const t = useT()
  return (
    <div>
      <span className="mb-2 block text-[0.9375rem] font-bold">{t('lager.bereich')}</span>
      <div className="flex flex-wrap gap-2">
        {kategorien.map((k) => (
          <Chip key={k.id} active={value === k.id} onClick={() => onChange(value === k.id ? '' : k.id)}>
            {k.name}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------ Neu hinzufuegen */

interface NeuMerker {
  kat: string
  einheit: string
  art: BestandArt
}

/** Flott mehrere Dinge nacheinander anlegen: Name, Bereich, Menge, Einheit,
 *  Mindestmenge, Art. Das Formular bleibt offen; Bereich, Einheit und Art
 *  merkt es sich. */
export function NeuDialog({
  kategorien,
  vorbelegtKategorie,
  onClose,
  onGespeichert,
}: {
  kategorien: LagerKategorie[]
  /** Der Bereich, der gerade im Filter steht. */
  vorbelegtKategorie?: string
  onClose: () => void
  /** Nach jedem Speichern: Liste neu laden. */
  onGespeichert: () => void
}) {
  const t = useT()
  const toast = useToast()
  const { project } = useProject()
  const [merker, setMerker] = useLocalState<NeuMerker>('magazino.lager.neu', { kat: '', einheit: 'Stk', art: 'verbrauch' })
  const gueltigKat = (id: string) => (kategorien.some((k) => k.id === id) ? id : '')

  const [name, setName] = useState('')
  const [kat, setKat] = useState(gueltigKat(vorbelegtKategorie ?? merker.kat))
  const [menge, setMenge] = useState('1')
  const [einheit, setEinheit] = useState(merker.einheit)
  const [mindest, setMindest] = useState('0')
  const [art, setArt] = useState<BestandArt>(merker.art)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [angelegt, setAngelegt] = useState(0)
  // Mit neuem Schluessel faengt das Namensfeld frisch an und hat den Fokus.
  const [runde, setRunde] = useState(0)

  async function speichern(weiter: boolean) {
    setFehler(null)
    if (!name.trim()) return setFehler(t('lager.name_fehlt'))
    const m = zahl(menge)
    const min = zahl(mindest)
    if (!(m >= 0) || !(min >= 0)) return setFehler(t('lager.menge_ungueltig_null'))
    setBusy(true)
    try {
      await bestandAnlegen(project.id, {
        name,
        einheit,
        menge: m,
        mindestmenge: min,
        art,
        kategorie_id: kat || null,
      })
      setMerker({ kat, einheit: einheit.trim() || 'Stk', art })
      toast(t('lager.toast_angelegt', { name: name.trim() }), 'ok')
      onGespeichert()
      if (weiter) {
        setName('')
        setMenge('1')
        setMindest('0')
        setAngelegt((n) => n + 1)
        setRunde((n) => n + 1)
      } else {
        onClose()
      }
    } catch (err) {
      setFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('lager.neu_titel')}
      footer={
        <Button variant="ghost" disabled={busy} onClick={() => (name.trim() ? void speichern(false) : onClose())}>
          {t('aktion.fertig')}
          {angelegt > 0 ? ` (${angelegt})` : ''}
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void speichern(true)
        }}
        className="space-y-4"
      >
        <Field label={t('lager.produkt')} required>
          <Input key={runde} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <BereichChips kategorien={kategorien} value={kat} onChange={setKat} />
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('lager.menge')}>
            <Input inputMode="decimal" dir="ltr" value={menge} onChange={(e) => setMenge(e.target.value)} />
          </Field>
          <Field label={t('lager.einheit')}>
            <Input value={einheit} onChange={(e) => setEinheit(e.target.value)} placeholder={t('lager.einheit_beispiel')} />
          </Field>
          <Field label={t('lager.mindestmenge_kurz')}>
            <Input inputMode="decimal" dir="ltr" value={mindest} onChange={(e) => setMindest(e.target.value)} />
          </Field>
        </div>
        <ArtWahl art={art} onChange={setArt} />
        <FehlerAnzeige fehler={fehler} />
        <Button type="submit" size="lg" full loading={busy}>
          {t('lager.speichern_naechstes')}
        </Button>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------ Aendern, Loeschen */

export function AendernDialog({
  b,
  kategorien,
  onClose,
  onFertig,
}: {
  b: Bestand
  kategorien: LagerKategorie[]
  onClose: () => void
  onFertig: () => void
}) {
  const t = useT()
  const toast = useToast()
  const [name, setName] = useState(b.name)
  const [kat, setKat] = useState(b.kategorie_id ?? '')
  const [einheit, setEinheit] = useState(b.einheit)
  const [mindest, setMindest] = useState(mengeText(b.mindestmenge))
  const [art, setArt] = useState<BestandArt>(b.art)
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [loeschen, setLoeschen] = useState(false)

  async function senden(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    if (!name.trim()) return setFehler(t('lager.name_fehlt'))
    const min = zahl(mindest)
    if (!(min >= 0)) return setFehler(t('lager.menge_ungueltig_null'))
    setBusy(true)
    try {
      await bestandAendern(b.id, {
        name: name.trim(),
        kategorie_id: kat || null,
        einheit: einheit.trim() || 'Stk',
        mindestmenge: min,
        art,
      })
      toast(t('lager.toast_geaendert', { name: name.trim() }), 'ok')
      onFertig()
    } catch (err) {
      setFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('lager.aendern_titel', { name: b.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="bestand-aendern" type="submit" loading={busy}>
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <form id="bestand-aendern" onSubmit={senden} className="space-y-4">
        <Field label={t('lager.produkt')} required>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <BereichChips kategorien={kategorien} value={kat} onChange={setKat} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('lager.einheit')}>
            <Input value={einheit} onChange={(e) => setEinheit(e.target.value)} />
          </Field>
          <Field label={t('lager.mindestmenge_kurz')}>
            <Input inputMode="decimal" dir="ltr" value={mindest} onChange={(e) => setMindest(e.target.value)} />
          </Field>
        </div>
        <ArtWahl art={art} onChange={setArt} />
        <FehlerAnzeige fehler={fehler} />
        <Button type="button" variant="danger" full onClick={() => setLoeschen(true)}>
          {t('aktion.loeschen')}
        </Button>
      </form>
      <ConfirmDialog
        open={loeschen}
        title={t('lager.loeschen_titel', { name: b.name })}
        body={t('lager.loeschen_text')}
        onClose={() => setLoeschen(false)}
        onConfirm={async () => {
          try {
            await bestandLoeschen(b.id)
            toast(t('lager.toast_geloescht', { name: b.name }), 'ok')
            onFertig()
          } catch (err) {
            setFehler(fehlerText(err))
            setLoeschen(false)
          }
        }}
      />
    </Modal>
  )
}

/* -------------------------------------------------------- Bereiche */

/** Eine Zeile: Name, Zustaendiger, Speichern; bei vorhandenen Bereichen
 *  dazu Loeschen (nur leere, sonst steht der Satz der Datenbank da). */
function BereichZeile({
  k,
  onGespeichert,
}: {
  k?: LagerKategorie
  onGespeichert: () => void
}) {
  const t = useT()
  const toast = useToast()
  const { project, members } = useProject()
  const [name, setName] = useState(k?.name ?? '')
  const [zust, setZust] = useState(k?.zustaendig_id ?? '')
  const [busy, setBusy] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [weg, setWeg] = useState(false)
  const geaendert = !k || name.trim() !== k.name || (zust || null) !== k.zustaendig_id

  async function speichern(e: FormEvent) {
    e.preventDefault()
    setFehler(null)
    if (!name.trim()) return setFehler(t('lager.name_fehlt'))
    setBusy(true)
    try {
      await kategorieSpeichern(project.id, { id: k?.id, name, zustaendig_id: zust || null })
      toast(t('lager.toast_bereich'), 'ok')
      if (!k) {
        setName('')
        setZust('')
      }
      onGespeichert()
    } catch (err) {
      setFehler(fehlerText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-2 rounded-karte border border-line p-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t(k ? 'lager.bereich_name' : 'lager.bereich_neu')}
        aria-label={t('lager.bereich_name')}
      />
      <Select value={zust} onChange={(e) => setZust(e.target.value)} aria-label={t('lager.zustaendig')}>
        <option value="">{`${t('lager.zustaendig')}: ${t('lager.niemand')}`}</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {`${t('lager.zustaendig')}: ${displayNameOf(m.profile, t('umzuege.jemand'))}`}
          </option>
        ))}
      </Select>
      {fehler ? <ErrorBox error={fehler} /> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant={k ? 'outline' : 'primary'} loading={busy} disabled={!geaendert}>
          {t(k ? 'aktion.speichern' : 'aktion.anlegen')}
        </Button>
        {k ? (
          <IconButton label={t('aktion.loeschen')} tone="danger" size="sm" className="ms-auto" onClick={() => setWeg(true)}>
            <Trash2 size={18} />
          </IconButton>
        ) : null}
      </div>
      {k ? (
        <ConfirmDialog
          open={weg}
          title={t('lager.bereich_loeschen_titel', { name: k.name })}
          body={t('lager.bereich_loeschen_text')}
          onClose={() => setWeg(false)}
          onConfirm={async () => {
            try {
              await bereichLoeschen(k.id)
              toast(t('lager.toast_bereich_weg', { name: k.name }), 'ok')
              onGespeichert()
            } catch (err) {
              setFehler(fehlerText(err))
              setWeg(false)
            }
          }}
        />
      ) : null}
    </form>
  )
}

export function BereicheDialog({
  kategorien,
  onClose,
  onGeaendert,
}: {
  kategorien: LagerKategorie[]
  onClose: () => void
  onGeaendert: () => void
}) {
  const t = useT()
  return (
    <Modal
      open
      onClose={onClose}
      title={t('lager.bereiche_titel')}
      footer={<Button onClick={onClose}>{t('aktion.fertig')}</Button>}
    >
      <div className="space-y-3">
        {kategorien.length === 0 ? <p className="t-sub">{t('lager.bereiche_leer')}</p> : null}
        {kategorien.map((k) => (
          <BereichZeile key={k.id} k={k} onGespeichert={onGeaendert} />
        ))}
        <BereichZeile onGespeichert={onGeaendert} />
      </div>
    </Modal>
  )
}
