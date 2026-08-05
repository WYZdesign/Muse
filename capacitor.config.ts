import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wyzdesign.muse',
  appName: 'Muse',
  webDir: 'out',
  server: {
    url: 'https://muse.wyzdesign.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0612",
      showSpinner: false,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0a0612",
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    Camera: {
      ios: { cameraAccessPermission: "Muse needs camera access for profile photos and chat images" },
      android: { saveToGallery: false },
    },
    Geolocation: {
      ios: { locationPermission: "Muse uses location for nearby creatives and distance sorting" },
      android: { locationPermission: "Muse uses location for nearby creatives and distance sorting" },
    },
    App: {
      launchAutoHidden: false,
    },
    Device: {},
    Haptics: {},
    Purchases: {
      // RevenueCat API keys - set via environment or configure at runtime
      iosApiKey: process.env.REVENUECAT_IOS_API_KEY || "",
      androidApiKey: process.env.REVENUECAT_ANDROID_API_KEY || "",
    },
  },
};

export default config;