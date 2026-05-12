import apiClient from './client'

const getNearby = (radius = 0.5) =>
    apiClient.get(`/api/main/nearby/?radius=${radius}`)

const sendRequest = (receiverId: number) =>
    apiClient.post('/api/main/neighbour-requests/', {receiver_id: receiverId})

const acceptRequest = (requestId: number) =>
    apiClient.post(`/api/main/neighbour-requests/${requestId}/accept/`)

const rejectRequest = (requestId: number) =>
    apiClient.post(`/api/main/neighbour-requests/${requestId}/reject/`)

const getPendingRequests = () =>
    apiClient.get('/api/main/neighbour-requests/')

const getCommunities = () =>
    apiClient.get('/api/main/communities/')

const getCommunity = (id: number) =>
    apiClient.get(`/api/main/communities/${id}/`)

const getChat = (chatId: number) =>
    apiClient.get(`/api/main/chats/${chatId}/`)

const sendMessage = (chatId: number, message: string) =>
    apiClient.post(`/api/main/chats/${chatId}/send-message/`, {message})

export default {
    getNearby,
    sendRequest,
    acceptRequest,
    rejectRequest,
    getPendingRequests,
    getCommunities,
    getCommunity,
    getChat,
    sendMessage
}