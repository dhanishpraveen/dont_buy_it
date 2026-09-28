export type Coordinates = { latitude: number; longitude: number };

export function validateCoordinates(value: unknown): Coordinates {
    if (!value || typeof value !== 'object') throw new Error('A valid latitude and longitude are required.');
    const candidate = value as Record<string, unknown>;
    const latitude = Number(candidate.latitude);
    const longitude = Number(candidate.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('Latitude must be between -90 and 90 and longitude between -180 and 180.');
    }
    return { latitude, longitude };
}

export function validateRadius(value: unknown, fallback = 5): number {
    const radius = value === undefined || value === null || value === '' ? fallback : Number(value);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 100) throw new Error('Radius must be greater than zero and no more than 100 km.');
    return radius;
}

export function distanceInKm(from: Coordinates, to: Coordinates): number {
    const earthRadiusKm = 6371;
    const latitudeDelta = (to.latitude - from.latitude) * Math.PI / 180;
    const longitudeDelta = (to.longitude - from.longitude) * Math.PI / 180;
    const latitudeOne = from.latitude * Math.PI / 180;
    const latitudeTwo = to.latitude * Math.PI / 180;
    const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function pointForCoordinates(coordinates: Coordinates) {
    return { type: 'Point' as const, coordinates: [coordinates.longitude, coordinates.latitude] };
}

export function coordinatesFromPoint(value: unknown): Coordinates | null {
    if (!value || typeof value !== 'object') return null;
    const point = value as { type?: unknown; coordinates?: unknown };
    if (point.type !== 'Point' || !Array.isArray(point.coordinates) || point.coordinates.length !== 2) return null;
    try {
        return validateCoordinates({ latitude: point.coordinates[1], longitude: point.coordinates[0] });
    } catch {
        return null;
    }
}
