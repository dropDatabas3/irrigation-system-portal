/* Minimal service worker: installability without disrupting dev or streaming. */
const CACHE_NAME = 'riego-pwa-v2'

self.addEventListener('install', () => {
  // Skip waiting so updates apply quickly
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  )
  self.clients.claim()
})

// In local/dev (localhost, 127.0.0.1, or typical LAN IPs), avoid intercepting fetches
// to prevent conflicts with Next.js HMR/streaming which can cause stuck "loading".
const IS_LOCAL = (() => {
  const host = self.location.hostname
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.endsWith('.local')
  )
})()

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (IS_LOCAL) return // don't touch dev/local traffic
  if (request.method !== 'GET') return

  // Keep it simple in production: direct network, with lightweight offline fallback
  event.respondWith(
    fetch(request).catch(() =>
      new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    )
  )
})
