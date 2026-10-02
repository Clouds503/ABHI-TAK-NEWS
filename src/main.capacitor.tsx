/**
 * Capacitor / mobile SPA entry point.
 *
 * This file is only used for the Android build (npm run build:mobile).
 * The SSR / web build continues to use @tanstack/react-start's own entry.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { getRouter } from './router';

// Capacitor core — must be imported before plugins
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { PushNotifications } from '@capacitor/push-notifications';

import './styles.css';

// ── Router & QueryClient ─────────────────────────────────────────────────────
const router = getRouter();
const { queryClient } = router.options.context;

// ── Native initialisation (runs only on real devices) ───────────────────────
async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  // Status bar: match app theme colour #D40000
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  await StatusBar.setBackgroundColor({ color: '#D40000' }).catch(() => {});

  // Push Notifications
  const permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === 'prompt') {
    await PushNotifications.requestPermissions();
  }
  if (permStatus.receive === 'granted') {
    await PushNotifications.register();
  }

  PushNotifications.addListener('registration', (token) => {
    // TODO: send token.value to your backend / Supabase user profile
    console.info('[Push] FCM token:', token.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error:', err.error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.info('[Push] Foreground notification:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Navigate to a route embedded in notification data, e.g. data.path = '/news/some-slug'
    const path: unknown = action.notification.data?.['path'];
    if (typeof path === 'string' && path.startsWith('/')) {
      router.navigate({ to: path as '/' }).catch(() => {});
    }
  });

  // Hide splash after app is ready
  await SplashScreen.hide();
}

// ── Mount React ───────────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

// Init native features after React mounts
initNative().catch(console.error);
