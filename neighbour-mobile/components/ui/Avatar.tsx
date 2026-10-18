import {StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Text from './Text';

/** Figma "Avatar" (1611:190): initials on brand-subtle; a photo replaces them when present. */
export const initialsOf = (name?: string | null) =>
    (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

export default function Avatar({name, size = 44}: { name?: string | null; size?: number }) {
    const c = useColors();
    return (
        <View style={[styles.circle, {width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg.brandSubtle}]}>
            <Text variant="subhead" color={c.text.brand}>{initialsOf(name)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({circle: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}});
