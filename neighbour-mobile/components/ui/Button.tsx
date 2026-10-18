import {ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {radius, useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/**
 * Figma "Button" (1611:65). Primary = main action, Danger = emergency only, Outline / Ghost =
 * secondary. L = 52 px tall (full width 343 on a phone), M = 40 px.
 */
type Variant = 'primary' | 'danger' | 'outline' | 'ghost' | 'white' | 'outlineOnDark';
type Props = {
    title: string;
    onPress?: () => void;
    variant?: Variant;
    size?: 'L' | 'M';
    icon?: IconName;
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
};

export default function Button({title, onPress, variant = 'primary', size = 'L', icon, loading, disabled, style}: Props) {
    const c = useColors();
    const palette: Record<Variant, { bg: string; pressed: string; fg: string; border?: string; borderWidth?: number }> = {
        primary: {bg: c.bg.brand, pressed: c.bg.brandPressed, fg: c.text.onBrand},
        danger: {bg: c.bg.danger, pressed: c.bg.dangerPressed, fg: c.text.onBrand},
        outline: {bg: c.bg.surface, pressed: c.bg.subtle, fg: c.text.primary, border: c.border.strong, borderWidth: 1},
        ghost: {bg: 'transparent', pressed: 'rgba(255,255,255,0.12)', fg: c.text.onBrand},
        white: {bg: '#ffffff', pressed: '#f0f2f5', fg: c.text.primary},
        outlineOnDark: {bg: 'transparent', pressed: 'rgba(255,255,255,0.08)', fg: '#ffffff', border: 'rgba(255,255,255,0.5)', borderWidth: 1.5},
    };
    const p = palette[variant];
    const off = disabled || loading;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{disabled: !!off, busy: !!loading}}
            disabled={off}
            onPress={onPress}
            style={({pressed}) => [
                styles.base,
                size === 'L' ? styles.L : styles.M,
                {backgroundColor: pressed ? p.pressed : p.bg, borderColor: p.border, borderWidth: p.borderWidth ?? 0},
                off && {opacity: 0.6},
                style,
            ]}>
            {loading ? (
                <ActivityIndicator color={p.fg}/>
            ) : (
                <View style={styles.row}>
                    {icon && <Icon name={icon} size={size === 'L' ? 20 : 18} color={p.fg}/>}
                    <Text variant={size === 'L' ? 'buttonL' : 'buttonM'} color={p.fg}>{title}</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center'},
    L: {height: 52, paddingHorizontal: 24},
    M: {height: 40, paddingHorizontal: 16},
    row: {flexDirection: 'row', alignItems: 'center', gap: 8},
});
