import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import authStorage from '@/auth/storage';
import AlertCardBubble from '@/components/chat2/AlertCardBubble';
import ChatBubble from '@/components/chat2/ChatBubble';
import ChatHeader from '@/components/chat2/ChatHeader';
import Composer from '@/components/chat2/Composer';
import Text from '@/components/ui/Text';
import {clockTime} from '@/features/time';
import {alertsApi, chatApi} from '@/lib/endpoints';
import {useChatSocket} from '@/lib/socket';
import {Alert, ChatMessage, Conversation} from '@/lib/types';
import {newClientId} from '@/lib/uuid';
import {useColors} from '@/theme';

/** Figma "Messages — group chat" (1620:794): live chat with alert cards. */
export default function Chat() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const conversationId = Number(id);
    const [convo, setConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [alerts, setAlerts] = useState<Record<number, Alert>>({});
    const [myId, setMyId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
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

    const onSend = () => {
        const body = draft.trim();
        if (!body) return;
        const client_id = newClientId();
        const optimistic: ChatMessage = {
            id: -Date.now(), conversation_id: conversationId, client_id, kind: 'text', body, sender_id: myId,
            sender_name: 'You', alert_id: null, created_at: new Date().toISOString(), pending: true,
        };
        setMessages((l) => [...l, optimistic]);
        setDraft('');
        if (!send({type: 'message', client_id, body})) {
            // Not connected: the socket hook reconnects; the user can resend. Keep it marked as pending.
        }
    };

    const data = useMemo(() => [...messages].reverse(), [messages]);
    const title = convo?.name || convo?.participants.filter((p) => p.id !== myId).map((p) => p.full_name).join(', ') || 'Chat';
    const status = convo?.kind === 'group' ? `${convo.participants.length} members` : undefined;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <ChatHeader title={title} status={status} onBack={() => router.back()} onMore={() => undefined}/>
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
                    return <ChatBubble direction={mine ? 'out' : 'in'} body={item.body} sender={item.sender_name} time={time}
                                       showAvatar={showAvatar} pending={item.pending}/>;
                }}
            />
            <Composer value={draft} onChange={setDraft} onSend={onSend} bottomInset={insets.bottom}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    thread: {paddingHorizontal: 16, paddingTop: 16, gap: 16},
    today: {alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 0},
});
