import {StyleSheet, View} from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Text from '@/components/ui/Text';
import {shadow, useColors} from '@/theme';

/**
 * Figma "Chat bubble" (1614:214), Text variants.
 * In: avatar + name + time above a white bubble. Out: time above a light brand bubble with a
 * brand outline (own messages are deliberately not the solid iMessage blue).
 */
type Props = { direction: 'in' | 'out'; body: string; sender?: string | null; time: string; showAvatar?: boolean; pending?: boolean };

export default function ChatBubble({direction, body, sender, time, showAvatar = true, pending}: Props) {
    const c = useColors();
    if (direction === 'out') {
        return (
            <View style={[styles.row, {justifyContent: 'flex-end'}]}>
                <View style={[styles.content, {alignItems: 'flex-end'}]}>
                    <Text variant="caption2" color={c.text.muted}>{pending ? 'Sending…' : time}</Text>
                    <View style={[styles.bubble, styles.out, shadow.bubble, {backgroundColor: c.bg.brandSubtle, borderColor: c.border.brand}]}>
                        <Text variant="body" style={styles.body}>{body}</Text>
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
                    <Text variant="body" style={styles.body}>{body}</Text>
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
