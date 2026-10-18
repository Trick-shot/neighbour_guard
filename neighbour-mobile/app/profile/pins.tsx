import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {alertsApi} from '@/lib/endpoints';
import {radius, useColors} from '@/theme';

/** Figma page "Android · 07" / "Safety and duress PINs". Same rules as onboarding stage 4. */
const PIN = /^\d{4,8}$/;

export default function SafetyPins() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [isSet, setIsSet] = useState<boolean | null>(null);
    const [pin, setPin] = useState('');
    const [duress, setDuress] = useState('');
    const [errors, setErrors] = useState<{ pin?: string; duress?: string }>({});
    const [failed, setFailed] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        alertsApi.pinStatus().then((s) => setIsSet(s.is_set)).catch(() => setIsSet(null));
    }, []);

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
            router.back();
        } catch (e: any) {
            setFailed(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Safety and duress PINs"/>
            <View style={styles.content}>
                <Text variant="body" color={c.text.secondary}>
                    You type one of these to end an alert. Which one you type decides what your neighbours see.
                    {isSet ? ' Setting new ones replaces both.' : ''}
                </Text>

                <TextField label="Safety PIN" value={pin} keyboardType="number-pad" secureTextEntry maxLength={8}
                           error={errors.pin} helper="Ends the alert for everyone."
                           onChangeText={(v) => { setPin(v.replace(/\D/g, '')); setErrors((e) => ({...e, pin: undefined})); }}/>
                <TextField label="Duress PIN" value={duress} keyboardType="number-pad" secureTextEntry maxLength={8}
                           error={errors.duress}
                           onChangeText={(v) => { setDuress(v.replace(/\D/g, '')); setErrors((e) => ({...e, duress: undefined})); }}/>

                <View style={[styles.note, {backgroundColor: c.feedback.warningBg}]}>
                    <Icon name="eye" size={20} color={c.feedback.warning}/>
                    <Text variant="subhead" color={c.feedback.warning} style={styles.noteText}>
                        Type the duress PIN when someone is making you end the alert. Your screen says it is over.
                        Your neighbours keep coming, and they are told you are under threat.
                    </Text>
                </View>

                {isSet === false && (
                    <Text variant="subhead" color={c.text.muted}>
                        No PINs set yet. Until you set them, “I’m safe” ends an alert without asking for anything.
                    </Text>
                )}
                {failed && <Text variant="subhead" color={c.feedback.error}>{failed}</Text>}
            </View>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title={isSet ? 'Replace both PINs' : 'Save both PINs'} onPress={save} loading={busy}/>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 16},
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    noteText: {flex: 1},
    footer: {paddingHorizontal: 16},
});
