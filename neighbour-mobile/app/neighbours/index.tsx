import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, Share, StyleSheet, View} from 'react-native';

import VouchSheet from '@/components/neighbours/VouchSheet';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import Note from '@/components/ui/Note';
import ScreenHeader from '@/components/ui/ScreenHeader';
import SearchField from '@/components/ui/SearchField';
import Segmented from '@/components/ui/Segmented';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {placesApi} from '@/lib/endpoints';
import {MyResidence, Neighbour} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Neighbours list" (1633:1899) with the vouch sheet (1633:2103). */
export const homeLabel = (n: Neighbour['home']) => (n.house_number ? `House ${n.house_number}` : `${n.street} area`);

export default function Neighbours() {
    const c = useColors();
    const [people, setPeople] = useState<Neighbour[] | null>(null);
    const [me, setMe] = useState<MyResidence | null>(null);
    const [tab, setTab] = useState<'verified' | 'pending'>('verified');
    const [query, setQuery] = useState('');
    const [asking, setAsking] = useState<Neighbour | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [p, m] = await Promise.all([placesApi.neighbours(), placesApi.me().catch(() => null)]);
            setPeople(p);
            setMe(m);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, []);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const vouch = async () => {
        if (!asking) return;
        setBusy(true);
        try {
            await placesApi.vouch(asking.home.id);
            setAsking(null);
            load();
        } catch (e: any) {
            setError(e.message);
            setAsking(null);
        } finally {
            setBusy(false);
        }
    };

    const q = query.trim().toLowerCase();
    const match = (n: Neighbour) => !q || n.full_name.toLowerCase().includes(q) || (n.home.house_number ?? '').includes(q);
    const verified = (people ?? []).filter((n) => n.home.status === 'verified');
    const pending = (people ?? []).filter((n) => n.home.status === 'pending');
    const iCanVouch = me?.status === 'verified';
    const waiting = pending.filter((n) => iCanVouch && !n.i_vouched);
    const list = (tab === 'verified' ? verified : pending).filter(match);

    const row = (n: Neighbour, action?: 'vouch') => (
        <Pressable key={n.user_id} onPress={() => router.push(`/neighbours/${n.user_id}`)}
                   style={[styles.row, {backgroundColor: c.bg.surface, borderBottomColor: c.border.default}]}>
            <Avatar name={n.full_name} uri={n.photo_url} size={40}/>
            <View style={styles.flex}>
                <Text variant="headline" numberOfLines={1}>{n.full_name}</Text>
                <Text variant="footnote" color={c.text.secondary} numberOfLines={1}>
                    {homeLabel(n.home)}{n.home.status === 'pending' ? ` · waiting for vouches` : ''}
                </Text>
            </View>
            {action === 'vouch' ? (
                <Pressable onPress={() => setAsking(n)} style={[styles.vouch, {backgroundColor: c.bg.brandSubtle}]}>
                    <Text variant="buttonM" color={c.text.brand}>Vouch</Text>
                </Pressable>
            ) : n.home.status === 'verified' ? <Icon name="shield-check" size={20} color={c.feedback.success}/> : null}
        </Pressable>
    );

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Neighbours" right={
                <Pressable accessibilityLabel="Invite a neighbour" hitSlop={10} onPress={() => Share.share({
                    message: 'Join our street on NeighbourGuard so we can reach each other in an emergency.',
                }).catch(() => undefined)}>
                    <Icon name="plus" size={24}/>
                </Pressable>
            }/>
            <View style={[styles.top, {backgroundColor: c.bg.surface}]}>
                <SearchField value={query} onChangeText={setQuery} placeholder="Search by name or house"/>
                <Segmented options={[{key: 'verified', label: `Verified (${verified.length})`}, {key: 'pending', label: `Pending (${pending.length})`}]}
                           value={tab} onChange={setTab}/>
            </View>
            {people === null && !error ? <StateView kind="loading"/> : error && !people ? (
                <StateView kind="error" body="We couldn’t load your neighbours. Check your connection and try again. Your SOS button still works." actionLabel="Try again" onAction={load}/>
            ) : (
                <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load}/>} contentContainerStyle={{paddingBottom: 32}}>
                    <Text variant="caption1" color={c.text.muted} style={styles.section}>
                        {tab === 'verified' ? 'VERIFIED NEIGHBOURS' : 'WAITING FOR VOUCHES'}
                    </Text>
                    {list.length ? list.map((n) => row(n, tab === 'pending' && iCanVouch && !n.i_vouched ? 'vouch' : undefined)) : (
                        <Text variant="subhead" color={c.text.secondary} style={styles.empty}>
                            {q ? 'Nobody matches that.' : tab === 'verified' ? 'No verified neighbours yet.' : 'Nobody is waiting.'}
                        </Text>
                    )}
                    {tab === 'verified' && waiting.length > 0 && (
                        <>
                            <Text variant="caption1" color={c.text.muted} style={styles.section}>WAITING FOR YOUR VOUCH</Text>
                            {waiting.filter(match).map((n) => row(n, 'vouch'))}
                        </>
                    )}
                    {error ? <Text variant="footnote" color={c.feedback.error} style={styles.empty}>{error}</Text> : null}
                    <View style={styles.note}>
                        <Note icon="lock">House numbers are visible to verified neighbours only. Unverified members see the area.</Note>
                    </View>
                </ScrollView>
            )}
            <VouchSheet name={asking?.full_name ?? null} where={asking ? `${homeLabel(asking.home)}, ${asking.home.street}` : ''}
                        busy={busy} onYes={vouch} onNo={() => setAsking(null)}/>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, minWidth: 0},
    top: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 12},
    section: {paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth},
    vouch: {height: 36, paddingHorizontal: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
    empty: {paddingHorizontal: 16, paddingVertical: 12},
    note: {padding: 16},
});
