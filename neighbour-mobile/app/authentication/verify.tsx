import {router} from 'expo-router';
import {useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import {OptionCard} from '@/components/ui/Choice';
import Footer from '@/components/ui/Footer';
import Illustration from '@/components/ui/Illustration';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/** Figma "Onboarding — verify identity" (1627:1336). Stage 2, a quarter through. Skippable. */
export const ID_TYPES = [
    {key: 'nida', title: 'National ID (NIDA)', subtitle: 'Tanzanian citizens', icon: 'user', card: 'NIDA card'},
    {key: 'passport', title: 'Passport', subtitle: 'Any country', icon: 'eye', card: 'passport'},
    {key: 'voter', title: 'Voter’s ID', subtitle: 'NEC voter card', icon: 'clock', card: 'voter card'},
] as const;

export default function OnboardingVerify() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [kind, setKind] = useState<(typeof ID_TYPES)[number]['key']>('nida');

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={2} progress={0.25} back={false}/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Illustration source={require('@/assets/illustrations/verify-identity.png')} size={150}/>
                <View style={styles.heading}>
                    <Text variant="title1">Verify your identity</Text>
                    <Text variant="body" color={c.text.secondary}>Verified neighbours are trusted faster. It takes about a minute.</Text>
                </View>
                <View style={styles.options}>
                    {ID_TYPES.map((t) => (
                        <OptionCard key={t.key} icon={t.icon} title={t.title} subtitle={t.subtitle}
                                    selected={kind === t.key} onPress={() => setKind(t.key)}/>
                    ))}
                </View>
                <Note icon="lock">Checked by a verification partner. We never keep a copy of your ID.</Note>
            </ScrollView>
            <Footer>
                <Button title="Continue" onPress={() => router.push({pathname: '/authentication/scanId', params: {kind}})}/>
                <Button title="Skip for now" variant="text" onPress={() => router.replace('/authentication/location')}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    heading: {gap: 8},
    options: {gap: 8},
});
