/** Typed calls to /api/v2 (see docs/API-v2.md). */
import {api, call} from './api';
import {
    Alert, AlertType, Area, Attachment, AttachmentKind, ChatMessage, Conversation, EmergencyContact,
    HouseholdPerson, Issue, IssueComment, IssueStatus, Me, MyResidence, NewResidence, ResponseState,
} from './types';

type Tokens = { access: string; refresh: string };

export const authApi = {
    requestEmailCode: (email: string) => call(api.post('/api/auth/email-code/', {email})),
    verifyEmailCode: (email: string, code: string) =>
        call<Tokens>(api.post('/api/auth/email-code/verify/', {email, code})),
    // Sign-up. Djoser emails an activation link; the account cannot sign in until it is clicked.
    signUp: (full_name: string, email: string, password: string) =>
        call(api.post('/api/auth/users/', {full_name, email, password, re_password: password})),
    resendActivation: (email: string) => call(api.post('/api/auth/users/resend_activation/', {email})),
    // Used to find out whether the activation link has been clicked yet: it only succeeds after.
    signIn: (email: string, password: string) =>
        call<Tokens>(api.post('/api/auth/jwt/create/', {email, password})),
    // Both need the JWT: the server takes the number from the OTP record, never from the body.
    requestPhoneCode: (phone_number: string) => call(api.post('/api/auth/send-otp/', {phone_number})),
    verifyPhoneCode: (otp: string) => call(api.post('/api/auth/verify-otp/', {otp})),
};

export const placesApi = {
    me: () => call<MyResidence>(api.get('/api/v2/places/me/')),
    // The server reads who you are from the token; the body carries the home only.
    create: (home: NewResidence) => call<MyResidence>(api.post('/api/v2/places/me/', home)),
    // Only the text fields. Moving the pin would change who gets your alerts, so the server refuses it.
    update: (fields: { house_number?: string; street?: string; directions?: string }) =>
        call<MyResidence>(api.patch('/api/v2/places/me/', fields)),
    areas: () => call<{ neighbourhood: string; areas: Area[] }>(api.get('/api/v2/places/areas/')),
    // The people in my home. Responders to my own live alert see this list; nobody else does.
    household: () => call<HouseholdPerson[]>(api.get('/api/v2/places/household/')),
    addToHousehold: (person: Omit<HouseholdPerson, 'id'>) =>
        call<HouseholdPerson>(api.post('/api/v2/places/household/', person)),
    updateHousehold: (id: number, fields: Partial<Omit<HouseholdPerson, 'id'>>) =>
        call<HouseholdPerson>(api.patch(`/api/v2/places/household/${id}/`, fields)),
    removeFromHousehold: (id: number) => call(api.delete(`/api/v2/places/household/${id}/`)),
    neighbours: () => call<{ user_id: number; full_name: string }[]>(api.get('/api/v2/places/neighbours/')),
};

export const profileApi = {
    me: () => call<Me>(api.get('/api/auth/users/me/')),
    // Only the name is writable: the phone reaches the profile through verify-otp and nowhere else.
    rename: (full_name: string) => call<Me>(api.patch('/api/auth/users/me/', {full_name})),
};

export const contactsApi = {
    list: () => call<EmergencyContact[]>(api.get('/api/v2/contacts/')),
    add: (contact: Omit<EmergencyContact, 'id'>) =>
        call<EmergencyContact>(api.post('/api/v2/contacts/', contact)),
    remove: (id: number) => call(api.delete(`/api/v2/contacts/${id}/`)),
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
    setPins: (pin: string, duress_pin: string) =>
        call<{ is_set: boolean }>(api.put('/api/v2/alerts/safety-pin/', {pin, duress_pin})),
    savePushToken: (token: string) => call(api.post('/api/v2/alerts/push-token/', {token})),
};

export const issuesApi = {
    list: (scope: 'mine' | 'others' = 'mine') => call<Issue[]>(api.get('/api/v2/issues/', {scope})),
    get: (id: number) => call<Issue>(api.get(`/api/v2/issues/${id}/`)),
    report: (issue: {
        title: string; description?: string; category?: string; severity?: string;
        visibility?: string; lat?: number; lng?: number;
    }) => call<Issue>(api.post('/api/v2/issues/', issue)),
    setStatus: (id: number, status: IssueStatus) => call<Issue>(api.patch(`/api/v2/issues/${id}/`, {status})),
    support: (id: number, on: boolean) =>
        call<{ support_count: number; i_support: boolean }>(
            on ? api.post(`/api/v2/issues/${id}/support/`) : api.delete(`/api/v2/issues/${id}/support/`)),
    follow: (id: number, on: boolean) =>
        call<{ i_follow: boolean }>(
            on ? api.post(`/api/v2/issues/${id}/follow/`) : api.delete(`/api/v2/issues/${id}/follow/`)),
    comments: (id: number) => call<IssueComment[]>(api.get(`/api/v2/issues/${id}/comments/`)),
    comment: (id: number, body: string) =>
        call<IssueComment>(api.post(`/api/v2/issues/${id}/comments/`, {body})),
    share: (id: number) =>
        call<{ conversation_id: number; message_id: number }>(api.post(`/api/v2/issues/${id}/share/`)),
};

export const chatApi = {
    conversations: () => call<Conversation[]>(api.get('/api/v2/chat/conversations/')),
    messages: (id: number, params?: { before?: number; after?: number }) =>
        call<ChatMessage[]>(api.get(`/api/v2/chat/conversations/${id}/messages/`, params)),
    ticket: () => call<{ ticket: string }>(api.post('/api/v2/chat/ticket/')),
    /**
     * Upload first, send second: a socket frame is the wrong place for 50 MB of video, and an
     * upload that fails half way should not lose the message. The server sniffs the real file type,
     * so a wrong `mime` here changes nothing.
     */
    upload: (file: { uri: string; name: string; mime: string }, kind: AttachmentKind, durationSeconds?: number) => {
        const form = new FormData();
        // React Native's FormData takes this shape for a file; it is not a browser File.
        form.append('file', {uri: file.uri, name: file.name, type: file.mime} as unknown as Blob);
        form.append('kind', kind);
        if (durationSeconds) form.append('duration_s', String(Math.round(durationSeconds)));
        return call<Attachment>(api.post('/api/v2/chat/attachments/', form, {
            headers: {'Content-Type': 'multipart/form-data'},
        }));
    },
};
