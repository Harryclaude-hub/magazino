import { Archive, Armchair, Boxes, Lamp } from 'lucide-react'
import { Card, ErrorBox, SectionTitle } from './ui'
import { countItems, ladeZimmerPlan, listItems } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { useAsync } from '../lib/util'
import type { ObjektArt, PlanKiste } from '../lib/types'

/* Was in einem Zimmer steht, auf einen Blick: Moebel (Regale und
 * Schraenke zaehlen mit), davon Regale und Schraenke, Kisten und einzelne
 * Gegenstaende. Darunter jedes Regal und jeder Schrank mit dem, was drin
 * und darauf steht.
 *
 * Moebel sind zwei Dinge: gezeichnete Objekte im Grundriss und Moebel-
 * Eintraege (kind 'furniture') dieses Zimmers. Ist ein Eintrag mit einem
 * Objekt verknuepft, zaehlt er nur einmal. Kisten und Gegenstaende zaehlt
 * die Datenbank, nicht eine abgeschnittene Liste. */

interface Zahlen {
  moebel: number
  regale: number
  kisten: number
  dinge: number
  liste: { id: string; name: string; art: ObjektArt; kisten: number; dinge: number }[]
}

/** Das Objekt, auf oder in dem ein Stapel steht (ueber Kisten hinweg). */
function wurzelObjekt(k: PlanKiste, nachId: Map<string, PlanKiste>): string | null {
  let jetzt: PlanKiste | undefined = k
  for (let i = 0; jetzt && i < 50; i++) {
    if (jetzt.unterlage_art === 'objekt' || jetzt.unterlage_art === 'fach') return jetzt.unterlage_objekt_id
    if (jetzt.unterlage_art !== 'kiste' || !jetzt.unterlage_item_id) return null
    jetzt = nachId.get(jetzt.unterlage_item_id)
  }
  return null
}

function Zahl({ wert, wort, icon }: { wert: number; wort: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted">{icon}</div>
      <div className="t-serial text-2xl font-black">{wert}</div>
      <div className="t-sub mt-0.5">{wort}</div>
    </div>
  )
}

export function ZimmerInhalt({ projectId, tagId, stand }: { projectId: string; tagId: string; stand: number }) {
  const { t } = useSprache()
  const daten = useAsync<Zahlen>(
    async () => {
      const [plan, kisten, taschen, dinge, moebel] = await Promise.all([
        ladeZimmerPlan(projectId, tagId),
        countItems(projectId, { roomId: tagId, kind: 'box' }),
        countItems(projectId, { roomId: tagId, kind: 'bag' }),
        countItems(projectId, { roomId: tagId, kind: 'other' }),
        listItems(projectId, { roomId: tagId, kind: 'furniture', limit: 1000 }),
      ])
      const verknuepft = new Set(plan.objekte.map((o) => o.item_id).filter(Boolean))
      const nurEintrag = moebel.rows.filter((m) => !verknuepft.has(m.id)).length
      const regale = plan.objekte.filter((o) => o.art === 'regal' || o.art === 'schrank')
      const nachId = new Map(plan.kisten.map((k) => [k.id, k]))
      const liste = regale.map((o) => ({ id: o.id, name: o.name, art: o.art, kisten: 0, dinge: 0 }))
      const nachObjekt = new Map(liste.map((r) => [r.id, r]))
      for (const k of plan.kisten) {
        const w = wurzelObjekt(k, nachId)
        const r = w ? nachObjekt.get(w) : undefined
        if (!r) continue
        if (k.kind === 'other') r.dinge++
        else r.kisten++
      }
      return {
        moebel: plan.objekte.length + nurEintrag,
        regale: regale.length,
        kisten: kisten + taschen,
        dinge,
        liste,
      }
    },
    [projectId, tagId, stand],
  )

  return (
    <section className="mb-6">
      <SectionTitle>{t('gegenstand.im_zimmer')}</SectionTitle>
      {daten.loading ? (
        <p className="t-sub text-center">{t('bereichsseite.zahlen_laden')}</p>
      ) : daten.error ? (
        <ErrorBox error={daten.error} onRetry={daten.reload} />
      ) : daten.data ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Zahl wert={daten.data.moebel} wort={t('gegenstand.zahl_moebel')} icon={<Armchair size={16} />} />
            <Zahl wert={daten.data.regale} wort={t('gegenstand.zahl_regale')} icon={<Archive size={16} />} />
            <Zahl wert={daten.data.kisten} wort={t('gegenstand.zahl_kisten')} icon={<Boxes size={16} />} />
            <Zahl wert={daten.data.dinge} wort={t('gegenstand.zahl_gegenstaende')} icon={<Lamp size={16} />} />
          </div>
          <p className="t-sub mt-2 text-center">{t('gegenstand.moebel_hinweis')}</p>

          {daten.data.liste.length > 0 ? (
            <Card className="zebra mt-4 divide-y divide-line overflow-hidden">
              {daten.data.liste.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <Archive size={18} className="shrink-0 text-muted" />
                  <span className="t-name min-w-0 flex-1 truncate">
                    {r.name || t(r.art === 'regal' ? 'gegenstand.regal' : 'gegenstand.schrank')}
                  </span>
                  <span className="t-sub shrink-0">
                    {r.kisten + r.dinge === 0
                      ? t('gegenstand.regal_leer')
                      : t('gegenstand.regal_inhalt', { kisten: r.kisten, dinge: r.dinge })}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
