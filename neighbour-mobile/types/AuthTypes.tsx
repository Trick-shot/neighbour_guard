export interface HomeTypes {
    id: string,
    residenceName: string,
    houseNumber: string,
    location?: null,
    streetName: string,
    district: string
}

export interface LocationType {
    id?: number;
    latitude: number | null;
    longitude: number | null;
    latitudeDelta: number | null;
    longitudeDelta: number | null;
}

export interface TokenType {
    refresh: string,
    access: string
}