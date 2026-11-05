import {StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/** The grey note box from the frames: 16 px brand icon, footnote text, 12 px radius. */
export default function Note({icon, children, tone = 'brand'}: { icon: IconName; children: string; tone?: 'brand' | 'muted' }) {
    const c = useColors();
    return (
        <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
            <Icon name={icon} size={16} color={tone === 'brand' ? c.icon.brand : c.icon.muted}/>
            <Text variant="footnote" color={c.text.secondary} style={styles.text}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    note: {flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, alignItems: 'flex-start', width: '100%'},
    text: {flex: 1},
});
