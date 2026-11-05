import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import OtpInput from '@/components/ui/OtpInput';
import Text from '@/components/ui/Text';
import {useAuth} from '@/context/AuthContext';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/**
 * Figma "Onboarding — code" (1619:591) and "Sign in — code" (1631:1434): the same screen, with the
 * stage header only during sign-up. One code both signs in and signs up; the server says which it
 * was (`is_new`), and a new account carries on into onboarding.
 */
const RESEND_AFTER = 30;

export default function EmailCode() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {email = '', mode, via} = useLocalSearchParams<{ email: string; mode?: 'signup' | 'signin'; via?: 'sms' }>();
    const signup = mode === 'signup';
    const {login} = useAuth();
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
            const tokens = await authApi.verifyEmailCode(email, value);
            await login(tokens.access, tokens.refresh);
            router.replace(tokens.is_new ? '/authentication/phone' : '/(tabs)');
        } catch (e: any) {
            setError(e.message);
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setWait(RESEND_AFTER);
        await (via === 'sms' ? authApi.requestSmsCode(email) : authApi.requestEmailCode(email)).catch(() => undefined);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={signup ? 1 : undefined} progress={0.5}/>
            <View style={styles.heading}>
                <Text variant="title1">Enter the 6-digit code</Text>
                <Text variant="body" color={c.text.secondary}>
                    Sent to {via === 'sms' ? 'the phone on your account' : email} · <Text variant="body" color={c.text.brand} onPress={() => router.back()}>Change</Text>
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
                <Button title={signup ? 'Verify' : 'Sign in'} onPress={() => verify()} loading={busy} disabled={code.length !== 6}/>
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
