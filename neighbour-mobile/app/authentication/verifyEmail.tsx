import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import {useAuth} from '@/context/AuthContext';
import {authApi} from '@/lib/endpoints';
import {radius, useColors} from '@/theme';

/**
 * Figma "Android · 01" / "Onboarding — verify email". Stage 2 of 4.
 *
 * Djoser will not issue tokens until the activation link is clicked, so signing in is itself the
 * test for "has he clicked it yet?". We keep the tokens when it finally works: everything after
 * this point talks to /api/v2, which reads the user from the token and never from the body.
 */
const POLL_EVERY_MS = 5000;
const RESEND_AFTER = 30;

export default function OnboardingVerifyEmail() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {email = '', password = ''} = useLocalSearchParams<{ email: string; password: string }>();
    const {login} = useAuth();
    const [wait, setWait] = useState(RESEND_AFTER);
    const [note, setNote] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const done = useRef(false);

    const tryContinue = async (manual = false) => {
        if (done.current) return;
        if (manual) { setChecking(true); setNote(null); }
        try {
            const tokens = await authApi.signIn(email, password);
            done.current = true;
            await login(tokens.access, tokens.refresh);
            router.replace('/authentication/phone');
        } catch {
            if (manual) setNote('Not yet. Open the email and tap the link, then try again.');
        } finally {
            if (manual) setChecking(false);
        }
    };

    useEffect(() => {
        const t = setInterval(tryContinue, POLL_EVERY_MS);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email, password]);

    useEffect(() => {
        if (wait <= 0) return;
        const t = setTimeout(() => setWait((w) => w - 1), 1000);
        return () => clearTimeout(t);
    }, [wait]);

    const resend = async () => {
        setWait(RESEND_AFTER);
        setNote('Sent again. It can take a minute to arrive.');
        await authApi.resendActivation(email).catch(() => setNote('We could not send it again just now.'));
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 10}]}>
            <View style={styles.header}>
                <StageProgress stage={2}/>
            </View>
            <View style={styles.content}>
                <View style={[styles.badge, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="mail" size={36} color={c.icon.brand}/>
                </View>
                <View style={styles.heading}>
                    <Text variant="title1">Check your email</Text>
                    <Text variant="body" color={c.text.secondary}>
                        We sent a link to {email}. Tap it and this screen moves on by itself.
                    </Text>
                </View>
                {note && <Text variant="subhead" color={c.text.secondary}>{note}</Text>}
            </View>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="I have tapped the link" onPress={() => tryContinue(true)} loading={checking}/>
                {wait > 0 ? (
                    <Text variant="subhead" color={c.text.muted} style={styles.centre}>
                        Send it again in 0:{String(wait).padStart(2, '0')}
                    </Text>
                ) : (
                    <Text variant="subhead" color={c.text.brand} style={styles.centre} onPress={resend}>
                        Send the email again
                    </Text>
                )}
                <Text variant="footnote" color={c.text.muted} style={styles.centre}
                      onPress={() => router.replace('/authentication/account')}>
                    Wrong address? Start again
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {paddingHorizontal: 16},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 32, gap: 20, alignItems: 'flex-start'},
    badge: {width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center'},
    heading: {gap: 8},
    footer: {paddingHorizontal: 16, gap: 12},
    centre: {textAlign: 'center'},
});
