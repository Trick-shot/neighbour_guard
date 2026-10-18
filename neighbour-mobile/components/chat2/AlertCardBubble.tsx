import {Pressable, StyleSheet, View} from 'react-native';

import {ALERT_META} from '@/components/ui/AlertTypeChip';
import Avatar from '@/components/ui/Avatar';
import Text from '@/components/ui/Text';
import {Alert} from '@/lib/types';
import {alertColor, shadow, useColors} from '@/theme';

/**
 * Figma "Chat bubble · Alert" (1710:11272): a white bubble holding a live alert card in the alert's
 * colour, with the people responding and an "I'm coming" button. Live state comes from the alert
 * itself, so the card never shows stale responders.
 */
type Props = {
    alert: Alert | null;
    sender: string | null;
    time: string;
    body: string;
    mine: boolean;
    canRespond: boolean;
    onComing: () => void;
    onOpen: () => void;
};

const ago = (iso?: string | null) => {
    if (!iso) return '';
    const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return min < 1 ? 'just now' : `${min} min ago`;
};

export default function AlertCardBubble({alert, sender, time, body, mine, canRespond, onComing, onOpen}: Props) {
    const c = useColors();
    const live = alert?.status === 'sent';
    const tint = alert ? alertColor(c, alert.type) : c.bg.danger;
    const title = alert?.home?.house_number ? `${ALERT_META[alert.type].label} at House ${alert.home.house_number}` : ALERT_META[alert?.type ?? 'emergency'].label;
    const coming = (alert?.responses ?? []).filter((r) => r.state === 'coming' || r.state === 'arrived');
    const status = live ? 'LIVE' : alert?.status === 'resolved' ? 'RESOLVED' : 'ENDED';
    return (
        <View style={[styles.row, mine && {justifyContent: 'flex-end'}]}>
            {!mine && <Avatar name={sender}/>}
            <Pressable onPress={onOpen} style={[styles.bubble, shadow.bubble, {backgroundColor: c.bg.surface}, mine ? styles.out : styles.in]}>
                <View style={styles.header}>
                    <Text variant="headline">{mine ? 'You' : sender}</Text>
                    <Text variant="footnote" color={c.text.muted}>{time}</Text>
                </View>
                {!!body && <Text variant="body">{body}</Text>}
                <View style={[styles.card, {backgroundColor: live ? tint : c.bg.inverse}]}>
                    <View style={styles.top}>
                        <View style={styles.text}>
                            <View style={styles.live}>
                                <View style={[styles.dot, {opacity: live ? 1 : 0.5}]}/>
                                <Text variant="caption1" color="rgba(255,255,255,0.7)">
                                    {status} · {ALERT_META[alert?.type ?? 'emergency'].label.toUpperCase()}
                                </Text>
                            </View>
                            <Text variant="title3" color="#ffffff">{title}</Text>
                            <Text variant="footnote" color="rgba(255,255,255,0.65)">{ago(alert?.sent_at)}</Text>
                        </View>
                        <View style={styles.responders}>
                            {coming.slice(0, 2).map((r, i) => (
                                <View key={r.responder_id} style={[styles.ring, {backgroundColor: live ? tint : c.bg.inverse, marginRight: i === 0 && coming.length > 1 ? -10 : 0}]}>
                                    <Avatar name={r.name}/>
                                </View>
                            ))}
                        </View>
                    </View>
                    {live && canRespond && (
                        <Pressable onPress={onComing} style={styles.coming} accessibilityRole="button">
                            <Text variant="buttonM">I’m coming</Text>
                        </Pressable>
                    )}
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, width: '100%'},
    bubble: {width: 300, padding: 14, gap: 10, borderRadius: 24},
    in: {borderTopLeftRadius: 8},
    out: {borderTopRightRadius: 8},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    card: {borderRadius: 18, padding: 16, gap: 14},
    top: {flexDirection: 'row', alignItems: 'center', gap: 10},
    text: {flex: 1, gap: 4},
    live: {flexDirection: 'row', alignItems: 'center', gap: 6},
    dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff'},
    responders: {flexDirection: 'row'},
    ring: {padding: 2, borderRadius: 24},
    coming: {height: 40, borderRadius: 999, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center'},
});
