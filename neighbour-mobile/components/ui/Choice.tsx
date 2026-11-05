import {Pressable, StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/** 22 px radio: strong outline when off, brand disc with a check when on. */
export function Radio({on}: { on: boolean }) {
    const c = useColors();
    return on ? (
        <View style={[styles.radio, {backgroundColor: c.bg.brand}]}><Icon name="check" size={14} color={c.icon.onBrand}/></View>
    ) : <View style={[styles.radio, {borderWidth: 2, borderColor: c.border.strong}]}/>;
}

/** 22 px checkbox, 6 px radius. */
export function Checkbox({on}: { on: boolean }) {
    const c = useColors();
    return on ? (
        <View style={[styles.box, {backgroundColor: c.bg.brand}]}><Icon name="check" size={14} color={c.icon.onBrand}/></View>
    ) : <View style={[styles.box, {borderWidth: 2, borderColor: c.border.strong}]}/>;
}

/** Figma "Option" card: title + footnote on the left, a radio on the right; brand outline when chosen. */
export function OptionCard({title, subtitle, selected, onPress, icon}: { title: string; subtitle?: string; selected: boolean; onPress: () => void; icon?: IconName }) {
    const c = useColors();
    const pad = icon ? 12 : 14;
    return (
        <Pressable accessibilityRole="radio" accessibilityState={{selected}} onPress={onPress}
                   style={[styles.option, selected
                       ? {backgroundColor: c.bg.brandSubtle, borderWidth: 2, borderColor: c.border.brand, paddingHorizontal: 15, paddingVertical: pad - 1}
                       : {backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.default, paddingVertical: pad}]}>
            {icon ? (
                <View style={[styles.iconBox, {backgroundColor: selected ? c.bg.surface : c.bg.subtle}]}>
                    <Icon name={icon} size={20} color={c.icon.brand}/>
                </View>
            ) : null}
            <View style={styles.optionText}>
                <Text variant="headline">{title}</Text>
                {subtitle ? <Text variant="footnote" color={c.text.secondary}>{subtitle}</Text> : null}
            </View>
            <Radio on={selected}/>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    radio: {width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
    box: {width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center'},
    option: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, width: '100%'},
    optionText: {flex: 1, gap: 2},
    iconBox: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
});
