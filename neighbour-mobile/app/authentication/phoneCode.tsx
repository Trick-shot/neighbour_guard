import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import OtpInput from '@/components/ui/OtpInput';
import Text from '@/components/ui/Text';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/**
 * The SMS code for the phone number. Same layout as "Onboarding — code" (1619:591); Figma has no
 * separate frame for it. The server takes the number from its own OTP record, never from here.
 */
const RESEND_AFTER = 30;

export default function PhoneCode() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {phone = '', from} = useLocalSearchParams<{ phone: string; from?: string }>();
    const onboarding = from !== 'profile';
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
        if (value.length !== 6 || busy) return;
        setBusy(true);
        setError(null);
        try {
            await authApi.verifyPhoneCode(value);
            if (onboarding) router.replace('/authentication/profile');
            else router.dismissTo('/profile/personal');
        } catch (e: any) {
            setError(e.message);
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setWait(RESEND_AFTER);
        await authApi.requestPhoneCode(phone).catch(() => undefined);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={onboarding ? 1 : undefined} progress={0.75}/>
            <View style={styles.heading}>
                <Text variant="title1">Enter the 6-digit code</Text>
                <Text variant="body" color={c.text.secondary}>
                    Sent to {phone} · <Text variant="body" color={c.text.brand} onPress={() => router.back()}>Change</Text>
                </Text>
            </View>
            <View style={styles.otp}>
                <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); if (v.length === 6) verify(v); }}/>
            </View>
            {error ? (
                <Text variant="subhead" color={c.feedback.error} style={styles.below}>{error}</Text>
            ) : wait > 0 ? (
                <Text variant="subhead" color={c.text.muted} style={styles.below}>Resend code in 0:{String(wait).padStart(2, '0')}</Text>
            ) : (
                <Text variant="subhead" color={c.text.brand} style={styles.below} onPress={resend}>Resend code</Text>
            )}
            <Footer>
                <Button title="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== 6}/>
            </Footer>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    heading: {paddingHorizontal: 16, marginTop: 32, gap: 8},
    // Cells at y 260 in the frame, 68 px under the heading.
    otp: {marginTop: 68, alignItems: 'center'},
    below: {marginLeft: 16, marginTop: 20},
});
