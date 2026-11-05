import {useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SearchField from '@/components/ui/SearchField';
import Text from '@/components/ui/Text';
import {chatApi, placesApi, profileApi} from '@/lib/endpoints';
import {Conversation, Neighbour} from '@/lib/types';
import {useColors} from '@/theme';

import {homeLabel} from '../neighbours/index';

/**
 * Figma "Group members" (1633:2381). Groups have no admins on the server yet, so everyone is
 * listed as a member (the frame's "Admin" badges are left out rather than invented).
 */
export default function GroupMembers() {
    const c = useColors();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [group, setGroup] = useState<Conversation | null>(null);
    const [homes, setHomes] = useState<Record<number, Neighbour['home']>>({});
    const [meId, setMeId] = useState<number | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        chatApi.conversations().then((all) => setGroup(all.find((x) => x.id === Number(id)) ?? null)).catch(() => undefined);
        placesApi.neighbours().then((n) => setHomes(Object.fromEntries(n.map((x) => [x.user_id, x.home])))).catch(() => undefined);
        profileApi.me().then((m) => setMeId(m.id)).catch(() => undefined);
    }, [id]);

    const people = (group?.participants ?? []).filter((p) => !query.trim() || p.full_name.toLowerCase().includes(query.trim().toLowerCase()));
    const invite = () => Share.share({message: 'Join our street on NeighbourGuard. New members need 2 vouches to join.'}).catch(() => undefined);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title={`Members (${group?.participants.length ?? 0})`} right={
                <Pressable accessibilityLabel="Invite" hitSlop={10} onPress={invite}><Icon name="plus" size={24}/></Pressable>
            }/>
            <View style={styles.search}><SearchField value={query} onChangeText={setQuery} placeholder="Search members"/></View>
            <ScrollView contentContainerStyle={{paddingBottom: 140}}>
                <Text variant="caption1" color={c.text.muted} style={styles.section}>MEMBERS · {group?.participants.length ?? 0}</Text>
                {people.map((p) => (
                    <View key={p.id} style={[styles.row, {borderBottomColor: c.border.default}]}>
                        <Avatar name={p.full_name} size={40}/>
                        <View style={styles.flex}>
                            <Text variant="headline">{p.full_name}</Text>
                            <Text variant="footnote" color={c.text.secondary}>
                                {homes[p.id] ? homeLabel(homes[p.id]) : ''}{p.id === meId ? (homes[p.id] ? ' · You' : 'You') : ''}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
            <View style={[styles.inviteCard, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                <View style={[styles.inviteIcon, {backgroundColor: c.bg.brandSubtle}]}><Icon name="send" size={18} color={c.icon.brand}/></View>
                <View style={styles.flex}>
                    <Text variant="headline">Invite with a link</Text>
                    <Text variant="footnote" color={c.text.secondary}>New members need 2 vouches to join</Text>
                </View>
                <Pressable onPress={invite} style={[styles.share, {backgroundColor: c.bg.brandSubtle}]}>
                    <Text variant="buttonM" color={c.text.brand}>Share</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    search: {paddingHorizontal: 16, paddingVertical: 12},
    section: {paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth},
    inviteCard: {position: 'absolute', left: 16, right: 16, bottom: 32, flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: 16, borderWidth: 1},
    inviteIcon: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    share: {height: 40, paddingHorizontal: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
});
