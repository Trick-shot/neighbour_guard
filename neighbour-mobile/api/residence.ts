import apiClient from "@/api/client";

const userResidence = () => apiClient.get('/api/main/residences/my-residence/')


export default {userResidence}