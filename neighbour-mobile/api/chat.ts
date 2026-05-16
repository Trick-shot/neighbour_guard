import apiClient from "@/api/client";

const getConversations = () => apiClient.get('/api/main/conversations/')
const getMessages = (conversationId: number) => apiClient.get(`/api/main/conversations/${conversationId}/messages/`)
const createConversation = (data: { participant_ids: number[], conversation_type: string, name?: string }) =>
    apiClient.post('/api/main/conversations/', data)

export default {getConversations, getMessages, createConversation}