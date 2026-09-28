import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { UserCoordinates } from '../../shared/types/requirements';

export type LocationStatus = 'LOCATION_UNKNOWN' | 'LOCATION_REQUESTED' | 'LOCATION_AVAILABLE' | 'LOCATION_DENIED' | 'LOCATION_UNAVAILABLE' | 'LOCATION_MANUAL';

type LocationContextValue = { status: LocationStatus; coordinates: UserCoordinates | null; requestLocation: () => void; setManualLocation: (coordinates: UserCoordinates) => void };
const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<LocationStatus>('LOCATION_UNKNOWN');
    const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);
    const requestLocation = () => {
        if (!navigator.geolocation) { setStatus('LOCATION_UNAVAILABLE'); return; }
        setStatus('LOCATION_REQUESTED');
        navigator.geolocation.getCurrentPosition(
            (position) => { setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setStatus('LOCATION_AVAILABLE'); },
            (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'LOCATION_DENIED' : 'LOCATION_UNAVAILABLE'),
            { enableHighAccuracy: false, maximumAge: 15 * 60 * 1000, timeout: 10000 },
        );
    };
    const setManualLocation = (value: UserCoordinates) => { setCoordinates(value); setStatus('LOCATION_MANUAL'); };
    const value = useMemo(() => ({ status, coordinates, requestLocation, setManualLocation }), [coordinates, status]);
    return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext() {
    const context = useContext(LocationContext);
    if (!context) throw new Error('useLocationContext must be used inside LocationProvider');
    return context;
}
