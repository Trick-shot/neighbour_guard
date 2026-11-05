import {Image} from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {router} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import {CATEGORY_META} from '@/components/ui/IssueCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Segmented from '@/components/ui/Segmented';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {issuesApi, placesApi} from '@/lib/endpoints';
import {IssueCategory, IssueVisibility, MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Report an issue" (1620:1056).
 *
 * The neighbourhood is never asked for: the server takes it from the reporter's own home. The pin
 * is where the phone is now, never the home's exact point, because a public issue is seen by other
 * areas. Security is left out of the categories on purpose: danger happening now is an SOS.
 */
const CATEGORIES: IssueCategory[] = ['waste', 'lighting', 'roads', 'water', 'noise', 'other'];
const MAX_PHOTOS = 4;

export default function ReportIssue() {
    const c = useColors();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<IssueCategory | null>(null);
    const [severity, setSeverity] = useState<'low' | 'moderate'>('low');
    const [visibility, setVisibility] = useState<IssueVisibility>('neighbourhood');
    const [photos, setPhotos] = useState<string[]>([]);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [here, setHere] = useState<{ lat: number; lng: number; street?: string | null } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const created = useRef<number | null>(null); // a retry after a failed photo upload must not post twice

    useEffect(() => {
        placesApi.me().then(setHome).catch(() => undefined);
        (async () => {
            const {status} = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const fix = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
            const place = (await Location.reverseGeocodeAsync(fix.coords).catch(() => []))[0];
            setHere({lat: fix.coords.latitude, lng: fix.coords.longitude, street: place?.street});
        })().catch(() => undefined);
    }, []);

    const addPhoto = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length});
        if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    };

    const submit = async () => {
        if (title.trim().length < 5) return setError('A few more words in the title, so neighbours know what this is.');
        if (!category) return setError('Pick a category.');
        setBusy(true);
        setError(null);
        try {
            if (created.current === null) {
                const issue = await issuesApi.report({
                    title: title.trim(), description: description.trim(), category, severity, visibility,
                    ...(here ? {lat: here.lat, lng: here.lng} : {}),
                });
                created.current = issue.id;
            }
            const id = created.current;
            const failed: string[] = [];
            for (const uri of photos) await issuesApi.addPhoto(id, uri).catch(() => failed.push(uri));
            router.replace({pathname: '/issues/posted', params: {id: String(id), photosFailed: failed.length ? String(failed.length) : ''}});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const area = home?.neighbourhood.name ?? 'your neighbourhood';
    const where = here ? `${here.street ?? 'Where you are now'}, ${area}` : `No pin · ${area}`;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Report an issue"/>
            <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Street lights out on Hekima St" maxLength={120}/>

                <View style={styles.group}>
                    <Text variant="label">Category</Text>
                    <View style={styles.pills}>
                        {CATEGORIES.map((k) => {
                            const on = category === k;
                            return (
                                <Pressable key={k} accessibilityRole="button" accessibilityState={{selected: on}} onPress={() => setCategory(k)}
                                           style={[styles.pill, on ? {backgroundColor: c.bg.inverse} : {borderWidth: 1, borderColor: c.border.default}]}>
                                    <Text variant="subhead" color={on ? c.text.inverse : c.text.primary}>{CATEGORY_META[k].short}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.group}>
                    <Text variant="label">Severity</Text>
                    <Segmented options={[{key: 'low', label: 'Low'}, {key: 'moderate', label: 'Needs attention'}]} value={severity} onChange={setSeverity}/>
                </View>

                <TextField label="Description" value={description} onChangeText={setDescription} placeholder="What is happening, and since when?" multiline maxLength={2000}/>

                <View style={styles.group}>
                    <Text variant="label">Photos</Text>
                    <View style={styles.photos}>
                        {photos.length < MAX_PHOTOS && (
                            <Pressable accessibilityLabel="Add photo" onPress={addPhoto} style={[styles.photo, styles.add, {backgroundColor: c.bg.subtle, borderColor: c.border.strong}]}>
                                <Icon name="camera" size={24} color={c.icon.muted}/>
                            </Pressable>
                        )}
                        {photos.map((uri) => (
                            <Pressable key={uri} accessibilityLabel="Remove photo" onLongPress={() => setPhotos((p) => p.filter((x) => x !== uri))}>
                                <Image source={{uri}} style={styles.photo} contentFit="cover"/>
                            </Pressable>
                        ))}
                    </View>
                    <Text variant="footnote" color={c.text.muted}>Location: {where}</Text>
                </View>

                <View style={styles.group}>
                    <Text variant="label">Who can see this?</Text>
                    <Segmented options={[{key: 'neighbourhood', label: 'My neighbourhood'}, {key: 'public', label: 'Public'}]} value={visibility} onChange={setVisibility}/>
                    <Text variant="footnote" color={c.text.muted}>
                        {visibility === 'public'
                            ? `Nearby areas can see and support it. Only ${area} residents can comment.`
                            : `Only verified ${area} residents will see it. Choose Public to let nearby areas see and support it.`}
                    </Text>
                </View>
                {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
            </KeyboardAwareScrollView>
            <Footer bottom={18}>
                <Button title="Post to neighbours" onPress={submit} loading={busy}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 16},
    group: {gap: 8},
    pills: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    pill: {height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center'},
    photos: {flexDirection: 'row', gap: 8},
    photo: {width: 72, height: 72, borderRadius: 12},
    add: {borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'},
});
