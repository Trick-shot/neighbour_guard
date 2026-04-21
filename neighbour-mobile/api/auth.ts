import {HomeTypes, LocationType} from "@/types/AuthTypes";
import apiClient from "./client";

const login = (email: string, password: string) => apiClient.post("/api/auth/jwt/create", {
    "email": email,
    "password": password
});
const register = (fullName: string, email: string, password: string, re_password: string) => apiClient.post("/api/auth/users/", {
    "full_name": fullName,
    "email": email,
    "password": password,
    "re_password": re_password
});

const registerHome = (values: HomeTypes) => {
    apiClient.post('main/Residences/', {
        "residence_name": values.residenceName,
        "house_number": values.houseNumber,
        "location": null,
        "street_name": values.streetName,
        "district": values.district

    })
}

const setLocation = (id: number, latitude: number | null, longitude: number | null, longitudeDelta: number | null, latitudeDelta: number | null, values: LocationType) => {
    apiClient.patch(`main/Residences/${id}`, {
        latitude: values.latitude,
        longitude: values.longitude,
        latitude_delta: values.latitudeDelta,
        longitude_delta: values.longitudeDelta
    })
}

const resendActivation = (email: string) =>
    apiClient.post('/auth/users/resend_activation/', {email});

export default {login, register, resendActivation, registerHome, setLocation}