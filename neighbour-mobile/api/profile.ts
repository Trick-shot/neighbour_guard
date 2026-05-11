import apiClient from "@/api/client";

const userProfile = () => apiClient.get('/api/main/profiles/my-profile/')


export default {userProfile}