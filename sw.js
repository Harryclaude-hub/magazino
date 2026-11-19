/* Magazino Service Worker
 * Aufgaben: App-Huelle offline halten, Push-Benachrichtigungen anzeigen.
 * Bewusst ohne Build-Schritt, damit hier nichts still auseinanderlaeuft.
 */
const VERSION = 'magazino-v1'
const SHELL = `${VERSION}-shell`

/* Die App kann unter einem Unterordner liegen (GitHub Pages liefert unter
 * /kistly/ aus). Der eigene Geltungsbereich verraet den Pfad, damit steht
 * er an genau einer Stelle und muss nirgends fest eingetragen werden. */
const BASE = new URL(self.registration.scope).pathname
const SHELL_FILES = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon.svg`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[sw] precache fehlgeschlagen', err)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navigation: erst Netz, sonst die gecachte Huelle.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(`${BASE}index.html`).then((r) => r || Response.error()),
      ),
    )
    return
  }

  // Statische Dateien: erst Cache, dann Netz und nachlegen.
  if (url.pathname.startsWith(`${BASE}assets/`) || url.pathname.startsWith(`${BASE}icons/`)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(SHELL).then((c) => c.put(req, copy))
            return res
          }),
      ),
    )
  }
})

/* --------------------------------------------------------------- Push */
function parsePush(event) {
  if (!event.data) return { title: 'Magazino', body: '' }
  try {
    return event.data.json()
  } catch {
    return { title: 'Magazino', body: event.data.text() }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePush(event)
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Magazino', {
      body: payload.body || '',
      tag: payload.tag,
      renotify: Boolean(payload.tag),
      icon: payload.icon || `${BASE}icons/icon-192.png`,
      badge: `${BASE}icons/favicon-32.png`,
      image: payload.image,
      vibrate: [120, 60, 120],
      data: payload.data || {},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  const action = event.action
  event.notification.close()

  /* Die Adressen im Push sind relativ zur App gedacht, darum kommt der
   * Basispfad hier davor. Sonst landet ein Tipp auf die Meldung unter
   * /app statt unter /kistly/app. */
  const inApp = (u) => (u ? `${BASE}${String(u).replace(/^\//, '')}` : `${BASE}app`)
  let target = inApp(data.url)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', action, data })
          client.navigate(target).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
