import {createContext, ReactNode, useContext} from 'react';
import {Pressable, StyleSheet, Switch, View} from 'react-native';

import {useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/**
 * Figma "Settings row" and the grouped cards on Profile (1745:12125) and its sub-screens
 * (Alarm & notifications 1634:2529, Privacy & location 1634:2692). 56 px rows, a 32 px icon tile,
 * 17 px label, value in secondary text, muted chevron. Groups are 16 px cards.
 */
// Outlined cards (sub-screens) draw hairlines between rows; Profile's plain groups do not.
const Divided = createContext(false);

export function Section({title, children, outlined}: { title?: string; children: ReactNode; outlined?: boolean }) {
    const c = useColors();
    return (
        <View style={styles.section}>
            {title && <Text variant="caption1" color={c.text.muted}>{title.toUpperCase()}</Text>}
            <View style={[styles.group, {backgroundColor: c.bg.surface}, outlined && {borderWidth: 1, borderColor: c.border.default}]}>
                <Divided.Provider value={!!outlined}>{children}</Divided.Provider>
            </View>
        </View>
    );
}

type RowProps = {
    title: string; subtitle?: string; value?: string; icon?: IconName; tile?: 'brand' | 'subtle';
    danger?: boolean; first?: boolean; right?: ReactNode; onPress?: () => void; chevron?: boolean;
};

export function Row({title, subtitle, value, icon, tile = 'brand', danger, first, right, onPress, chevron = true}: RowProps) {
    const c = useColors();
    const divided = useContext(Divided);
    return (
        <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
                   style={({pressed}) => [styles.row, {backgroundColor: pressed && onPress ? c.bg.subtle : c.bg.surface},
                       divided && !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
            {icon && (
                <View style={[styles.tile, {backgroundColor: danger ? c.feedback.errorBg : tile === 'brand' ? c.bg.brandSubtle : c.bg.subtle}]}>
                    <Icon name={icon} size={18} color={danger ? c.icon.danger : c.icon.brand}/>
                </View>
            )}
            <View style={styles.label}>
                <Text variant="body" color={danger ? c.text.danger : c.text.primary} numberOfLines={1}>{title}</Text>
                {subtitle && <Text variant="footnote" color={c.text.secondary} numberOfLines={2}>{subtitle}</Text>}
            </View>
            {value != null && <Text variant="subhead" color={c.text.secondary} numberOfLines={1}>{value}</Text>}
            {right}
            {onPress && chevron && !right && <Icon name="chevron-right" size={18} color={c.icon.muted}/>}
        </Pressable>
    );
}

/** Green when on, as in the frames. */
export function Toggle({value, onChange, disabled}: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    const c = useColors();
    return (
        <Switch value={value} onValueChange={onChange} disabled={disabled}
                trackColor={{false: c.border.strong, true: c.feedback.success}} thumbColor="#ffffff" ios_backgroundColor={c.border.strong}/>
    );
}

/** "Always on" — a setting the app will not let you turn off, with the lock that says so. */
export function Locked({label = 'Always on'}: { label?: string }) {
    const c = useColors();
    return (
        <View style={[styles.locked, {backgroundColor: c.bg.subtle}]}>
            <Icon name="lock" size={16} color={c.icon.muted}/>
            <Text variant="subhead" color={c.text.muted}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {gap: 8},
    group: {borderRadius: 16, overflow: 'hidden'},
    row: {minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16},
    tile: {width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    label: {flex: 1, gap: 2},
    locked: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: 999},
});
