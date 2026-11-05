import * as ImagePicker from 'expo-image-picker';
import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {useAuth} from '@/context/AuthContext';
import {placesApi, profileApi} from '@/lib/endpoints';
import {Me, MyResidence} from '@/lib/types';
import {type, useColors} from '@/theme';

/**
 * Figma "Personal information" (1634:2642).
 *
 * Only the name is typed here. The email is how you sign in, the phone only changes through a
 * code sent to it, and the home has its own screen — each opens where it can really be changed.
 */
export default function PersonalInformation() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {logout} = useAuth();
    const [me, setMe] = useState<Me | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirm, setConfirm] = useState('');

    useEffect(() => {
        profileApi.me().then((m) => { setMe(m); setName(m.full_name); }).catch(() => undefined);
        placesApi.me().then(setHome).catch(() => undefined);
    }, []);

    const changePhoto = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1]});
        if (res.canceled || !me) return;
        setPhotoBusy(true);
        try {
            const r = await profileApi.uploadPhoto(res.assets[0].uri, res.assets[0].mimeType ?? 'image/jpeg');
            setMe({...me, photo_url: r.photo_url});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setPhotoBusy(false);
        }
    };

    const save = async () => {
        if (name.trim().length < 2) return setError('Your name, as neighbours know you.');
        setBusy(true);
        setError(null);
        try {
            setMe(await profileApi.rename(name.trim()));
            router.back();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const deleteAccount = async () => {
        setBusy(true);
        try {
            await profileApi.deleteAccount();
            setDeleting(false);
            await logout();
            router.replace('/authentication/login');
        } catch (e: any) {
            setError(e.message);
            setBusy(false);
        }
    };

    const ReadOnly = ({label, value, onPress}: { label: string; value: string; onPress?: () => void }) => (
        <View style={styles.field}>
            <Text variant="label">{label}</Text>
            <Pressable disabled={!onPress} onPress={onPress} style={[styles.box, {borderColor: c.border.default}]}>
                <Text style={type.body} color={c.text.muted} numberOfLines={1}>{value}</Text>
            </Pressable>
        </View>
    );

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Personal information"/>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Pressable onPress={changePhoto} style={styles.photo} disabled={photoBusy}>
                    <Avatar name={me?.full_name} uri={me?.photo_url} size={72}/>
                    <Text variant="subhead" color={c.text.brand}>{photoBusy ? 'Uploading…' : 'Change photo'}</Text>
                </Pressable>
                <TextField label="Full name" value={name} onChangeText={setName} maxLength={100}/>
                <ReadOnly label="Email · used to sign in" value={me?.email ?? ''}/>
                <ReadOnly label="Phone · for SMS alerts when offline" value={me?.phone_number || 'Add a phone number'}
                          onPress={() => router.push('/authentication/phone')}/>
                <ReadOnly label="Home" value={home ? `House ${home.house_number}, ${home.street}` : 'Add your home'}
                          onPress={() => router.push(home ? '/profile/home' : '/authentication/location')}/>
                {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
                <Pressable onPress={() => setDeleting(true)} style={styles.delete}>
                    <Text variant="subhead" color={c.text.danger}>Delete account</Text>
                </Pressable>
            </ScrollView>
            <Footer>
                <Button title="Save changes" onPress={save} loading={busy} disabled={!me || name.trim() === me.full_name}/>
            </Footer>

            <Modal visible={deleting} transparent animationType="slide" onRequestClose={() => setDeleting(false)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setDeleting(false)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Delete your account?</Text>
                    <Text variant="subhead" color={c.text.secondary}>
                        You leave your home and your neighbourhood group, and your contacts, medical notes and photo are erased.
                        Alerts you answered stay, under “Former neighbour”. This cannot be undone.
                    </Text>
                    <TextField label="Type DELETE to confirm" value={confirm} onChangeText={setConfirm} autoCapitalize="characters"/>
                    <Button title="Delete my account" variant="danger" onPress={deleteAccount} loading={busy} disabled={confirm !== 'DELETE'}/>
                    <Button title="Keep my account" variant="text" onPress={() => setDeleting(false)}/>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 16},
    photo: {alignItems: 'center', gap: 8},
    field: {gap: 8},
    box: {height: 52, borderWidth: 1, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 16},
    delete: {alignSelf: 'center', paddingVertical: 4},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 8, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
});
