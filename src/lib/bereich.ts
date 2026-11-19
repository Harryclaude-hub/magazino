/* Entwurf eines Zimmers oder einer Person fuer den BereichDialog
 * (components/BereichDialog.tsx). Hier getrennt, damit die Dialogdatei nur
 * Komponenten ausliefert. */
import { TAG_COLORS, type TagKind } from './types'

export interface BereichEntwurf {
  id?: string
  kind: TagKind
  name: string
  short: string
  color: string
  /** Ein Zeichen neben dem Kuerzel. Freiwillig, hilft beim schnellen
   *  Erkennen auf Papier und in langen Listen. */
  symbol: string | null
  note: string
}

export function neuerBereich(kind: TagKind, schonDa: number, name = ''): BereichEntwurf {
  return { kind, name, short: '', color: TAG_COLORS[schonDa % TAG_COLORS.length], symbol: null, note: '' }
}

