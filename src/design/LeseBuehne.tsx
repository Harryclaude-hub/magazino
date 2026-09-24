import './lesen.css'

/* Die Zeichnung zur Ladeanzeige der Bilderkennung.
 *
 * Reine Optik, keine Logik: eine offene Kiste im Sucher einer Kamera, ein
 * Lichtstreifen faehrt darueber, und bei voller Bewegung blinken Funken
 * auf den Dingen, die gerade erkannt werden. Farben und Bewegung stehen
 * in lesen.css. Loescht man diese Datei und lesen.css, faellt nur die
 * Zeichnung weg; wie das geht, steht in README.md.
 */
export function LeseBuehne() {
  return (
    <svg viewBox="0 0 200 150" className="lese-buehne" aria-hidden="true">
      {/* Sucherecken */}
      <path className="ecke" d="M18 34 V16 H36" />
      <path className="ecke" d="M164 16 H182 V34" />
      <path className="ecke" d="M182 116 V134 H164" />
      <path className="ecke" d="M36 134 H18 V116" />

      {/* Was oben aus der Kiste schaut: Flasche, Dose, Tube */}
      <rect className="ding-1" x="62" y="26" width="16" height="44" rx="5" />
      <rect className="ding-1" x="66" y="17" width="8" height="11" rx="2" />
      <rect className="ding-2" x="90" y="34" width="24" height="34" rx="4" />
      <rect className="ding-3" x="122" y="28" width="14" height="40" rx="3" />

      {/* Die Kiste */}
      <rect className="karton" x="46" y="66" width="108" height="56" rx="6" />
      <path className="karton-seite" d="M130 66 h18 a6 6 0 0 1 6 6 v44 a6 6 0 0 1 -6 6 h-18 z" />
      <path className="klappe" d="M42 66 L58 54 h30 v12 z" />
      <path className="klappe" d="M158 66 L142 54 h-30 v12 z" />
      <rect className="band" x="92" y="66" width="16" height="56" />

      {/* Funken auf den Dingen, nur bei voller Bewegung sichtbar */}
      <circle className="funke funke-1" cx="70" cy="36" r="4" />
      <circle className="funke funke-2" cx="102" cy="44" r="4" />
      <circle className="funke funke-3" cx="129" cy="38" r="4" />

      {/* Der Lichtstreifen */}
      <g className="strahl-gruppe">
        <rect className="strahl" x="24" y="68" width="152" height="14" rx="7" />
        <rect className="strahl-kern" x="24" y="73.5" width="152" height="3" rx="1.5" />
      </g>
    </svg>
  )
}
