import {router, useFocusEffect} from 'expo-router';
import {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import MapView, {Circle, Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import AreaPill from '@/components/home/AreaPill';
import {ALERT_META} from '@/components/ui/AlertTypeChip';
import Icon from '@/components/ui/Icon';
import {AlertPin, MePin} from '@/components/ui/MapPin';
import StatusCompact from '@/components/ui/StatusCompact';
import Text from '@/components/ui/Text';
import MapUnavailable from '@/components/ui/MapUnavailable';
import {alertsApi, placesApi} from '@/lib/endpoints';
import {hasMapsKey} from '@/lib/maps';
import {alarmsAreAtRisk} from '@/lib/notifications';
import {Alert, Area, MyResidence} from '@/lib/types';
import {shadow, useColors} from '@/theme';
import {streetMapStyle} from '@/theme/mapStyle';

/** Figma "Home" (1672:1171): the map with approximate neighbour areas, status bar, controls. */
const AREA_RADIUS_M = 75;

export default function Home() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const map = useRef<MapView>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [areas, setAreas] = useState<Area[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [satellite, setSatellite] = useState(false);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [noHome, setNoHome] = useState(false);
    const [alarmRisk, setAlarmRisk] = useState(false);

    const load = useCallback(async () => {
        try {
            const me = await placesApi.me();
            setHome(me);
            setNoHome(false);
            const [a, live] = await Promise.all([placesApi.areas(), alertsApi.active()]);
            setAreas(a.areas);
            setAlerts(live);
        } catch (e: any) {
            if (e.status === 404) setNoHome(true);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        load();
        // Phone settings change outside the app, so re-read them every time Home comes into focus.
        alarmsAreAtRisk().then(setAlarmRisk);
        const t = setInterval(load, 20_000);
        return () => clearInterval(t);
    }, [load]));

    const region: Region | undefined = useMemo(() => home ? {
        latitude: home.lat, longitude: home.lng, latitudeDelta: 0.012, longitudeDelta: 0.012,
    } : undefined, [home]);

    const homes = areas.reduce((n, a) => n + a.homes, 0);
    const others = alerts.filter((a) => a.home?.lat != null);
    const nearest = alerts[0];

    const status = nearest
        ? {tone: 'alert' as const, title: `${ALERT_META[nearest.type].label} nearby`, subtitle: `${nearest.sender_name} · tap to see`}
        : {tone: 'quiet' as const, title: `All quiet in ${home?.neighbourhood.name ?? 'your area'}`,
            subtitle: noHome ? 'Add your home to see your neighbours' : `${Math.max(0, homes - 1)} neighbours nearby`};

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.subtle}]}>
            {!hasMapsKey ? <MapUnavailable/> : <MapView
                ref={map}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                customMapStyle={satellite ? undefined : streetMapStyle}
                mapType={satellite ? 'hybrid' : 'standard'}
                initialRegion={region}
                region={undefined}
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
                            tracksViewChanges={false}>
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
                            onPress={() => router.push(`/alert/${a.id}`)}>
                        <AlertPin/>
                    </Marker>
                ))}
            </MapView>}

            <View style={[styles.top, {top: insets.top + 6}]}>
                <StatusCompact {...status} badge={alerts.length}
                               onPress={() => nearest ? router.push(`/alert/${nearest.id}`) : undefined}/>
                {/* An alarm that cannot ring is the one failure nobody notices until it matters. */}
                {alarmRisk && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/system/alarm-check')}
                        style={[styles.notice, shadow.control, {backgroundColor: c.feedback.errorBg}]}>
                        <Icon name="triangle-alert" size={22} color={c.icon.danger}/>
                        <View style={styles.noticeText}>
                            <Text variant="label" color={c.text.danger}>Alarms can’t reach you</Text>
                            <Text variant="footnote" color={c.text.danger}>A neighbour’s SOS would stay silent. Fix it.</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={c.icon.danger}/>
                    </Pressable>
                )}
                {/* No home means no neighbourhood, so an SOS would reach nobody. Say so and offer the fix. */}
                {noHome && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/authentication/location')}
                        style={[styles.notice, shadow.control, {backgroundColor: c.bg.surface}]}>
                        <Icon name="map-pin" size={22} color={c.icon.brand}/>
                        <View style={styles.noticeText}>
                            <Text variant="label">Pin your home</Text>
                            <Text variant="footnote" color={c.text.secondary}>Until you do, an alert reaches nobody.</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={c.icon.muted}/>
                    </Pressable>
                )}
            </View>

            <View style={[styles.rail, shadow.control, {top: insets.top + 82, backgroundColor: c.bg.surface}]}>
                <Pressable accessibilityLabel="Actions" onPress={() => setActionsOpen((o) => !o)}
                           style={[styles.expand, {backgroundColor: actionsOpen ? c.bg.subtle : c.bg.brand}]}>
                    <Icon name={actionsOpen ? 'x' : 'more-horizontal'} size={22} color={actionsOpen ? c.icon.default : c.icon.onBrand}/>
                    {!actionsOpen && alerts.length > 0 && (
                        <View style={[styles.badge, {borderColor: c.bg.surface}]}>
                            <Text variant="caption2" color="#ffffff">{alerts.length}</Text>
                        </View>
                    )}
                </Pressable>
                {actionsOpen ? (
                    <>
                        <Pressable onPress={() => { setActionsOpen(false); router.push('/(tabs)/issues'); }} style={styles.action}>
                            <Icon name="clipboard-list" size={22}/>
                            <Text variant="caption2" color={c.text.secondary}>Report</Text>
                        </Pressable>
                        <Pressable onPress={() => { setActionsOpen(false); router.push('/neighbours'); }} style={styles.action}>
                            <Icon name="users" size={22}/>
                            <Text variant="caption2" color={c.text.secondary}>Neighbours</Text>
                        </Pressable>
                    </>
                ) : (
                    <Text variant="caption2" color={c.text.secondary}>Actions</Text>
                )}
            </View>

            <View style={[styles.controls, shadow.control, {top: insets.top + 82, backgroundColor: c.bg.surface}]}>
                <Pressable accessibilityLabel={satellite ? 'Street map' : 'Satellite map'} onPress={() => setSatellite((s) => !s)} style={styles.control}>
                    <Icon name="image" size={22} color={satellite ? c.icon.brand : c.icon.default}/>
                </Pressable>
                <Pressable accessibilityLabel="Back to my home" onPress={() => region && map.current?.animateToRegion(region, 400)} style={styles.control}>
                    <Icon name="locate" size={22}/>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    top: {position: 'absolute', left: 16, right: 16, gap: 8},
    notice: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16},
    noticeText: {flex: 1},
    rail: {position: 'absolute', left: 16, alignItems: 'center', gap: 4, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 10, borderRadius: 999},
    expand: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
    badge: {position: 'absolute', left: 32, top: -4, width: 18, height: 18, borderRadius: 9, borderWidth: 2, backgroundColor: '#e52e2e', alignItems: 'center', justifyContent: 'center'},
    action: {alignItems: 'center', gap: 2, paddingTop: 6},
    controls: {position: 'absolute', right: 16, padding: 2, borderRadius: 999},
    control: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
});
