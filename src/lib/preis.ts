/* Preise der Moebel (0040): in Cent gespeichert, als Euro gezeigt. */

/** 89900 -> "899,00" (ohne Waehrungszeichen, Komma wie in Oesterreich). */
export function euroText(cent: number): string {
  const e = Math.floor(cent / 100)
  const c = String(cent % 100).padStart(2, '0')
  return `${e.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${c}`
}

