import * as Location from 'expo-location';
import {type Href, router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import MapView, {Circle, Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import AreaPill from '@/components/home/AreaPill';
import QuickActions from '@/components/home/QuickActions';
import SafetyChecklist from '@/components/home/SafetyChecklist';
import {ALERT_META} from '@/components/ui/AlertTypeChip';
import Icon from '@/components/ui/Icon';
import {AlertPin, MePin} from '@/components/ui/MapPin';
import MapUnavailable from '@/components/ui/MapUnavailable';
import StatusCompact from '@/components/ui/StatusCompact';
import Text from '@/components/ui/Text';
import authStorage from '@/auth/storage';
import {routeForAlert, splitLiveAlerts} from '@/features/alerts';
import {alertsApi, notificationsApi, placesApi, providersApi} from '@/lib/endpoints';
import {events} from '@/lib/events';
import {hasMapsKey} from '@/lib/maps';
import {alarmsAreAtRisk} from '@/lib/notifications';
import {prefs} from '@/lib/prefs';
import {Alert, Area, MyResidence} from '@/lib/types';
import {shadow, useColors} from '@/theme';
import {streetMapStyle} from '@/theme/mapStyle';

/**
 * Figma "Home" (1672:1171) and its states: alert nearby (1672:1635), actions open (1672:1460),
 * SOS hint (1672:1313), offline / no location (1673:5258), safety checklist (1673:5384).
 * Neighbours are shown as approximate areas with a home count, never as houses.
 */
const AREA_RADIUS_M = 75;

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

export default function Home() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ checklist?: string; covered?: string }>();
    const map = useRef<MapView>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [areas, setAreas] = useState<Area[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [myId, setMyId] = useState<number | null>(null);
    useEffect(() => { authStorage.getUser().then((u) => setMyId(u?.user_id ?? null)).catch(() => undefined); }, []);
    const [unread, setUnread] = useState(0);
    const [covered, setCovered] = useState<boolean | null>(null);
    const [guard, setGuard] = useState<{ provider: string; onDuty: boolean } | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [satellite, setSatellite] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [noHome, setNoHome] = useState(false);
    const [offline, setOffline] = useState(false);
    const [locationOff, setLocationOff] = useState(false);
    const [alarmRisk, setAlarmRisk] = useState(false);
    const [hint, setHint] = useState(false);
    const [checklist, setChecklist] = useState(false);
    const [stackHeight, setStackHeight] = useState(56);

    const load = useCallback(async () => {
        try {
            const me = await placesApi.me();
            setHome(me);
            prefs.setOfflineHome({house_number: me.house_number, street: me.street});
            setNoHome(false);
            setOffline(false);
            const [a, live, feed] = await Promise.all([
                placesApi.areas(), alertsApi.active(), notificationsApi.list().catch(() => null),
            ]);
            setAreas(a.areas);
            setAlerts(live);
            if (feed) setUnread(feed.unread);
        } catch (e: any) {
            if (e.status === 404) setNoHome(true);
            if (e.message === 'No connection') setOffline(true);
        }
        providersApi.mine().then((subs) => {
            const live = subs.find((s) => s.status === 'active' && s.my_status === 'paid');
            setCovered(!!live);
            setGuard(live ? {provider: live.provider, onDuty: !!live.on_duty} : null);
        }).catch(() => setCovered(null));
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        // Phone settings change outside the app, so re-read them every time Home comes into focus.
        alarmsAreAtRisk().then(setAlarmRisk);
        Location.getForegroundPermissionsAsync()
            .then(async (p) => setLocationOff(!p.granted || !(await Location.hasServicesEnabledAsync())))
            .catch(() => undefined);
        const t = setInterval(load, 20_000);
        return () => clearInterval(t);
    }, [load]));

    // Once, straight after onboarding.
    useEffect(() => {
        if (params.checklist !== '1') return;
        prefs.checklistSeen().then((seen) => {
            if (!seen) { setChecklist(true); prefs.setChecklistSeen(); }
        });
    }, [params.checklist]);

    // "Subscribed — Home" (1749:2431): the payment screen lands here once the server says paid.
    useEffect(() => {
        if (!params.covered) return;
        setToast(`You’re now covered by ${params.covered}`);
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [params.covered]);

    useEffect(() => events.on('sosHint', () => {
        setHint(true);
        setTimeout(() => setHint(false), 3500);
    }), []);

    const region: Region | undefined = useMemo(() => home ? {
        latitude: home.lat, longitude: home.lng, latitudeDelta: 0.012, longitudeDelta: 0.012,
    } : undefined, [home]);

    const homes = areas.reduce((n, a) => n + a.homes, 0);
    const neighbours = Math.max(0, homes - 1);
    // My own live alert is never a neighbour's: it gets its own banner and opens my live screen.
    const {mine, others: liveOthers} = splitLiveAlerts(alerts, myId);
    const others = liveOthers.filter((a) => a.home?.lat != null);
    const nearest = liveOthers[0];
    const focus = mine ?? nearest;
    const coming = nearest?.responses.filter((r) => r.state === 'coming' || r.state === 'arrived').length ?? 0;
    const away = nearest && home && nearest.home?.lat != null
        ? `${Math.round(metres(home, {lat: nearest.home.lat!, lng: nearest.home.lng!}) / 10) * 10} m away` : 'nearby';

    const status = mine
        ? {tone: 'alert' as const, title: 'Your alert is live', subtitle: 'tap to open'}
        : nearest
        ? {tone: 'alert' as const, title: `${ALERT_META[nearest.type].label} ${away}`,
            subtitle: `${nearest.sender_name} · ${coming} responding · tap to help`}
        : guard ? {tone: 'protected' as const, title: `Protected by ${guard.provider}`,
            subtitle: `${guard.onDuty ? 'Guard on duty · ' : ''}${neighbours} ${neighbours === 1 ? 'neighbour' : 'neighbours'} nearby`}
        : {tone: 'quiet' as const, title: `All quiet in ${home?.neighbourhood.name ?? 'your area'}`,
            subtitle: noHome ? 'Add your home to see your neighbours'
                : `${neighbours} ${neighbours === 1 ? 'neighbour' : 'neighbours'} nearby`};

    const actions = [
        {key: 'report', label: 'Report', icon: 'eye' as const, tone: 'danger' as const,
            onPress: () => router.push('/witness')},
        {key: 'checkin', label: 'Check-in', icon: 'check' as const, tone: 'success' as const,
            onPress: () => router.push({pathname: '/(tabs)/message', params: {compose: 'checkin'}})},
        {key: 'guard', label: 'Guard', icon: 'shield-check' as const, tone: 'brand' as const,
            badge: covered === false ? 1 : 0, onPress: () => router.push('/providers')},
        {key: 'voice', label: 'Voice', icon: 'mic' as const, tone: 'warning' as const,
            onPress: () => router.push({pathname: '/(tabs)/message', params: {compose: 'voice'}})},
    ];
    const openAction = (fn: () => void) => () => { setActionsOpen(false); fn(); };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.subtle}]}>
            {!hasMapsKey ? <MapUnavailable/> : <MapView
                ref={map}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                customMapStyle={satellite ? undefined : streetMapStyle}
                mapType={satellite ? 'hybrid' : 'standard'}
                initialRegion={region}
                showsCompass={false}
                showsMyLocationButton={false}
                toolbarEnabled={false}
                onMapReady={() => region && map.current?.animateToRegion(region, 0)}>
                {areas.map((a) => (
                    <Circle key={`c${a.lat},${a.lng}`} center={{latitude: a.lat, longitude: a.lng}} radius={AREA_RADIUS_M}
                            fillColor="rgba(51,159,255,0.18)" strokeColor="rgba(0,136,255,0.55)" strokeWidth={1.5}
                            lineDashPattern={[6, 4]}/>
                ))}
                {areas.map((a) => (
                    <Marker key={`p${a.lat},${a.lng}`} coordinate={{latitude: a.lat, longitude: a.lng}} anchor={{x: 0.5, y: 0.5}}
                            tracksViewChanges={false} onPress={() => router.push('/neighbours')}>
                        <AreaPill homes={a.homes}/>
                    </Marker>
                ))}
                {home && (
                    <Marker coordinate={{latitude: home.lat, longitude: home.lng}} anchor={{x: 0.5, y: 52 / 88}} tracksViewChanges={false}>
                        <MePin/>
                    </Marker>
                )}
                {others.map((a) => (
                    <Marker key={a.id} coordinate={{latitude: a.home.lat!, longitude: a.home.lng!}} anchor={{x: 0.5, y: 0.5}}
                            onPress={() => router.push(routeForAlert(a, myId) as Href)}>
                        <AlertPin/>
                    </Marker>
                ))}
            </MapView>}

            <View style={[styles.top, {top: insets.top - 2}]} onLayout={(e) => setStackHeight(e.nativeEvent.layout.height)}>
                {offline ? (
                    <View style={[styles.offline, {backgroundColor: c.feedback.warningBg, borderColor: c.feedback.warning}]}>
                        <View style={[styles.offlineIcon, {backgroundColor: c.bg.surface}]}>
                            <Icon name="volume-x" size={20} color={c.feedback.warning}/>
                        </View>
                        <View style={styles.flex}>
                            <Text variant="headline">You’re offline</Text>
                            <Text variant="subhead" color={c.text.secondary}>SOS still works. It will be sent by SMS.</Text>
                        </View>
                    </View>
                ) : (
                    <StatusCompact {...status} badge={focus ? alerts.length : unread}
                                   onPress={() => (focus ? router.push(routeForAlert(focus, myId) as Href) : router.push('/notifications'))}
                                   onBell={() => router.push('/notifications')}/>
                )}
                {locationOff && (
                    <View style={[styles.card, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                        <Icon name="locate" size={20} color={c.icon.danger}/>
                        <Text variant="footnote" style={styles.flex}>Location is off. Neighbours can’t find you.</Text>
                        <Pressable onPress={() => Linking.openSettings()} style={[styles.turnOn, {backgroundColor: c.bg.brandSubtle}]}>
                            <Text variant="buttonM" color={c.text.brand}>Turn on</Text>
                        </Pressable>
                    </View>
                )}
                {/* An alarm that cannot ring is the one failure nobody notices until it matters. */}
                {alarmRisk && (
                    <Pressable accessibilityRole="button" onPress={() => router.push('/system/alarm-check')}
                               style={[styles.card, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                        <Icon name="bell" size={20} color={c.icon.danger}/>
                        <Text variant="footnote" style={styles.flex}>Alarms can’t reach this phone. A neighbour’s SOS would stay silent.</Text>
                        <View style={[styles.turnOn, {backgroundColor: c.bg.brandSubtle}]}>
                            <Text variant="buttonM" color={c.text.brand}>Fix</Text>
                        </View>
                    </Pressable>
                )}
                {/* No home means no neighbourhood, so an SOS would reach nobody. Say so and offer the fix. */}
                {noHome && (
                    <Pressable accessibilityRole="button" onPress={() => router.push({pathname: '/authentication/location', params: {from: 'home'}})}
                               style={[styles.card, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                        <Icon name="map-pin" size={20} color={c.icon.brand}/>
                        <Text variant="footnote" style={styles.flex}>Pin your home. Until you do, an alert from you reaches nobody.</Text>
                        <View style={[styles.turnOn, {backgroundColor: c.bg.brandSubtle}]}>
                            <Text variant="buttonM" color={c.text.brand}>Pin it</Text>
                        </View>
                    </Pressable>
                )}
            </View>

            <View style={[styles.rail, {top: insets.top - 2 + stackHeight + (stackHeight > 60 ? 12 : 20)}]}>
                <QuickActions open={actionsOpen} onToggle={() => setActionsOpen((o) => !o)}
                              actions={actions.map((a) => ({...a, onPress: openAction(a.onPress)}))}/>
            </View>

            <View style={[styles.controls, shadow.control, {top: insets.top - 2 + stackHeight + (stackHeight > 60 ? 12 : 20), backgroundColor: c.bg.surface}]}>
                <Pressable accessibilityLabel={satellite ? 'Street map' : 'Satellite map'} onPress={() => setSatellite((s) => !s)} style={styles.control}>
                    <Icon name="image" size={22} color={satellite ? c.icon.brand : c.icon.default}/>
                </Pressable>
                <Pressable accessibilityLabel="Back to my home" onPress={() => region && map.current?.animateToRegion(region, 400)} style={styles.control}>
                    <Icon name="locate" size={22}/>
                </Pressable>
            </View>

            {hint && (
                <View pointerEvents="none" style={styles.hint}>
                    <Icon name="clock" size={16} color={c.text.inverse}/>
                    <Text variant="subhead" color={c.text.inverse}>Hold for 2 seconds to send SOS</Text>
                </View>
            )}

            {toast && (
                <View pointerEvents="none" style={styles.hint}>
                    <Icon name="check" size={16} color={c.feedback.success}/>
                    <Text variant="subhead" color={c.text.inverse}>{toast}</Text>
                </View>
            )}

            <SafetyChecklist visible={checklist} onClose={() => setChecklist(false)}/>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    top: {position: 'absolute', left: 16, right: 16, gap: 12},
    offline: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1},
    offlineIcon: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    card: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, borderWidth: 1},
    turnOn: {height: 40, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center', minWidth: 100},
    rail: {position: 'absolute', left: 16},
    controls: {position: 'absolute', right: 16, padding: 2, borderRadius: 999},
    control: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
    // "Hold hint" (1672:1313): near-black pill above the tab bar.
    hint: {position: 'absolute', bottom: 134, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, paddingLeft: 14, paddingRight: 16, borderRadius: 999, backgroundColor: 'rgba(20,26,36,0.88)'},
});
