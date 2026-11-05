import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';

import Segmented from '@/components/ui/Segmented';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import StateView from '@/components/ui/StateView';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {shortTime} from '@/features/time';
import authStorage from '@/auth/storage';
import {chatApi} from '@/lib/endpoints';
import {Conversation} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Messages" (1620:671): large header, All / Groups, chat rows. */
const KIND_LABEL: Record<string, string> = {alert: 'SOS alert', issue: 'Shared an issue', voice: 'Voice note', photo: 'Photo', video: 'Video', file: 'File'};

function preview(x: Conversation, myId: number | null) {
    const m = x.last_message;
    if (!m) return 'No messages yet';
    const text = KIND_LABEL[m.kind] ?? m.body;
    if (m.sender_id === myId) return `You: ${text}`;
    return x.kind === 'group' && m.sender_name ? `${m.sender_name.split(' ')[0]}: ${text}` : text;
}
export default function Messages() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<Conversation[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'all' | 'groups'>('all');
    const [myId, setMyId] = useState<number | null>(null);
    const {compose} = useLocalSearchParams<{ compose?: 'checkin' | 'voice' }>();

    // Home's quick actions: Check-in and Voice both go to the neighbourhood group.
    useEffect(() => {
        if (!compose) return;
        chatApi.conversations().then((all) => {
            const group = all.find((x) => x.kind === 'group');
            if (!group) return;
            router.setParams({compose: undefined});
            router.push({pathname: '/chat/[id]', params: compose === 'checkin'
                ? {id: String(group.id), draft: 'Checking in: I’m home and all is well.'}
                : {id: String(group.id), voice: '1'}});
        }).catch(() => undefined);
    }, [compose]);

    useFocusEffect(useCallback(() => {
        authStorage.getUser().then((u) => setMyId(u?.user_id ?? null));
        chatApi.conversations().then((l) => { setItems(l); setError(null); }).catch((e) => setError(e.message));
    }, []));
    const reload = () => chatApi.conversations().then((l) => { setItems(l); setError(null); }).catch((e) => setError(e.message));

    const titleOf = (x: Conversation) =>
        x.name || x.participants.filter((p) => p.id !== myId).map((p) => p.full_name).join(', ') || 'Chat';
    const shown = tab === 'groups' ? (items ?? []).filter((x) => x.kind === 'group') : (items ?? []);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 8}]}>
            <View style={styles.header}>
                <Text variant="titleLarge" style={{flex: 1}}>Messages</Text>
                <Pressable accessibilityLabel="New message" onPress={() => router.push('/messages/new')} hitSlop={8}>
                    <Icon name="search" size={24}/>
                </Pressable>
            </View>
            <View style={styles.segment}>
                <Segmented options={[{key: 'all', label: 'All'}, {key: 'groups', label: 'Groups'}]} value={tab} onChange={setTab}/>
            </View>
            {items === null && !error ? <StateView kind="loading"/> : items === null ? (
                <StateView kind="error" body="We couldn’t load your messages. Check your connection and try again. Your SOS button still works." actionLabel="Try again" onAction={reload}/>
            ) : shown.length === 0 ? (
                // Figma "Empty — no messages" (1635:3000).
                <StateView kind="empty" title="No messages yet" body="Say hello to your neighbours or join your street’s group."
                           icon="users" actionLabel="Find neighbours" onAction={() => router.push('/neighbours')}/>
            ) : <FlatList
                data={shown}
                keyExtractor={(x) => String(x.id)}
                contentContainerStyle={{paddingTop: 14, paddingBottom: 140}}
                renderItem={({item}) => (
                    <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={({pressed}) => [styles.row, pressed && {backgroundColor: c.bg.subtle}]}>
                        <Avatar name={titleOf(item)}/>
                        <View style={{flex: 1, gap: 2}}>
                            <View style={styles.line}>
                                <Text variant="bodyEmphasis" style={{flex: 1}} numberOfLines={1}>{titleOf(item)}</Text>
                                <Text variant="footnote" color={c.text.muted}>{shortTime(item.last_message?.created_at ?? item.updated_at)}</Text>
                            </View>
                            <View style={styles.line}>
                                <Text variant="subhead" color={c.text.secondary} style={{flex: 1}} numberOfLines={1}>
                                    {preview(item, myId)}
                                </Text>
                                {item.unread > 0 && (
                                    <View style={[styles.unread, {backgroundColor: c.bg.brand}]}>
                                        <Text variant="caption2" color={c.text.onBrand}>{item.unread}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </Pressable>
                )}
            />}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8},
    segment: {marginHorizontal: 16, marginTop: 7},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10},
    line: {flexDirection: 'row', alignItems: 'center', gap: 8},
    unread: {paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999},
});
