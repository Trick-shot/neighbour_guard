import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Note from '@/components/ui/Note';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {safetyApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Profile — skills & medical notes" (1637:5378). Notes are encrypted on the server. */
export const SKILLS = [
    {key: 'first_aid', label: 'First aid'}, {key: 'nurse', label: 'Nurse'}, {key: 'doctor', label: 'Doctor'},
    {key: 'security_guard', label: 'Security guard'}, {key: 'firefighting', label: 'Firefighting'},
    {key: 'has_car', label: 'Has a car'}, {key: 'electrician', label: 'Electrician'},
];

export default function SkillsAndMedical() {
    const c = useColors();
    const [skills, setSkills] = useState<string[]>([]);
    const [conditions, setConditions] = useState('');
    const [allergies, setAllergies] = useState('');
    const [blood, setBlood] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        safetyApi.get().then((p) => {
            setSkills(p.skills ?? []); setConditions(p.conditions ?? ''); setAllergies(p.allergies ?? ''); setBlood(p.blood_type ?? '');
        }).catch(() => undefined);
    }, []);

    const toggle = (k: string) => setSkills((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            await safetyApi.save({skills, conditions, allergies, blood_type: blood});
            router.back();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Skills & medical notes"/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                <Text variant="caption1" color={c.text.muted}>I CAN HELP WITH</Text>
                <Text variant="footnote" color={c.text.secondary}>We call people with the right skill first in a medical emergency.</Text>
                <View style={styles.pills}>
                    {SKILLS.map((s) => {
                        const on = skills.includes(s.key);
                        return (
                            <Pressable key={s.key} accessibilityRole="checkbox" accessibilityState={{checked: on}} onPress={() => toggle(s.key)}
                                       style={[styles.pill, on ? {backgroundColor: c.bg.inverse} : {backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.default}]}>
                                <Text variant="label" color={on ? c.text.inverse : c.text.primary}>{s.label}</Text>
                            </Pressable>
                        );
                    })}
                </View>
                <Text variant="caption1" color={c.text.muted} style={styles.gapTop}>MEDICAL NOTES (OPTIONAL)</Text>
                <Note icon="lock">Encrypted, and shown only to responders during your own alert.</Note>
                <TextField label="Conditions" value={conditions} placeholder="Asthma" onChangeText={setConditions}/>
                <TextField label="Allergies" value={allergies} placeholder="Penicillin" onChangeText={setAllergies}/>
                <TextField label="Blood type" value={blood} placeholder="O+" autoCapitalize="characters" maxLength={5} onChangeText={setBlood}/>
                {error ? <Text variant="subhead" color={c.feedback.error}>{error}</Text> : null}
            </KeyboardAwareScrollView>
            <Footer><Button title="Save" onPress={save} loading={busy}/></Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 10},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    pill: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999},
    gapTop: {marginTop: 10},
});
