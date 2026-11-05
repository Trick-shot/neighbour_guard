import {Pressable, StyleSheet, View} from 'react-native';

import Icon, {IconName} from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/**
 * Figma "Quick actions rail" (1661:323). Collapsed: one brand "Actions" button carrying the
 * combined badge. Open: × then Report, Check-in, Guard, Voice.
 */
export type QuickAction = { key: string; label: string; icon: IconName; tone: 'danger' | 'success' | 'brand' | 'warning'; badge?: number; onPress: () => void };

export default function QuickActions({open, onToggle, actions}: { open: boolean; onToggle: () => void; actions: QuickAction[] }) {
    const c = useColors();
    const badge = actions.reduce((n, a) => n + (a.badge ?? 0), 0);
    const tones = {
        danger: {bg: c.bg.dangerSubtle, fg: c.icon.danger},
        success: {bg: c.feedback.successBg, fg: c.feedback.success},
        brand: {bg: c.bg.brandSubtle, fg: c.icon.brand},
        warning: {bg: c.feedback.warningBg, fg: c.feedback.warning},
    };
    if (!open) {
        return (
            <View style={[styles.rail, styles.collapsed, {backgroundColor: c.bg.surface}]}>
                <Pressable accessibilityLabel="Actions" onPress={onToggle} style={[styles.expand, {backgroundColor: c.bg.brand}]}>
                    <Icon name="more-horizontal" size={22} color={c.icon.onBrand}/>
                    {badge > 0 && (
                        <View style={[styles.badge, {backgroundColor: c.bg.danger, borderColor: c.bg.surface}]}>
                            <Text variant="caption2" color={c.text.onBrand}>{badge}</Text>
                        </View>
                    )}
                </Pressable>
                <Text variant="caption2" color={c.text.secondary}>Actions</Text>
            </View>
        );
    }
    return (
        <View style={[styles.rail, styles.opened, {backgroundColor: c.bg.surface}]}>
            <Pressable accessibilityLabel="Close actions" onPress={onToggle} style={[styles.close, {backgroundColor: c.bg.subtle}]}>
                <Icon name="x" size={18}/>
            </Pressable>
            {actions.map((a) => (
                <Pressable key={a.key} accessibilityRole="button" onPress={a.onPress} style={styles.action}>
                    <View style={[styles.expand, {backgroundColor: tones[a.tone].bg}]}>
                        <Icon name={a.icon} size={22} color={tones[a.tone].fg}/>
                        {a.badge ? (
                            <View style={[styles.badge, {backgroundColor: c.bg.brand, borderColor: c.bg.surface}]}>
                                <Text variant="caption2" color={c.text.onBrand}>{a.badge}</Text>
                            </View>
                        ) : null}
                    </View>
                    <Text variant="caption2" color={c.text.secondary}>{a.label}</Text>
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    rail: {borderRadius: 999, alignItems: 'center', paddingHorizontal: 10,
        shadowColor: '#0d1426', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6},
    collapsed: {gap: 4, paddingTop: 10, paddingBottom: 12},
    opened: {gap: 14, paddingVertical: 14},
    expand: {width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center'},
    close: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
    action: {alignItems: 'center', gap: 4},
    badge: {position: 'absolute', left: 32, top: -4, width: 18, height: 18, borderRadius: 9, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center'},
});
