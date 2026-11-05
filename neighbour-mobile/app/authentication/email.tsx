import {router} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Onboarding — email" (1619:558). Stage 1, a quarter through. No password anywhere. */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function OnboardingEmail() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const send = async () => {
        const value = email.trim().toLowerCase();
        if (!isEmail(value)) return setError('Enter an email you can open right now.');
        setBusy(true);
        setError(null);
        try {
            await authApi.requestEmailCode(value);
            router.push({pathname: '/authentication/code', params: {email: value, mode: 'signup'}});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={1} progress={0.25}/>
            <View style={styles.heading}>
                <Text variant="title1">What’s your email?</Text>
                <Text variant="body" color={c.text.secondary}>We’ll send you a 6-digit code. No password to remember.</Text>
            </View>
            <View style={styles.field}>
                <TextField label="Email" value={email} autoFocus keyboardType="email-address" autoCapitalize="none"
                           autoComplete="email" textContentType="emailAddress" placeholder="you@example.com"
                           helper="Use an email you check often" error={error} returnKeyType="send" onSubmitEditing={send}
                           onChangeText={(v) => { setEmail(v); setError(null); }}/>
            </View>
            <Footer note={<Text variant="caption1" color={c.text.muted} style={styles.terms}>
                By continuing you agree to the Terms and Privacy Policy.</Text>}>
                <Button title="Send code" onPress={send} loading={busy}/>
            </Footer>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    heading: {paddingHorizontal: 16, marginTop: 32, gap: 8},
    field: {paddingHorizontal: 16, marginTop: 56},
    terms: {textAlign: 'center', marginBottom: 8},
});
