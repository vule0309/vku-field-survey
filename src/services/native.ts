import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { Geolocation, type Position } from '@capacitor/geolocation';

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Check if the application is running inside a native mobile wrapper (Android / iOS)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Capture a photo using @capacitor/camera native Android camera
 */
export async function takeNativePhoto(): Promise<string | null> {
  if (!isNativePlatform()) {
    throw new Error('Not running on native platform');
  }
  try {
    const image = await Camera.getPhoto({
      quality: 75,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // Allows user to choose Camera or Photos
      promptLabelHeader: 'Ảnh kiểm định CSVC',
      promptLabelPhoto: 'Chọn từ Thư viện ảnh',
      promptLabelPicture: 'Chụp ảnh bằng Camera',
      promptLabelCancel: 'Hủy bỏ',
    });

    return image.dataUrl || null;
  } catch (error: any) {
    // User cancelled or permission denied
    if (error?.message?.includes('cancelled') || error?.message?.includes('User cancelled')) {
      console.log('[Native Camera] User cancelled capture');
      return null;
    }
    console.warn('[Native Camera] Failed to get photo from Capacitor Camera:', error);
    throw error;
  }
}

/**
 * Retrieve current GPS coordinates using @capacitor/geolocation
 */
export async function getNativeLocation(): Promise<GPSLocation | null> {
  try {
    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    return {
      latitude: Number(position.coords.latitude.toFixed(6)),
      longitude: Number(position.coords.longitude.toFixed(6)),
      accuracy: Math.round(position.coords.accuracy),
    };
  } catch (error) {
    console.warn('[Native GPS] Could not get location:', error);
    return null;
  }
}

/**
 * Setup real-time native network listener using @capacitor/network
 */
export async function initNativeNetworkListener(
  onStatusChange: (isOnline: boolean) => void
): Promise<{ getCurrentStatus: () => Promise<boolean>; remove: () => void }> {
  try {
    const initialStatus: ConnectionStatus = await Network.getStatus();
    onStatusChange(initialStatus.connected);

    const listener = await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      console.log('[Native Network] Network status changed:', status.connected, status.connectionType);
      onStatusChange(status.connected);
    });

    return {
      getCurrentStatus: async () => {
        const s = await Network.getStatus();
        return s.connected;
      },
      remove: () => {
        listener.remove();
      },
    };
  } catch (err) {
    console.warn('[Native Network] Capacitor Network not available, using Web fallback:', err);
    onStatusChange(navigator.onLine);
    return {
      getCurrentStatus: async () => navigator.onLine,
      remove: () => {},
    };
  }
}
