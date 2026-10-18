import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {shortTime} from '@/features/time';
import authStorage from '@/auth/storage';
import {chatApi} from '@/lib/endpoints';
import {Conversation} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Messages" (1620:671): large header, All / Groups, chat rows. */
export default function Messages() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<Conversation[]>([]);
    const [tab, setTab] = useState<'all' | 'groups'>('all');
    const [myId, setMyId] = useState<number | null>(null);

    useFocusEffect(useCallback(() => {
        authStorage.getUser().then((u) => setMyId(u?.user_id ?? null));
        chatApi.conversations().then(setItems).catch(() => undefined);
    }, []));

    const titleOf = (x: Conversation) =>
        x.name || x.participants.filter((p) => p.id !== myId).map((p) => p.full_name).join(', ') || 'Chat';
    const shown = tab === 'groups' ? items.filter((x) => x.kind === 'group') : items;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 8}]}>
            <View style={styles.header}>
                <Text variant="titleLarge" style={{flex: 1}}>Messages</Text>
                <Icon name="search" size={24}/>
            </View>
            <View style={[styles.segment, {backgroundColor: c.bg.subtle}]}>
                {(['all', 'groups'] as const).map((k) => (
                    <Pressable key={k} onPress={() => setTab(k)} style={[styles.seg, tab === k && {backgroundColor: c.bg.surface}]}>
                        <Text variant="label" color={tab === k ? c.text.primary : c.text.secondary}>{k === 'all' ? 'All' : 'Groups'}</Text>
                    </Pressable>
                ))}
            </View>
            <FlatList
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
                                    {item.last_message ? (item.last_message.kind === 'alert' ? 'SOS alert' : item.last_message.body) : 'No messages yet'}
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
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8},
    segment: {flexDirection: 'row', height: 36, padding: 2, borderRadius: 10, marginHorizontal: 16, marginTop: 7},
    seg: {flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10},
    line: {flexDirection: 'row', alignItems: 'center', gap: 8},
    unread: {paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999},
});
