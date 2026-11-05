import {router} from 'expo-router';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Illustration from '@/components/ui/Illustration';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TipRow from '@/components/ui/TipRow';
import {registerForSos} from '@/lib/notifications';
import {useColors} from '@/theme';

/** Figma "Onboarding — allow alerts" (1627:1624). Stage 4, a quarter through. */
export default function OnboardingAlerts() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const next = () => router.replace('/authentication/safety');

    const allow = async () => {
        // Asks the OS, creates the `sos` channel and sends the push token to the server.
        await registerForSos().catch(() => false);
        next();
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={4} progress={0.25} back={false}/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Illustration source={require('@/assets/illustrations/alerts.png')} size={220}/>
                <Text variant="title1">Let emergency alarms ring, even on silent</Text>
                <View style={styles.rows}>
                    <TipRow icon="siren" body="Emergency alarms ring at full volume, even on silent or Do Not Disturb"/>
                    <TipRow icon="bell" body="Everyday updates arrive as normal, quiet notifications"/>
                    <TipRow icon="volume-x" body="You can mute non-emergency updates at night in settings"/>
                </View>
                <Note icon="shield-check">
                    {Platform.OS === 'ios'
                        ? 'iOS will ask next. Choose “Allow” for Critical Alerts too.'
                        : 'Android will ask next. Choose “Allow” so alarms can reach you.'}
                </Note>
            </ScrollView>
            <Footer>
                <Button title="Allow alerts" onPress={allow}/>
                <Button title="Not now" variant="text" onPress={next}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    rows: {gap: 12},
});
