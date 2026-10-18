import {useRef} from 'react';
import {Pressable, StyleSheet, TextInput, View} from 'react-native';

import {useColors} from '@/theme';

import Text from './Text';

/** Figma "OTP cell" ×6 (1614:200): 56 × 60 cells, 7 px gap. One hidden input drives all cells. */
export default function OtpInput({value, onChange, length = 6}: { value: string; onChange: (v: string) => void; length?: number }) {
    const c = useColors();
    const ref = useRef<TextInput>(null);
    return (
        <Pressable onPress={() => ref.current?.focus()} style={styles.row}>
            {Array.from({length}).map((_, i) => {
                const digit = value[i];
                const focus = i === Math.min(value.length, length - 1) && value.length < length + 1;
                const filled = !!digit;
                return (
                    <View
                        key={i}
                        style={[styles.cell, {
                            backgroundColor: filled || focus ? c.bg.surface : c.bg.subtle,
                            borderColor: focus ? c.border.focus : c.border.default,
                            borderWidth: focus ? 2 : 1,
                        }]}>
                        <Text variant="title2">{digit ?? ' '}</Text>
                    </View>
                );
            })}
            <TextInput
                ref={ref}
                value={value}
                onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                autoFocus
                style={styles.hidden}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: 'row', gap: 7, alignSelf: 'center'},
    cell: {width: 56, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    hidden: {position: 'absolute', opacity: 0, width: 1, height: 1},
});
