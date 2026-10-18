import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {AlertPin} from '@/components/ui/MapPin';
import ResponderRow from '@/components/ui/ResponderRow';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {Alert} from '@/lib/types';
import {type, useColors} from '@/theme';
import {streetMapStyle} from '@/theme/mapStyle';

/**
 * Figma "SOS — help on the way" (1677:829): live map with the alert, who is coming, Call 112 and
 * "I'm safe now" (asks for the safety PIN when one is set).
 */
const POLL_MS = 4000;

export default function SosLive() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const alertId = Number(id);
    const [alert, setAlert] = useState<Alert | null>(null);
    const [dim, setDim] = useState(false);
    const [askPin, setAskPin] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => alertsApi.get(alertId).then(setAlert).catch(() => undefined), [alertId]);
    useEffect(() => {
        load();
        const t = setInterval(load, POLL_MS);
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => {
        if (alert && alert.status !== 'sent') router.replace('/(tabs)');
    }, [alert?.status]);

    const resolve = async (withPin?: string) => {
        setBusy(true);
        setPinError(null);
        try {
            await alertsApi.resolve(alertId, withPin);
            setAskPin(false);
            router.replace('/(tabs)');
        } catch (e: any) {
            setPinError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const imSafe = async () => {
        const {is_set} = await alertsApi.pinStatus().catch(() => ({is_set: false}));
        if (is_set) setAskPin(true);
        else resolve();
    };

    const responses = alert?.responses ?? [];
    const coming = responses.filter((r) => r.state === 'coming' || r.state === 'arrived');
    const eta = coming.map((r) => r.eta_min).filter((m): m is number => m != null).sort((a, b) => a - b)[0];
    const title = coming.length ? 'Help is on the way' : 'Your alert was sent';
    const subtitle = coming.length
        ? (eta != null ? `First neighbour arrives in about ${eta} min` : `${coming.length} neighbour${coming.length > 1 ? 's are' : ' is'} coming`)
        : `${alert?.notified_count ?? 0} neighbours alerted · waiting for someone to respond`;
    const home = alert?.home;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                customMapStyle={streetMapStyle}
                region={home?.lat != null ? {latitude: home.lat, longitude: home.lng!, latitudeDelta: 0.008, longitudeDelta: 0.008} : undefined}
                toolbarEnabled={false}>
                {home?.lat != null && (
                    <Marker coordinate={{latitude: home.lat, longitude: home.lng!}} anchor={{x: 0.5, y: 0.5}}>
                        <AlertPin/>
                    </Marker>
                )}
            </MapView>

            <View style={[styles.livePill, {top: insets.top + 16, backgroundColor: c.bg.danger}]}>
                <Text variant="caption2" color={c.text.onBrand}>● LIVE · sharing your location</Text>
            </View>
            <Pressable onPress={() => setDim(true)} style={[styles.dimBtn, {top: insets.top + 50}]}>
                <Icon name="eye" size={16} color="#ffffff"/>
                <Text variant="label" color="#ffffff">Dim screen</Text>
            </Pressable>

            <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                <View style={[styles.grabber, {backgroundColor: c.border.strong}]}/>
                <View style={{gap: 2}}>
                    <Text variant="title2">{title}</Text>
                    <Text variant="subhead" color={coming.length ? c.feedback.success : c.text.secondary}>{subtitle}</Text>
                </View>
                <ScrollView style={{maxHeight: 240}} contentContainerStyle={{gap: 16}}>
                    {responses.map((r) => <ResponderRow key={r.responder_id} response={r}/>)}
                </ScrollView>
                <View style={styles.actions}>
                    <Button title="Call 112" variant="danger" size="M" style={{flex: 1}} onPress={() => Linking.openURL('tel:112')}/>
                    <Button title="I'm safe now" size="M" style={{flex: 1}} onPress={imSafe} loading={busy && !askPin}/>
                </View>
            </View>

            {dim && (
                <Pressable style={styles.dim} onPress={() => setDim(false)} accessibilityLabel="Show screen">
                    <Text variant="footnote" color="rgba(255,255,255,0.35)">Alert still live · tap to show</Text>
                </Pressable>
            )}

            <Modal visible={askPin} transparent animationType="fade" onRequestClose={() => setAskPin(false)}>
                <View style={[styles.modalScrim, {backgroundColor: c.scrim}]}>
                    <View style={[styles.modal, {backgroundColor: c.bg.surface}]}>
                        <Text variant="title3">Enter your safety PIN</Text>
                        <TextInput
                            value={pin}
                            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 8))}
                            secureTextEntry
                            keyboardType="number-pad"
                            autoFocus
                            style={[type.title2, styles.pinInput, {borderColor: pinError ? c.feedback.error : c.border.focus, color: c.text.primary}]}
                        />
                        {pinError && <Text variant="footnote" color={c.feedback.error}>{pinError}</Text>}
                        <Button title="Confirm I'm safe" onPress={() => resolve(pin)} loading={busy} disabled={pin.length < 4}/>
                        <Button title="Back" variant="outline" onPress={() => { setAskPin(false); setPin(''); }}/>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    map: {...StyleSheet.absoluteFillObject, bottom: 300},
    livePill: {position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999},
    dimBtn: {
        position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 14,
        paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(20,26,36,0.85)',
    },
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16, paddingTop: 8, paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28},
    grabber: {width: 36, height: 5, borderRadius: 3},
    actions: {flexDirection: 'row', gap: 8},
    dim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60},
    modalScrim: {flex: 1, justifyContent: 'center', padding: 24},
    modal: {borderRadius: 24, padding: 20, gap: 12},
    pinInput: {height: 56, borderWidth: 2, borderRadius: 12, paddingHorizontal: 16, letterSpacing: 8},
});
