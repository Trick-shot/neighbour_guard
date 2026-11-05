import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icon from '@/components/ui/Icon';
import IssueCard, {CATEGORY_META, severityColor} from '@/components/ui/IssueCard';
import MapUnavailable from '@/components/ui/MapUnavailable';
import Segmented from '@/components/ui/Segmented';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {issuesApi, placesApi} from '@/lib/endpoints';
import {hasMapsKey} from '@/lib/maps';
import {Issue, IssueCategory, MyResidence} from '@/lib/types';
import {shadow, useColors} from '@/theme';

/**
 * Figma "Issues" (1620:859), "Issues — other neighbourhoods" (1737:428) and "Issues — on map"
 * (1634:2354). The server decides what each list may contain; this only filters by category.
 */
const FILTERS: (IssueCategory | 'all')[] = ['all', 'waste', 'lighting', 'roads', 'water', 'noise', 'security', 'other'];

export default function Issues() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [scope, setScope] = useState<'mine' | 'others'>('mine');
    const [filter, setFilter] = useState<IssueCategory | 'all'>('all');
    const [issues, setIssues] = useState<Issue[] | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const params = useLocalSearchParams<{ map?: string }>();
    const [map, setMap] = useState(params.map === '1');
    const [picked, setPicked] = useState<Issue | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setIssues(await issuesApi.list(scope));
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
        placesApi.me().then(setHome).catch(() => undefined);
    }, [scope]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const shown = (issues ?? []).filter((i) => filter === 'all' || i.category === filter);
    const open = (i: Issue) => router.push({pathname: '/issues/[id]', params: {id: String(i.id), other: scope === 'others' ? '1' : ''}});

    const header = (
        <View style={[styles.header, {paddingTop: insets.top + 8}]}>
            <Text variant="titleLarge" style={styles.flex}>Issues</Text>
            <Pressable accessibilityLabel={map ? 'Show list' : 'Show on map'} hitSlop={10} onPress={() => setMap((m) => !m)}>
                <Icon name={map ? 'clipboard-list' : 'map-pin'} size={24}/>
            </Pressable>
            <Pressable accessibilityLabel="Report an issue" hitSlop={10} onPress={() => router.push('/issues/report')}>
                <Icon name="plus" size={24}/>
            </Pressable>
        </View>
    );
    const filters = (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {FILTERS.map((f) => {
                const on = filter === f;
                return (
                    <Pressable key={f} onPress={() => setFilter(f)}
                               style={[styles.pill, on ? {backgroundColor: c.bg.inverse} : {backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.default}]}>
                        <Text variant="label" color={on ? c.text.inverse : c.text.primary}>{f === 'all' ? (map ? 'Nearby' : 'All') : CATEGORY_META[f].short}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    if (map) {
        const pinned = shown.filter((i) => i.lat != null && i.lng != null);
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
                {!hasMapsKey ? <MapUnavailable/> : (
                    <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} mapType="satellite" toolbarEnabled={false}
                             initialRegion={home ? {latitude: home.lat, longitude: home.lng, latitudeDelta: 0.012, longitudeDelta: 0.012} : undefined}>
                        {pinned.map((i) => {
                            const t = severityColor(c, i.severity);
                            const on = picked?.id === i.id;
                            return (
                                <Marker key={i.id} coordinate={{latitude: i.lat!, longitude: i.lng!}} anchor={{x: 0.5, y: 0.5}} onPress={() => setPicked(i)}>
                                    <View style={[styles.pin, {backgroundColor: t.fg, width: on ? 44 : 34, height: on ? 44 : 34, borderRadius: on ? 22 : 17}]}>
                                        <Icon name={CATEGORY_META[i.category].icon} size={on ? 22 : 18} color="#ffffff"/>
                                    </View>
                                </Marker>
                            );
                        })}
                    </MapView>
                )}
                <View style={[styles.mapTop, {backgroundColor: c.bg.surface}]}>{header}{filters}</View>
                <View style={[styles.mapBottom, {bottom: 112}]}>
                    <Pressable onPress={() => setMap(false)} style={[styles.showList, shadow.pill, {backgroundColor: c.bg.surface}]}>
                        <Icon name="clipboard-list" size={16} color={c.icon.brand}/>
                        <Text variant="label" color={c.text.brand}>Show list</Text>
                    </Pressable>
                    {(picked ?? pinned[0]) && (
                        <View style={[shadow.card, styles.mapCard]}>
                            <IssueCard issue={(picked ?? pinned[0])!} home={home} otherArea={scope === 'others'} onPress={() => open((picked ?? pinned[0])!)}/>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <View>
                {header}
                <View style={styles.segment}>
                    <Segmented options={[{key: 'mine', label: 'My neighbourhood'}, {key: 'others', label: 'Other areas'}]} value={scope} onChange={(v) => { setScope(v); setIssues(null); }}/>
                </View>
                {filters}
            </View>
            {issues === null && !error ? <StateView kind="loading"/> : error && !issues ? (
                <StateView kind="error" actionLabel="Try again" onAction={load}/>
            ) : (
                <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load}/>} contentContainerStyle={styles.list}>
                    {shown.length === 0 && (
                        <Text variant="subhead" color={c.text.secondary} style={styles.empty}>
                            {scope === 'mine' ? 'No issues here yet. Spotted something? Tap + to report it.' : 'No public issues from nearby areas.'}
                        </Text>
                    )}
                    {shown.map((i) => <IssueCard key={i.id} issue={i} home={home} otherArea={scope === 'others'} onPress={() => open(i)}/>)}
                    <View style={[styles.note, {backgroundColor: c.feedback.warningBg}]}>
                        <Icon name="triangle-alert" size={18} color={c.feedback.warning}/>
                        <Text variant="footnote" color={c.feedback.warning} style={styles.flex}>Robbery or danger happening now? Use SOS on Home, not an issue.</Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    header: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 8},
    segment: {paddingHorizontal: 16, paddingTop: 7},
    filters: {gap: 8, paddingHorizontal: 16, paddingVertical: 12},
    pill: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999},
    list: {paddingHorizontal: 16, gap: 0, paddingBottom: 140, paddingTop: 4},
    empty: {paddingVertical: 12},
    note: {marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12},
    mapTop: {position: 'absolute', top: 0, left: 0, right: 0},
    mapBottom: {position: 'absolute', left: 16, right: 16, gap: 10, alignItems: 'center'},
    showList: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999},
    mapCard: {alignSelf: 'stretch', borderRadius: 16},
    pin: {alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff'},
});
