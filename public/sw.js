// Service Worker - ExtraTaff Push Notifications
// public/sw.js

self.addEventListener('install', (event) => {
  console.log('[SW] Install')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate')
  event.waitUntil(self.clients.claim())
})

// Réception d'une notification push
self.addEventListener('push', (event) => {
  console.log('[SW] Push reçu:', event)

  let data = {
    title: 'ExtraTaff',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/'
  }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch (e) {
    console.error('[SW] Erreur parsing push data:', e)
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Voir' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification cliquée:', event)
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si une fenêtre ExtraTaff est déjà ouverte, on la focus
      for (const client of clients) {
        if (client.url.includes('extrataff.fr') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      return self.clients.openWindow(url)
    })
  )
})
