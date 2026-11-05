import {Image} from 'expo-image';
import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import ResponderRow from '@/components/ui/ResponderRow';
import Text from '@/components/ui/Text';
import {alertsApi, chatApi} from '@/lib/endpoints';
import {Alert} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Alert — resolved" (1618:528). The same summary for the sender and the neighbours once an
 * alert is over. Every number comes from the server's timestamps.
 */
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

export default function AlertResolved() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [alert, setAlert] = useState<Alert | null>(null);

    useEffect(() => { alertsApi.get(Number(id)).then(setAlert).catch(() => undefined); }, [id]);

    const sent = alert?.sent_at ? new Date(alert.sent_at).getTime() : null;
    const ended = alert?.resolved_at ? new Date(alert.resolved_at) : null;
    const helped = (alert?.responses ?? []).filter((r) => r.state === 'coming' || r.state === 'arrived');
    const arrivals = helped.filter((r) => r.state === 'arrived' && r.updated_at).map((r) => new Date(r.updated_at!).getTime());
    const first = sent && arrivals.length ? mmss(Math.min(...arrivals) - sent) : '—';
    const total = sent && ended ? `${Math.max(1, Math.round((ended.getTime() - sent) / 60000))} min` : '—';
    const who = alert?.sender_name?.split(' ')[0] ?? 'The sender';
    const at = ended?.toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});

    const thank = async () => {
        const group = (await chatApi.conversations().catch(() => [])).find((x) => x.kind === 'group');
        if (group) router.replace({pathname: '/chat/[id]', params: {id: String(group.id), draft: 'Thank you all for coming. Everyone is safe.'}});
        else router.replace('/(tabs)/message');
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Image source={require('@/assets/illustrations/secure.png')} style={styles.art} contentFit="contain"/>
                <View style={styles.heading}>
                    <Text variant="title1" style={styles.centre}>Everyone is safe</Text>
                    <Text variant="subhead" color={c.text.secondary} style={styles.centre}>
                        {who} marked the alert as resolved{at ? ` at ${at}` : ''}.
                    </Text>
                </View>
                <View style={styles.stats}>
                    {[{v: first, l: 'First neighbour arrived'}, {v: String(helped.length), l: 'Neighbours helped'}, {v: total, l: 'Total alert time'}]
                        .map((s) => (
                            <View key={s.l} style={[styles.stat, {backgroundColor: c.bg.subtle}]}>
                                <Text variant="title2" color={c.text.brand}>{s.v}</Text>
                                <Text variant="caption1" color={c.text.secondary}>{s.l}</Text>
                            </View>
                        ))}
                </View>
                {helped.length > 0 && <Text variant="headline">Responders</Text>}
                {helped.map((r) => <ResponderRow key={r.responder_id} response={r}/>)}
            </ScrollView>
            <Footer>
                <Button title="Say thank you" onPress={thank} disabled={!helped.length}/>
                <Button title="Back to home" variant="text" onPress={() => router.replace('/(tabs)')}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingBottom: 16, gap: 16},
    art: {width: 122, height: 122, alignSelf: 'center', marginTop: 40},
    heading: {gap: 6},
    centre: {textAlign: 'center'},
    stats: {flexDirection: 'row', gap: 8, marginTop: 8},
    stat: {flex: 1, borderRadius: 16, padding: 12, gap: 2, minHeight: 96},
});
