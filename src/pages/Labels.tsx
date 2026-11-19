import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppShell'
import {
  EtikettenAnsicht,
  type BereichEintrag,
  type KisteEintrag,
  type PlatzZustand,
} from '../components/etikett/Ansicht'
import { useProject } from './ProjectLayout'
import { ladeGrundriss, ladeGrundrisse, listAllItems, listContentsForItems } from '../lib/api'
import { useSprache } from '../lib/i18n'
import type { GrundrissDaten, Item } from '../lib/types'
import { appUrl } from '../lib/util'

/* Etiketten drucken: Kisten und das Tuer-Etikett des Lagers.
 *
 * Diese Seite holt nur die Daten (Kisten, Inhalt, Platz im Regal) und reicht
 * sie an die Ansicht weiter (components/etikett/Ansicht.tsx). Dort stehen
 * Format, Vorschau und Druck. Die Rechnung, wie viel auf ein Etikett passt,
 * steht in lib/etikett.ts. */

/** Kisten, die schon angehakt sein sollen: aus ?item=, ?items= oder aus
 *  "Groessen pruefen" (dort liegt die Liste auf diesem Geraet, nicht in der
 *  Adresse). */
function vorauswahlLesen(params: URLSearchParams, projektId: string): string[] | null {
  const eine = params.get('item')
  if (eine) return [eine]
  const roh = params.get('items')
  if (roh) return roh.split(',').filter(Boolean)
  if (params.get('auswahl') === 'groessen') {
    try {
      const liste = JSON.parse(localStorage.getItem(`kistly.neuEingestuft.${projektId}`) ?? '[]') as unknown
      if (Array.isArray(liste)) return liste.filter((x): x is string => typeof x === 'string')
    } catch {
      /* Dann gibt es keine Vorauswahl, und es stehen alle Kisten da. */
    }
  }
  return null
}

/** Wo eine Kiste steht, als kurzer Text: Regal und Fach, Moebel, Kiste oder
 *  Boden im Raum. null, wenn sie keinen Platz hat. */
function platzText(
  k: Item,
  daten: GrundrissDaten[],
  codes: Map<string, string>,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!k.platz_raum_id || !k.unterlage_art) return null
  if (k.unterlage_art === 'kiste') {
    const code = k.unterlage_item_id ? codes.get(k.unterlage_item_id) : undefined
    return code ? t('etiketten.platz_auf_kiste', { code }) : null
  }
  if (k.unterlage_art === 'boden') {
    for (const d of daten) {
      const raum = d.raeume.find((r) => r.id === k.platz_raum_id)
      if (raum) return t('etiketten.platz_boden', { raum: raum.name })
    }
    return null
  }
  for (const d of daten) {
    const objekt = d.objekte.find((o) => o.id === k.unterlage_objekt_id)
    if (!objekt) continue
    if (k.unterlage_art === 'fach' && k.fach_ebene !== null) {
      return k.fach_spalte !== null
        ? t('etiketten.platz_fach', { name: objekt.name, ebene: k.fach_ebene, spalte: k.fach_spalte })
        : t('etiketten.platz_fach_eine', { name: objekt.name, ebene: k.fach_ebene })
    }
    return objekt.name
  }
  return null
}

export default function Labels() {
  const { project, rooms, tagById } = useProject()
  const { t } = useSprache()
  const [params] = useSearchParams()
  const vorauswahl = useMemo(() => vorauswahlLesen(params, project.id), [params, project.id])

  const [items, setItems] = useState<Item[]>([])
  const [inhalte, setInhalte] = useState<Awaited<ReturnType<typeof listContentsForItems>>>(new Map())
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [nochmal, setNochmal] = useState(0)

  useEffect(() => {
    let lebt = true
    setLaedt(true)
    setFehler(null)
    void (async () => {
      try {
        const alle = await listAllItems(project.id)
        if (!lebt) return
        const map = await listContentsForItems(alle.map((i) => i.id))
        if (!lebt) return
        setItems(alle)
        setInhalte(map)
      } catch (err) {
        if (lebt) setFehler(err instanceof Error ? err.message : String(err))
      } finally {
        if (lebt) setLaedt(false)
      }
    })()
    return () => {
      lebt = false
    }
  }, [project.id, nochmal])

  /* Der Platz kommt aus dem Grundriss und wird erst geholt, wenn die Ansicht
   * ihn zeigen will. */
  const [platzNoetig, setPlatzNoetig] = useState(false)
  const [platzDaten, setPlatzDaten] = useState<GrundrissDaten[] | null>(null)
  const [platzFehler, setPlatzFehler] = useState<string | null>(null)
  const [platzLaedt, setPlatzLaedt] = useState(false)
  const [platzNonce, setPlatzNonce] = useState(0)

  useEffect(() => {
    if (!platzNoetig) return
    let lebt = true
    setPlatzLaedt(true)
    setPlatzFehler(null)
    void (async () => {
      try {
        const grundrisse = await ladeGrundrisse(project.id)
        const geladen = await Promise.all(grundrisse.map((g) => ladeGrundriss(g.id)))
        if (lebt) setPlatzDaten(geladen.filter((d): d is GrundrissDaten => d !== null))
      } catch (err) {
        if (lebt) setPlatzFehler(err instanceof Error ? err.message : String(err))
      } finally {
        if (lebt) setPlatzLaedt(false)
      }
    })()
    return () => {
      lebt = false
    }
  }, [platzNoetig, project.id, platzNonce])

  const platzGebraucht = useCallback((noetig: boolean) => setPlatzNoetig(noetig), [])

  const kisten = useMemo<KisteEintrag[]>(
    () =>
      items.map((k) => {
        const bereich = tagById(k.room_id)
        return {
          id: k.id,
          code: k.code,
          titel: k.title?.trim() ? k.title.trim() : null,
          bereichId: k.room_id,
          bereichName: bereich?.name ?? null,
          bereichFarbe: bereich?.color ?? null,
          inhalt: (inhalte.get(k.id) ?? []).map((z) => ({ text: z.text, menge: z.qty })),
          qrWert: appUrl(`s/${k.id}`),
        }
      }),
    [items, inhalte, tagById],
  )

  const bereiche = useMemo<BereichEintrag[]>(() => rooms.map((r) => ({ id: r.id, name: r.name })), [rooms])

  const platzTexte = useMemo(() => {
    const out = new Map<string, string>()
    if (!platzDaten) return out
    const codes = new Map(items.map((k) => [k.id, k.code]))
    for (const k of items) {
      const text = platzText(k, platzDaten, codes, t)
      if (text) out.set(k.id, text)
    }
    return out
  }, [platzDaten, items, t])

  const platzZustand: PlatzZustand = !platzNoetig
    ? 'aus'
    : platzLaedt
      ? 'laden'
      : platzFehler
        ? 'fehler'
        : 'bereit'

  return (
    <>
      <AppHeader title={t('etiketten.titel')} back={`/app/p/${project.id}`} wide />
      <EtikettenAnsicht
        lagerName={project.name}
        tuerAdresse={appUrl(`app/p/${project.id}/tuer`)}
        kisten={kisten}
        bereiche={bereiche}
        laedt={laedt}
        fehler={fehler}
        nochmal={() => setNochmal((n) => n + 1)}
        vorauswahl={vorauswahl}
        platzTexte={platzTexte}
        platzZustand={platzZustand}
        platzFehler={platzFehler}
        platzNochmal={() => setPlatzNonce((n) => n + 1)}
        platzGebraucht={platzGebraucht}
      />
    </>
  )
}
