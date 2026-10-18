import {AlertType} from '@/lib/types';

/** Copy for the neighbour's alarm screen, by alert type. */
export function alarmTitle(type: AlertType, house?: string, sender?: string) {
    const at = house ? ` at House ${house}` : '';
    switch (type) {
        case 'medical': return 'Medical help needed';
        case 'robbery': return `Break-in${at}`;
        case 'fire': return `Fire${at}`;
        case 'suspicious': return `Suspicious activity${house ? ` near House ${house}` : ''}`;
        case 'emergency': return `Emergency${at}`;
        default: return `${sender ?? 'A neighbour'} needs help`;
    }
}

export const WHAT_TO_DO: Record<AlertType, string[]> = {
    robbery: ['Don’t go in alone. Wait for one more neighbour.', 'Turn on lights and make noise from outside.', 'Call 112 if you see a weapon.'],
    medical: ['Check they are breathing. Don’t move them if they fell.', 'Bring a torch and stay with them until help arrives.', 'Call 112 for an ambulance if it is serious.'],
    fire: ['Don’t go inside a burning house.', 'Help people out and keep the road clear.', 'Call 114 for the fire brigade.'],
    suspicious: ['Watch from a safe place. Don’t confront anyone.', 'Turn on your outside lights.', 'Share what you see in the group chat.'],
    emergency: ['Go with another neighbour if you can.', 'Call 112 if anyone is hurt or armed.'],
    other: ['Go with another neighbour if you can.', 'Call 112 if anyone is hurt or armed.'],
};

export const minutesAgo = (iso?: string | null) => {
    if (!iso) return '';
    const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return m < 1 ? 'just now' : `${m} min ago`;
};

/** Haversine distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

export const walkMinutes = (m: number) => Math.max(1, Math.ceil(m / 80));
export const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`);
