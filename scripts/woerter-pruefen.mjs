// Prueft die Woerterbuecher unter src/lib/i18n/bausteine:
//  - jeder im Code benutzte Schluessel existiert,
//  - de und ar haben dieselben Platzhalter,
//  - nirgends steht der lange Gedankenstrich (U+2014).
// Aufruf im Projektordner: node scripts/woerter-pruefen.mjs
// Bekannt und gewollt: 9 Meldungen PLATZHALTER bei *.eins, dort steht im
// Arabischen die Einzahl ohne Zahl.
import fs from 'node:fs'
import path from 'node:path'

const root = 'src'
const dict = {}
for (const f of fs.readdirSync('src/lib/i18n/bausteine')) {
  const txt = fs.readFileSync(path.join('src/lib/i18n/bausteine', f), 'utf8')
  const re = /'([a-z_]+\.[a-z0-9_.]+)':\s*\{\s*de:\s*(['"`])([\s\S]*?)\2,\s*ar:\s*(['"`])([\s\S]*?)\4,?\s*\}/g
  let m
  while ((m = re.exec(txt))) dict[m[1]] = { de: m[3], ar: m[5] }
}
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',')
let bad = 0
for (const [k, v] of Object.entries(dict)) {
  if (ph(v.de) !== ph(v.ar)) {
    console.log('PLATZHALTER', k, ph(v.de), '|', ph(v.ar))
    bad++
  }
  if ((v.de + v.ar).includes(String.fromCharCode(0x2014))) {
    console.log('GEDANKENSTRICH', k)
    bad++
  }
}
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name) && !p.includes('bausteine')) out.push(p)
  }
  return out
}
const plural = new Set(Object.keys(dict).filter((k) => k.endsWith('.eins')).map((k) => k.slice(0, -5)))
for (const f of walk(root)) {
  const txt = fs.readFileSync(f, 'utf8')
  for (const m of txt.matchAll(/\bt[ng]?\(\s*'([a-z_]+\.[a-z0-9_.]+)'/g)) {
    const k = m[1]
    if (!(k in dict) && !plural.has(k)) {
      console.log('FEHLT', k, 'in', f)
      bad++
    }
  }
}
console.log('Eintraege:', Object.keys(dict).length, 'Probleme:', bad)
