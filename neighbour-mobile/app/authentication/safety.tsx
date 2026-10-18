import {router} from 'expo-router';
import {useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {alertsApi} from '@/lib/endpoints';
import {radius, useColors} from '@/theme';

/**
 * Figma "Android · 01" / "Onboarding — safety". Stage 4 of 4: the safety PIN and the duress PIN.
 *
 * The duress PIN is the one piece of this app that has to be explained properly, because its whole
 * value is that it looks like nothing happened. Typed under threat it shows the sender "resolved"
 * while neighbours keep seeing the alert, marked `under_duress`. Anyone watching over a shoulder
 * sees an alert being cancelled.
 */
const PIN = /^\d{4,8}$/;

export default function OnboardingSafety() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState('');
    const [duress, setDuress] = useState('');
    const [errors, setErrors] = useState<{ pin?: string; duress?: string }>({});
    const [failed, setFailed] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const next: typeof errors = {};
        if (!PIN.test(pin)) next.pin = '4 to 8 digits.';
        if (!PIN.test(duress)) next.duress = '4 to 8 digits.';
        else if (duress === pin) next.duress = 'This has to be different from your safety PIN.';
        setErrors(next);
        setFailed(null);
        if (Object.keys(next).length) return;

        setBusy(true);
        try {
            await alertsApi.setPins(pin, duress);
            router.replace('/(tabs)');
        } catch (e: any) {
            setFailed(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 10}]}>
            <View style={styles.header}>
                <StageProgress stage={4}/>
            </View>
            <View style={styles.content}>
                <View style={[styles.badge, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="lock" size={34} color={c.icon.brand}/>
                </View>
                <View style={styles.heading}>
                    <Text variant="title1">Two PINs</Text>
                    <Text variant="body" color={c.text.secondary}>
                        You type one of these to end an alert. Which one you type decides what your neighbours see.
                    </Text>
                </View>

                <TextField label="Safety PIN" value={pin} keyboardType="number-pad" secureTextEntry
                           maxLength={8} error={errors.pin}
                           helper="Ends the alert for everyone. Use this when you are genuinely safe."
                           onChangeText={(v) => { setPin(v.replace(/\D/g, '')); setErrors((e) => ({...e, pin: undefined})); }}/>

                <TextField label="Duress PIN" value={duress} keyboardType="number-pad" secureTextEntry
                           maxLength={8} error={errors.duress}
                           onChangeText={(v) => { setDuress(v.replace(/\D/g, '')); setErrors((e) => ({...e, duress: undefined})); }}/>
                <View style={[styles.note, {backgroundColor: c.feedback.warningBg}]}>
                    <Icon name="eye" size={20} color={c.feedback.warning}/>
                    <Text variant="subhead" color={c.feedback.warning} style={styles.noteText}>
                        Type the duress PIN when someone is making you end the alert. Your screen says it is over.
                        Your neighbours keep coming, and they are told you are under threat.
                    </Text>
                </View>
                {failed && <Text variant="subhead" color={c.feedback.error}>{failed}</Text>}
            </View>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Save and finish" onPress={save} loading={busy}/>
                <Text variant="subhead" color={c.text.secondary} style={styles.centre}
                      onPress={() => router.replace('/(tabs)')}>
                    Set these up later in Profile
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {paddingHorizontal: 16},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 24, gap: 16, alignItems: 'flex-start'},
    badge: {width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center'},
    heading: {gap: 8},
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    noteText: {flex: 1},
    footer: {paddingHorizontal: 16, gap: 12},
    centre: {textAlign: 'center'},
});
