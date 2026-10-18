import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import OtpInput from '@/components/ui/OtpInput';
import Text from '@/components/ui/Text';
import {useAuth} from '@/context/AuthContext';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Sign in — code" (1631:1434). */
const RESEND_AFTER = 30;

export default function SignInCode() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {email = ''} = useLocalSearchParams<{ email: string }>();
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

    const signIn = async (value = code) => {
        if (value.length !== 6) return;
        setBusy(true);
        setError(null);
        try {
            const tokens = await authApi.verifyEmailCode(email, value);
            await login(tokens.access, tokens.refresh);
            router.replace('/(tabs)');
        } catch (e: any) {
            setError(e.message);
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setWait(RESEND_AFTER);
        await authApi.requestEmailCode(email).catch(() => undefined);
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
                <Icon name="chevron-left" size={24} color={c.icon.brand}/>
            </Pressable>
            <View style={styles.heading}>
                <Text variant="title1">Enter the 6-digit code</Text>
                <Text variant="body" color={c.text.secondary}>
                    Sent to {email} · <Text variant="body" color={c.text.brand} onPress={() => router.back()}>Change</Text>
                </Text>
            </View>
            <View style={styles.otp}>
                <OtpInput value={code} onChange={(v) => { setCode(v); setError(null); if (v.length === 6) signIn(v); }}/>
            </View>
            {error ? (
                <Text variant="subhead" color={c.feedback.error} style={styles.below}>{error}</Text>
            ) : wait > 0 ? (
                <Text variant="subhead" color={c.text.muted} style={styles.below}>Resend code in 0:{String(wait).padStart(2, '0')}</Text>
            ) : (
                <Text variant="subhead" color={c.text.brand} style={styles.below} onPress={resend}>Resend code</Text>
            )}
            <View style={{flex: 1}}/>
            <Button title="Sign in" onPress={() => signIn()} loading={busy} disabled={code.length !== 6}
                    style={[styles.cta, {marginBottom: Math.max(insets.bottom, 16)}]}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    back: {marginLeft: 12, marginTop: 10, width: 24, height: 24},
    heading: {paddingHorizontal: 16, marginTop: 32, gap: 8},
    otp: {marginTop: 40},
    below: {marginLeft: 16, marginTop: 20},
    cta: {marginHorizontal: 29.5},
});
