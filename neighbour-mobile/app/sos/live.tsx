import {Image} from 'expo-image';
import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import MapView, {Circle, Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon, {IconName} from '@/components/ui/Icon';
import {AlertPin} from '@/components/ui/MapPin';
import Note from '@/components/ui/Note';
import ResponderRow from '@/components/ui/ResponderRow';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {Alert} from '@/lib/types';
import {type, useColors} from '@/theme';
import {streetMapStyle} from '@/theme/mapStyle';

/**
 * Figma "SOS — help on the way" (1677:829), "… guard dispatched" (1758:12612),
 * "… no one responded, widening" (1677:958) and "SOS — I’m safe, confirm" (1677:1049).
 * The sheet changes with what is actually happening; nothing here is decided on the phone.
 */
const POLL_MS = 4000;
const WIDEN_HINT_AFTER_S = 60;
const SHEET = 409; // height of the "help on the way" sheet in the frame

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Step({icon, tone, text}: { icon: IconName; tone: 'success' | 'brand'; text: string }) {
    const c = useColors();
    return (
        <View style={styles.step}>
            <View style={[styles.stepIcon, {backgroundColor: tone === 'success' ? c.feedback.successBg : c.bg.brandSubtle}]}>
                <Icon name={icon} size={18} color={tone === 'success' ? c.feedback.success : c.icon.brand}/>
            </View>
            <Text variant="subhead" style={styles.flex}>{text}</Text>
        </View>
    );
}

export default function SosLive() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const alertId = Number(id);
    const [alert, setAlert] = useState<Alert | null>(null);
    const [now, setNow] = useState(Date.now());
    const [dim, setDim] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [pinSet, setPinSet] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => alertsApi.get(alertId).then(setAlert).catch(() => undefined), [alertId]);
    useEffect(() => {
        load();
        alertsApi.pinStatus().then((p) => setPinSet(p.is_set)).catch(() => undefined);
        const t = setInterval(load, POLL_MS);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => { clearInterval(t); clearInterval(tick); };
    }, [load]);

    useEffect(() => {
        if (alert && alert.status !== 'sent') router.replace('/(tabs)');
    }, [alert?.status]); // eslint-disable-line react-hooks/exhaustive-deps

    const resolve = async () => {
        setBusy(true);
        setPinError(null);
        try {
            await alertsApi.resolve(alertId, pinSet ? pin : undefined);
            setConfirm(false);
            router.replace({pathname: '/alert/resolved', params: {id: String(alertId)}});
        } catch (e: any) {
            setPinError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const responses = alert?.responses ?? [];
    const coming = responses.filter((r) => r.state === 'coming' || r.state === 'arrived');
    const guard = alert?.dispatches?.find((d) => d.status !== 'declined');
    const eta = coming.map((r) => r.eta_min).filter((m): m is number => m != null).sort((a, b) => a - b)[0];
    const since = alert?.sent_at ? Math.max(0, (now - new Date(alert.sent_at).getTime()) / 1000) : 0;
    const widening = !!alert && coming.length === 0 && !guard?.guard_name && since >= WIDEN_HINT_AFTER_S;
    const widened = (alert?.radius_m ?? 500) > 500;
    const home = alert?.home;
    const guardLine = guard ? (guard.status === 'requested' ? `${guard.provider} notified`
        : guard.eta_min != null ? `guard in about ${guard.eta_min} min` : 'guard on the way') : null;

    const subtitle = coming.length
        ? [eta != null ? `Neighbours in ${eta} min` : `${coming.length} coming`, guard && guard.status !== 'requested' ? guardLine : null]
            .filter(Boolean).join(' · ')
        : `${alert?.notified_count ?? 0} neighbours alerted · waiting for someone to respond`;
    const firstLine = coming.length === 1 && eta != null && !guard ? `First neighbour arrives in about ${eta} min` : subtitle;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                customMapStyle={streetMapStyle}
                mapPadding={{top: 0, left: 0, right: 0, bottom: SHEET}}
                region={home?.lat != null ? {latitude: home.lat, longitude: home.lng!,
                    // Widening zooms out until the outer ring fits the width, as in the frame.
                    latitudeDelta: widening ? ((widened ? 1000 : 500) * 2.3) / 111000 : 0.008,
                    longitudeDelta: widening ? ((widened ? 1000 : 500) * 2.3) / 111000 : 0.008} : undefined}
                toolbarEnabled={false}>
                {home?.lat != null && widening && (
                    <>
                        <Circle center={{latitude: home.lat, longitude: home.lng!}} radius={widened ? 1000 : 500}
                                fillColor="rgba(0,136,255,0.10)" strokeColor={c.bg.brand} strokeWidth={2} lineDashPattern={[8, 6]}/>
                        <Circle center={{latitude: home.lat, longitude: home.lng!}} radius={widened ? 500 : 200}
                                fillColor="rgba(0,136,255,0.16)" strokeColor={c.bg.brand} strokeWidth={2}/>
                    </>
                )}
                {home?.lat != null && widening && (
                    <Marker coordinate={{latitude: home.lat + (widened ? 1000 : 500) / 111000 * 0.72,
                        longitude: home.lng! + (widened ? 1000 : 500) / 111000 * 0.72}} anchor={{x: 0.5, y: 0.5}} tracksViewChanges={false}>
                        <View style={[styles.radiusPill, {backgroundColor: c.bg.surface}]}>
                            <Text variant="caption1" color={c.text.brand}>{widened ? '1 000 m' : '500 m'}</Text>
                        </View>
                    </Marker>
                )}
                {home?.lat != null && (
                    <Marker coordinate={{latitude: home.lat, longitude: home.lng!}} anchor={{x: 0.5, y: 0.5}}>
                        <AlertPin/>
                    </Marker>
                )}
            </MapView>

            <View style={[styles.livePill, {top: insets.top + 8, backgroundColor: c.bg.danger}]}>
                <Text variant="caption2" color={c.text.onBrand}>● LIVE · sharing your location</Text>
            </View>
            {!widening && (
                <Pressable onPress={() => setDim(true)} style={[styles.dimBtn, {top: insets.top + 42}]}>
                    <Icon name="eye" size={16} color="#ffffff"/>
                    <Text variant="label" color="#ffffff">Dim screen</Text>
                </Pressable>
            )}

            <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34),
                paddingTop: widening ? 10 : 8}]}>
                <View style={[styles.grabber, widening ? {alignSelf: 'center', backgroundColor: c.border.default} : {backgroundColor: c.border.strong}]}/>
                {widening ? (
                    <>
                        <View style={{gap: 8}}>
                            <View style={[styles.chip, {backgroundColor: c.feedback.warningBg}]}>
                                <Icon name="clock" size={16} color={c.feedback.warning}/>
                                <Text variant="label" color={c.feedback.warning}>No response yet · {mmss(since)}</Text>
                            </View>
                            <Text variant="title2">Widening your alert</Text>
                        </View>
                        <View style={{gap: 12}}>
                            <Step icon="check" tone="success" text={`${alert?.notified_count ?? 0} neighbours within 500 m were alerted`}/>
                            <Step icon="siren" tone="brand" text={widened ? 'Now alerting more homes within 1 000 m'
                                : `If nobody answers by 2:00, homes up to 1 000 m are alerted too`}/>
                            {guard && <Step icon="shield-check" tone="brand" text={guard.eta_min != null
                                ? `${guard.provider} notified · guard about ${guard.eta_min} min away` : `${guard.provider} notified`}/>}
                        </View>
                        <View style={styles.actions}>
                            <Button title="Call 112" icon="phone" variant="danger" size="M" style={styles.flex} onPress={() => Linking.openURL('tel:112')}/>
                            <Button title="I’m safe" variant="outline" size="M" style={styles.flex} onPress={() => setConfirm(true)}/>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={{gap: 2}}>
                            <Text variant="title2">{coming.length || guard?.status === 'accepted' ? 'Help is on the way' : 'Your alert was sent'}</Text>
                            <Text variant="subhead" color={coming.length ? c.feedback.success : c.text.secondary}>{firstLine}</Text>
                        </View>
                        <ScrollView style={{maxHeight: 240}} contentContainerStyle={{gap: 0}}>
                            {guard && guard.status !== 'requested' && (
                                <View style={[styles.guard, {backgroundColor: c.bg.inverse}]}>
                                    <View style={styles.guardIcon}><Icon name="shield-check" size={20} color="#73d98c"/></View>
                                    <View style={styles.flex}>
                                        <Text variant="caption2" color="#73d98c">{guard.provider.toUpperCase()} · {guard.status === 'arrived' ? 'ARRIVED' : 'DISPATCHED'}</Text>
                                        <Text variant="headline" color={c.text.inverse}>{guard.guard_name || 'A guard'} is {guard.status === 'arrived' ? 'here' : 'coming'}</Text>
                                        {guard.eta_min != null && <Text variant="footnote" color={c.text.inverse}>About {guard.eta_min} min</Text>}
                                    </View>
                                    {guard.guard_phone ? (
                                        <Pressable accessibilityLabel="Call the guard" onPress={() => Linking.openURL(`tel:${guard.guard_phone}`)}
                                                   style={[styles.guardCall, {backgroundColor: c.bg.brand}]}>
                                            <Icon name="phone" size={18} color={c.text.onBrand}/>
                                        </Pressable>
                                    ) : null}
                                </View>
                            )}
                            {responses.map((r) => <ResponderRow key={r.responder_id} response={r}/>)}
                        </ScrollView>
                        <View style={styles.actions}>
                            <Button title="Call 112" variant="danger" size="M" style={styles.flex} onPress={() => Linking.openURL('tel:112')}/>
                            <Button title="I'm safe now" size="M" style={styles.flex} onPress={() => setConfirm(true)}/>
                        </View>
                    </>
                )}
            </View>

            {dim && (
                <Pressable style={styles.dim} onPress={() => setDim(false)} accessibilityLabel="Show screen">
                    <Text variant="footnote" color="rgba(255,255,255,0.35)">Alert still live · tap to show</Text>
                </Pressable>
            )}

            <Modal visible={confirm} transparent animationType="slide" onRequestClose={() => setConfirm(false)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.4)'}]} onPress={() => setConfirm(false)}/>
                <View style={[styles.confirm, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {alignSelf: 'center', backgroundColor: c.border.default}]}/>
                    <Image source={require('@/assets/illustrations/secure.png')} style={styles.secure} contentFit="contain"/>
                    <View style={{gap: 8}}>
                        <Text variant="title1" style={styles.centre}>Are you safe now?</Text>
                        <Text variant="body" color={c.text.secondary} style={styles.centre}>
                            We’ll tell your {coming.length || 'alerted'} {coming.length === 1 ? 'responder' : 'neighbours'}
                            {guard ? ` and ${guard.provider}` : ''} that the emergency is over.
                        </Text>
                    </View>
                    {pinSet && (
                        <View style={{gap: 6}}>
                            <Text variant="label">Safety PIN</Text>
                            <TextInput value={pin} autoFocus secureTextEntry keyboardType="number-pad" placeholder="••••"
                                       placeholderTextColor={c.text.muted}
                                       onChangeText={(v) => { setPin(v.replace(/\D/g, '').slice(0, 8)); setPinError(null); }}
                                       style={[type.body, styles.pin, {borderColor: pinError ? c.feedback.error : c.border.default, color: c.text.primary}]}/>
                            {pinError ? <Text variant="footnote" color={c.feedback.error}>{pinError}</Text> : null}
                        </View>
                    )}
                    {pinSet && <Note icon="lock">If someone is forcing you, enter your duress PIN. It looks the same, but keeps your alert live.</Note>}
                    <Button title="Yes, I’m safe" onPress={resolve} loading={busy} disabled={pinSet && pin.length < 4}/>
                    <Button title="Not yet" variant="text" onPress={() => { setConfirm(false); setPin(''); }}/>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    centre: {textAlign: 'center'},
    livePill: {position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999},
    dimBtn: {
        position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 14,
        paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(20,26,36,0.85)',
    },
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16, paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28},
    grabber: {width: 36, height: 5, borderRadius: 3},
    radiusPill: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999},
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingLeft: 10, paddingRight: 12, paddingVertical: 6, borderRadius: 999},
    step: {flexDirection: 'row', alignItems: 'center', gap: 12},
    stepIcon: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
    actions: {flexDirection: 'row', gap: 8},
    guard: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, marginBottom: 6},
    guardIcon: {width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center'},
    guardCall: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    dim: {...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60},
    confirm: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16, paddingTop: 10, paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28},
    secure: {width: 82, height: 82, alignSelf: 'center'},
    pin: {height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16},
});
