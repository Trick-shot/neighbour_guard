import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import MapView, {PROVIDER_GOOGLE} from 'react-native-maps';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {MePin} from '@/components/ui/MapPin';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import MapUnavailable from '@/components/ui/MapUnavailable';
import {placesApi} from '@/lib/endpoints';
import {hasMapsKey} from '@/lib/maps';
import {MyResidence} from '@/lib/types';
import {radius, useColors} from '@/theme';

/**
 * Figma page "Android · 07" / "Home and address".
 *
 * The address text is editable; the pin is not. Moving a pin changes which neighbours get your
 * alerts, so the server refuses it (PATCH takes text fields only) and this screen says so instead
 * of offering a control that would fail.
 */
export default function HomeAndAddress() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [home, setHome] = useState<MyResidence | null>(null);
    const [houseNumber, setHouseNumber] = useState('');
    const [street, setStreet] = useState('');
    const [directions, setDirections] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        placesApi.me().then((data) => {
            setHome(data);
            setHouseNumber(data.house_number);
            setStreet(data.street);
            setDirections(data.directions ?? '');
        }).catch(() => undefined);
    }, []);

    const dirty = !!home && (houseNumber !== home.house_number || street !== home.street
        || directions !== (home.directions ?? ''));

    const save = async () => {
        if (!houseNumber.trim() || !street.trim()) return setError('House number and street are both needed.');
        setBusy(true);
        setError(null);
        try {
            setHome(await placesApi.update({
                house_number: houseNumber.trim(), street: street.trim(), directions: directions.trim(),
            }));
            setSaved(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const verified = home?.status === 'verified';

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Home and address"/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
                                     showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {home && (
                    <View style={styles.mapWrap}>
                        {!hasMapsKey ? <MapUnavailable compact/> : <MapView
                            style={StyleSheet.absoluteFill}
                            provider={PROVIDER_GOOGLE}
                            mapType="hybrid"
                            initialRegion={{latitude: home.lat, longitude: home.lng,
                                latitudeDelta: 0.002, longitudeDelta: 0.002}}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            rotateEnabled={false}
                            pitchEnabled={false}
                            toolbarEnabled={false}
                        />}
                        <View pointerEvents="none" style={styles.pinLayer}>
                            <View style={styles.pinOffset}><MePin/></View>
                        </View>
                    </View>
                )}

                <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="lock" size={20} color={c.icon.muted}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.noteText}>
                        The pin cannot be moved. It decides which neighbours your alerts reach, so changing it
                        would quietly change who comes. If it is in the wrong place, ask Erick to move it for you.
                    </Text>
                </View>

                {home && (
                    <View style={[styles.status, {backgroundColor: verified ? c.feedback.successBg : c.feedback.warningBg}]}>
                        <Icon name={verified ? 'shield-check' : 'clock'} size={20}
                              color={verified ? c.feedback.success : c.feedback.warning}/>
                        <Text variant="subhead" color={verified ? c.feedback.success : c.feedback.warning}
                              style={styles.noteText}>
                            {verified
                                ? `Verified in ${home.neighbourhood.name}. Neighbours can see your house number.`
                                : `${home.vouches} of ${home.vouches_needed} vouches. Until two verified neighbours `
                                  + 'vouch for you, others see your street but not your house number.'}
                        </Text>
                    </View>
                )}

                <TextField label="House number" value={houseNumber} autoCapitalize="characters"
                           onChangeText={(v) => { setHouseNumber(v); setError(null); setSaved(false); }}/>
                <TextField label="Street" value={street} autoCapitalize="words"
                           onChangeText={(v) => { setStreet(v); setError(null); setSaved(false); }}/>
                <TextField label="How to find you" value={directions} multiline
                           placeholder="Black gate next to the shop, second house on the left"
                           helper="Only shown to neighbours responding to your live alert."
                           onChangeText={(v) => { setDirections(v); setError(null); setSaved(false); }}/>
                {error && <Text variant="subhead" color={c.feedback.error}>{error}</Text>}
                {saved && <Text variant="subhead" color={c.feedback.success}>Saved.</Text>}
            </KeyboardAwareScrollView>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Save" onPress={save} loading={busy} disabled={!dirty}/>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 16},
    mapWrap: {height: 160, borderRadius: radius.lg, overflow: 'hidden'},
    pinLayer: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center'},
    pinOffset: {transform: [{translateY: -4}]},
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    status: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    noteText: {flex: 1},
    footer: {paddingHorizontal: 16, paddingTop: 8},
});
