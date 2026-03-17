self.addEventListener('fetch', function(event) {
  // Basic fetch handler to satisfy PWA requirements
  event.respondWith(fetch(event.request));
});

self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo.png', // Make sure you have a logo
    badge: '/logo.png',
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
