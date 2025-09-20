import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bffd3034019549f6aa4c63687f725aa8',
  appName: 'ionic-data-quest',
  webDir: 'dist',
  server: {
    url: 'https://bffd3034-0195-49f6-aa4c-63687f725aa8.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#E8F4FD',
      showSpinner: false
    }
  }
};

export default config;