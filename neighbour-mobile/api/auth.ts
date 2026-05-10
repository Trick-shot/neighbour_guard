import {HomeTypes, LocationType} from "@/types/AuthTypes";
import apiClient from "./client";

const login = (email: string, password: string) =>
    apiClient.post("/api/auth/jwt/create/", {
        email,
        password
    });

const register = (fullName: string, email: string, password: string, re_password: string) =>
    apiClient.post("/api/auth/users/", {
        full_name: fullName,
        email,
        password,
        re_password
    });

const resendActivation = (email: string) =>
    apiClient.post('/api/auth/users/resend_activation/', {email});

const requestOtpCodes = (email: string, phoneNumber: string) =>
    apiClient.post("/api/auth/send-otp/", {
        email,
        phone_number: phoneNumber
    });

const verifyOtp = (phoneNumber: string, otp: string) =>
    apiClient.post("/api/auth/verify-otp/", {
        phone_number: phoneNumber,
        otp
    });

const registerHome = (email: string, values: HomeTypes) =>
    apiClient.post('/api/main/Residences/', {
        email,
        residence_name: values.residenceName,
        house_number: values.houseNumber,
        location: null,
        street_name: values.streetName,
        district: values.district
    });

const setLocation = (
    id: number,
    values: LocationType
) =>
    apiClient.patch(`/api/main/Residences/${id}/`, {
        latitude: values.latitude,
        longitude: values.longitude,
        latitude_delta: values.latitudeDelta,
        longitude_delta: values.longitudeDelta
    });

const profileUpdate = (data: FormData) =>
    apiClient.patch('/api/main/profiles/update-profile/', data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
    })
const verifyToken = (token: string) =>
    apiClient.post('/api/auth/jwt/verify/', {token})

const refreshToken = (refresh: string) =>
    apiClient.post('/api/auth/jwt/refresh/', {refresh})

export default {
    login,
    register,
    resendActivation,
    requestOtpCodes,
    verifyOtp,
    registerHome,
    setLocation,
    profileUpdate,
    verifyToken,
    refreshToken
}