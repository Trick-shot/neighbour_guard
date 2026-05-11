export interface ResidenceTypes {
    id: string,
    residence_name: string,
    house_number: string,
    location?: LocationType,
    street_name: string,
    district: string
}


export interface LocationType {
    id?: number;
    latitude: number | null;
    longitude: number | null;
    latitudeDelta: number | null;
    longitudeDelta: number | null;
}
