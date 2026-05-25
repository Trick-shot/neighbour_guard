import apiClient from "@/api/client";

const getNeighbourhoodStats = () =>
    apiClient.get('/api/main/stats/neighbourhood/')

export default {getNeighbourhoodStats}