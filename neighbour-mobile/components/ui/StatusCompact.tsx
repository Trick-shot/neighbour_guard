import {Pressable, StyleSheet, View} from 'react-native';

import {shadow, useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/**
 * Figma "Status · compact" (Home top bar). Quiet: white pill, green shield. Alert: the whole pill
 * turns danger red with white text, and the bell's badge flips to white-on-red
 * ("Home — alert nearby", 1672:1635).
 */
type Tone = 'quiet' | 'alert' | 'protected';
type Props = { tone: Tone; title: string; subtitle: string; badge?: number; onPress?: () => void; onBell?: () => void };

export default function StatusCompact({tone, title, subtitle, badge = 0, onPress, onBell}: Props) {
    const c = useColors();
    const alert = tone === 'alert';
    const icon: IconName = alert ? 'siren' : 'shield-check';
    const onColour = 'rgba(255,255,255,0.22)';
    return (
        <Pressable onPress={onPress} style={[styles.bar, shadow.card, {backgroundColor: alert ? c.bg.danger : c.bg.surface}]}>
            <View style={[styles.circle, {backgroundColor: alert ? onColour : c.feedback.successBg}]}>
                <Icon name={icon} size={20} color={alert ? c.icon.onBrand : c.feedback.success}/>
            </View>
            <View style={styles.text}>
                <Text variant="headline" numberOfLines={1} color={alert ? c.text.onBrand : undefined}>{title}</Text>
                <Text variant="footnote" numberOfLines={1} color={alert ? c.text.onBrand : c.text.secondary}>{subtitle}</Text>
            </View>
            <Pressable onPress={onBell} hitSlop={6} accessibilityLabel="Notifications"
                       style={[styles.circle, {backgroundColor: alert ? onColour : c.bg.subtle}]}>
                <Icon name="bell" size={20} color={alert ? c.icon.onBrand : undefined}/>
                {badge > 0 && (
                    <View style={[styles.badge, alert
                        ? {backgroundColor: c.bg.surface, borderColor: c.bg.danger}
                        : {backgroundColor: c.bg.danger, borderColor: c.bg.surface}]}>
                        <Text variant="caption2" color={alert ? c.text.danger : c.text.onBrand}>{badge > 9 ? '9+' : badge}</Text>
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
