import {Pressable, StyleSheet, View} from 'react-native';

import {radius, useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/**
 * Figma "Settings row" (with optional Value). Used by Profile and anywhere a screen is a list of
 * things to open. Rows group into a card: pass `first`/`last` so the corners round correctly.
 */
type Props = {
    title: string;
    value?: string;
    subtitle?: string;
    icon?: IconName;
    danger?: boolean;
    chevron?: boolean;
    first?: boolean;
    last?: boolean;
    onPress?: () => void;
};

export default function ListRow({
    title, value, subtitle, icon, danger, chevron = true, first, last, onPress,
}: Props) {
    const c = useColors();
    const fg = danger ? c.text.danger : c.text.primary;
    return (
        <Pressable
            accessibilityRole={onPress ? 'button' : undefined}
            disabled={!onPress}
            onPress={onPress}
            style={({pressed}) => [
                styles.row,
                {backgroundColor: pressed && onPress ? c.bg.subtle : c.bg.surface},
                !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default},
                first && {borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg},
                last && {borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg},
            ]}>
            {icon && <Icon name={icon} size={22} color={danger ? c.icon.danger : c.icon.default}/>}
            <View style={styles.label}>
                <Text variant="body" color={fg}>{title}</Text>
                {subtitle && <Text variant="footnote" color={c.text.muted}>{subtitle}</Text>}
            </View>
            {value && <Text variant="subhead" color={c.text.secondary} numberOfLines={1}>{value}</Text>}
            {onPress && chevron && <Icon name="chevron-right" size={20} color={c.icon.muted}/>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56},
    label: {flex: 1, gap: 2},
});
