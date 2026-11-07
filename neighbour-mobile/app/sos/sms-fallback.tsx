import {Image} from 'expo-image';
import * as Location from 'expo-location';
import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {Linking, Platform, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon, {IconName} from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {prefs} from '@/lib/prefs';
import {smsRef, SOS_SHORTCODE} from '@/lib/sms';
import {AlertType} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "No internet — send SOS by SMS" (1767:203), then "Offline SMS fallback" (1635:2945).
 *
 * Where the SOS goes when there is no data. The phone hands the message to the SMS app already
 * written, including the 8-character ref taken from the client_id it already made — so when data
 * comes back and the app retries over HTTP, the server recognises the same emergency and does not
 * raise a second alert. The server reads the word after "SOS" as the type (alerts/sms_inbound.py),
 * texts back when it is received, and again when the first neighbour is on the way.
 *
 * The shortcode and the home are on the phone already, because the one moment this screen exists
 * for is the moment the network is gone.
 */
export default function SmsFallback() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {clientId = '', type = 'emergency'} = useLocalSearchParams<{ clientId: string; type: AlertType }>();
    const [home, setHome] = useState<{ house_number?: string; street?: string; contacts?: number } | null>(null);
    const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
    const [sentAt, setSentAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);

    useEffect(() => {
        prefs.offlineHome().then(setHome);
        // GPS works without data. The last fix is instant; it is a hint for people, not for routing.
        Location.getLastKnownPositionAsync().then((p) => p && setHere({lat: p.coords.latitude, lng: p.coords.longitude})).catch(() => undefined);
    }, []);

    const ref = smsRef(clientId);
    const parts = [
        `SOS ${String(type).toUpperCase()}`,
        home?.house_number ? `House ${home.house_number}, ${home.street}` : null,
        here ? `${here.lat.toFixed(4)}, ${here.lng.toFixed(4)}` : null,
        ref ? `ref ${ref}` : null,
    ].filter(Boolean);
    const body = parts.join(' · ');

    const send = async () => {
        if (!SOS_SHORTCODE) return setError('This build has no SOS number set. Call 112.');
        // iOS wants & before the body, Android wants ?.
        const url = Platform.OS === 'ios' ? `sms:${SOS_SHORTCODE}&body=${encodeURIComponent(body)}` : `sms:${SOS_SHORTCODE}?body=${encodeURIComponent(body)}`;
        try {
            await Linking.openURL(url);
            setSentAt(new Date().toTimeString().slice(0, 5));
        } catch {
            setError(`Could not open the SMS app. Text “${body}” to ${SOS_SHORTCODE}.`);
        }
    };

    // "I'm safe" ends the alert in the app, with the PIN. With data back, the same client_id adopts
    // the SMS alert; without it there is nothing to end yet, and the screen says so.
    const safe = async () => {
        try {
            const alert = await alertsApi.create(clientId, type as AlertType);
            router.replace({pathname: '/sos/live', params: {id: String(alert.id)}});
        } catch {
            setNote('Still no data. Your neighbours keep coming until you end the alert in the app, with your PIN, once you’re back online.');
        }
    };

    const Banner = ({text}: { text: string }) => (
        <View style={[styles.banner, {backgroundColor: c.feedback.warningBg, paddingTop: insets.top + 10}]}>
            <Icon name="volume-x" size={18} color={c.feedback.warning}/>
            <Text variant="subhead" color={c.text.primary}>{text}</Text>
        </View>
    );
    const Line = ({icon, tone, text}: { icon: IconName; tone: 'ok' | 'wait'; text: string }) => (
        <View style={styles.line}>
            <View style={[styles.tick, {backgroundColor: tone === 'ok' ? c.feedback.successBg : c.feedback.warningBg}]}>
                <Icon name={icon} size={16} color={tone === 'ok' ? c.feedback.success : c.feedback.warning}/>
            </View>
            <Text variant="subhead" style={styles.flex}>{text}</Text>
        </View>
    );

    if (sentAt) {
        const contacts = home?.contacts;
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
                <Banner text="No internet · using SMS"/>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.art, {backgroundColor: c.bg.brandSubtle}]}>
                        <Image source={require('@/assets/illustrations/offline.png')} style={styles.artImg} contentFit="contain"/>
                    </View>
                    <Text variant="title1">Alert sent by SMS</Text>
                    <Text variant="body" color={c.text.secondary}>You have no data, so we sent your alert as a text message. Your home was included.</Text>
                    <Line icon="check" tone="ok" text={`Texted NeighbourGuard at ${sentAt}. Neighbours are alerted as it arrives`}/>
                    {!!contacts && <Line icon="check" tone="ok" text={`Your ${contacts} emergency contact${contacts === 1 ? '' : 's'} will be texted`}/>}
                    <Line icon="clock" tone="wait" text="Live updates resume when you’re back online"/>
                    {note && <Text variant="footnote" color={c.text.secondary}>{note}</Text>}
                </ScrollView>
                <Footer gap={12}>
                    <Button title="Call 112" variant="danger" icon="phone" onPress={() => Linking.openURL('tel:112').catch(() => undefined)}/>
                    <Button title="I’m safe" variant="text" onPress={safe}/>
                </Footer>
            </View>
        );
    }

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <Banner text="No internet · SOS will go by SMS"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.badge, {backgroundColor: c.feedback.errorBg}]}><Icon name="send" size={22} color={c.icon.danger}/></View>
                <Text variant="title1">Send your alert by SMS</Text>
                <Text variant="body" color={c.text.secondary}>You have no data right now. Your phone’s SMS app will open with this alert ready. Just tap Send.</Text>
                <View style={[styles.preview, {backgroundColor: c.bg.subtle, borderColor: c.border.default}]}>
                    <Text variant="caption1" color={c.text.muted}>TO NEIGHBOURGUARD · {SOS_SHORTCODE || '—'}</Text>
                    <Text variant="body">{body}</Text>
                </View>
                <Line icon="users" tone="ok" text="Our server alerts your neighbours and texts your emergency contacts"/>
                <Line icon="map-pin" tone="ok" text="Your home is in the message, so the right street is alerted"/>
                <Line icon="check" tone="ok" text="You’ll get a reply SMS when someone is on the way"/>
                {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
            </ScrollView>
            <Footer gap={12}>
                <Button title="Send SMS" variant="danger" icon="send" onPress={send}/>
                <Button title="Call 112 instead" variant="text" onPress={() => Linking.openURL('tel:112').catch(() => undefined)}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    banner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 10},
    content: {padding: 16, gap: 14},
    badge: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 16},
    preview: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 6},
    line: {flexDirection: 'row', alignItems: 'center', gap: 12},
    tick: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
    art: {height: 190, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
    artImg: {width: 180, height: 170},
});
