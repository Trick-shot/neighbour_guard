import {StyleSheet, View} from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Text from '@/components/ui/Text';
import {Attachment, ChatMessage} from '@/lib/types';
import {shadow, useColors} from '@/theme';

import {FileBubble, PhotoBubble, VoiceBubble} from './MediaBubble';

/**
 * Figma "Chat bubble" (1614:214), Text variants.
 * In: avatar + name + time above a white bubble. Out: time above a light brand bubble with a
 * brand outline (own messages are deliberately not the solid iMessage blue).
 */
type Props = {
    direction: 'in' | 'out';
    body: string;
    sender?: string | null;
    time: string;
    showAvatar?: boolean;
    pending?: boolean;
    kind?: ChatMessage['kind'];
    attachment?: Attachment | null;
};

export default function ChatBubble({direction, body, sender, time, showAvatar = true, pending, kind = 'text',
                                    attachment}: Props) {
    const c = useColors();
    const tint = direction === 'out' ? c.bg.brand : c.icon.default;

    /** The contents of the bubble: words, or a file, or both. */
    const inside = () => {
        if (attachment && kind === 'voice') return <VoiceBubble attachment={attachment} tint={tint}/>;
        if (attachment && kind === 'photo') return <PhotoBubble attachment={attachment}/>;
        if (attachment && kind === 'video') return <FileBubble attachment={attachment} video/>;
        if (attachment && kind === 'file') return <FileBubble attachment={attachment}/>;
        return <Text variant="body" style={styles.body}>{body}</Text>;
    };
    if (direction === 'out') {
        return (
            <View style={[styles.row, {justifyContent: 'flex-end'}]}>
                <View style={[styles.content, {alignItems: 'flex-end'}]}>
                    <Text variant="caption2" color={c.text.muted}>{pending ? 'Sending…' : time}</Text>
                    <View style={[styles.bubble, styles.out, shadow.bubble, {backgroundColor: c.bg.brandSubtle, borderColor: c.border.brand}]}>
                        {inside()}
                    </View>
                </View>
            </View>
        );
    }
    return (
        <View style={[styles.row, {gap: 10}]}>
            {showAvatar ? <Avatar name={sender}/> : <View style={{width: 44}}/>}
            <View style={styles.content}>
                <View style={styles.meta}>
                    <Text variant="caption1" color={c.text.muted}>{sender}</Text>
                    <Text variant="caption2" color={c.text.muted}>{time}</Text>
                </View>
                <View style={[styles.bubble, styles.in, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                    {inside()}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'flex-start', width: '100%'},
    content: {gap: 6, alignItems: 'flex-start', flexShrink: 1},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 6},
    bubble: {paddingHorizontal: 16, paddingVertical: 11, borderRadius: 20},
    in: {borderTopLeftRadius: 6},
    out: {borderTopRightRadius: 6, borderWidth: 1},
    body: {maxWidth: 250},
});
