import {Image} from 'expo-image';
import * as Location from 'expo-location';
import {router, useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TipRow from '@/components/ui/TipRow';
import {useColors} from '@/theme';

/**
 * Figma "Onboarding — location" (1619:673). Stage 3, a third through. The permission is asked
 * here, with the reason, right before the pin screen that needs it. A refusal is recoverable.
 */
export default function OnboardingLocation() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {from} = useLocalSearchParams<{ from?: string }>();
    const onboarding = from !== 'profile' && from !== 'home';
    const [busy, setBusy] = useState(false);
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const allow = async () => {
        if (denied) return Linking.openSettings();
        setBusy(true);
        setError(null);
        try {
            const {status} = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return setDenied(true);
            // Balanced accuracy is enough to centre the map; the exact pin is set by hand next.
            const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            router.push({pathname: '/authentication/pinHome',
                params: {lat: String(fix.coords.latitude), lng: String(fix.coords.longitude), from: from ?? ''}});
        } catch {
            setError('We could not get your location. Move somewhere with a clearer view of the sky and try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={onboarding ? 3 : undefined} progress={1 / 3} back={!onboarding}/>
            <Image source={require('@/assets/illustrations/location.png')} style={styles.art} contentFit="contain"/>
            <Text variant="title1" style={styles.title}>Let neighbours find you in an emergency</Text>
            <View style={styles.rows}>
                <TipRow icon="shield-check" body="Your exact location is shared only while your alert is live."/>
                <TipRow icon="users" body="Otherwise neighbours see an approximate area, never your door."/>
                <TipRow icon="bell" body="We use it to alert you about emergencies on your street."/>
                {denied && <Text variant="subhead" color={c.feedback.error}>
                    Location is off for this app. Open Settings, allow location, then come back.</Text>}
                {error && <Text variant="subhead" color={c.feedback.error}>{error}</Text>}
            </View>
            <Footer>
                <Button title={denied ? 'Open Settings' : 'Allow location'} onPress={allow} loading={busy}/>
                <Button title="Not now" variant="text"
                        onPress={() => (onboarding ? router.replace('/authentication/alerts') : router.back())}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    // Illustration 122 px at y 142, title at y 330, first row at y 440.
    art: {width: 122, height: 122, alignSelf: 'center', marginTop: 46},
    title: {textAlign: 'center', marginTop: 66, marginHorizontal: 16},
    rows: {marginTop: 42, paddingHorizontal: 16, gap: 24},
});
