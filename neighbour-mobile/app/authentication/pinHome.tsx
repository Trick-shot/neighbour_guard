import * as Location from 'expo-location';
import {router, useLocalSearchParams} from 'expo-router';
import {useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {MePin} from '@/components/ui/MapPin';
import StageProgress from '@/components/ui/StageProgress';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {placesApi} from '@/lib/endpoints';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma "Android · 01" / "Onboarding — pin home". The last onboarding step before the map:
 * POST /api/v2/places/me/ with the pin and the address.
 *
 * The pin sits fixed in the middle of the map and the map moves under it. A dragged marker is
 * fiddly with one thumb and drops silently on Android; moving the map cannot miss.
 *
 * The pin can only be set once: the server refuses to move it later (PATCH takes text only),
 * because the pin decides which neighbours get your alerts.
 */
const CLOSE_ENOUGH = {latitudeDelta: 0.0025, longitudeDelta: 0.0025};

export default function PinHome() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const map = useRef<MapView>(null);
    const {lat, lng} = useLocalSearchParams<{ lat?: string; lng?: string }>();

    // An empty param must not become 0: that would drop the map in the Gulf of Guinea.
    const coord = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
    const startLat = coord(lat), startLng = coord(lng);
    const hasStart = startLat !== null && startLng !== null;
    const start = {latitude: startLat ?? 0, longitude: startLng ?? 0};

    // Where the pin is: the centre of the map, updated when the map stops moving.
    const [pin, setPin] = useState(hasStart ? start : null);
    const [houseNumber, setHouseNumber] = useState('');
    const [street, setStreet] = useState('');
    const [district, setDistrict] = useState('');
    const [directions, setDirections] = useState('');
    const [errors, setErrors] = useState<{ houseNumber?: string; street?: string }>({});
    const [failed, setFailed] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [satellite, setSatellite] = useState(true);

    const region: Region | undefined = hasStart ? {...start, ...CLOSE_ENOUGH} : undefined;

    const recentre = async () => {
        try {
            const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            map.current?.animateToRegion({
                latitude: fix.coords.latitude, longitude: fix.coords.longitude, ...CLOSE_ENOUGH,
            }, 600);
        } catch {
            // Staying where the map already is tells the user more than an error box here.
        }
    };

    const save = async () => {
        const next: typeof errors = {};
        if (!houseNumber.trim()) next.houseNumber = 'Responders look for this first.';
        if (!street.trim()) next.street = 'Which street is the house on?';
        setErrors(next);
        setFailed(null);
        if (Object.keys(next).length || !pin) {
            if (!pin) setFailed('Move the map until the pin is on your roof.');
            return;
        }
        setBusy(true);
        try {
            await placesApi.create({
                house_number: houseNumber.trim(),
                street: street.trim(),
                district: district.trim(),
                directions: directions.trim(),
                lat: pin.latitude,
                lng: pin.longitude,
            });
            router.replace('/authentication/safety');
        } catch (e: any) {
            // 409: this account already has a home. Nothing to add, so carry on.
            if (e.status === 409) router.replace('/authentication/safety');
            else setFailed(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <View style={styles.mapWrap}>
                <MapView
                    ref={map}
                    style={StyleSheet.absoluteFill}
                    provider={PROVIDER_GOOGLE}
                    mapType={satellite ? 'hybrid' : 'standard'}
                    initialRegion={region}
                    showsUserLocation
                    showsMyLocationButton={false}
                    showsCompass={false}
                    toolbarEnabled={false}
                    onRegionChangeComplete={(r) => setPin({latitude: r.latitude, longitude: r.longitude})}
                />
                {/* The pin never moves on screen; the map does. Pointer events pass through to the map. */}
                <View pointerEvents="none" style={styles.pinLayer}>
                    <View style={styles.pinOffset}>
                        <MePin/>
                    </View>
                </View>
                <View style={[styles.mapTop, {paddingTop: insets.top + 8}]}>
                    <Pressable
                        accessibilityLabel="Back"
                        onPress={() => router.canGoBack() && router.back()}
                        style={[styles.round, shadow.control, {backgroundColor: c.bg.surface}]}>
                        <Icon name="chevron-left" size={22}/>
                    </Pressable>
                    {/* Same control rail as the Home map, so the gesture is already familiar. */}
                    <View style={[styles.controls, shadow.control, {backgroundColor: c.bg.surface}]}>
                        <Pressable
                            accessibilityLabel={satellite ? 'Street map' : 'Satellite map'}
                            onPress={() => setSatellite((s) => !s)}
                            style={styles.control}>
                            <Icon name="image" size={22} color={satellite ? c.icon.brand : c.icon.default}/>
                        </Pressable>
                        <Pressable accessibilityLabel="Centre on my location" onPress={recentre} style={styles.control}>
                            <Icon name="locate" size={22}/>
                        </Pressable>
                    </View>
                </View>
                <View style={[styles.hint, {backgroundColor: c.scrim}]}>
                    <Text variant="footnote" color={c.text.onBrand}>Move the map until the pin is on your roof</Text>
                </View>
            </View>

            <KeyboardAwareScrollView
                bottomOffset={24}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={[styles.card, {backgroundColor: c.bg.surface}]}
                contentContainerStyle={[styles.cardContent, {paddingBottom: Math.max(insets.bottom, 16) + 8}]}>
                <StageProgress stage={3}/>
                <View style={styles.heading}>
                    <Text variant="title2">Pin your home</Text>
                    <Text variant="subhead" color={c.text.secondary}>
                        This is how a neighbour finds your door in the dark. You cannot move the pin later, so take
                        your time now.
                    </Text>
                </View>
                <TextField
                    label="House number"
                    value={houseNumber}
                    onChangeText={(v) => { setHouseNumber(v); setErrors((e) => ({...e, houseNumber: undefined})); }}
                    placeholder="109"
                    autoCapitalize="characters"
                    error={errors.houseNumber}
                />
                <TextField
                    label="Street"
                    value={street}
                    onChangeText={(v) => { setStreet(v); setErrors((e) => ({...e, street: undefined})); }}
                    placeholder="Masaki Street"
                    autoCapitalize="words"
                    error={errors.street}
                />
                <TextField
                    label="District"
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Kinondoni"
                    autoCapitalize="words"
                    helper="Optional. Names your neighbourhood when you are the first here."
                />
                <TextField
                    label="How to find you"
                    value={directions}
                    onChangeText={setDirections}
                    placeholder="Black gate next to the shop, second house on the left"
                    multiline
                    helper="Optional. Only shown to neighbours responding to your live alert."
                />
                {failed && <Text variant="subhead" color={c.feedback.error}>{failed}</Text>}
                <Button title="Save my home" onPress={save} loading={busy} style={styles.cta}/>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    mapWrap: {height: '42%', overflow: 'hidden'},
    pinLayer: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center'},
    // MePin is 88 tall and its point is 48 px down, so a centred pin points 4 px below the map centre.
    pinOffset: {transform: [{translateY: -4}]},
    mapTop: {position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between'},
    round: {width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center'},
    controls: {padding: 2, borderRadius: radius.pill},
    control: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'},
    hint: {position: 'absolute', bottom: 12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: radius.pill},
    card: {flex: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -radius.xl},
    cardContent: {paddingHorizontal: 16, paddingTop: 16, gap: 16},
    heading: {gap: 6},
    cta: {marginTop: 4},
});
