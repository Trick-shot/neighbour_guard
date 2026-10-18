import {router, useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {Linking, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ALERT_META} from '@/components/ui/AlertTypeChip';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {AlertType} from '@/lib/types';
import {smsRef, SOS_SHORTCODE} from '@/lib/sms';
import {radius, useColors} from '@/theme';

/**
 * Figma page "Android · 09" / "System — offline SMS send".
 *
 * Where the SOS goes when there is no data. The phone hands the message to the SMS app already
 * written, including the 8-character ref taken from the client_id it already made — so when data
 * comes back and the app retries over HTTP, the server recognises the same emergency and does not
 * raise a second alert.
 *
 * The shortcode is compiled into the app rather than fetched, because the one moment this screen
 * exists for is the moment the network is gone.
 */
export default function SmsFallback() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {clientId = '', type = 'emergency'} = useLocalSearchParams<{ clientId: string; type: AlertType }>();
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ref = smsRef(clientId);
    const body = `SOS ${type} ${ref}`;
    const meta = ALERT_META[type as AlertType] ?? ALERT_META.emergency;

    const openSms = async () => {
        if (!SOS_SHORTCODE) {
            setError('This build has no SOS number set. Call 112.');
            return;
        }
        // iOS wants & before the body, Android wants ?.
        const url = Platform.OS === 'ios'
            ? `sms:${SOS_SHORTCODE}&body=${encodeURIComponent(body)}`
            : `sms:${SOS_SHORTCODE}?body=${encodeURIComponent(body)}`;
        try {
            await Linking.openURL(url);
            setSent(true);
        } catch {
            setError(`Could not open the SMS app. Text “${body}” to ${SOS_SHORTCODE}.`);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.danger, paddingTop: insets.top + 16}]}>
            <View style={styles.content}>
                <View style={styles.badge}>
                    <Icon name="volume-x" size={34} color="#ffffff"/>
                </View>
                <Text variant="title1" color="#ffffff">No connection</Text>
                <Text variant="body" color="rgba(255,255,255,0.9)">
                    Your {meta.label.toLowerCase()} alert cannot go out over the internet. Send it as a text
                    instead — it reaches the same neighbours.
                </Text>

                <View style={styles.preview}>
                    <Text variant="caption1" color="rgba(255,255,255,0.75)">To {SOS_SHORTCODE || '—'}</Text>
                    <Text variant="bodyEmphasis" color="#ffffff">{body}</Text>
                    <Text variant="caption1" color="rgba(255,255,255,0.75)">
                        The code is what stops this becoming two alerts when your data comes back.
                    </Text>
                </View>

                {sent && (
                    <Text variant="subhead" color="#ffffff">
                        Once the text is sent, your neighbours are alerted straight away — there is no 10 second
                        countdown on an SMS.
                    </Text>
                )}
                {error && <Text variant="subhead" color="#ffffff">{error}</Text>}
            </View>

            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Open the SMS app" variant="white" onPress={openSms}/>
                <Button title="Call 112 instead" variant="outlineOnDark"
                        onPress={() => Linking.openURL('tel:112').catch(() => undefined)}/>
                <Text variant="subhead" color="#ffffff" style={styles.centre} onPress={() => router.back()}>
                    Back
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {flex: 1, paddingHorizontal: 20, gap: 14},
    badge: {width: 64, height: 64, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.18)'},
    preview: {backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: radius.md, padding: 16, gap: 6},
    footer: {paddingHorizontal: 20, gap: 12},
    centre: {textAlign: 'center'},
});
