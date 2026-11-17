/**
 * Service Worker para Memorama PWA
 * Permite funcionamiento offline y cacheo de recursos
 */

const CACHE_NAME = 'memorama-v1';
// Usar rutas relativas para que funcionen independientemente de la ruta base
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando recursos estáticos');
                return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
            })
            .then(() => {
                console.log('[SW] Recursos cacheados correctamente');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Error al cachear:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Eliminando cache antigua:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activado');
                return self.clients.claim();
            })
    );
});

// Interceptar peticiones de red (estrategia Cache First para estáticos, Network First para HTML)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo manejar peticiones del mismo origen
    if (url.origin !== location.origin) {
        return;
    }

    // Estrategia para recursos estáticos (CSS, JS, imágenes, manifest)
    if (request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image' ||
        request.destination === 'manifest' ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.json')) {

        event.respondWith(cacheFirst(request));
        return;
    }

    // Estrategia para HTML (Network First para actualizaciones)
    if (request.destination === 'document' || request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Por defecto: Network First
    event.respondWith(networkFirst(request));
});

/**
 * Estrategia Cache First: busca en cache, si no está va a red y guarda en cache
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        // Solo cachear respuestas válidas
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Error en fetch (cacheFirst):', error);

        // Si es una navegación y falla, devolver página offline
        if (request.destination === 'document') {
            return caches.match('./index.html');
        }

        throw error;
    }
}

/**
 * Estrategia Network First: intenta red primero, si falla usa cache
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        // Cachear respuesta exitosa
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Red no disponible, buscando en cache:', error);

        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback para navegación: página principal
        if (request.destination === 'document' || request.mode === 'navigate') {
            return caches.match('./index.html');
        }

        throw error;
    }
}

// Manejar mensajes del cliente (para skipWaiting, etc.)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Sincronización en segundo plano (para futuras funcionalidades)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-game-data') {
        event.waitUntil(syncGameData());
    }
});

async function syncGameData() {
    // Placeholder para sincronizar datos de juego cuando se recupere conexión
    console.log('[SW] Sincronización en segundo plano');
}

// Notificaciones push (para futuras funcionalidades)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || 'Nueva notificación de Memorama',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        },
        actions: [
            { action: 'play', title: '🎮 Jugar' },
            { action: 'close', title: 'Cerrar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Memorama', options)
    );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'play' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Si ya hay una ventana abierta, enfocarla
                    for (const client of clientList) {
                        if (client.url.includes('./') && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Sino, abrir nueva ventana
                    if (clients.openWindow) {
                        return clients.openWindow('./');
                    }
                })
        );
    }
});

console.log('[SW] Service Worker de Memorama cargado');