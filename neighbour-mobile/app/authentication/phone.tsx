import {router, useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/**
 * Figma "Onboarding — phone (SMS backup)" (1637:694). Stage 1, three quarters. Skippable: the app
 * works without a number, but an SOS cannot fall back to SMS and nobody can call you back.
 * Also opened from Profile (`?from=profile`), where it has no stage bar.
 */
const TZ_PHONE = /^(\+255|255|0)[67][0-9]{8}$/;

export default function OnboardingPhone() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {from} = useLocalSearchParams<{ from?: string }>();
    const onboarding = from !== 'profile';
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const send = async () => {
        const value = phone.replace(/[\s-]/g, '');
        if (!TZ_PHONE.test(value)) return setError('A Tanzanian mobile number, like +255 754 375 852.');
        setBusy(true);
        setError(null);
        try {
            await authApi.requestPhoneCode(value);
            router.push({pathname: '/authentication/phoneCode', params: {phone: value, from: from ?? ''}});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={onboarding ? 1 : undefined} progress={0.75}
                              back={!onboarding || router.canGoBack()}/>
            <View style={styles.content}>
                <View style={styles.heading}>
                    <Text variant="title1">Add your phone number</Text>
                    <Text variant="body" color={c.text.secondary}>
                        So your SOS still works without data, and responders can call you back.
                    </Text>
                </View>
                <TextField label="Phone number" value={phone} autoFocus keyboardType="phone-pad" autoComplete="tel"
                           textContentType="telephoneNumber" placeholder="+255 7XX XXX XXX" error={error}
                           helper="We’ll text a code to confirm it" returnKeyType="send" onSubmitEditing={send}
                           onChangeText={(v) => { setPhone(v); setError(null); }}/>
                <Note icon="eye">Neighbours only see your number during a live alert.</Note>
            </View>
            <Footer>
                <Button title="Send code" onPress={send} loading={busy}/>
                <Button title="Skip for now" variant="text"
                        onPress={() => (onboarding ? router.replace('/authentication/profile') : router.back())}/>
            </Footer>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, marginTop: 12, gap: 20},
    heading: {gap: 8},
});
