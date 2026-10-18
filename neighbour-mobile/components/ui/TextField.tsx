import {useState} from 'react';
import {StyleSheet, TextInput, TextInputProps, View} from 'react-native';

import {type, useColors} from '@/theme';

import Text from './Text';

/** Figma "Text field" (1614:193): 52 px field, label above, helper or error below. */
type Props = TextInputProps & { label: string; helper?: string; error?: string | null };

export default function TextField({label, helper, error, style, ...input}: Props) {
    const c = useColors();
    const [focused, setFocused] = useState(false);
    const border = error ? c.feedback.error : focused ? c.border.focus : c.border.default;
    return (
        <View style={styles.wrap}>
            <Text variant="label">{label}</Text>
            <View style={[styles.field, {borderColor: border, borderWidth: focused || error ? 2 : 1, backgroundColor: c.bg.surface}]}>
                <TextInput
                    {...input}
                    onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
                    onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
                    placeholderTextColor={c.text.muted}
                    style={[type.body, styles.input, {color: c.text.primary}, style]}
                />
            </View>
            {(error || helper) && <Text variant="footnote" color={error ? c.feedback.error : c.text.muted}>{error || helper}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: 6, width: '100%'},
    field: {height: 52, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center'},
    input: {padding: 0},
});
