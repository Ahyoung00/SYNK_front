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

// 백그라운드(앱이 닫혔거나 탭이 백그라운드) 알림 수신
messaging.onBackgroundMessage((payload) => {
  const { title = '알림', body = '' } = payload.notification ?? {}
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    data: payload.data,
  })
})

// 알림 클릭 시 앱으로 포커스 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/')
    }),
  )
})
