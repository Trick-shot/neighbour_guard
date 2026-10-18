import {Pressable, StyleSheet} from 'react-native';

import {alertColor, useColors} from '@/theme';
import {AlertType} from '@/lib/types';

import Icon, {IconName} from './Icon';
import Text from './Text';

/** Figma "Alert type chip" (1611:161). Selected = filled with the type colour. */
export const ALERT_META: Record<AlertType, { label: string; icon: IconName }> = {
    emergency: {label: 'Emergency', icon: 'siren'},
    robbery: {label: 'Robbery', icon: 'home'},
    fire: {label: 'Fire', icon: 'flame'},
    medical: {label: 'Medical', icon: 'heart-pulse'},
    suspicious: {label: 'Suspicious', icon: 'eye'},
    other: {label: 'Other', icon: 'more-horizontal'},
};

type Props = { type: AlertType; selected?: boolean; onPress?: () => void };

export default function AlertTypeChip({type, selected, onPress}: Props) {
    const c = useColors();
    const tint = alertColor(c, type);
    const meta = ALERT_META[type];
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : 'text'}
            accessibilityState={{selected}}
            style={[styles.chip, {backgroundColor: selected ? tint : c.bg.subtle}]}>
            <Icon name={meta.icon} size={18} color={selected ? c.icon.onBrand : tint}/>
            <Text variant="label" color={selected ? c.text.onBrand : c.text.primary}>{meta.label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 14, paddingVertical: 8, borderRadius: 999},
});
