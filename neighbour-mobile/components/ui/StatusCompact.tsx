import {Pressable, StyleSheet, View} from 'react-native';

import {shadow, useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/** Figma "Status · compact" (Home top bar): state icon, title + subtitle, bell with badge. */
type Tone = 'quiet' | 'alert' | 'protected';
type Props = { tone: Tone; title: string; subtitle: string; badge?: number; onPress?: () => void; onBell?: () => void };

export default function StatusCompact({tone, title, subtitle, badge = 0, onPress, onBell}: Props) {
    const c = useColors();
    const iconBg = tone === 'alert' ? c.bg.dangerSubtle : c.feedback.successBg;
    const iconColor = tone === 'alert' ? c.icon.danger : c.feedback.success;
    const icon: IconName = tone === 'alert' ? 'siren' : 'shield-check';
    return (
        <Pressable onPress={onPress} style={[styles.bar, shadow.card, {backgroundColor: c.bg.surface}]}>
            <View style={[styles.circle, {backgroundColor: iconBg}]}>
                <Icon name={icon} size={20} color={iconColor}/>
            </View>
            <View style={styles.text}>
                <Text variant="headline" numberOfLines={1}>{title}</Text>
                <Text variant="footnote" color={c.text.secondary} numberOfLines={1}>{subtitle}</Text>
            </View>
            <Pressable onPress={onBell} accessibilityLabel="Notifications" style={[styles.circle, {backgroundColor: c.bg.subtle}]}>
                <Icon name="bell" size={20}/>
                {badge > 0 && (
                    <View style={[styles.badge, {backgroundColor: c.bg.danger, borderColor: c.bg.surface}]}>
                        <Text variant="caption2" color={c.text.onBrand}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                )}
            </Pressable>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    bar: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 999},
    circle: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    text: {flex: 1, minWidth: 0},
    badge: {
        position: 'absolute', left: 26, top: -4, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
    },
});
