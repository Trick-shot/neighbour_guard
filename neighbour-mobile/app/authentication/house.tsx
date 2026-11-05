import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {router, useLocalSearchParams} from 'expo-router';
import {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {placesApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/**
 * Figma "Onboarding — how to find my house" (1637:839). Stage 3, complete. Everything here is
 * responder-only: the server shows directions and the gate photo to people answering your live
 * alert, and to nobody else.
 */
export default function OnboardingHouse() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {from} = useLocalSearchParams<{ from?: string }>();
    const onboarding = from !== 'profile' && from !== 'home';
    const [gate, setGate] = useState('');
    const [landmark, setLandmark] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const next = () => (onboarding ? router.replace('/authentication/alerts') : router.dismissTo('/(tabs)'));

    const pick = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.7});
        if (res.canceled || !res.assets[0]) return;
        const asset = res.assets[0];
        setPhoto(asset.uri);
        try {
            await placesApi.uploadGatePhoto(asset.uri, asset.mimeType ?? 'image/jpeg');
        } catch (e: any) {
            setPhoto(null);
            setError(e.message);
        }
    };

    const save = async () => {
        const directions = [gate.trim(), landmark.trim()].filter(Boolean).join(' · ');
        setBusy(true);
        setError(null);
        try {
            if (directions) await placesApi.update({directions});
            next();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={onboarding ? 3 : undefined} progress={1} back={false}/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled"
                                     contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heading}>
                    <Text variant="title1">Help neighbours find your gate</Text>
                    <Text variant="body" color={c.text.secondary}>
                        Street numbers are hard to see at night. These details are shown only to responders during your alert.
                    </Text>
                </View>
                <TextField label="Gate colour" value={gate} placeholder="Green metal gate" onChangeText={setGate}/>
                <TextField label="Nearby landmark" value={landmark} placeholder="Opposite the blue kiosk" onChangeText={setLandmark}/>
                <Pressable accessibilityRole="button" onPress={pick}
                           style={[styles.photo, {backgroundColor: c.bg.surface, borderColor: c.border.strong}]}>
                    {photo ? <Image source={{uri: photo}} style={styles.thumb}/> : (
                        <View style={[styles.iconBox, {backgroundColor: c.bg.brandSubtle}]}>
                            <Icon name="camera" size={20} color={c.icon.brand}/>
                        </View>
                    )}
                    <View style={styles.flex}>
                        <Text variant="headline">{photo ? 'Gate photo added' : 'Add a photo of your gate'}</Text>
                        <Text variant="footnote" color={c.text.secondary}>Helps at night and for first-time responders</Text>
                    </View>
                </Pressable>
                {error ? <Text variant="subhead" color={c.feedback.error}>{error}</Text> : null}
            </KeyboardAwareScrollView>
            <Footer>
                <Button title="Save" onPress={save} loading={busy}/>
                <Button title="Skip for now" variant="text" onPress={next}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 16},
    heading: {gap: 8},
    photo: {flexDirection: 'row', alignItems: 'center', gap: 12, height: 80, paddingHorizontal: 16, borderRadius: 16,
        borderWidth: 1.5, borderStyle: 'dashed'},
    iconBox: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    thumb: {width: 40, height: 40, borderRadius: 12},
});
