import {Image} from 'expo-image';
import {router} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Sign in — email" (1631:1402). */
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function SignInEmail() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const send = async () => {
        if (!isEmail(email)) return setError('Enter the email you signed up with.');
        setBusy(true);
        setError(null);
        try {
            await authApi.requestEmailCode(email.trim().toLowerCase());
            router.push({pathname: '/authentication/code', params: {email: email.trim().toLowerCase()}});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <Pressable accessibilityLabel="Back" onPress={() => router.canGoBack() && router.back()} style={styles.back}>
                <Icon name="chevron-left" size={24}/>
            </Pressable>
            <View style={styles.content}>
                <View style={[styles.hero, {backgroundColor: c.bg.brandSubtle}]}>
                    <Image source={require('@/assets/illustrations/signin.png')} style={styles.heroImage} contentFit="contain"/>
                </View>
                <View style={styles.heading}>
                    <Text variant="title1">Welcome back</Text>
                    <Text variant="body" color={c.text.secondary}>Enter the email you signed up with and we’ll send you a code.</Text>
                </View>
                <TextField
                    label="Email"
                    value={email}
                    onChangeText={(v) => { setEmail(v); setError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={send}
                    error={error}
                />
                <Text variant="subhead" color={c.text.brand}>Can’t access your email?</Text>
            </View>
            <Button title="Send code" onPress={send} loading={busy} style={[styles.cta, {marginBottom: Math.max(insets.bottom, 16)}]}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    back: {marginLeft: 12, marginTop: 10, width: 24, height: 24},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 20},
    hero: {height: 190, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
    heroImage: {width: 190, height: 190},
    heading: {gap: 8},
    cta: {marginHorizontal: 29.5},
});
