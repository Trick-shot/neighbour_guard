import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';

import AlertTypeChip from '@/components/ui/AlertTypeChip';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import IssueCard from '@/components/ui/IssueCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import {chatApi, FeedItem, issuesApi, notificationsApi, placesApi} from '@/lib/endpoints';
import {Conversation, Issue, MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Group page" (1633:2248): the neighbourhood group, its people and what happened lately. */
export default function GroupPage() {
    const c = useColors();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [group, setGroup] = useState<Conversation | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [alerts, setAlerts] = useState<FeedItem[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);

    useEffect(() => {
        chatApi.conversations().then((all) => setGroup(all.find((x) => x.id === Number(id)) ?? null)).catch(() => undefined);
        placesApi.me().then(setHome).catch(() => undefined);
        notificationsApi.list(true).then((f) => setAlerts(f.items.slice(0, 3))).catch(() => undefined);
        issuesApi.list('mine').then((i) => setIssues(i.slice(0, 3))).catch(() => undefined);
    }, [id]);

    const people = group?.participants ?? [];
    const names = people.slice(0, 2).map((p) => p.full_name.split(' ')[0]).join(', ');
    const invite = () => Share.share({message: `Join ${group?.name ?? 'our street'} on NeighbourGuard so we can reach each other in an emergency.`}).catch(() => undefined);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Group"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                    <View style={[styles.icon, {backgroundColor: c.bg.brandSubtle}]}><Icon name="users" size={24} color={c.icon.brand}/></View>
                    <Text variant="title2">{group?.name ?? 'Neighbours'}</Text>
                    <Text variant="subhead" color={c.text.secondary}>
                        {people.length} members{home ? ` · ${[...new Set([home.neighbourhood.name, home.district].filter(Boolean))].join(', ')}` : ''}
                    </Text>
                    <Text variant="body">Our street’s group for alerts, issues and news. Be kind and keep it local.</Text>
                    <Pressable onPress={() => router.push({pathname: '/group/members', params: {id}})} style={styles.faces}>
                        <View style={styles.row}>
                            {people.slice(0, 4).map((p, i) => (
                                <View key={p.id} style={[styles.face, {borderColor: c.bg.surface, marginLeft: i ? -8 : 0}]}><Avatar name={p.full_name} size={28}/></View>
                            ))}
                        </View>
                        <Text variant="footnote" color={c.text.secondary}>
                            {names}{people.length > 2 ? ` and ${people.length - 2} others` : ''}
                        </Text>
                    </Pressable>
                    <View style={styles.row}>
                        <Button title="Open chat" icon="message-circle" size="M" style={styles.flex} onPress={() => router.push(`/chat/${id}`)}/>
                        <Pressable onPress={invite} style={[styles.invite, {backgroundColor: c.bg.brandSubtle}]}>
                            <Icon name="plus" size={18} color={c.icon.brand}/>
                            <Text variant="buttonM" color={c.text.brand}>Invite</Text>
                        </Pressable>
                    </View>
                </View>
                {(alerts.length > 0 || issues.length > 0) && <Text variant="caption1" color={c.text.muted}>RECENT ACTIVITY</Text>}
                {alerts.map((a) => (
                    <Pressable key={a.id} onPress={() => a.live && a.alert_id ? router.push(`/alert/${a.alert_id}`) : undefined}
                               style={[styles.card, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                        <View style={[styles.row, styles.between]}>
                            <AlertTypeChip type="emergency"/>
                            <Text variant="caption2" color={a.live ? c.text.danger : c.text.muted}>{a.live ? '● LIVE' : 'RESOLVED'}</Text>
                        </View>
                        <Text variant="headline">{a.title}</Text>
                        <Text variant="footnote" color={c.text.secondary}>{a.body}</Text>
                    </Pressable>
                ))}
                {issues.map((i) => <IssueCard key={i.id} issue={i} onPress={() => router.push(`/issues/${i.id}`)}/>)}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    content: {padding: 16, gap: 12, paddingBottom: 40},
    card: {borderWidth: 1, borderRadius: 20, padding: 16, gap: 10},
    icon: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
    faces: {flexDirection: 'row', alignItems: 'center', gap: 8},
    face: {borderWidth: 2, borderRadius: 16},
    row: {flexDirection: 'row', alignItems: 'center', gap: 8},
    between: {justifyContent: 'space-between'},
    invite: {flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6},
});
