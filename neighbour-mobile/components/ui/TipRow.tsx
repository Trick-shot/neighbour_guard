import {StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/** 40 px subtle icon box with a brand icon, then text (title + body, or a single subhead line). */
export default function TipRow({icon, title, body}: { icon: IconName; title?: string; body: string }) {
    const c = useColors();
    return (
        <View style={[styles.row, !title && styles.centred]}>
            <View style={[styles.box, {backgroundColor: c.bg.subtle}]}><Icon name={icon} size={20} color={c.icon.brand}/></View>
            <View style={styles.text}>
                {title ? <Text variant="headline">{title}</Text> : null}
                <Text variant="subhead" color={c.text.secondary}>{body}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
    centred: {alignItems: 'center'},
    box: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    text: {flex: 1, gap: 2},
});
