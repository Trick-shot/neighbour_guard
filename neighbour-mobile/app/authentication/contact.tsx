import {router} from 'expo-router';
import {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {contactsApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Onboarding — emergency contact" (1637:903). Stage 4, complete. Texted on every SOS. */
export default function OnboardingContact() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const next = () => router.replace('/authentication/done');

    const add = async () => {
        if (name.trim().length < 2) return setError('Who is this?');
        setBusy(true);
        setError(null);
        try {
            await contactsApi.add({name: name.trim(), relation: relation.trim(), phone: phone.replace(/\s/g, '')});
            next();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={4} progress={1} back={false}/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
                                     contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heading}>
                    <Text variant="title1">Who should we text in an emergency?</Text>
                    <Text variant="body" color={c.text.secondary}>
                        They get an SMS with your location when you send an SOS. They don’t need the app.
                    </Text>
                </View>
                <TextField label="Name" value={name} placeholder="Their name" autoCapitalize="words" onChangeText={setName}/>
                <TextField label="Relationship" value={relation} placeholder="Mother" autoCapitalize="words" onChangeText={setRelation}/>
                <TextField label="Phone number" value={phone} placeholder="07xx xxx xxx" keyboardType="phone-pad"
                           error={error} onChangeText={(v) => { setPhone(v); setError(null); }}/>
            </KeyboardAwareScrollView>
            <Footer>
                <Button title="Add contact" onPress={add} loading={busy}/>
                <Button title="Skip for now" variant="text" onPress={next}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14},
    heading: {gap: 8},
});
