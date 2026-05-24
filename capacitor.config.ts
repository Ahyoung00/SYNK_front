import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.synk.app',
  appName: 'SYNK',
  webDir: 'dist',

  server: {
    // Dev only: point the native shell at the Vite dev server
    // Comment this out before building for production
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Permissions strings shown to the user (iOS)
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f0f14',
    },
  },

  ios: {
    contentInset: 'always',
  },

  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
}

export default config
