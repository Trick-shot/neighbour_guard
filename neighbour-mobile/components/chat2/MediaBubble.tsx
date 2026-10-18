import {Audio} from 'expo-av';
import {Image} from 'expo-image';
import {useEffect, useRef, useState} from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';

import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {Attachment} from '@/lib/types';
import {radius, useColors} from '@/theme';

/**
 * Figma "Chat bubble" — the Voice, Photo, Video and Document variants.
 *
 * A voice note plays in place; a photo shows; a video and a document open outside the app, because
 * a chat screen is not a media player and a half-built one would be worse than the phone's own.
 */
const seconds = (n?: number | null) => {
    const total = Math.max(0, Math.round(n ?? 0));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const size = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function VoiceBubble({attachment, tint}: { attachment: Attachment; tint: string }) {
    const c = useColors();
    const sound = useRef<Audio.Sound | null>(null);
    const [playing, setPlaying] = useState(false);

    useEffect(() => () => { sound.current?.unloadAsync(); }, []);

    const toggle = async () => {
        try {
            if (!sound.current) {
                const {sound: loaded} = await Audio.Sound.createAsync({uri: attachment.url});
                sound.current = loaded;
                loaded.setOnPlaybackStatusUpdate((status) => {
                    if ('didJustFinish' in status && status.didJustFinish) setPlaying(false);
                });
            }
            if (playing) {
                await sound.current.pauseAsync();
                setPlaying(false);
            } else {
                await sound.current.playFromPositionAsync(0);
                setPlaying(true);
            }
        } catch {
            setPlaying(false);
        }
    };

    return (
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause' : 'Play voice note'}
                   onPress={toggle} style={styles.voice}>
            <View style={[styles.play, {backgroundColor: tint}]}>
                <Icon name={playing ? 'volume-x' : 'mic'} size={18} color={c.icon.onBrand}/>
            </View>
            {/* A fixed waveform: drawing the real one would mean decoding the file on the phone. */}
            <View style={styles.wave}>
                {[6, 12, 18, 10, 20, 14, 8, 16, 11, 19, 7, 13].map((height, i) => (
                    <View key={i} style={[styles.bar, {height, backgroundColor: tint, opacity: playing ? 1 : 0.45}]}/>
                ))}
            </View>
            <Text variant="caption1" color={c.text.secondary}>{seconds(attachment.duration_s)}</Text>
        </Pressable>
    );
}

export function PhotoBubble({attachment}: { attachment: Attachment }) {
    return (
        <Image source={{uri: attachment.url}} style={styles.photo} contentFit="cover"
               accessibilityLabel="Photo"/>
    );
}

export function FileBubble({attachment, video}: { attachment: Attachment; video?: boolean }) {
    const c = useColors();
    return (
        <Pressable accessibilityRole="button" onPress={() => Linking.openURL(attachment.url)}
                   style={styles.file}>
            <View style={[styles.fileIcon, {backgroundColor: c.bg.subtle}]}>
                <Icon name={video ? 'image' : 'clipboard-list'} size={20}/>
            </View>
            <View style={styles.fileText}>
                <Text variant="label" numberOfLines={1}>{video ? 'Video' : 'Document'}</Text>
                <Text variant="caption1" color={c.text.muted}>
                    {size(attachment.size)}{attachment.duration_s ? ` · ${seconds(attachment.duration_s)}` : ''} · tap to open
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    voice: {flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180},
    play: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
    wave: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24},
    bar: {width: 3, borderRadius: 2},
    photo: {width: 220, height: 220, borderRadius: radius.md},
    file: {flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 200},
    fileIcon: {width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center'},
    fileText: {flex: 1},
});
