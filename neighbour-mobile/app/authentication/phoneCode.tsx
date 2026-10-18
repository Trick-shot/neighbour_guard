import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import OtpInput from '@/components/ui/OtpInput';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Android · 01" / "Onboarding — phone code". Stage 2 of 4. */
const RESEND_AFTER = 60;   // the server allows 3 sends per 10 minutes, so do not invite retries

export default function OnboardingPhoneCode() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {phone = ''} = useLocalSearchParams<{ phone: string }>();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [wait, setWait] = useState(RESEND_AFTER);

    useEffect(() => {
        if (wait <= 0) return;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const verify = async (value = code) => {
        if (value.length !== 6) return;
        setBusy(true);
        setError(null);
        try {
            // The server takes the number from its own OTP record, not from anything we send.
            await authApi.verifyPhoneCode(value);
            router.replace('/authentication/location');
        } catch (e: any) {
            setError(e.message);
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setWait(RESEND_AFTER);
        setError(null);
        await authApi.requestPhoneCode(phone).catch((e: any) => setError(e.message));
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 10}]}>
            <View style={styles.header}>
                <Pressable accessibilityLabel="Back" onPress={() => router.canGoBack() && router.back()}
                           style={styles.back}>
                    <Icon name="chevron-left" size={24}/>
                </Pressable>
                <StageProgress stage={2}/>
            </View>
            <View style={styles.heading}>
                <Text variant="title1">Enter the 6-digit code</Text>
                <Text variant="body" color={c.text.secondary}>
                    Texted to {phone} ·{' '}
                    <Text variant="body" color={c.text.brand} onPress={() => router.back()}>Change</Text>
                </Text>
            </View>
            <View style={styles.otp}>
                <OtpInput value={code} onChange={(v) => {
                    setCode(v);
                    setError(null);
                    if (v.length === 6) verify(v);
                }}/>
            </View>
            {error ? (
                <Text variant="subhead" color={c.feedback.error} style={styles.below}>{error}</Text>
            ) : wait > 0 ? (
                <Text variant="subhead" color={c.text.muted} style={styles.below}>
                    Send a new code in 0:{String(wait).padStart(2, '0')}
                </Text>
            ) : (
                <Text variant="subhead" color={c.text.brand} style={styles.below} onPress={resend}>Send a new code</Text>
            )}
            <View style={{flex: 1}}/>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== 6}/>
                <Text variant="subhead" color={c.text.secondary} style={styles.centre}
                      onPress={() => router.replace('/authentication/location')}>
                    Skip for now
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {paddingHorizontal: 16, gap: 12},
    back: {width: 24, height: 24},
    heading: {paddingHorizontal: 16, marginTop: 28, gap: 8},
    otp: {marginTop: 32},
    below: {marginLeft: 16, marginTop: 20},
    footer: {paddingHorizontal: 16, gap: 12},
    centre: {textAlign: 'center'},
});
