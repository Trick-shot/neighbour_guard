import {router} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Android · 01" / "Onboarding — account". Stage 1 of 4. */
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type Errors = { fullName?: string; email?: string; password?: string; confirm?: string };

export default function OnboardingAccount() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<Errors>({});
    const [failed, setFailed] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const next: Errors = {};
        if (fullName.trim().length < 3) next.fullName = 'Your neighbours need to recognise this.';
        if (!isEmail(email)) next.email = 'Enter an email you can open right now.';
        // Django's own validators also run server-side and their message is shown if they disagree.
        if (password.length < 8) next.password = 'At least 8 characters.';
        if (confirm !== password) next.confirm = 'These two do not match.';
        setErrors(next);
        setFailed(null);
        if (Object.keys(next).length) return;

        setBusy(true);
        try {
            await authApi.signUp(fullName.trim(), email.trim().toLowerCase(), password);
            router.push({
                pathname: '/authentication/verifyEmail',
                params: {email: email.trim().toLowerCase(), password},
            });
        } catch (e: any) {
            setFailed(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <View style={styles.header}>
                <Pressable accessibilityLabel="Back" onPress={() => router.canGoBack() && router.back()}
                           style={styles.back}>
                    <Icon name="chevron-left" size={24}/>
                </Pressable>
                <StageProgress stage={1}/>
            </View>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
                                     showsVerticalScrollIndicator={false}
                                     contentContainerStyle={styles.content}>
                <View style={styles.heading}>
                    <Text variant="title1">Create your account</Text>
                    <Text variant="body" color={c.text.secondary}>
                        Your name is what a neighbour sees when you need help, so use the one they know you by.
                    </Text>
                </View>
                <TextField label="Full name" value={fullName} autoCapitalize="words" textContentType="name"
                           placeholder="Erick Luoga" error={errors.fullName}
                           onChangeText={(v) => { setFullName(v); setErrors((e) => ({...e, fullName: undefined})); }}/>
                <TextField label="Email" value={email} keyboardType="email-address" autoCapitalize="none"
                           autoComplete="email" textContentType="emailAddress" placeholder="you@example.com"
                           helper="We send a link here to prove the address is yours." error={errors.email}
                           onChangeText={(v) => { setEmail(v); setErrors((e) => ({...e, email: undefined})); }}/>
                <TextField label="Password" value={password} secureTextEntry autoCapitalize="none"
                           textContentType="newPassword" error={errors.password}
                           onChangeText={(v) => { setPassword(v); setErrors((e) => ({...e, password: undefined})); }}/>
                <TextField label="Confirm password" value={confirm} secureTextEntry autoCapitalize="none"
                           textContentType="newPassword" error={errors.confirm}
                           onChangeText={(v) => { setConfirm(v); setErrors((e) => ({...e, confirm: undefined})); }}/>
                {failed && <Text variant="subhead" color={c.feedback.error}>{failed}</Text>}
            </KeyboardAwareScrollView>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Continue" onPress={submit} loading={busy}/>
                <Text variant="subhead" color={c.text.secondary} style={styles.signIn}>
                    Already have an account?{' '}
                    <Text variant="subhead" color={c.text.brand}
                          onPress={() => router.replace('/authentication/login')}>Sign in</Text>
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {paddingHorizontal: 16, paddingTop: 10, gap: 12},
    back: {width: 24, height: 24},
    content: {paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 16},
    heading: {gap: 8},
    footer: {paddingHorizontal: 16, gap: 12},
    signIn: {textAlign: 'center'},
});
