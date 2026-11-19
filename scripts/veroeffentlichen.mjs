// Magazino veroeffentlichen, ohne GitHub-Rechenzeit (E108).
//
// Warum: Der Bau ueber GitHub Actions kostet bei privaten Repos Rechenzeit, und
// ist die aufgebraucht, startet kein Bau mehr (startup_failure). Dieses Skript
// baut die Seite auf diesem Rechner und legt das Ergebnis auf den Zweig gh-pages.
// GitHub Pages liefert den Zweig dann aus; das kostet keine Actions-Minuten.
//
// Aufruf im Projektordner:   node scripts/veroeffentlichen.mjs
// Voraussetzung: gh (angemeldet), git, npm. Die Adressen der Datenbank holt das
// Skript aus den Repository-Variablen (das sind nur oeffentliche Werte, keine
// Geheimnisse). Vorher laufen die Pruefungen aus CLAUDE.md von Hand.
//
// Es wird nie mit --force gepusht: jeder Stand ist ein normaler Commit auf gh-pages.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const REPO = 'Harryclaude-hub/magazino'
const win = process.platform === 'win32'
const npm = win ? 'npm.cmd' : 'npm'

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim()
}

function variable(name) {
  const v = run('gh', ['variable', 'get', name, '--repo', REPO])
  if (!v) throw new Error(`Repository-Variable ${name} ist leer.`)
  return v
}

const env = {
  ...process.env,
  VITE_BASE: '/magazino/',
  VITE_SUPABASE_URL: variable('VITE_SUPABASE_URL'),
  VITE_SUPABASE_ANON_KEY: variable('VITE_SUPABASE_ANON_KEY'),
  VITE_VAPID_PUBLIC_KEY: variable('VITE_VAPID_PUBLIC_KEY'),
}

// Gebaut wird immer der letzte Commit (HEAD) in einem eigenen Arbeitsordner, nie halbfertige Dateien.
const baumDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magazino-bau-'))
fs.rmSync(baumDir, { recursive: true, force: true })
run('git', ['worktree', 'add', '--quiet', '--detach', baumDir, 'HEAD'])
fs.symlinkSync(path.resolve('node_modules'), path.join(baumDir, 'node_modules'), 'junction')
console.log('1/4 Bauen (letzter Commit) ...')
try {
  execFileSync(npm, ['run', 'build'], { stdio: 'inherit', env, shell: win, cwd: baumDir })
} catch (e) {
  run('git', ['worktree', 'remove', '--force', baumDir])
  throw e
}
const dist = path.join(baumDir, 'dist')
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html fehlt.')
const quelle = run('git', ['rev-parse', '--short', 'HEAD'])
// GitHub Pages kennt keine Umschreibung auf index.html: tiefe Adressen brauchen diese Kopie.
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))

const remote = run('git', ['remote', 'get-url', 'origin'])
const arbeit = fs.mkdtempSync(path.join(os.tmpdir(), 'magazino-pages-'))

console.log('2/4 Zweig gh-pages holen ...')
let vorhanden = true
try {
  run('git', ['clone', '--quiet', '--branch', 'gh-pages', '--single-branch', remote, arbeit])
} catch {
  vorhanden = false
  run('git', ['init', '--quiet', '-b', 'gh-pages', arbeit])
  run('git', ['-C', arbeit, 'remote', 'add', 'origin', remote])
}

console.log('3/4 Dateien ersetzen ...')
for (const e of fs.readdirSync(arbeit)) {
  if (e === '.git') continue
  fs.rmSync(path.join(arbeit, e), { recursive: true, force: true })
}
fs.cpSync(dist, arbeit, { recursive: true })
run('git', ['-C', arbeit, 'add', '-A'])
const status = run('git', ['-C', arbeit, 'status', '--porcelain'])
if (!status) {
  console.log('Nichts Neues: die Seite ist schon auf diesem Stand.')
} else {
  run('git', ['-C', arbeit, '-c', 'user.name=Magazino', '-c', 'user.email=magazino@users.noreply.github.com',
    'commit', '--quiet', '-m', `Seite vom Stand ${quelle}`])
  console.log('4/4 Hochladen ...')
  run('git', ['-C', arbeit, 'push', '--quiet', 'origin', 'gh-pages'])
  console.log(`Fertig: Stand ${quelle} ist hochgeladen${vorhanden ? '' : ' (Zweig gh-pages neu angelegt)'}.`)
}
fs.rmSync(arbeit, { recursive: true, force: true })
try {
  fs.unlinkSync(path.join(baumDir, 'node_modules')) // nur die Verknuepfung, nie den echten Ordner
} catch {
  /* schon weg */
}
run('git', ['worktree', 'remove', '--force', baumDir])
