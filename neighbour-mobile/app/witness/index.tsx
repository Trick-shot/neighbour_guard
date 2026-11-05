import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {router} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';

import AlertTypeChip from '@/components/ui/AlertTypeChip';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Note from '@/components/ui/Note';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {alertsApi} from '@/lib/endpoints';
import {AlertType} from '@/lib/types';
import {newClientId} from '@/lib/uuid';
import {useColors} from '@/theme';

/** Figma "Witness — report what I see" (1632:2008). Anyone can send one; the name never shows. */
const TYPES: AlertType[] = ['emergency', 'fire', 'suspicious', 'medical', 'other'];

export default function WitnessReport() {
    const c = useColors();
    const clientId = useRef(newClientId()).current; // reused on retry, so a retry never pushes twice
    const [kind, setKind] = useState<AlertType>('suspicious');
    const [spot, setSpot] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
    const [street, setStreet] = useState('');
    const [place, setPlace] = useState('Finding where you are…');
    const [photo, setPhoto] = useState<string | null>(null);
    const [seen, setSeen] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const locate = async () => {
        try {
            const perm = await Location.requestForegroundPermissionsAsync();
            if (!perm.granted) return setPlace('Location is off · turn it on to send');
            const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.High});
            setSpot({lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy});
            const [hit] = await Location.reverseGeocodeAsync(fix.coords).catch(() => []);
            const name = [hit?.street, hit?.district ?? hit?.subregion].filter(Boolean).join(', ');
            setStreet(hit?.street ?? '');
            setPlace(name ? `Near ${name}` : 'Your current location');
        } catch {
            setPlace('We could not find you · tap Change to try again');
        }
    };
    useEffect(() => { locate(); }, []);

    const pick = async () => {
        const res = await ImagePicker.launchCameraAsync({quality: 0.6}).catch(() => null);
        if (res && !res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
    };

    const send = async () => {
        if (!spot) return setError('We need your location to alert the right street.');
        setBusy(true);
        setError(null);
        try {
            const r = await alertsApi.witness({client_id: clientId, type: kind, lat: spot.lat, lng: spot.lng, street, description: seen.trim(), photo});
            router.replace({pathname: '/witness/sent', params: {homes: String(r.homes_alerted), radius: String(r.radius_m), at: r.created_at}});
        } catch (e: any) {
            setError(e.status === 429 ? 'You have sent several reports already. If someone is in danger, call 112.' : e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Report an emergency"/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                <Note icon="shield-check">You don’t need an account. Your name is never shown to anyone.</Note>
                <Text variant="caption1" color={c.text.muted}>WHAT’S HAPPENING</Text>
                <View style={styles.types}>
                    {TYPES.map((t) => <AlertTypeChip key={t} type={t} selected={kind === t} onPress={() => setKind(t)}/>)}
                </View>
                <Text variant="caption1" color={c.text.muted}>WHERE</Text>
                <View style={[styles.location, {borderColor: c.border.default}]}>
                    <View style={[styles.iconBox, {backgroundColor: c.bg.brandSubtle}]}><Icon name="map-pin" size={20} color={c.icon.brand}/></View>
                    <View style={styles.flex}>
                        <Text variant="headline" numberOfLines={1}>{place}</Text>
                        {spot && <Text variant="footnote" color={c.text.secondary}>
                            Found automatically{spot.accuracy ? ` · within ${Math.round(spot.accuracy)} m` : ''}</Text>}
                    </View>
                    <Text variant="subhead" color={c.text.brand} onPress={locate}>Change</Text>
                </View>
                <Pressable onPress={pick} style={[styles.photo, {borderColor: c.border.strong}]}>
                    {photo ? <Image source={{uri: photo}} style={styles.thumb} contentFit="cover"/> : (
                        <>
                            <Icon name="camera" size={24} color={c.icon.brand}/>
                            <Text variant="subhead" color={c.text.secondary}>Add a photo (optional)</Text>
                        </>
                    )}
                </Pressable>
                <TextField label="What did you see?" value={seen} placeholder="Two men climbing the wall of House 109"
                           maxLength={500} onChangeText={setSeen}/>
                {error ? <Text variant="subhead" color={c.feedback.error}>{error}</Text> : null}
            </KeyboardAwareScrollView>
            <Footer><Button title="Send witness alert" icon="siren" variant="danger" onPress={send} loading={busy}/></Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12},
    types: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    location: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1},
    iconBox: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    photo: {height: 88, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden'},
    thumb: {width: '100%', height: '100%'},
});
