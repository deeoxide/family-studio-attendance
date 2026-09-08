import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { distanceMeters } from '@/lib/geofence';
import type { Office } from '@/api/types';

export type GeoStatus = 'loading' | 'ready' | 'denied' | 'error';

interface GeofenceState {
  status: GeoStatus;
  distance: number | null; // metres from the office, null until a fix arrives
  coords: { lat: number; lng: number } | null;
  refresh: () => Promise<void>;
}

/** Watches the device's position and reports live distance from `office`. */
export function useGeofence(office: Office | undefined): GeofenceState {
  const [status, setStatus] = useState<GeoStatus>('loading');
  const [distance, setDistance] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const applyPosition = useCallback(
    (pos: Location.LocationObject) => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      if (office) setDistance(distanceMeters(office.lat, office.lng, c.lat, c.lng));
    },
    [office],
  );

  const start = useCallback(async () => {
    setStatus('loading');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return;
      }
      const last = await Location.getLastKnownPositionAsync();
      if (last) applyPosition(last);

      subRef.current?.remove();
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 2 },
        (pos) => {
          applyPosition(pos);
          setStatus('ready');
        },
      );
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [applyPosition]);

  useEffect(() => {
    start();
    return () => subRef.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [office?.id]);

  const refresh = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      applyPosition(pos);
    } catch {
      setStatus('error');
    }
  }, [applyPosition]);

  return { status, distance, coords, refresh };
}
