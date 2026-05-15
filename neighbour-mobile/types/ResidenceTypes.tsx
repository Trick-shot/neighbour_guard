import {UserType} from "@/types/AuthTypes";

export interface ResidenceTypes {
    id: string,
    residence_name: string,
    residence_members: UserType [],
    house_number: string,
    location?: LocationType,
    street_name: string,
    district: string
}


export interface LocationType {
    id?: number;
    latitude: number;
    longitude: number;
}
