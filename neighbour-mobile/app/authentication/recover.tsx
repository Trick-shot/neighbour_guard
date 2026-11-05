import {router, useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icon, {IconName} from '@/components/ui/Icon';
import Illustration from '@/components/ui/Illustration';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {authApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

import {isEmail} from './email';

/**
 * Figma "Can’t access email" (1631:1475). The phone option texts the sign-in code to the verified
 * number on the account; the server picks the number, so nothing here can redirect it.
 * Neighbour recovery has no server side yet, so its row says so instead of pretending.
 */
function Option({icon, title, body, onPress, disabled}: { icon: IconName; title: string; body: string; onPress?: () => void; disabled?: boolean }) {
    const c = useColors();
    return (
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
                   style={[styles.option, {borderColor: c.border.default, backgroundColor: c.bg.surface, opacity: disabled ? 0.6 : 1}]}>
            <View style={[styles.iconBox, {backgroundColor: c.bg.subtle}]}><Icon name={icon} size={20} color={c.icon.brand}/></View>
            <View style={styles.text}>
                <Text variant="headline">{title}</Text>
                <Text variant="footnote" color={c.text.secondary}>{body}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={c.icon.muted}/>
        </Pressable>
    );
}

export default function Recover() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ email?: string }>();
    const [email, setEmail] = useState(params.email ?? '');
    const [error, setError] = useState<string | null>(null);

    const byPhone = async () => {
        const value = email.trim().toLowerCase();
        if (!isEmail(value)) return setError('Which email did you sign up with?');
        try {
            await authApi.requestSmsCode(value);
            router.push({pathname: '/authentication/code', params: {email: value, mode: 'signin', via: 'sms'}});
        } catch (e: any) {
            setError(e.message);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader tone="default"/>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Illustration source={require('@/assets/illustrations/verify-identity.png')} size={180}/>
                <View style={styles.heading}>
                    <Text variant="title1">Can’t access your email?</Text>
                    <Text variant="body" color={c.text.secondary}>Get back into your account and keep your trust level and neighbours.</Text>
                </View>
                {!params.email && (
                    <TextField label="Email you signed up with" value={email} keyboardType="email-address" autoCapitalize="none"
                               error={error} onChangeText={(v) => { setEmail(v); setError(null); }}/>
                )}
                <View style={styles.options}>
                    <Option icon="phone" title="Use my phone number" body="We’ll text a code to the verified phone on your account" onPress={byPhone}/>
                    <Option icon="users" title="Ask a verified neighbour" disabled
                            body="Coming soon: they confirm it’s you, then you add your new email"/>
                </View>
                {params.email && error ? <Text variant="subhead" color={c.feedback.error}>{error}</Text> : null}
                <Note icon="lock">Your old email stops working for sign-in as soon as you switch.</Note>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 20},
    heading: {gap: 8},
    options: {gap: 8},
    option: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1},
    iconBox: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    text: {flex: 1, gap: 2},
});
