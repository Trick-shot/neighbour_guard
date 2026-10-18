import * as Location from 'expo-location';
import {router} from 'expo-router';
import {useState} from 'react';
import {Linking, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import {radius, useColors} from '@/theme';

/**
 * Figma "Android · 01" / "Onboarding — location". Stage 3 of onboarding: ask for the location
 * permission once, with the reason, then hand the first fix to the pin screen.
 *
 * Why the permission is asked here and not on the Home map: a neighbour's alert is only useful if
 * the server knows which neighbourhood you are in, and that comes from the home pin set next.
 */
export default function OnboardingLocation() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [busy, setBusy] = useState(false);
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const allow = async () => {
        setBusy(true);
        setError(null);
        try {
            const {status} = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setDenied(true);
                return;
            }
            // Balanced accuracy is enough to centre the map; the exact pin is set by hand next.
            const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            router.push({
                pathname: '/authentication/pinHome',
                params: {lat: String(fix.coords.latitude), lng: String(fix.coords.longitude)},
            });
        } catch {
            setError('We could not get your location. Move somewhere with a clearer view of the sky and try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 12}]}>
            <View style={styles.header}>
                <StageProgress stage={3}/>
            </View>
            <View style={styles.content}>
                <View style={[styles.badge, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="map-pin" size={36} color={c.icon.brand}/>
                </View>
                <View style={styles.heading}>
                    <Text variant="title1">Turn on location</Text>
                    <Text variant="body" color={c.text.secondary}>
                        NeighbourGuard needs your location to put you in the right neighbourhood, so the people who
                        can actually reach you are the ones who hear your alert.
                    </Text>
                </View>
                <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="shield-check" size={20} color={c.icon.brand}/>
                    <Text variant="subhead" color={c.text.secondary} style={styles.noteText}>
                        Your exact home only leaves the server during one of your own live alerts. Neighbours see an
                        approximate area, never your pin.
                    </Text>
                </View>
                {denied && (
                    <Text variant="subhead" color={c.feedback.error}>
                        Location is off for NeighbourGuard. Open Settings, allow location, then come back.
                    </Text>
                )}
                {error && <Text variant="subhead" color={c.feedback.error}>{error}</Text>}
            </View>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                {denied ? (
                    <>
                        <Button title="Open settings" onPress={() => Linking.openSettings()}/>
                        <Button title="I have allowed it" variant="outline" onPress={() => { setDenied(false); allow(); }}/>
                    </>
                ) : (
                    <Button
                        title={Platform.OS === 'ios' ? 'Allow while using the app' : 'Allow location'}
                        onPress={allow}
                        loading={busy}
                    />
                )}
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
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    noteText: {flex: 1},
    footer: {paddingHorizontal: 16, gap: 12},
});
