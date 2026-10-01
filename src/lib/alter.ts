/* Wie lange etwas her ist, in der Sprache der App (E81): "vor 3 Wochen",
 * "منذ 3 أسبوع". relTime in util.ts kennt nur Deutsch und springt nach
 * einer Woche aufs Datum; fuer das Alter von Fotos und Aenderungen zaehlt
 * aber gerade der Unterschied zwischen Wochen, Monaten und Jahren. */

type Tn = (key: string, n: number, vars?: Record<string, string | number>) => string
type T = (key: string, vars?: Record<string, string | number>) => string

export function alterText(t: T, tn: Tn, iso: string | null | undefined, jetzt = Date.now()): string {
  if (!iso) return ''
  const ms = jetzt - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  const min = Math.floor(ms / 60_000)
  if (min < 1) return t('kisten.alter_jetzt')
  if (min < 60) return tn('kisten.alter_min', min)
  const std = Math.floor(min / 60)
  if (std < 24) return tn('kisten.alter_std', std)
  const tage = Math.floor(std / 24)
  if (tage < 7) return tn('kisten.alter_tage', tage)
  if (tage < 31) return tn('kisten.alter_wochen', Math.floor(tage / 7))
  if (tage < 365) return tn('kisten.alter_monate', Math.max(1, Math.floor(tage / 30.44)))
  return tn('kisten.alter_jahre', Math.floor(tage / 365.25))
}
