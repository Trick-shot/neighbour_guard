import {router} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {authApi} from '@/lib/endpoints';
import {radius, useColors} from '@/theme';

/**
 * Figma "Android · 01" / "Onboarding — phone". Stage 2 of 4, second half.
 *
 * Skippable on purpose: the app works without a number. What it costs is spelled out on screen,
 * because the number is how a responder calls you during a live alert, and how an SOS still goes
 * out by SMS when there is no data.
 */
const TZ_PHONE = /^(\+255|255|0)[0-9]{9}$/;

export default function OnboardingPhone() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const send = async () => {
        const value = phone.replace(/\s/g, '');
        if (!TZ_PHONE.test(value)) return setError('A Tanzanian number, like 0712 345 678.');
        setBusy(true);
        setError(null);
        try {
            await authApi.requestPhoneCode(value);
            router.push({pathname: '/authentication/phoneCode', params: {phone: value}});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 10}]}>
            <View style={styles.header}>
                <StageProgress stage={2}/>
            </View>
            <View style={styles.content}>
                <View style={[styles.badge, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="phone" size={34} color={c.icon.brand}/>
                </View>
                <View style={styles.heading}>
                    <Text variant="title1">Your phone number</Text>
                    <Text variant="body" color={c.text.secondary}>
                        We text a 6-digit code to check it works. The number is only shown to neighbours while
                        one of your own alerts is live.
                    </Text>
                </View>
                <TextField label="Phone number" value={phone} keyboardType="phone-pad" autoComplete="tel"
                           textContentType="telephoneNumber" placeholder="0712 345 678" error={error}
                           returnKeyType="send" onSubmitEditing={send}
                           onChangeText={(v) => { setPhone(v); setError(null); }}/>
                <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="triangle-alert" size={20} color={c.feedback.warning}/>
                    <Text variant="subhead" color={c.text.secondary} style={styles.noteText}>
                        Without a verified number, a responder cannot call you, and an SOS cannot fall back to
                        SMS when there is no data.
                    </Text>
                </View>
            </View>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Send the code" onPress={send} loading={busy}/>
                <Text variant="subhead" color={c.text.secondary} style={styles.centre}
                      onPress={() => router.replace('/authentication/location')}>
                    Add it later in Profile
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {paddingHorizontal: 16},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 28, gap: 20, alignItems: 'flex-start'},
    badge: {width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center'},
    heading: {gap: 8},
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    noteText: {flex: 1},
    footer: {paddingHorizontal: 16, gap: 12},
    centre: {textAlign: 'center'},
});
