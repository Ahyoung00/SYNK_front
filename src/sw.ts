/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e: ExtendableEvent) => {
  e.waitUntil(self.clients.claim())
})

const firebaseApp = initializeApp({
  apiKey: 'AIzaSyB7pgYMC37wqEm4wm0q6CIr9oveMUk0pY0',
  authDomain: 'synk-fea96.firebaseapp.com',
  projectId: 'synk-fea96',
  storageBucket: 'synk-fea96.firebasestorage.app',
  messagingSenderId: '228681249941',
  appId: '1:228681249941:web:dcc883bf734d7da648579c',
})

const messaging = getMessaging(firebaseApp)

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title ?? '미션 시작!'
  const body = payload.notification?.body ?? ''
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
  })
})

self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close()
  e.waitUntil(self.clients.openWindow('/'))
})
