import * as ImagePicker from 'expo-image-picker';
import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {profileApi} from '@/lib/endpoints';
import {useColors} from '@/theme';

/** Figma "Onboarding — profile" (1619:632). Stage 1, complete: the name neighbours will see. */
export default function OnboardingProfile() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        profileApi.me().then((me) => { setName(me.full_name ?? ''); setPhoto(me.photo_url); }).catch(() => undefined);
    }, []);

    const pick = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7});
        if (res.canceled || !res.assets[0]) return;
        const asset = res.assets[0];
        setPhoto(asset.uri);
        try {
            const saved = await profileApi.uploadPhoto(asset.uri, asset.mimeType ?? 'image/jpeg');
            setPhoto(saved.photo_url);
        } catch (e: any) {
            setPhoto(null);
            setError(e.message);
        }
    };

    const save = async () => {
        if (name.trim().length < 3) return setError('Use the name your neighbours know you by.');
        setBusy(true);
        setError(null);
        try {
            await profileApi.rename(name.trim());
            router.replace('/authentication/verify');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={1} progress={1} back={false}/>
            <View style={styles.heading}>
                <Text variant="title1">How should neighbours see you?</Text>
                <Text variant="body" color={c.text.secondary}>A real name and photo help neighbours trust your alerts.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Add a photo" onPress={pick} style={styles.avatar}>
                <Avatar name={name || ' '} size={96} uri={photo}/>
                <View style={[styles.camera, {backgroundColor: c.bg.brand}]}>
                    <Icon name="camera" size={19} color={c.icon.onBrand}/>
                </View>
            </Pressable>
            <View style={styles.field}>
                <TextField label="Full name" value={name} autoCapitalize="words" textContentType="name"
                           placeholder="Your full name" error={error}
                           onChangeText={(v) => { setName(v); setError(null); }}/>
            </View>
            <Footer><Button title="Continue" onPress={save} loading={busy}/></Footer>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    heading: {paddingHorizontal: 16, marginTop: 32, gap: 8},
    // Avatar 96 px centred at y 268; the camera button overlaps its lower right.
    avatar: {alignSelf: 'center', marginTop: 20, width: 96, height: 96},
    camera: {position: 'absolute', left: 66, top: 62, width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
    field: {paddingHorizontal: 16, marginTop: 36},
});
