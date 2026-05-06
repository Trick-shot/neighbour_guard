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

const registerHome = (values: HomeTypes) =>
    apiClient.post('/api/main/Residences/', {
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

export default {
    login,
    register,
    resendActivation,
    requestOtpCodes,
    verifyOtp,
    registerHome,
    setLocation
}