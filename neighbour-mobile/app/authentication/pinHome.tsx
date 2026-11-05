import * as Location from 'expo-location';
import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {MePin} from '@/components/ui/MapPin';
import MapUnavailable from '@/components/ui/MapUnavailable';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {placesApi} from '@/lib/endpoints';
import {hasMapsKey} from '@/lib/maps';
import {shadow, useColors} from '@/theme';

/**
 * Figma "Onboarding — pin home" (1619:728): a full-screen satellite map, the instruction card on
 * top, the pin fixed in the middle of the visible map, and a sheet with the address it detected.
 * "Confirm my home" calls POST /api/v2/places/me/.
 *
 * The map moves under a fixed pin (docs/DECISIONS.md): a dragged marker is fiddly with one thumb.
 * The pin can only be set once — the server refuses to move it, because it decides who gets your
 * alerts — so the street is detected from the pin and can be corrected here, but not the pin later.
 */
const CLOSE_ENOUGH = {latitudeDelta: 0.0025, longitudeDelta: 0.0025};
const SHEET = 264; // the sheet's height in the frame: 874 − 610

type Address = { street: string; district: string; city: string };

export default function PinHome() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const map = useRef<MapView>(null);
    const {lat, lng, from} = useLocalSearchParams<{ lat?: string; lng?: string; from?: string }>();
    const coord = (v?: string) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
    const startLat = coord(lat), startLng = coord(lng);
    const start = startLat !== null && startLng !== null ? {latitude: startLat, longitude: startLng} : null;
    const [pin, setPin] = useState(start);
    const [address, setAddress] = useState<Address | null>(null);
    const [editStreet, setEditStreet] = useState(false);
    const [street, setStreet] = useState('');
    const [houseNumber, setHouseNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const region: Region | undefined = start ? {...start, ...CLOSE_ENOUGH} : undefined;

    // Name the street under the pin. If the phone cannot, the field opens for typing instead.
    useEffect(() => {
        if (!pin) return;
        let live = true;
        const t = setTimeout(async () => {
            try {
                const [hit] = await Location.reverseGeocodeAsync(pin);
                if (!live) return;
                const found = {street: hit?.street ?? '', district: hit?.district ?? hit?.subregion ?? '', city: hit?.city ?? hit?.region ?? ''};
                setAddress(found);
                if (!editStreet) setStreet(found.street);
                if (!found.street) setEditStreet(true);
            } catch {
                if (live) setEditStreet(true);
            }
        }, 400);
        return () => { live = false; clearTimeout(t); };
    }, [pin?.latitude, pin?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

    const recentre = async () => {
        try {
            const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            map.current?.animateToRegion({latitude: fix.coords.latitude, longitude: fix.coords.longitude, ...CLOSE_ENOUGH}, 600);
        } catch {
            // Staying where the map already is tells the user more than an error here.
        }
    };

    const confirm = async () => {
        if (!pin) return setError('Move the map until the pin sits on your house.');
        if (!houseNumber.trim()) return setError('Responders look for the house number first.');
        if (!street.trim()) { setEditStreet(true); return setError('Which street is the house on?'); }
        setBusy(true);
        setError(null);
        try {
            await placesApi.create({house_number: houseNumber.trim(), street: street.trim(),
                district: address?.district ?? '', lat: pin.latitude, lng: pin.longitude});
            router.replace({pathname: '/authentication/house', params: {from: from ?? ''}});
        } catch (e: any) {
            // 409: this account already has a home. Nothing to add, so carry on.
            if (e.status === 409) router.replace({pathname: '/authentication/house', params: {from: from ?? ''}});
            else setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            {!hasMapsKey ? <MapUnavailable/> : <MapView
                ref={map}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                mapType="satellite"
                initialRegion={region}
                mapPadding={{top: 0, left: 0, right: 0, bottom: SHEET}}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={false}
                toolbarEnabled={false}
                onRegionChangeComplete={(r) => setPin({latitude: r.latitude, longitude: r.longitude})}
            />}
            {/* The pin never moves on screen; the map does. Its point is the middle of the visible map. */}
            <View pointerEvents="none" style={[styles.pinLayer, {bottom: SHEET}]}>
                <View style={styles.pinOffset}><MePin/></View>
            </View>
            <View style={[styles.instruction, shadow.md, {top: insets.top + 4, backgroundColor: c.bg.surface}]}>
                <Icon name="map-pin" size={22} color={c.icon.brand}/>
                <Text variant="subhead" style={styles.flex}>Move the map until the pin sits on your house</Text>
            </View>
            <Pressable accessibilityLabel="Centre on my location" onPress={recentre}
                       style={[styles.locate, {bottom: SHEET + 96, backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                <Icon name="locate" size={24}/>
            </Pressable>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" scrollEnabled={false}
                                     style={[styles.sheet, {backgroundColor: c.bg.surface}]}
                                     contentContainerStyle={[styles.sheetContent, {paddingBottom: Math.max(insets.bottom, 34)}]}>
                <View style={[styles.grabber, {backgroundColor: c.border.strong}]}/>
                {editStreet ? (
                    <TextField label="Street" value={street} autoCapitalize="words" placeholder="Masaki St"
                               onChangeText={(v) => { setStreet(v); setError(null); }}/>
                ) : (
                    <Pressable onPress={() => setEditStreet(true)} style={styles.address}>
                        <Text variant="title3">{[street, address?.district].filter(Boolean).join(', ') || 'Finding the street…'}</Text>
                        <Text variant="footnote" color={c.text.muted}>
                            {[address?.city, 'detected from the pin'].filter(Boolean).join(' · ')}
                        </Text>
                    </Pressable>
                )}
                <TextField label="House number" value={houseNumber} placeholder="109" autoCapitalize="characters"
                           error={error} onChangeText={(v) => { setHouseNumber(v); setError(null); }}/>
                <Button title="Confirm my home" onPress={confirm} loading={busy}/>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    pinLayer: {position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center'},
    // MePin is 88 tall with its point 48 px down: lift it so the point, not the box, is centred.
    pinOffset: {transform: [{translateY: -4}]},
    instruction: {position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16},
    locate: {position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center'},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, flexGrow: 0},
    sheetContent: {paddingHorizontal: 16, paddingTop: 8, gap: 14},
    grabber: {width: 36, height: 5, borderRadius: 3},
    address: {gap: 2},
});
