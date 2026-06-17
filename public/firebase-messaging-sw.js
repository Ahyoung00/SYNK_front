self.addEventListener('install', function (e) {
  self.skipWaiting()
})

self.addEventListener('activate', function (e) {
  console.log('fcm sw activate..')
})

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyB7pgYMC37wqEm4wm0q6CIr9oveMUk0pY0',
  authDomain: 'synk-fea96.firebaseapp.com',
  projectId: 'synk-fea96',
  storageBucket: 'synk-fea96.firebasestorage.app',
  messagingSenderId: '228681249941',
  appId: '1:228681249941:web:dcc883bf734d7da648579c',
})

const messaging = firebase.messaging()

self.addEventListener('push', function (e) {
  if (!e.data.json()) return

  const resultData = e.data.json().notification
  const notificationTitle = resultData.title

  const notificationOptions = {
    body: resultData.body,
    icon: '/icon-192.png',
  }

  console.log(resultData.title, { body: resultData.body })

  e.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
