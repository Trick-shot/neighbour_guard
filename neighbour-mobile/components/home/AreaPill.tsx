import {StyleSheet, View} from 'react-native';

import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {shadow, useColors} from '@/theme';

/** Figma "Area count": how many homes are in an approximate area. Never an exact house. */
export default function AreaPill({homes}: { homes: number }) {
    const c = useColors();
    return (
        <View style={[styles.pill, shadow.pill, {backgroundColor: c.bg.surface}]}>
            <Icon name="users" size={14} color={c.icon.brand}/>
            <Text variant="caption1" color={c.text.brand}>{homes} {homes === 1 ? 'home' : 'homes'}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 8, paddingRight: 10, paddingVertical: 5, borderRadius: 999},
});
