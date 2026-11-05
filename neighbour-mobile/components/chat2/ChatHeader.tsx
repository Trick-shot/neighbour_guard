import {Pressable, StyleSheet, View} from 'react-native';

import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {shadow, useColors} from '@/theme';

/** Figma "Chat header" (1709:543): round back, name + status, round call / more. */
type Props = { title: string; status?: string; statusTone?: 'danger'; onBack: () => void; onCall?: () => void; onMore?: () => void; onTitle?: () => void };

export default function ChatHeader({title, status, statusTone, onBack, onCall, onMore, onTitle}: Props) {
    const c = useColors();
    const round = (icon: 'chevron-left' | 'phone' | 'more-horizontal', onPress: () => void, label: string) => (
        <Pressable accessibilityLabel={label} onPress={onPress} style={[styles.round, shadow.bubble, {backgroundColor: c.bg.surface}]}>
            <Icon name={icon} size={22}/>
        </Pressable>
    );
    return (
        <View style={styles.row}>
            {round('chevron-left', onBack, 'Back')}
            <Pressable onPress={onTitle} disabled={!onTitle} style={styles.text}>
                <Text variant="title3" numberOfLines={1}>{title}</Text>
                {!!status && <Text variant="subhead" color={statusTone === 'danger' ? c.text.danger : c.text.secondary} numberOfLines={1}>{status}</Text>}
            </Pressable>
            {onCall && round('phone', onCall, 'Call')}
            {onMore && round('more-horizontal', onMore, 'More')}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8},
    round: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center'},
    text: {flex: 1, minWidth: 0},
});
