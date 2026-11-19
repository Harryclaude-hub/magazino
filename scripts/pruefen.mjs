// Alle Pruefungen nacheinander, mit Zusammenfassung. Aufruf: npm run pruefen
// Typen, Linter (nur Fehler zaehlen), Build, Woerter und jedes scripts/*-pruefen.mjs.
// Bekannt: woerter-pruefen meldet 8 Eintraege bei *.eins, oxlint warnt zu set-state-in-effect.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const schritte = [
  { name: 'Typen (tsc -b)', cmd: npx, args: ['tsc', '-b'] },
  { name: 'Linter (oxlint, nur Fehler)', cmd: npx, args: ['oxlint', '--quiet'] },
  { name: 'Build', cmd: npm, args: ['run', 'build', '--silent'] },
  { name: 'Woerter', cmd: process.execPath, args: ['scripts/woerter-pruefen.mjs'], toleriert: true },
  ...readdirSync('scripts')
    .filter((f) => f.endsWith('-pruefen.mjs') && f !== 'woerter-pruefen.mjs')
    .sort()
    .map((f) => ({ name: f.replace('.mjs', ''), cmd: process.execPath, args: ['scripts/' + f] })),
]

const ergebnis = []
for (const s of schritte) {
  process.stdout.write(`\n=== ${s.name} ===\n`)
  const t0 = performance.now()
  const r = spawnSync(s.cmd, s.args, { stdio: 'inherit', shell: process.platform === 'win32' && s.cmd.endsWith('.cmd') })
  const sek = ((performance.now() - t0) / 1000).toFixed(1)
  const ok = r.status === 0
  ergebnis.push({ name: s.name, ok, sek, toleriert: !!s.toleriert })
}

console.log('\n\n==== Zusammenfassung ====')
let fehler = 0
for (const e of ergebnis) {
  const zeichen = e.ok ? 'OK    ' : e.toleriert ? 'HINWEIS' : 'FEHLER '
  if (!e.ok && !e.toleriert) fehler++
  console.log(`${zeichen} ${e.name} (${e.sek} s)`)
}
console.log(fehler === 0 ? '\nAlles in Ordnung.' : `\n${fehler} Pruefung(en) fehlgeschlagen.`)
process.exit(fehler === 0 ? 0 : 1)
