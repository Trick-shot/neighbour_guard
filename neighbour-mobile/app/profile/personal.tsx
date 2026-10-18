import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {profileApi} from '@/lib/endpoints';
import {Me} from '@/lib/types';
import {radius, useColors} from '@/theme';

/** Figma page "Android · 07" / "Personal information". */
export default function PersonalInformation() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [me, setMe] = useState<Me | null>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        profileApi.me().then((data) => { setMe(data); setName(data.full_name); }).catch(() => undefined);
    }, []);

    const save = async () => {
        if (name.trim().length < 3) return setError('Your neighbours need to recognise this.');
        setBusy(true);
        setError(null);
        try {
            const updated = await profileApi.rename(name.trim());
            setMe(updated);
            setSaved(true);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Personal information"/>
            <View style={styles.content}>
                <TextField label="Full name" value={name} autoCapitalize="words" error={error}
                           helper="This is the name a neighbour sees on your alert."
                           onChangeText={(v) => { setName(v); setError(null); setSaved(false); }}/>

                {/* Email and phone are deliberately not editable here. */}
                <View style={[styles.locked, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="mail" size={20} color={c.icon.muted}/>
                    <View style={styles.lockedText}>
                        <Text variant="label">{me?.email ?? ' '}</Text>
                        <Text variant="footnote" color={c.text.muted}>
                            Your email is how you sign in, so it cannot be changed here.
                        </Text>
                    </View>
                </View>

                <View style={[styles.locked, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="phone" size={20} color={c.icon.muted}/>
                    <View style={styles.lockedText}>
                        <Text variant="label">
                            {me?.phone_number || 'No phone number'}
                            {me?.is_phone_verified ? ' · verified' : ''}
                        </Text>
                        <Text variant="footnote" color={c.text.muted}>
                            {me?.is_phone_verified
                                ? 'Shown to neighbours only while one of your alerts is live.'
                                : 'A verified number lets a responder call you during an alert.'}
                        </Text>
                        <Text variant="subhead" color={c.text.brand}
                              onPress={() => router.push('/authentication/phone')}>
                            {me?.is_phone_verified ? 'Change my number' : 'Add my number'}
                        </Text>
                    </View>
                </View>

                {saved && <Text variant="subhead" color={c.feedback.success}>Saved.</Text>}
            </View>
            <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 16)}]}>
                <Button title="Save" onPress={save} loading={busy} disabled={!me || name.trim() === me.full_name}/>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 16},
    locked: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    lockedText: {flex: 1, gap: 4},
    footer: {paddingHorizontal: 16},
});
