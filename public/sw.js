/* PSB Web Push service worker */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = String(data.title || 'Physics by Suraj Bhardwaj');
  const options = {
    body: String(data.body || 'A new study update is available.'),
    icon: '/psb-logo-transparent.webp',
    badge: '/psb-logo-transparent.webp',
    tag: String(data.tag || 'psb-study-update'),
    renotify: false,
    data: {
      url: typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
        ? data.url
        : '/'
    }
  };

  // Push messages must be user-visible. Display the system notification immediately.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const sameOrigin = windows.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOrigin) {
        const navigated = await sameOrigin.navigate(targetUrl);
        return (navigated || sameOrigin).focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
