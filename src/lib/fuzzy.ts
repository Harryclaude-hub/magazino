/* Tolerante Suche (E105), rein im Browser, ohne Netz und ohne React.
 *
 * Verzeiht Tippfehler: "papirbecher" findet "Papierbecher", "fusbal" findet
 * "Fussbaelle", "gumibaerchen" findet "Gummibaerchen". Umlaute ohne Punkte,
 * vertauschte und fehlende Buchstaben gehen auch.
 *
 * So geht sie vor:
 *  1. Normalisieren: klein, Umlaute (ae/oe/ue), ss fuer ss, Akzente weg,
 *     Satzzeichen weg.
 *  2. Lockerer Schluessel je Wort: ae/oe/ue werden a/o/u, ie wird i, ck wird k,
 *     ph wird f, doppelte Buchstaben werden einfach. Beide Seiten (Eingabe
 *     und Eintrag) werden gleich behandelt, "Fussbaelle" und "fusbal" liegen
 *     danach nah beieinander.
 *  3. Je Suchwort der beste Treffer unter den Woertern eines Eintrags:
 *     genau, Anfang, Teilwort, Tippfehler am Wortanfang, Tippfehler im
 *     ganzen Wort, Tippfehler mitten in einem Zusammengesetzten.
 *  4. Mehrere Suchwoerter muessen alle passen (jedes tolerant).
 * Tippfehler zaehlen als Damerau-Levenshtein: Einfuegen, Weglassen, Ersetzen
 * und Vertauschen zweier Nachbarn je einen Schritt. */

/** Normalisierter Text: klein, Umlaute und Akzente aufgeloest, nur Buchstaben,
 *  Ziffern und einzelne Leerzeichen. */
export function normalisieren(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Lockerer Schluessel eines (schon normalisierten) Wortes. */
export function locker(w: string): string {
  return w
    .replace(/ae|oe|ue/g, (m) => m[0])
    .replace(/ie/g, 'i')
    .replace(/ck/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/(.)\1+/g, '$1')
}

/** Die Woerter eines Textes, normalisiert. */
export function woerter(s: string): string[] {
  const n = normalisieren(s)
  return n ? n.split(' ') : []
}

/** Wie viele Tippfehler ein Suchwort dieser (lockeren) Laenge vertraegt. */
function erlaubteFehler(laenge: number): number {
  if (laenge <= 3) return 0
  if (laenge <= 6) return 1
  return 2
}

/** Kleinster Abstand (Damerau-Levenshtein, optimal string alignment) zwischen
 *  w und einem Teil von v. anfang: der Teil muss am Wortanfang von v
 *  beginnen. ende: der Teil muss am Wortende von v aufhoeren. Beides an:
 *  Abstand der ganzen Woerter. Beides aus: irgendein Teilstueck von v. */
function abstand(w: string, v: string, anfang: boolean, ende: boolean): number {
  const m = w.length
  const n = v.length
  if (m === 0) return 0
  // Drei Zeilen reichen: aktuelle, vorige, vorvorige (fuer die Vertauschung).
  let vor2: number[] = new Array<number>(n + 1).fill(0)
  let vor: number[] = new Array<number>(n + 1)
  let jetzt: number[] = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) vor[j] = anfang ? j : 0
  for (let i = 1; i <= m; i++) {
    jetzt[0] = i
    const wi = w.charCodeAt(i - 1)
    for (let j = 1; j <= n; j++) {
      const vj = v.charCodeAt(j - 1)
      const kosten = wi === vj ? 0 : 1
      let d = Math.min(vor[j] + 1, jetzt[j - 1] + 1, vor[j - 1] + kosten)
      if (i > 1 && j > 1 && wi === v.charCodeAt(j - 2) && w.charCodeAt(i - 2) === vj) {
        d = Math.min(d, vor2[j - 2] + 1)
      }
      jetzt[j] = d
    }
    const tmp = vor2
    vor2 = vor
    vor = jetzt
    jetzt = tmp
  }
  // Nach der Schleife steht die letzte Zeile in vor.
  if (ende) return vor[n]
  let best = vor[n]
  for (let j = 0; j < n; j++) if (vor[j] < best) best = vor[j]
  return best
}

/** Punkte (0 bis 100), wie gut das Suchwort w zu einem Wort v passt.
 *  Beide sind schon locker geschluesselt. 0 heisst: passt nicht. */
function wortPunkte(w: string, v: string): number {
  if (!w || !v) return 0
  if (w === v) return 100
  if (v.startsWith(w)) return 90 - Math.min(10, (v.length - w.length) * 0.5)
  const fehler = erlaubteFehler(w.length)
  if (w.length >= 3 && v.includes(w)) return 62
  if (fehler === 0) return 0
  // Ganzes Wort mit Tippfehlern.
  const ganz = abstand(w, v, true, true)
  if (ganz <= fehler) return 80 - ganz * 14
  // Anfang des Eintragswortes mit Tippfehlern ("fusbal" zu "fusbale").
  const vorn = abstand(w, v, true, false)
  if (vorn <= fehler) return 76 - vorn * 14
  // Mitten in einem Zusammengesetzten ("bechr" in "papierbecher").
  if (w.length >= 5) {
    const mitten = abstand(w, v, false, false)
    if (mitten <= fehler) return 44 - mitten * 8
  }
  return 0
}

/** Ein Feld eines Eintrags: Text und Gewicht (1 = voll, kleiner = nebensaechlich). */
export type Feld = string | { text: string; gewicht?: number }

interface Wort {
  /** Lockerer Schluessel. */
  w: string
  gewicht: number
}

interface FuzzyIndex<T> {
  items: T[]
  woerter: Wort[][]
}

/** Zerlegt jeden Eintrag einmal. Wer oft sucht (jeder Tastendruck), baut den
 *  Index einmal und fragt ihn mit fuzzyAbfrage. */
export function fuzzyIndex<T>(items: T[], felder: (item: T) => Feld[]): FuzzyIndex<T> {
  const woerter = items.map((item) => {
    const aus: Wort[] = []
    for (const f of felder(item)) {
      const text = typeof f === 'string' ? f : f.text
      const gewicht = typeof f === 'string' ? 1 : (f.gewicht ?? 1)
      const teile = woerter_(text)
      for (const t of teile) aus.push({ w: t, gewicht })
      // "Papier Becher" soll auch auf "papierbecher" passen.
      if (teile.length > 1) aus.push({ w: teile.join(''), gewicht: gewicht * 0.9 })
    }
    return aus
  })
  return { items, woerter }
}

function woerter_(text: string): string[] {
  return woerter(text).map(locker)
}

interface FuzzyTreffer<T> {
  item: T
  /** 0 bis 100, hoeher ist besser. */
  punkte: number
}

/** Die Eintraege, auf die alle Suchwoerter passen, bester zuerst. Bei leerer
 *  Eingabe kommen alle in der alten Reihenfolge mit 0 Punkten zurueck. */
export function fuzzyAbfrage<T>(index: FuzzyIndex<T>, text: string): FuzzyTreffer<T>[] {
  const suche = woerter_(text)
  if (suche.length === 0) return index.items.map((item) => ({ item, punkte: 0 }))
  const aus: Array<FuzzyTreffer<T> & { pos: number }> = []
  for (let i = 0; i < index.items.length; i++) {
    const ws = index.woerter[i]
    let summe = 0
    let alle = true
    for (const s of suche) {
      let best = 0
      for (const v of ws) {
        const p = wortPunkte(s, v.w) * v.gewicht
        if (p > best) best = p
        if (best >= 100) break
      }
      if (best <= 0) {
        alle = false
        break
      }
      summe += best
    }
    if (alle) aus.push({ item: index.items[i], punkte: summe / suche.length, pos: i })
  }
  aus.sort((a, b) => b.punkte - a.punkte || a.pos - b.pos)
  return aus.map(({ item, punkte }) => ({ item, punkte }))
}

/** Bequem fuer einmaliges Suchen. */
export function fuzzyFilter<T>(items: T[], text: string, felder: (item: T) => Feld[]): FuzzyTreffer<T>[] {
  return fuzzyAbfrage(fuzzyIndex(items, felder), text)
}
