import apiClient from "./client.ts";

const verifyEmail = (uid: string, token: string) => {
    return apiClient.post('auth/users/activation/', {
        "uid": uid,
        "token": token
    })
}

export default {verifyEmail}