import {Audio} from 'expo-av';
import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ALERT_META} from '@/components/ui/AlertTypeChip';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {AlertPin, MePin} from '@/components/ui/MapPin';
import Text from '@/components/ui/Text';
import {alarmTitle, distanceM, formatDistance, minutesAgo, walkMinutes, WHAT_TO_DO} from '@/features/alerts';
import {alertsApi, placesApi} from '@/lib/endpoints';
import {Alert, MyResidence} from '@/lib/types';
import {alertColor, useColors} from '@/theme';
import {streetMapStyle} from '@/theme/mapStyle';

/**
 * Figma "Neighbour — alarm" (1678:915) and "· robbery" (1707:928): full screen in the alert's
 * colour, ringing until the neighbour answers or mutes it.
 */
export default function NeighbourAlarm() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const alertId = Number(id);
    const [alert, setAlert] = useState<Alert | null>(null);
    const [me, setMe] = useState<MyResidence | null>(null);
    const [busy, setBusy] = useState(false);
    const sound = useRef<Audio.Sound | null>(null);

    const stopAlarm = async () => {
        const s = sound.current;
        sound.current = null;
        await s?.stopAsync().catch(() => undefined);
        await s?.unloadAsync().catch(() => undefined);
    };

    useEffect(() => {
        alertsApi.get(alertId).then((a) => {
            setAlert(a);
            if (a.status === 'sent') alertsApi.respond(alertId, 'seen').catch(() => undefined);
        }).catch(() => router.back());
        placesApi.me().then(setMe).catch(() => undefined);
        (async () => {
            await Audio.setAudioModeAsync({playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: false});
            const {sound: s} = await Audio.Sound.createAsync(require('@/assets/sounds/alarm.mp3'), {shouldPlay: true, isLooping: true, volume: 1});
            sound.current = s;
        })().catch(() => undefined);
        return () => { stopAlarm(); };
    }, [alertId]);

    const respond = async (state: 'coming' | 'cant', eta?: number) => {
        setBusy(true);
        await stopAlarm();
        try {
            await alertsApi.respond(alertId, state, eta);
            if (state === 'coming') router.replace({pathname: '/alert/on-the-way', params: {id: String(alertId)}});
            else router.back();
        } catch {
            setBusy(false);
        }
    };

    const tint = alert ? alertColor(c, alert.type) : c.bg.danger;
    const target = alert?.home?.lat != null ? {lat: alert.home.lat, lng: alert.home.lng!} : null;
    const dist = me && target ? distanceM(me, target) : null;
    const walk = dist != null ? walkMinutes(dist) : undefined;
    const responding = (alert?.responses ?? []).filter((r) => r.state === 'coming' || r.state === 'arrived').length;
    const meta = alert ? ALERT_META[alert.type] : ALERT_META.emergency;

    return (
        <View style={[styles.screen, {backgroundColor: tint}]}>
            <View style={[styles.ring, {width: 300, height: 300, top: 94, backgroundColor: 'rgba(255,255,255,0.08)'}]}/>
            <View style={[styles.ring, {width: 200, height: 200, top: 144, backgroundColor: 'rgba(255,255,255,0.10)'}]}/>

            <View style={[styles.copy, {top: Math.max(insets.top + 42, 96)}]}>
                <Text variant="caption2" color={c.text.onBrand}>
                    {meta.label.toUpperCase()}{dist != null ? ` · ${formatDistance(dist).toUpperCase()} AWAY` : ''}
                </Text>
                <Text variant="title1" color={c.text.onBrand} style={styles.center}>
                    {alert ? alarmTitle(alert.type, alert.home?.house_number, alert.sender_name) : 'Neighbour needs help'}
                </Text>
                <Text variant="body" color={c.text.onBrand}>{alert ? `${alert.sender_name} · ${minutesAgo(alert.sent_at)}` : ''}</Text>
            </View>

            <View style={styles.iconCircle}>
                <Icon name={meta.icon} size={44} color={c.bg.danger}/>
            </View>

            <View style={styles.miniMap}>
                {target && (
                    <MapView
                        style={StyleSheet.absoluteFill}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={streetMapStyle}
                        liteMode
                        scrollEnabled={false}
                        zoomEnabled={false}
                        initialRegion={{
                            latitude: me ? (me.lat + target.lat) / 2 : target.lat,
                            longitude: me ? (me.lng + target.lng) / 2 : target.lng,
                            latitudeDelta: Math.max(0.004, me ? Math.abs(me.lat - target.lat) * 2.4 : 0.004),
                            longitudeDelta: Math.max(0.004, me ? Math.abs(me.lng - target.lng) * 2.4 : 0.004),
                        }}>
                        {me && <Polyline coordinates={[{latitude: me.lat, longitude: me.lng}, {latitude: target.lat, longitude: target.lng}]} strokeColor={c.bg.brand} strokeWidth={4}/>}
                        {me && <Marker coordinate={{latitude: me.lat, longitude: me.lng}} anchor={{x: 0.5, y: 52 / 88}}><View style={{transform: [{scale: 0.6}]}}><MePin/></View></Marker>}
                        <Marker coordinate={{latitude: target.lat, longitude: target.lng}} anchor={{x: 0.5, y: 0.5}}><AlertPin size={53}/></Marker>
                    </MapView>
                )}
                {dist != null && (
                    <View style={styles.eta}>
                        <Text variant="label" color="#ffffff">{formatDistance(dist)} · {walk} min walk · {responding} responding</Text>
                    </View>
                )}
            </View>

            <View style={styles.todo}>
                <Text variant="caption1" color="#ffffff" style={{opacity: 0.85}}>WHAT TO DO</Text>
                {(alert ? WHAT_TO_DO[alert.type] : []).map((line) => (
                    <View key={line} style={styles.bullet}>
                        <Text variant="subhead" color="#ffffff">•</Text>
                        <Text variant="subhead" color="#ffffff" style={{flex: 1}}>{line}</Text>
                    </View>
                ))}
            </View>

            <View style={[styles.buttons, {bottom: Math.max(insets.bottom, 16) + 62}]}>
                <Button title="I'm coming" variant="white" onPress={() => respond('coming', walk)} loading={busy} disabled={alert?.status !== 'sent'}/>
                <Button title="Call 112" variant="ghost" onPress={() => Linking.openURL('tel:112')}/>
            </View>
            <Text variant="subhead" color={c.text.onBrand} style={[styles.footer, {bottom: Math.max(insets.bottom, 16) + 20}]}>
                <Text variant="subhead" color={c.text.onBrand} onPress={() => respond('cant')}>Can’t help</Text>
                {'  ·  '}
                <Text variant="subhead" color={c.text.onBrand} onPress={stopAlarm}>Mute alarm</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, alignItems: 'center'},
    ring: {position: 'absolute', borderRadius: 999, alignSelf: 'center'},
    copy: {position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 6},
    center: {textAlign: 'center'},
    iconCircle: {position: 'absolute', top: 200, width: 88, height: 88, borderRadius: 44, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center'},
    miniMap: {position: 'absolute', top: 300, width: 343, height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: '#ffffff'},
    eta: {position: 'absolute', left: 10, bottom: 10, paddingLeft: 10, paddingRight: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(20,26,36,0.85)'},
    todo: {position: 'absolute', top: 482, width: 343, gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)'},
    bullet: {flexDirection: 'row', gap: 8},
    buttons: {position: 'absolute', width: 343, gap: 8},
    footer: {position: 'absolute', opacity: 0.85},
});
