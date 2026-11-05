import {Pressable, StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Text from './Text';

/** Figma "Segmented control": subtle track, 2 px inset, the chosen segment is a white 8 px pill. */
export default function Segmented<T extends string>({options, value, onChange}: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
    const c = useColors();
    return (
        <View style={[styles.track, {backgroundColor: c.bg.subtle}]}>
            {options.map((o) => {
                const on = o.key === value;
                return (
                    <Pressable key={o.key} accessibilityRole="tab" accessibilityState={{selected: on}} onPress={() => onChange(o.key)}
                               style={[styles.segment, on && {backgroundColor: c.bg.surface}]}>
                        <Text variant="label" color={on ? c.text.primary : c.text.secondary}>{o.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    track: {flexDirection: 'row', padding: 2, borderRadius: 10, height: 36},
    segment: {flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
});
