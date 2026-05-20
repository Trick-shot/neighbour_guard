import apiClient from "@/api/client";

const getConversations = () => apiClient.get('/api/main/conversations/')
const getMessages = (conversationId: number) => apiClient.get(`/api/main/conversations/${conversationId}/messages/`)
const createConversation = (data: { participant_ids: number[], conversation_type: string, name?: string }) =>
    apiClient.post('/api/main/conversations/', data)
const createNeighbourhoodGroup = () =>
    apiClient.post('/api/main/conversations/neighbourhood-group/')

export default {getConversations, getMessages, createConversation, createNeighbourhoodGroup}
