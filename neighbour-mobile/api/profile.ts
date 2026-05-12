import apiClient from "@/api/client";

const userProfile = () => apiClient.get('/api/main/profiles/my-profile/')

const updateProfile = (formData: FormData) =>
    apiClient.patch('/api/main/profiles/update-profile/', formData, {
        headers: {'Content-Type': 'multipart/form-data'}
    })

export default {userProfile, updateProfile}