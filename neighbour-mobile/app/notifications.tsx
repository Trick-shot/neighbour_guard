import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';

import Button from '@/components/ui/Button';
import Icon, {IconName} from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Segmented from '@/components/ui/Segmented';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {FeedItem, notificationsApi, placesApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/**
 * Figma "Notifications" (1631:1675). The feed is built by the server from what happened
 * (places/feed.py). The tick marks everything read; "I know her" is a real vouch.
 */
const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)}m`;
    if (m < 60 * 24) return `${Math.round(m / 60)}h`;
    return new Date(iso).toLocaleDateString('en-GB', {weekday: 'short'});
};
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export default function Notifications() {
    const c = useColors();
    const [tab, setTab] = useState<'all' | 'alerts'>('all');
    const [items, setItems] = useState<FeedItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [vouched, setVouched] = useState<Set<number>>(new Set());

    const load = useCallback(async () => {
        try {
            setItems((await notificationsApi.list(tab === 'alerts')).items);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, [tab]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const markRead = async () => {
        await notificationsApi.seen().catch(() => undefined);
        setItems((list) => list?.map((i) => ({...i, unread: false})) ?? null);
    };

    const vouch = async (residenceId: number) => {
        try {
            await placesApi.vouch(residenceId);
            setVouched((s) => new Set(s).add(residenceId));
        } catch (e: any) {
            setError(e.message);
        }
    };

    const tone: Record<FeedItem['kind'], { icon: IconName; bg: string; fg: string }> = {
        alert: {icon: 'siren', bg: c.bg.dangerSubtle, fg: c.icon.danger},
        vouch: {icon: 'users', bg: c.bg.brandSubtle, fg: c.icon.brand},
        issue: {icon: 'clipboard-list', bg: c.feedback.warningBg, fg: c.feedback.warning},
        provider: {icon: 'shield-check', bg: c.feedback.successBg, fg: c.feedback.success},
        welcome: {icon: 'home', bg: c.bg.subtle, fg: c.icon.brand},
    };

    const open = (i: FeedItem) => {
        if (i.kind === 'alert' && i.alert_id && i.live) router.push(`/alert/${i.alert_id}`);
        else if (i.kind === 'issue' && i.issue_id) router.push(`/issues/${i.issue_id}`);
        else if (i.kind === 'provider') router.push('/providers');
        else if (i.kind === 'welcome') router.push('/neighbours');
    };

    const shown = (items ?? []).filter((i) => !dismissed.has(i.id));
    const sections = [
        {title: 'TODAY', rows: shown.filter((i) => isToday(i.at))},
        {title: 'EARLIER', rows: shown.filter((i) => !isToday(i.at))},
    ].filter((s) => s.rows.length);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Notifications" right={
                <Pressable accessibilityLabel="Mark all as read" hitSlop={10} onPress={markRead}>
                    <Icon name="check" size={24}/>
                </Pressable>
            }/>
            <View style={styles.segment}>
                <Segmented options={[{key: 'all', label: 'All'}, {key: 'alerts', label: 'Alerts only'}]} value={tab} onChange={setTab}/>
            </View>
            {items === null && !error ? <StateView kind="loading"/> : error && !items ? (
                <StateView kind="error" body={error} actionLabel="Try again" onAction={load}/>
            ) : shown.length === 0 ? (
                <StateView kind="empty" title="Nothing yet" body="Alerts, vouch requests and replies from your neighbourhood show up here."/>
            ) : (
                <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load}/>}
                            contentContainerStyle={{paddingBottom: 32}}>
                    {sections.map((s) => (
                        <View key={s.title}>
                            <Text variant="caption1" color={c.text.muted} style={styles.section}>{s.title}</Text>
                            {s.rows.map((i) => {
                                const t = tone[i.kind];
                                const done = i.residence_id != null && vouched.has(i.residence_id);
                                return (
                                    <Pressable key={i.id} onPress={() => open(i)}
                                               style={[styles.row, {backgroundColor: i.unread ? c.bg.brandSubtle : c.bg.surface,
                                                   borderTopColor: c.border.default}]}>
                                        <View style={[styles.iconBox, {backgroundColor: i.unread && i.kind === 'vouch' ? c.bg.surface : t.bg}]}>
                                            <Icon name={t.icon} size={20} color={t.fg}/>
                                        </View>
                                        <View style={styles.text}>
                                            <Text variant="headline">{i.title}</Text>
                                            <Text variant="subhead" color={c.text.secondary}>{done ? 'You vouched. Thank you.' : i.body}</Text>
                                            {i.kind === 'vouch' && !done && (
                                                <View style={styles.actions}>
                                                    <Button title="I know them" size="M" onPress={() => vouch(i.residence_id!)} style={styles.flex}/>
                                                    <Button title="Not sure" size="M" variant="outline" style={styles.flex}
                                                            onPress={() => setDismissed((d) => new Set(d).add(i.id))}/>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.meta}>
                                            <Text variant="caption1" color={c.text.muted}>{ago(i.at)}</Text>
                                            {i.unread && <View style={[styles.dot, {backgroundColor: c.bg.brand}]}/>}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    segment: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14},
    section: {paddingTop: 16, paddingBottom: 8, paddingHorizontal: 16},
    row: {flexDirection: 'row', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1},
    iconBox: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    text: {flex: 1, gap: 3},
    actions: {flexDirection: 'row', gap: 8, marginTop: 8},
    meta: {alignItems: 'flex-end', gap: 6, minWidth: 15},
    dot: {width: 8, height: 8, borderRadius: 4},
});
