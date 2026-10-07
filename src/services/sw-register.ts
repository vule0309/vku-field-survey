import { syncPendingSurveys, registerBackgroundSync } from './sync';

let swRegistration: ServiceWorkerRegistration | null = null;
let deferredPrompt: any = null;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered with scope:', registration.scope);
          swRegistration = registration;

          // Request background sync registration initially
          registerBackgroundSync();

          // Listen for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[SW] New content available; please refresh.');
                  } else {
                    console.log('[SW] Content cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });
    });

    // Listen for messages from Service Worker (e.g. background sync)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'BACKGROUND_SYNC_TRIGGERED') {
        console.log('[SW Message] Background sync triggered from Service Worker');
        syncPendingSurveys();
      }
    });
  }

  // Setup Online / Offline event listeners
  window.addEventListener('online', () => {
    console.log('[Network] Network is back ONLINE! Initiating sequential auto-sync...');
    window.dispatchEvent(new CustomEvent('vku-network-change', { detail: { online: true } }));
    // Automatically dispatch queued surveys sequentially upon network restoration
    syncPendingSurveys();
  });

  window.addEventListener('offline', () => {
    console.log('[Network] Network is OFFLINE! Offline persistence mode active.');
    window.dispatchEvent(new CustomEvent('vku-network-change', { detail: { online: false } }));
  });

  // PWA Install prompt listener
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt event captured');
    window.dispatchEvent(new CustomEvent('vku-can-install', { detail: { canInstall: true } }));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application installed successfully');
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('vku-can-install', { detail: { canInstall: false } }));
  });
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('vku-can-install', { detail: { canInstall: false } }));
  return choice.outcome === 'accepted';
}

export function isPWAInstallable(): boolean {
  return !!deferredPrompt;
}

export function getSWRegistration(): ServiceWorkerRegistration | null {
  return swRegistration;
}
