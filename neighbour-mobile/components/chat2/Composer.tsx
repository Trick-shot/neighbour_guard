import {RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Modal, PanResponder, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icon, {IconName} from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {shadow, type, useColors} from '@/theme';

/**
 * Figma "Composer" (1614:215), "Messages — attach" (1715:791) and "recording a voice note"
 * (1715:639). The mic records while held — the same gesture as SOS, so there is one thing to
 * learn. Release sends; sliding left cancels.
 */
export type PickedFile = { uri: string; name: string; mime: string };
export type MediaKind = 'photo' | 'video' | 'voice' | 'file';
type Props = {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    bottomInset: number;
    onPickMedia?: (file: PickedFile, kind: MediaKind, durationSeconds?: number) => void;
    onShareLocation?: () => void;
    busy?: boolean;
    startRecording?: boolean;
};

const CANCEL_DX = -90;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Composer({value, onChange, onSend, bottomInset, onPickMedia, onShareLocation, busy, startRecording}: Props) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [sheet, setSheet] = useState(false);
    const [recording, setRecording] = useState(false);
    const [locked, setLocked] = useState(false); // started from the sheet: tap to send instead of hold
    const [seconds, setSeconds] = useState(0);
    const [cancelling, setCancelling] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    // expo-audio gives one long-lived recorder from a hook, instead of expo-av's
    // throwaway Recording object, so `active` tracks whether a take is in progress.
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const active = useRef(false);
    const startedAt = useRef(0);
    const cancelRef = useRef(false);

    useEffect(() => {
        if (!recording) return;
        const t = setInterval(() => setSeconds((Date.now() - startedAt.current) / 1000), 250);
        return () => clearInterval(t);
    }, [recording]);

    const start = async (tapMode = false) => {
        setNote(null);
        try {
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted) return setNote('The microphone is not allowed for this app yet.');
            await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
            await recorder.prepareToRecordAsync();
            recorder.record();
            active.current = true;
            startedAt.current = Date.now();
            cancelRef.current = false;
            setCancelling(false);
            setSeconds(0);
            setLocked(tapMode);
            setRecording(true);
        } catch {
            setNote('Could not start recording.');
        }
    };

    const stop = async (send: boolean) => {
        const wasActive = active.current;
        active.current = false;
        setRecording(false);
        setLocked(false);
        if (!wasActive) return;
        try {
            await recorder.stop();
            const secs = (Date.now() - startedAt.current) / 1000;
            const uri = recorder.uri;
            // Under a second is almost always a mis-tap, not a message.
            if (!send || !uri || secs < 1) return;
            onPickMedia?.({uri, name: 'voice.m4a', mime: 'audio/mp4'}, 'voice', secs);
        } catch {
            setNote('Could not save that recording.');
        }
    };

    useEffect(() => { if (startRecording) start(true); }, [startRecording]); // eslint-disable-line react-hooks/exhaustive-deps

    // Hold the mic: press starts, release sends, sliding left past the line cancels.
    const hold = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { start(false); },
        onPanResponderMove: (_, g) => {
            const off = g.dx < CANCEL_DX;
            cancelRef.current = off;
            setCancelling(off);
        },
        onPanResponderRelease: () => { stop(!cancelRef.current); },
        onPanResponderTerminate: () => { stop(false); },
    })).current;

    const fromLibrary = async () => {
        setSheet(false);
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return setNote('Photos are not allowed for this app yet.');
        const r = await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images', 'videos'], quality: 0.7});
        const a = r.assets?.[0];
        if (r.canceled || !a) return;
        const video = a.type === 'video';
        onPickMedia?.({uri: a.uri, name: a.fileName ?? (video ? 'video.mp4' : 'photo.jpg'), mime: a.mimeType ?? (video ? 'video/mp4' : 'image/jpeg')},
            video ? 'video' : 'photo', a.duration ? a.duration / 1000 : undefined);
    };
    const fromCamera = async () => {
        setSheet(false);
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return setNote('The camera is not allowed for this app yet.');
        const r = await ImagePicker.launchCameraAsync({quality: 0.7});
        const a = r.assets?.[0];
        if (!r.canceled && a) onPickMedia?.({uri: a.uri, name: 'photo.jpg', mime: a.mimeType ?? 'image/jpeg'}, 'photo');
    };
    const document = async () => {
        setSheet(false);
        const r = await DocumentPicker.getDocumentAsync({copyToCacheDirectory: true, type: ['application/pdf', 'text/plain',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']});
        const a = r.assets?.[0];
        if (!r.canceled && a) onPickMedia?.({uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf'}, 'file');
    };

    const tiles: { label: string; icon: IconName; bg: string; fg: string; onPress: () => void }[] = [
        {label: 'Camera', icon: 'camera', bg: c.bg.brandSubtle, fg: c.icon.brand, onPress: fromCamera},
        {label: 'Photos & videos', icon: 'image', bg: c.feedback.successBg, fg: c.feedback.success, onPress: fromLibrary},
        {label: 'Document', icon: 'clipboard-list', bg: c.feedback.warningBg, fg: c.feedback.warning, onPress: document},
        {label: 'Location', icon: 'map-pin', bg: c.bg.dangerSubtle, fg: c.icon.danger, onPress: () => { setSheet(false); onShareLocation?.(); }},
        {label: 'Voice note', icon: 'mic', bg: c.bg.brandSubtle, fg: c.icon.brand, onPress: () => { setSheet(false); start(true); }},
    ];

    return (
        <View style={[styles.wrap, {borderTopColor: c.border.default, paddingBottom: 8 + bottomInset, backgroundColor: c.bg.surface}]}>
            {recording && (
                <View style={styles.toast} pointerEvents="none">
                    <Text variant="footnote" color={c.text.inverse} style={[styles.toastText, {backgroundColor: 'rgba(20,26,36,0.88)'}]}>
                        {locked ? 'Tap the mic to send · tap Cancel to stop' : cancelling ? 'Release to cancel' : 'Release to send · slide left to cancel'}
                    </Text>
                </View>
            )}
            {(note || busy) && !recording && (
                <Text variant="caption1" color={c.text.muted} style={styles.note}>{busy ? 'Sending…' : note}</Text>
            )}
            <View style={styles.row}>
                <View style={[styles.input, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                    <Pressable onPress={() => setSheet(true)} accessibilityLabel="Attach" hitSlop={8}>
                        <Icon name="plus" size={22} color={c.icon.muted}/>
                    </Pressable>
                    <TextInput value={value} onChangeText={onChange} placeholder="Message…" placeholderTextColor={c.text.muted}
                               style={[type.body, styles.field, {color: c.text.primary}]} multiline/>
                    {/* Stays mounted while recording, so the finger that is holding it keeps the gesture. */}
                    <View accessibilityLabel="Hold to record a voice note" hitSlop={8} {...hold.panHandlers}>
                        <Icon name="mic" size={22} color={c.icon.muted}/>
                    </View>
                </View>
                <Pressable accessibilityLabel="Send" onPress={onSend} disabled={busy}
                           style={[styles.send, {backgroundColor: busy ? c.bg.disabled : c.bg.brand}]}>
                    {busy ? <ActivityIndicator color={c.icon.onBrand}/> : <Icon name="send" size={22} color={c.icon.onBrand}/>}
                </Pressable>
                {recording && (
                    <View style={[StyleSheet.absoluteFill, styles.row, {backgroundColor: c.bg.surface}]} pointerEvents={locked ? 'box-none' : 'none'}>
                        <View style={[styles.input, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                            <View style={[styles.recDot, {backgroundColor: c.bg.danger}]}/>
                            <Text variant="headline" style={styles.flex}>{mmss(seconds)}</Text>
                            {locked ? (
                                <Text variant="subhead" color={c.text.brand} onPress={() => stop(false)}>Cancel</Text>
                            ) : (
                                <Text variant="subhead" color={cancelling ? c.text.danger : c.text.muted}>‹ Slide to cancel</Text>
                            )}
                        </View>
                        <Pressable accessibilityLabel="Send voice note" disabled={!locked} onPress={() => stop(true)}
                                   style={[styles.send, {backgroundColor: c.bg.danger}]}>
                            <Icon name="mic" size={22} color={c.icon.onBrand}/>
                        </Pressable>
                    </View>
                )}
            </View>

            <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setSheet(false)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Share</Text>
                    <View style={styles.grid}>
                        {tiles.map((t) => (
                            <Pressable key={t.label} onPress={t.onPress} style={styles.tile}>
                                <View style={[styles.tileIcon, {backgroundColor: t.bg}]}><Icon name={t.icon} size={24} color={t.fg}/></View>
                                <Text variant="footnote" color={c.text.secondary}>{t.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text variant="caption1" color={c.text.muted}>Photos and videos are compressed to save data. Max 25 MB per file.</Text>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, gap: 6},
    row: {flexDirection: 'row', alignItems: 'center', gap: 10},
    flex: {flex: 1},
    input: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 26},
    field: {flex: 1, paddingVertical: 12, maxHeight: 120},
    send: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
    recDot: {width: 10, height: 10, borderRadius: 5},
    toast: {position: 'absolute', top: -44, left: 0, right: 0, alignItems: 'center'},
    toastText: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden'},
    note: {marginLeft: 8},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 20, gap: 16,
        borderTopLeftRadius: 28, borderTopRightRadius: 28},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
    grid: {flexDirection: 'row', flexWrap: 'wrap', rowGap: 18},
    tile: {width: '33.33%', alignItems: 'center', gap: 8},
    tileIcon: {width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
});
