import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';

import AlertTypeChip, {ALERT_META} from '@/components/ui/AlertTypeChip';
import Icon, {IconName} from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Segmented from '@/components/ui/Segmented';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {AlertHistory, HistoryAlert} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "My alert history" (1634:2762): what I sent, what I answered, and how fast help came. */
const when = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate()} ${d.toLocaleString('en-GB', {month: 'short'})} · ${d.toTimeString().slice(0, 5)}`;
};
const mmss = (s: number | null) => (s == null ? '–' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);

export default function AlertHistoryScreen() {
    const c = useColors();
    const [data, setData] = useState<AlertHistory | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'sent' | 'helped'>('sent');

    const load = () => alertsApi.history().then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message));
    useEffect(() => { load(); }, []);

    if (!data) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
                <ScreenHeader title="My alert history"/>
                {error ? <StateView kind="error" body={error} actionLabel="Try again" onAction={load}/> : <StateView kind="loading"/>}
            </View>
        );
    }
    const list = tab === 'sent' ? data.sent : data.helped;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="My alert history"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.stats, {borderColor: c.border.default}]}>
                    <Stat value={String(data.sent_count)} label="alerts sent"/>
                    <Stat value={mmss(data.avg_first_response_s)} label="avg first response"/>
                    <Stat value={String(data.helped_count)} label="times you helped"/>
                </View>
                <Segmented options={[{key: 'sent', label: `Sent (${data.sent_count})`}, {key: 'helped', label: `Helped (${data.helped_count})`}]} value={tab} onChange={setTab}/>
                {list.length === 0 && (
                    <Text variant="subhead" color={c.text.muted} style={styles.empty}>
                        {tab === 'sent' ? 'You have not sent an alert. We hope it stays that way.' : 'When you answer a neighbour’s alert, it shows here.'}
                    </Text>
                )}
                {list.map((a) => <Card key={`${tab}-${a.id}`} a={a} mine={tab === 'sent'}/>)}
            </ScrollView>
        </View>
    );
}

function Stat({value, label}: { value: string; label: string }) {
    const c = useColors();
    return (
        <View style={styles.stat}>
            <Text variant="title2" color={c.text.brand}>{value}</Text>
            <Text variant="footnote" color={c.text.secondary}>{label}</Text>
        </View>
    );
}

function Card({a, mine}: { a: HistoryAlert; mine: boolean }) {
    const c = useColors();
    const title = a.message || (mine ? `${ALERT_META[a.type].label} at House ${a.house_number}` : `${a.sender_name ?? 'A neighbour'} · House ${a.house_number}`);
    const Meta = ({icon, text}: { icon: IconName; text: string }) => (
        <View style={styles.meta}><Icon name={icon} size={16} color={c.icon.muted}/><Text variant="footnote" color={c.text.secondary}>{text}</Text></View>
    );
    return (
        <Pressable onPress={() => router.push({pathname: '/alert/resolved', params: {id: String(a.id)}})}
                   style={[styles.card, {borderColor: c.border.default}]}>
            <View style={styles.top}>
                <AlertTypeChip type={a.type}/>
                <Text variant="caption2" color={a.status === 'sent' ? c.text.danger : c.text.muted}>{a.status === 'sent' ? '● LIVE' : 'RESOLVED'}</Text>
            </View>
            <Text variant="headline">{title}</Text>
            <View style={styles.metaRow}>
                <Meta icon="map-pin" text={mine ? 'Your home' : a.street}/>
                <Meta icon="clock" text={when(a.sent_at)}/>
                <Meta icon="users" text={`${a.responded} responded`}/>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {padding: 16, gap: 12},
    stats: {flexDirection: 'row', borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, gap: 12},
    stat: {flex: 1, gap: 2},
    empty: {paddingVertical: 12},
    card: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 10},
    top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    metaRow: {flexDirection: 'row', gap: 12, flexWrap: 'wrap'},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 4},
});
