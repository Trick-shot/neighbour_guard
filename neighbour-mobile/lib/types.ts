export type AlertType = 'emergency' | 'robbery' | 'fire' | 'medical' | 'suspicious' | 'other';
export type AlertStatus = 'pending' | 'sent' | 'cancelled' | 'resolved';
export type ResponseState = 'seen' | 'coming' | 'arrived' | 'cant';

export type AlertHome = {
    id: number;
    house_number?: string;
    street: string;
    status?: string;
    directions?: string;
    lat?: number;
    lng?: number;
};

export type AlertResponse = {
    responder_id: number;
    name: string;
    state: ResponseState;
    eta_min: number | null;
    phone: string | null;
};

export type Alert = {
    id: number;
    client_id: string;
    type: AlertType;
    message: string;
    status: AlertStatus;
    sender_id: number;
    sender_name: string;
    sender_phone: string | null;
    home: AlertHome;
    send_at: string;
    sent_at: string | null;
    seconds_left: number;
    radius_m: number;
    notified_count: number;
    recipients?: number;
    under_duress?: boolean;
    responses: AlertResponse[];
    created_at: string;
};

export type MyResidence = {
    id: number;
    house_number: string;
    street: string;
    lat: number;
    lng: number;
    status: 'pending' | 'verified';
    neighbourhood: { id: number; name: string; slug: string; radius_m: number };
};

export type Area = { lat: number; lng: number; homes: number };

export type ChatMessage = {
    id: number;
    conversation_id: number;
    client_id: string | null;
    kind: 'text' | 'alert' | 'issue' | 'voice' | 'photo' | 'video' | 'file' | 'system';
    body: string;
    sender_id: number | null;
    sender_name: string | null;
    alert_id: number | null;
    created_at: string;
    pending?: boolean;
};

export type Conversation = {
    id: number;
    kind: 'direct' | 'group';
    name: string;
    participants: { id: number; full_name: string }[];
    last_message: { kind: string; body: string; created_at: string } | null;
    unread: number;
    updated_at: string;
};
