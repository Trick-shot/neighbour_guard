import {Audio} from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import {useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, TextInput, View} from 'react-native';

import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {radius, shadow, type, useColors} from '@/theme';

/**
 * Figma "Composer" (1614:215): + / message / mic in a pill, round send button.
 *
 * The mic records while held — the same gesture as the SOS button, so there is one thing to learn.
 * Releasing sends; sliding off cancels.
 */
export type PickedFile = { uri: string; name: string; mime: string };
export type MediaKind = 'photo' | 'video' | 'voice' | 'file';

type Props = {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    bottomInset: number;
    onPickMedia?: (file: PickedFile, kind: MediaKind, durationSeconds?: number) => void;
    busy?: boolean;
};

export default function Composer({value, onChange, onSend, bottomInset, onPickMedia, busy}: Props) {
    const c = useColors();
    const [menuOpen, setMenuOpen] = useState(false);
    const [recording, setRecording] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const recorder = useRef<Audio.Recording | null>(null);
    const startedAt = useRef<number>(0);

    const pick = async (kind: 'photo' | 'video') => {
        setMenuOpen(false);
        setNote(null);
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return setNote('Photos are not allowed for this app yet.');
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
            quality: 0.8,
        });
        const asset = result.assets?.[0];
        if (result.canceled || !asset) return;
        onPickMedia?.(
            {
                uri: asset.uri,
                name: asset.fileName ?? (kind === 'photo' ? 'photo.jpg' : 'video.mp4'),
                mime: asset.mimeType ?? (kind === 'photo' ? 'image/jpeg' : 'video/mp4'),
            },
            kind,
            asset.duration ? asset.duration / 1000 : undefined,
        );
    };

    const startRecording = async () => {
        setNote(null);
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) return setNote('The microphone is not allowed for this app yet.');
            await Audio.setAudioModeAsync({allowsRecordingIOS: true, playsInSilentModeIOS: true});
            const {recording: started} = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY);
            recorder.current = started;
            startedAt.current = Date.now();
            setRecording(true);
        } catch {
            setNote('Could not start recording.');
        }
    };

    const stopRecording = async (send: boolean) => {
        const current = recorder.current;
        recorder.current = null;
        setRecording(false);
        if (!current) return;
        try {
            await current.stopAndUnloadAsync();
            const seconds = (Date.now() - startedAt.current) / 1000;
            const uri = current.getURI();
            // Under a second is almost always a mis-tap, not a message.
            if (!send || !uri || seconds < 1) return;
            onPickMedia?.({uri, name: 'voice.m4a', mime: 'audio/mp4'}, 'voice', seconds);
        } catch {
            setNote('Could not save that recording.');
        }
    };

    return (
        <View style={[styles.wrap, {borderTopColor: c.border.default, paddingBottom: 8 + bottomInset,
            backgroundColor: c.bg.surface}]}>
            {menuOpen && (
                <View style={[styles.menu, shadow.card, {backgroundColor: c.bg.surface}]}>
                    <Pressable accessibilityRole="button" onPress={() => pick('photo')} style={styles.menuRow}>
                        <Icon name="image" size={20} color={c.icon.brand}/>
                        <Text variant="body">Photo</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => pick('video')} style={styles.menuRow}>
                        <Icon name="camera" size={20} color={c.icon.brand}/>
                        <Text variant="body">Video</Text>
                    </Pressable>
                </View>
            )}
            {(note || recording || busy) && (
                <Text variant="caption1" color={recording ? c.text.danger : c.text.muted} style={styles.note}>
                    {recording ? 'Recording… release to send, slide away to cancel'
                        : busy ? 'Sending…' : note}
                </Text>
            )}
            <View style={styles.row}>
                <View style={[styles.input, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                    <Pressable onPress={() => setMenuOpen((o) => !o)} accessibilityLabel="Attach" hitSlop={8}>
                        <Icon name={menuOpen ? 'x' : 'plus'} size={22}/>
                    </Pressable>
                    <TextInput
                        value={value}
                        onChangeText={onChange}
                        placeholder="Message…"
                        placeholderTextColor={c.text.muted}
                        style={[type.body, styles.field, {color: c.text.primary}]}
                        multiline
                    />
                    <Pressable
                        accessibilityLabel="Hold to record a voice note"
                        onPressIn={startRecording}
                        onPressOut={() => stopRecording(true)}
                        hitSlop={8}>
                        <Icon name="mic" size={22} color={recording ? c.icon.danger : c.icon.default}/>
                    </Pressable>
                </View>
                <Pressable accessibilityLabel="Send" onPress={onSend} disabled={busy}
                           style={[styles.send, {backgroundColor: busy ? c.bg.disabled : c.bg.brand}]}>
                    {busy ? <ActivityIndicator color={c.icon.onBrand}/>
                        : <Icon name="send" size={22} color={c.icon.onBrand}/>}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, gap: 6},
    row: {flexDirection: 'row', alignItems: 'center', gap: 10},
    input: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14,
        borderRadius: 26},
    field: {flex: 1, paddingVertical: 12, maxHeight: 120},
    send: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
    menu: {borderRadius: radius.md, paddingVertical: 4, marginBottom: 4},
    menuRow: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12},
    note: {marginLeft: 8},
});
