interface HomeTypes {
    residenceName: string,
    houseNumber: string,
    location: null,
    streetName: string,
    district: string
}

type LocationType = {
    id?: number;
    latitude: number | null;
    longitude: number | null;
    latitudeDelta: number | null;
    longitudeDelta: number | null;
};

export {HomeTypes, LocationType}