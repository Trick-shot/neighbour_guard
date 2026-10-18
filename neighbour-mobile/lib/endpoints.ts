/** Typed calls to /api/v2 (see docs/API-v2.md). */
import {api, call} from './api';
import {Alert, AlertType, Area, ChatMessage, Conversation, MyResidence, NewResidence, ResponseState} from './types';

export const authApi = {
    requestEmailCode: (email: string) => call(api.post('/api/auth/email-code/', {email})),
    verifyEmailCode: (email: string, code: string) =>
        call<{ access: string; refresh: string }>(api.post('/api/auth/email-code/verify/', {email, code})),
};

export const placesApi = {
    me: () => call<MyResidence>(api.get('/api/v2/places/me/')),
    // The server reads who you are from the token; the body carries the home only.
    create: (home: NewResidence) => call<MyResidence>(api.post('/api/v2/places/me/', home)),
    // Only the text fields. Moving the pin would change who gets your alerts, so the server refuses it.
    update: (fields: { house_number?: string; street?: string; directions?: string }) =>
        call<MyResidence>(api.patch('/api/v2/places/me/', fields)),
    areas: () => call<{ neighbourhood: string; areas: Area[] }>(api.get('/api/v2/places/areas/')),
    neighbours: () => call<{ user_id: number; full_name: string }[]>(api.get('/api/v2/places/neighbours/')),
};

export const alertsApi = {
    create: (client_id: string, type: AlertType) => call<Alert>(api.post('/api/v2/alerts/', {client_id, type})),
    active: () => call<Alert[]>(api.get('/api/v2/alerts/')),
    get: (id: number) => call<Alert>(api.get(`/api/v2/alerts/${id}/`)),
    changeType: (id: number, type: AlertType) => call<Alert>(api.post(`/api/v2/alerts/${id}/type/`, {type})),
    cancel: (id: number) => call<Alert>(api.post(`/api/v2/alerts/${id}/cancel/`)),
    sendNow: (id: number) => call<Alert>(api.post(`/api/v2/alerts/${id}/send-now/`)),
    respond: (id: number, state: ResponseState, eta_min?: number) =>
        call<Alert>(api.post(`/api/v2/alerts/${id}/respond/`, {state, eta_min})),
    resolve: (id: number, pin?: string) => call<Alert>(api.post(`/api/v2/alerts/${id}/resolve/`, {pin})),
    pinStatus: () => call<{ is_set: boolean }>(api.get('/api/v2/alerts/safety-pin/')),
    savePushToken: (token: string) => call(api.post('/api/v2/alerts/push-token/', {token})),
};

export const chatApi = {
    conversations: () => call<Conversation[]>(api.get('/api/v2/chat/conversations/')),
    messages: (id: number, params?: { before?: number; after?: number }) =>
        call<ChatMessage[]>(api.get(`/api/v2/chat/conversations/${id}/messages/`, params)),
    ticket: () => call<{ ticket: string }>(api.post('/api/v2/chat/ticket/')),
};
