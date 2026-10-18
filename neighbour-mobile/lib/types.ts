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
    district: string;
    directions: string;
    lat: number;
    lng: number;
    status: 'pending' | 'verified';
    verified_at: string | null;
    vouches: number;
    vouches_needed: number;
    neighbourhood: { id: number; name: string; slug: string; radius_m: number };
};

/** The body of POST /api/v2/places/me/. The pin is sent once, here, and cannot move later. */
export type NewResidence = {
    house_number: string;
    street: string;
    lat: number;
    lng: number;
    district?: string;
    directions?: string;
};

export type Area = { lat: number; lng: number; homes: number };

export type IssueCategory = 'security' | 'lighting' | 'roads' | 'water' | 'waste' | 'other';
export type IssueSeverity = 'low' | 'moderate' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';
export type IssueVisibility = 'neighbourhood' | 'public';

export type Issue = {
    id: number;
    title: string;
    description: string;
    category: IssueCategory;
    severity: IssueSeverity;
    status: IssueStatus;
    visibility: IssueVisibility;
    lat: number | null;
    lng: number | null;
    created_at: string;
    updated_at: string;
    created_by: number;
    /** null for an unverified viewer: they have not been vouched for, so they get no names. */
    reporter_name: string | null;
    neighbourhood: number;
    neighbourhood_name: string;
    support_count: number;
    comment_count: number;
    i_support: boolean;
    i_follow: boolean;
    media: { id: number; image: string }[];
};

export type IssueComment = {
    id: number;
    body: string;
    author_id: number;
    author_name: string;
    created_at: string;
};

export type Me = {
    id: number;
    email: string;
    full_name: string;
    phone_number: string | null;
    is_phone_verified: boolean;
};

export type EmergencyContact = {
    id: number;
    name: string;
    relation: string;
    phone: string;
};

export type HouseholdPerson = {
    id: number;
    name: string;
    age_group: 'child' | 'adult' | 'elderly';
    needs_help: boolean;
};

export type ChatMessage = {
    id: number;
    conversation_id: number;
    client_id: string | null;
    kind: 'text' | 'alert' | 'issue' | 'voice' | 'photo' | 'video' | 'file' | 'system';
    body: string;
    sender_id: number | null;
    sender_name: string | null;
    alert_id: number | null;
    issue_id: number | null;
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
