import * as Location from 'expo-location';
import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import authStorage from '@/auth/storage';
import AlertCardBubble from '@/components/chat2/AlertCardBubble';
import ChatBubble from '@/components/chat2/ChatBubble';
import ChatHeader from '@/components/chat2/ChatHeader';
import Composer from '@/components/chat2/Composer';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {clockTime} from '@/features/time';
import {alertsApi, chatApi, placesApi} from '@/lib/endpoints';
import {useChatSocket} from '@/lib/socket';
import {Alert, ChatMessage, Conversation} from '@/lib/types';
import {newClientId} from '@/lib/uuid';
import {useColors} from '@/theme';

/** Figma "Messages — group chat" (1620:794): live chat with alert cards. */
export default function Chat() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id, draft: initialDraft, alert: incidentParam, voice} = useLocalSearchParams<{ id: string; draft?: string; alert?: string; voice?: string }>();
    const conversationId = Number(id);
    const [convo, setConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [alerts, setAlerts] = useState<Record<number, Alert>>({});
    const [myId, setMyId] = useState<number | null>(null);
    const [draft, setDraft] = useState(initialDraft ?? '');
    const [peerHome, setPeerHome] = useState<string | null>(null);
    const [arrivedAt, setArrivedAt] = useState<string | null>(incidentParam ? new Date().toISOString() : null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    messagesRef.current = messages;

    const loadAlert = useCallback((alertId: number) => {
        alertsApi.get(alertId).then((a) => setAlerts((m) => ({...m, [a.id]: a}))).catch(() => undefined);
    }, []);

    const add = useCallback((m: ChatMessage) => {
        setMessages((list) => {
            const i = list.findIndex((x) => x.id === m.id || (m.client_id && x.client_id === m.client_id));
            if (i >= 0) {
                const next = [...list];
                next[i] = m;
                return next;
            }
            return [...list, m];
        });
        if (m.alert_id) loadAlert(m.alert_id);
    }, [loadAlert]);

    useEffect(() => {
        authStorage.getUser().then((u) => setMyId(u?.user_id ?? null));
        chatApi.conversations().then((all) => setConvo(all.find((x) => x.id === conversationId) ?? null)).catch(() => undefined);
        chatApi.messages(conversationId).then((list) => {
            setMessages(list);
            new Set(list.map((m) => m.alert_id).filter(Boolean) as number[]).forEach(loadAlert);
        }).catch(() => undefined);
    }, [conversationId, loadAlert]);

    const {send} = useChatSocket(conversationId, {
        onMessage: add,
        onAlertUpdate: (u) => loadAlert(u.alert_id),
        lastMessageId: () => messagesRef.current.filter((m) => !m.pending).at(-1)?.id,
    });

    /**
     * Upload first, then send the message over the socket with the attachment's id. The optimistic
     * bubble waits for the upload: showing a photo as sent before it has left the phone would be a
     * lie, and in this app a lie about delivery is the worst kind.
     */
    const sendMedia = async (
        file: {uri: string; name: string; mime: string},
        kind: 'photo' | 'video' | 'voice' | 'file',
        durationSeconds?: number,
    ) => {
        setUploading(true);
        try {
            const attachment = await chatApi.upload(file, kind, durationSeconds);
            const client_id = newClientId();
            if (!send({type: 'message', kind, attachment_id: attachment.id, client_id})) {
                // No socket: the message list reloads from HTTP when the socket comes back.
                setUploadError('No connection. It will send when you are back online.');
            }
        } catch (e: any) {
            setUploadError(e.message);
        } finally {
            setUploading(false);
        }
    };

    const onSend = () => {
        const body = draft.trim();
        if (!body) return;
        const client_id = newClientId();
        const optimistic: ChatMessage = {
            id: -Date.now(), conversation_id: conversationId, client_id, kind: 'text', body, sender_id: myId,
            sender_name: 'You', alert_id: null, issue_id: null, attachment: null,
            created_at: new Date().toISOString(), pending: true,
        };
        setMessages((l) => [...l, optimistic]);
        setDraft('');
        if (!send({type: 'message', client_id, body})) {
            // Not connected: the socket hook reconnects; the user can resend. Keep it marked as pending.
        }
    };

    const data = useMemo(() => [...messages].reverse(), [messages]);

    // Direct chats show the other person's house in the header (Figma "Messages — direct chat").
    const peer = convo?.kind === 'direct' ? convo.participants.find((p) => p.id !== myId) : undefined;
    useEffect(() => {
        if (!peer) return;
        placesApi.neighbour(peer.id).then((n) => setPeerHome(n.home.house_number ? `House ${n.home.house_number}` : n.home.street))
            .catch(() => undefined);
    }, [peer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // A live alert in this group turns the chat into the incident chat: banner + quick replies.
    const incident = Object.values(alerts).find((a) => a.status === 'sent') ?? null;
    const iArrived = incident?.responses.some((r) => r.responder_id === myId && r.state === 'arrived');
    const quick = (text: string) => {
        const client_id = newClientId();
        setMessages((l) => [...l, {id: -Date.now(), conversation_id: conversationId, client_id, kind: 'text', body: text, sender_id: myId,
            sender_name: 'You', alert_id: null, issue_id: null, attachment: null, created_at: new Date().toISOString(), pending: true}]);
        send({type: 'message', client_id, body: text});
    };
    const arrived = async () => {
        if (!incident) return;
        await alertsApi.respond(incident.id, 'arrived').catch(() => undefined);
        setArrivedAt(new Date().toISOString());
        quick('I’ve arrived.');
    };
    const title = convo?.name || convo?.participants.filter((p) => p.id !== myId).map((p) => p.full_name).join(', ') || 'Chat';
    const status = incident
        ? `Live · ${incident.responses.filter((r) => r.state === 'coming' || r.state === 'arrived').length} neighbours responding`
        : convo?.kind === 'group' ? `${convo.participants.length} members` : peerHome ?? undefined;
    const headerTitle = incident && convo?.kind === 'group'
        ? `${incident.type[0].toUpperCase()}${incident.type.slice(1)}${incident.home?.house_number ? ` · House ${incident.home.house_number}` : ''}` : title;
    const openInfo = () => (convo?.kind === 'group' ? router.push(`/group/${conversationId}`) : peer && router.push(`/neighbours/${peer.id}`));

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <ChatHeader title={headerTitle} status={status} statusTone={incident ? 'danger' : undefined}
                        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/message'))}
                        onTitle={openInfo} onMore={openInfo}/>
            {incident && (iArrived || arrivedAt) && (
                <View style={[styles.banner, {backgroundColor: c.bg.dangerSubtle}]}>
                    <Icon name="siren" size={16} color={c.icon.danger}/>
                    <Text variant="footnote" color={c.text.danger} style={styles.flex}>
                        You arrived{arrivedAt ? ` at ${clockTime(arrivedAt)}` : ''} · this chat closes 24 h after it’s resolved
                    </Text>
                </View>
            )}
            <FlatList
                inverted
                data={data}
                keyExtractor={(m) => String(m.client_id ?? m.id)}
                contentContainerStyle={styles.thread}
                ListFooterComponent={
                    <View style={[styles.today, {backgroundColor: c.bg.subtle}]}>
                        <Text variant="caption2" color={c.text.muted}>Today</Text>
                    </View>
                }
                renderItem={({item, index}) => {
                    const mine = item.sender_id === myId;
                    const time = clockTime(item.created_at);
                    if (item.kind === 'alert') {
                        const a = item.alert_id ? alerts[item.alert_id] ?? null : null;
                        return (
                            <AlertCardBubble
                                alert={a} sender={item.sender_name} time={time} body={item.body} mine={mine}
                                canRespond={!mine && !a?.responses.some((r) => r.responder_id === myId && r.state !== 'seen')}
                                onOpen={() => a && router.push(mine ? {pathname: '/sos/live', params: {id: String(a.id)}} : `/alert/${a.id}`)}
                                onComing={async () => {
                                    if (!a) return;
                                    await alertsApi.respond(a.id, 'coming').catch(() => undefined);
                                    router.push({pathname: '/alert/on-the-way', params: {id: String(a.id)}});
                                }}
                            />
                        );
                    }
                    const prev = data[index + 1];
                    const showAvatar = !prev || prev.sender_id !== item.sender_id || prev.kind === 'alert';
                    return <ChatBubble direction={mine ? 'out' : 'in'} body={item.body} sender={item.sender_name}
                                       time={time} showAvatar={showAvatar} pending={item.pending}
                                       kind={item.kind} attachment={item.attachment}/>;
                }}
            />
            {incident && convo?.kind === 'group' && (
                <View style={styles.quick}>
                    {[{t: 'I’ve arrived', f: arrived}, {t: 'Police called', f: () => quick('Police called.')},
                        {t: 'Need first aid', f: () => quick('We need first aid here.')}].map((q) => (
                        <Pressable key={q.t} onPress={q.f} style={[styles.quickChip, {borderColor: c.border.default, backgroundColor: c.bg.surface}]}>
                            <Text variant="label">{q.t}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
            <Composer value={draft} onChange={setDraft} onSend={onSend} bottomInset={insets.bottom}
                      onPickMedia={sendMedia} busy={uploading} startRecording={voice === '1'}
                      onShareLocation={async () => {
                          // Shared only because the person tapped "Location": their choice, this once.
                          const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
                          if (!perm?.granted) return;
                          const fix = await Location.getCurrentPositionAsync({}).catch(() => null);
                          if (fix) quick(`📍 My location: https://maps.google.com/?q=${fix.coords.latitude.toFixed(5)},${fix.coords.longitude.toFixed(5)}`);
                      }}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    thread: {paddingHorizontal: 16, paddingTop: 16, gap: 16},
    flex: {flex: 1},
    banner: {flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 4, padding: 10, borderRadius: 12},
    quick: {flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, flexWrap: 'wrap'},
    quickChip: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8},
    today: {alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 0},
});
