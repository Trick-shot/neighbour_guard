import {router} from 'expo-router';
import {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import PinInput from '@/components/ui/PinInput';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/**
 * Figma "Onboarding — safety & duress PIN" (1637:772). Stage 4, two thirds. The safety PIN ends
 * an alert; the duress PIN looks the same on your phone but keeps the alert live for neighbours.
 */
export default function OnboardingPins() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState('');
    const [duress, setDuress] = useState('');
    const [errors, setErrors] = useState<{ pin?: string; duress?: string }>({});
    const [busy, setBusy] = useState(false);
    const next = () => router.replace('/authentication/contact');

    const save = async () => {
        const e: typeof errors = {};
        if (pin.length !== 4) e.pin = 'Four digits.';
        if (duress.length !== 4) e.duress = 'Four digits.';
        else if (duress === pin) e.duress = 'Must be different from your safety PIN.';
        setErrors(e);
        if (Object.keys(e).length) return;
        setBusy(true);
        try {
            await alertsApi.setPins(pin, duress);
            next();
        } catch (err: any) {
            setErrors({duress: err.message});
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={4} progress={2 / 3} back={false}/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
                                     contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heading}>
                    <Text variant="title1">Set your safety PINs</Text>
                    <Text variant="body" color={c.text.secondary}>
                        Your safety PIN ends an alert. If someone forces you, enter the duress PIN instead. It looks normal, but your alert stays live.
                    </Text>
                </View>
                <PinInput label="Safety PIN" value={pin} autoFocus error={errors.pin}
                          onChange={(v) => { setPin(v); setErrors((x) => ({...x, pin: undefined})); }}/>
                <PinInput label="Duress PIN" value={duress} error={errors.duress}
                          onChange={(v) => { setDuress(v); setErrors((x) => ({...x, duress: undefined})); }}/>
                <Note icon="lock">With the duress PIN, neighbours and your security provider are alerted silently. Never share it.</Note>
            </KeyboardAwareScrollView>
            <Footer>
                <Button title="Save PINs" onPress={save} loading={busy}/>
                <Button title="Skip for now" variant="text" onPress={next}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    heading: {gap: 8},
});
