import apiClient from "./client";

const login = (email: string, password: string) => apiClient.post("/auth/jwt/create", {
    "email": email,
    "password": password
});
const register = (fullName: string, email: string, password: string, re_password: string) => apiClient.post("/auth/users/", {
    "full_name": fullName,
    "email": email,
    "password": password,
    "re_password": re_password
});

const resendActivation = (email: string) =>
    apiClient.post('/auth/users/resend_activation/', {email});

export default {login, register, resendActivation}