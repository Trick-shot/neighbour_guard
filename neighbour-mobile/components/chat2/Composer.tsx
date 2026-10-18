import {Pressable, StyleSheet, TextInput, View} from 'react-native';

import Icon from '@/components/ui/Icon';
import {shadow, type, useColors} from '@/theme';

/** Figma "Composer" (1614:215): + / message / mic in a pill, round send button. */
type Props = { value: string; onChange: (v: string) => void; onSend: () => void; onAttach?: () => void; bottomInset: number };

export default function Composer({value, onChange, onSend, onAttach, bottomInset}: Props) {
    const c = useColors();
    return (
        <View style={[styles.wrap, {borderTopColor: c.border.default, paddingBottom: 8 + bottomInset, backgroundColor: c.bg.surface}]}>
            <View style={[styles.input, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                <Pressable onPress={onAttach} accessibilityLabel="Attach" hitSlop={8}><Icon name="plus" size={22}/></Pressable>
                <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Message…"
                    placeholderTextColor={c.text.muted}
                    style={[type.body, styles.field, {color: c.text.primary}]}
                    multiline
                />
                <Icon name="mic" size={22}/>
            </View>
            <Pressable accessibilityLabel="Send" onPress={onSend} style={[styles.send, {backgroundColor: c.bg.brand}]}>
                <Icon name="send" size={22} color={c.icon.onBrand}/>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1},
    input: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 26},
    field: {flex: 1, paddingVertical: 12, maxHeight: 120},
    send: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
});
