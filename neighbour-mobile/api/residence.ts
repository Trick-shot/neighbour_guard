import apiClient from "@/api/client";

const userResidence = () => apiClient.get('/api/main/residences/my-residence/')
const getNeighbours = () => apiClient.get("/api/main/residences/neighbours/");


export default {userResidence, getNeighbours}