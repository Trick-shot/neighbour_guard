import * as Haptics from 'expo-haptics';
import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Circle} from 'react-native-svg';

import AlertTypeChip, {ALERT_META} from '@/components/ui/AlertTypeChip';
import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {Alert, AlertType} from '@/lib/types';
import {palettes} from '@/theme/colors';

/**
 * Figma "SOS — sending in 10 s (cancel window)" (1677:780).
 * The alert already exists on the server as "pending"; the server sends it when the countdown
 * ends even if this phone dies. This screen shows the countdown and lets the person cancel,
 * send at once, or change the type.
 */
const INK = palettes.light.bg.inverse; // this screen is always dark, in light and dark mode
const RED = palettes.light.bg.danger;
const TOTAL = 10;
const SIZE = 200;
const STROKE = 10;
const CHOICES: AlertType[] = ['robbery', 'medical', 'fire'];

export default function Countdown() {
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const alertId = Number(id);
    const [alert, setAlert] = useState<Alert | null>(null);
    const [left, setLeft] = useState(TOTAL);
    const [busy, setBusy] = useState<'send' | 'cancel' | null>(null);
    const deadline = useRef<number>(Date.now() + TOTAL * 1000);
    const leaving = useRef(false);

    const goLive = () => {
        if (leaving.current) return;
        leaving.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({pathname: '/sos/live', params: {id: String(alertId)}});
    };

    useEffect(() => {
        alertsApi.get(alertId).then((a) => {
            setAlert(a);
            deadline.current = Date.now() + a.seconds_left * 1000;
            if (a.status === 'sent') goLive();
        }).catch(() => undefined);
    }, [alertId]);

    useEffect(() => {
        const t = setInterval(async () => {
            const s = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
            setLeft(s);
            if (s > 0) {
                Haptics.selectionAsync();
                return;
            }
            // The server sends at send_at; confirm and move on (also covers a slow worker).
            const a = await alertsApi.get(alertId).catch(() => null);
            if (a?.status === 'sent') goLive();
            if (a?.status === 'cancelled') router.replace('/(tabs)');
        }, 1000);
        return () => clearInterval(t);
    }, [alertId]);

    const changeType = async (type: AlertType) => {
        if (!alert || alert.type === type) return;
        setAlert({...alert, type});
        const updated = await alertsApi.changeType(alertId, type).catch(() => null);
        if (updated) setAlert(updated);
    };

    const sendNow = async () => {
        setBusy('send');
        try {
            await alertsApi.sendNow(alertId);
            goLive();
        } catch {
            setBusy(null);
        }
    };

    const cancel = async () => {
        setBusy('cancel');
        try {
            await alertsApi.cancel(alertId);
            router.replace('/(tabs)');
        } catch (e: any) {
            // 409 = it was already sent: show what is happening instead.
            if (e.status === 409) goLive();
            else setBusy(null);
        }
    };

    const r = SIZE / 2 - STROKE / 2;
    const circumference = 2 * Math.PI * r;
    const label = alert ? ALERT_META[alert.type].label : 'Emergency';
    const recipients = alert?.recipients;
    const body = alert
        ? `${label} alert to ${recipients ?? 'your'} neighbour${recipients === 1 ? '' : 's'} within ${alert.radius_m} m. Pressed by mistake? Cancel now and nobody is disturbed.`
        : 'Pressed by mistake? Cancel now and nobody is disturbed.';

    return (
        <View style={[styles.screen, {paddingTop: insets.top}]}>
            <View style={styles.ringBox}>
                <Svg width={SIZE} height={SIZE} style={{transform: [{rotate: '-90deg'}]}}>
                    <Circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={STROKE} fill="none"/>
                    <Circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke={RED} strokeWidth={STROKE} fill="none" strokeLinecap="round"
                            strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - left / TOTAL)}/>
                </Svg>
                <View style={styles.ringCenter}>
                    <Text variant="displaySOS" color="#ffffff">{left}</Text>
                    <Text variant="subhead" color="rgba(255,255,255,0.7)">seconds</Text>
                </View>
            </View>

            <Text variant="title1" color="#ffffff" style={[styles.center, {marginTop: 30}]}>Sending your alert…</Text>
            <Text variant="body" color="rgba(255,255,255,0.72)" style={[styles.center, styles.body]}>{body}</Text>

            <View style={styles.types}>
                {CHOICES.map((t) => (
                    <AlertTypeChip key={t} type={t} selected={alert?.type === t} onPress={() => changeType(t)}/>
                ))}
            </View>
            <Text variant="footnote" color="rgba(255,255,255,0.55)" style={styles.center}>Change the type before it goes out.</Text>

            <View style={{flex: 1}}/>
            <View style={[styles.buttons, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Send now" variant="danger" onPress={sendNow} loading={busy === 'send'} disabled={!!busy}/>
                <Button title="Cancel · it was a mistake" variant="outlineOnDark" onPress={cancel} loading={busy === 'cancel'} disabled={!!busy}/>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: INK, alignItems: 'center'},
    ringBox: {marginTop: 96, width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center'},
    ringCenter: {position: 'absolute', alignItems: 'center'},
    center: {textAlign: 'center'},
    body: {width: 340, marginTop: 10},
    types: {flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 12},
    buttons: {width: 343, gap: 8},
});
