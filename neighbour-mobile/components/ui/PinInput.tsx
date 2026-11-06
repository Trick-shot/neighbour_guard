import {type ComponentRef, useRef, useState} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';

import {useColors} from '@/theme';

import Text from './Text';

/**
 * Figma "Safety PIN" cells: four 52 × 60 OTP cells, 10 px apart, left-aligned, digits shown as dots.
 * The cell after the last digit has the focus outline; empty cells are subtle.
 */
type Props = { label: string; value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean; error?: string | null };

export default function PinInput({label, value, onChange, length = 4, autoFocus, error}: Props) {
    const c = useColors();
    const ref = useRef<ComponentRef<typeof TextInput>>(null);
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.wrap}>
            <Text variant="label">{label}</Text>
            <Pressable accessibilityLabel={label} onPress={() => ref.current?.focus()} style={styles.row}>
                {Array.from({length}).map((_, i) => {
                    const filled = i < value.length;
                    const focus = focused && i === Math.min(value.length, length - 1) && !(filled && i === length - 1);
                    return (
                        <View key={i} style={[styles.cell, {
                            backgroundColor: filled || focus ? c.bg.surface : c.bg.subtle,
                            borderColor: error ? c.feedback.error : focus ? c.border.focus : c.border.default,
                            borderWidth: focus || error ? 2 : 1,
                        }]}>
                            <Text variant="title2">{filled ? '•' : ' '}</Text>
                        </View>
                    );
                })}
                <TextInput ref={ref} value={value} autoFocus={autoFocus} secureTextEntry keyboardType="number-pad"
                           onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                           onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))} style={styles.hidden}/>
            </Pressable>
            {error ? <Text variant="footnote" color={c.feedback.error}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: 8},
    row: {flexDirection: 'row', gap: 10},
    cell: {width: 52, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    hidden: {position: 'absolute', opacity: 0, width: 1, height: 1},
});
