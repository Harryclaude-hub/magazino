/* Preise der Moebel (0040): in Cent gespeichert, als Euro gezeigt. */

/** 89900 -> "899,00" (ohne Waehrungszeichen, Komma wie in Oesterreich). */
export function euroText(cent: number): string {
  const e = Math.floor(cent / 100)
  const c = String(cent % 100).padStart(2, '0')
  return `${e.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`
}

/** "899", "899,90", "1.299,00", "1299.5", "899 €" -> Cent; sonst null. */
export function centLesen(text: string): number | null {
  let s = text.replace(/[€\s]/g, '').replace(/eur/i, '')
  if (!s) return null
  // Tausenderpunkte vor einem Komma weg, dann Komma als Dezimaltrenner.
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const cent = Math.round(Number(s) * 100)
  return Number.isFinite(cent) && cent >= 0 && cent <= 1_000_000_000 ? cent : null
}
