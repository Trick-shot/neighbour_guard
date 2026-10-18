import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import AlertTypeChip from '@/components/ui/AlertTypeChip';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {AlertPin, MePin} from '@/components/ui/MapPin';
import Text from '@/components/ui/Text';
import {distanceM, formatDistance, minutesAgo, walkMinutes} from '@/features/alerts';
import {alertsApi, chatApi, placesApi} from '@/lib/endpoints';
import {Alert, MyResidence} from '@/lib/types';
import {shadow, useColors} from '@/theme';
import {streetMapStyle} from '@/theme/mapStyle';

/** Figma "Neighbour — on the way" (1678:1014). */
export default function OnTheWay() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const alertId = Number(id);
    const [alert, setAlert] = useState<Alert | null>(null);
    const [me, setMe] = useState<MyResidence | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => alertsApi.get(alertId).then(setAlert).catch(() => undefined), [alertId]);
    useEffect(() => {
        load();
        placesApi.me().then(setMe).catch(() => undefined);
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
    }, [load]);

    const target = alert?.home?.lat != null ? {lat: alert.home.lat, lng: alert.home.lng!} : null;
    const dist = me && target ? distanceM(me, target) : null;
    const responding = (alert?.responses ?? []).filter((r) => r.state === 'coming' || r.state === 'arrived').length;
    const live = alert?.status === 'sent';

    const arrived = async () => {
        setBusy(true);
        await alertsApi.respond(alertId, 'arrived').catch(() => undefined);
        router.replace('/(tabs)');
    };

    const messageGroup = async () => {
        const convos = await chatApi.conversations().catch(() => []);
        const group = convos.find((x) => x.kind === 'group');
        if (group) router.push(`/chat/${group.id}`);
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                customMapStyle={streetMapStyle}
                region={target ? {
                    latitude: me ? (me.lat + target.lat) / 2 : target.lat,
                    longitude: me ? (me.lng + target.lng) / 2 : target.lng,
                    latitudeDelta: Math.max(0.005, me ? Math.abs(me.lat - target.lat) * 2.2 : 0.005),
                    longitudeDelta: Math.max(0.005, me ? Math.abs(me.lng - target.lng) * 2.2 : 0.005),
                } : undefined}
                toolbarEnabled={false}>
                {me && target && <Polyline coordinates={[{latitude: me.lat, longitude: me.lng}, {latitude: target.lat, longitude: target.lng}]} strokeColor={c.bg.brand} strokeWidth={5}/>}
                {me && <Marker coordinate={{latitude: me.lat, longitude: me.lng}} anchor={{x: 0.5, y: 52 / 88}}><MePin/></Marker>}
                {target && <Marker coordinate={{latitude: target.lat, longitude: target.lng}} anchor={{x: 0.5, y: 0.5}}><AlertPin/></Marker>}
            </MapView>

            {dist != null && (
                <View style={[styles.eta, shadow.md, {top: insets.top + 12, backgroundColor: c.bg.surface}]}>
                    <Icon name="navigation" size={22} color={c.icon.brand}/>
                    <View>
                        <Text variant="headline">{walkMinutes(dist)} min · {formatDistance(dist)}</Text>
                        <Text variant="footnote" color={c.text.secondary}>Walk to {alert?.home.street}</Text>
                    </View>
                </View>
            )}

            <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                <View style={[styles.grabber, {backgroundColor: c.border.strong}]}/>
                <Text variant="title2">{live ? "You're on the way" : 'This alert has ended'}</Text>
                {alert && (
                    <View style={[styles.card, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                        <View style={styles.cardTop}>
                            <AlertTypeChip type={alert.type}/>
                            <View style={{flex: 1}}/>
                            {live && <Text variant="caption2" color={c.text.danger}>● LIVE</Text>}
                        </View>
                        <Text variant="headline">{alert.sender_name} needs help</Text>
                        <View style={styles.metaRow}>
                            {dist != null && <Meta icon="map-pin" text={`${formatDistance(dist)} away`}/>}
                            <Meta icon="clock" text={minutesAgo(alert.sent_at)}/>
                            <Meta icon="users" text={`${responding} responding`}/>
                        </View>
                    </View>
                )}
                <Text variant="footnote" color={c.text.secondary}>Stay safe. Don’t confront anyone armed — call 112 and wait with others.</Text>
                <View style={styles.actions}>
                    <Button title="Message group" variant="outline" size="M" style={{flex: 1}} onPress={messageGroup}/>
                    <Button title="I've arrived" size="M" style={{flex: 1}} onPress={arrived} loading={busy} disabled={!live}/>
                </View>
            </View>
        </View>
    );
}

function Meta({icon, text}: { icon: 'map-pin' | 'clock' | 'users'; text: string }) {
    const c = useColors();
    return (
        <View style={styles.meta}>
            <Icon name={icon} size={16} color={c.icon.muted}/>
            <Text variant="footnote" color={c.text.secondary}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    map: {...StyleSheet.absoluteFillObject, bottom: 274},
    eta: {position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 8, paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28},
    grabber: {width: 36, height: 5, borderRadius: 3},
    card: {borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 10},
    cardTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
    metaRow: {flexDirection: 'row', gap: 12, flexWrap: 'wrap'},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 4},
    actions: {flexDirection: 'row', gap: 8},
});
