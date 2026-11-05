import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';

import {homeLabel} from '@/app/neighbours/index';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SearchField from '@/components/ui/SearchField';
import Text from '@/components/ui/Text';
import {chatApi, placesApi} from '@/lib/endpoints';
import {Conversation, Neighbour} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Messages — new message" (1633:2536): pick a group or a neighbour. No distances shown. */
export default function NewMessage() {
    const c = useColors();
    const [query, setQuery] = useState('');
    const [groups, setGroups] = useState<Conversation[]>([]);
    const [people, setPeople] = useState<Neighbour[]>([]);

    useEffect(() => {
        chatApi.conversations().then((all) => setGroups(all.filter((x) => x.kind === 'group'))).catch(() => undefined);
        placesApi.neighbours().then(setPeople).catch(() => undefined);
    }, []);

    const q = query.trim().toLowerCase();
    const open = async (userId: number) => {
        const convo = await chatApi.direct(userId).catch(() => null);
        if (convo) router.replace(`/chat/${convo.id}`);
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="New message" right={
                <Pressable accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()}><Icon name="x" size={24}/></Pressable>
            }/>
            <View style={styles.search}><SearchField value={query} onChangeText={setQuery} placeholder="To: neighbour or group"/></View>
            <ScrollView>
                {groups.filter((g) => !q || g.name.toLowerCase().includes(q)).length > 0 && (
                    <Text variant="caption1" color={c.text.muted} style={styles.section}>GROUPS</Text>
                )}
                {groups.filter((g) => !q || g.name.toLowerCase().includes(q)).map((g) => (
                    <Pressable key={g.id} onPress={() => router.replace(`/chat/${g.id}`)} style={[styles.row, {borderBottomColor: c.border.default}]}>
                        <View style={[styles.groupIcon, {backgroundColor: c.bg.brandSubtle}]}><Icon name="users" size={20} color={c.icon.brand}/></View>
                        <View style={styles.flex}>
                            <Text variant="headline">{g.name}</Text>
                            <Text variant="footnote" color={c.text.secondary}>{g.participants.length} members</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={c.icon.muted}/>
                    </Pressable>
                ))}
                <Text variant="caption1" color={c.text.muted} style={styles.section}>NEIGHBOURS</Text>
                {people.filter((p) => !q || p.full_name.toLowerCase().includes(q) || (p.home.house_number ?? '').includes(q)).map((p) => (
                    <Pressable key={p.user_id} onPress={() => open(p.user_id)} style={[styles.row, {borderBottomColor: c.border.default}]}>
                        <Avatar name={p.full_name} uri={p.photo_url} size={40}/>
                        <View style={styles.flex}>
                            <Text variant="headline">{p.full_name}</Text>
                            <Text variant="footnote" color={c.text.secondary}>{homeLabel(p.home)}</Text>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    search: {paddingHorizontal: 16, paddingVertical: 12},
    section: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth},
    groupIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
});
