
/**
 * Douglas-Peucker algorithm for polyline simplification.
 * @param points Array of [lat, lng] coordinates.
 * @param tolerance The maximum distance (in degrees) between a point and the line segment.
 * @returns Simplified array of [lat, lng] coordinates.
 */
export function simplifyPolyline(points: [number, number][], tolerance: number): [number, number][] {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let index = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
        const distance = getPerpendicularDistance(points[i], start, end);
        if (distance > maxDistance) {
            maxDistance = distance;
            index = i;
        }
    }

    if (maxDistance > tolerance) {
        const left = simplifyPolyline(points.slice(0, index + 1), tolerance);
        const right = simplifyPolyline(points.slice(index), tolerance);
        return [...left.slice(0, left.length - 1), ...right];
    } else {
        return [start, end];
    }
}

/**
 * Calculates the perpendicular distance of a point from a line segment.
 */
function getPerpendicularDistance(point: [number, number], start: [number, number], end: [number, number]): number {
    const [x, y] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;

    const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
    const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

    return numerator / denominator;
}

/**
 * Calculate distance between two points in km (Haversine formula).
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Calculates tile coordinates for a given lat/lng and zoom level.
 */
export function lon2tile(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat: number, zoom: number): number {
    return Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
        Math.pow(2, zoom)
    );
}

/**
 * Generates a list of tile URLs for a bounding box and zoom levels.
 */
export function getSectorTileUrls(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    zoomLevels: number[],
    urlTemplate: string
): string[] {
    const urls: string[] = [];
    
    for (const zoom of zoomLevels) {
        const xStart = lon2tile(minLng, zoom);
        const xEnd = lon2tile(maxLng, zoom);
        const yStart = lat2tile(maxLat, zoom);
        const yEnd = lat2tile(minLat, zoom);

        for (let x = Math.min(xStart, xEnd); x <= Math.max(xStart, xEnd); x++) {
            for (let y = Math.min(yStart, yEnd); y <= Math.max(yStart, yEnd); y++) {
                const url = urlTemplate
                    .replace('{z}', zoom.toString())
                    .replace('{x}', x.toString())
                    .replace('{y}', y.toString());
                urls.push(url);
            }
        }
    }
    
    return urls;
}
