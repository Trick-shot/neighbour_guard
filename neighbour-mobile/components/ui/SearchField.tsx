import {Platform, StyleSheet, TextInput, View} from 'react-native';

import {type, useColors} from '@/theme';

import Icon from './Icon';

/** Figma "Search field": subtle 36 px pill with a muted search icon. */
export default function SearchField({value, onChangeText, placeholder}: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
    const c = useColors();
    return (
        <View style={[styles.field, {backgroundColor: c.bg.subtle}]}>
            <Icon name="search" size={18} color={c.icon.muted}/>
            <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.text.muted}
                       autoCorrect={false} returnKeyType="search"
                       style={[type.body, styles.input, {color: c.text.primary}, Platform.OS === 'web' && ({outlineWidth: 0} as object)]}/>
        </View>
    );
}

const styles = StyleSheet.create({
    field: {flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, borderRadius: 10, paddingHorizontal: 10},
    input: {flex: 1, padding: 0},
});
