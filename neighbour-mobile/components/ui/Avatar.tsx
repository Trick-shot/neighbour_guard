import {Image} from 'expo-image';
import {StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Text from './Text';

/** Figma "Avatar" (1611:190): initials on brand-subtle; a photo replaces them when present. */
export const initialsOf = (name?: string | null) =>
    (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

type Props = { name?: string | null; size?: number; uri?: string | null; tone?: 'brand' | 'neutral' };

export default function Avatar({name, size = 44, uri, tone = 'brand'}: Props) {
    const c = useColors();
    // Initials scale with the circle, as in Figma (26.6 px on a 96 px avatar, 15 on 44).
    const fontSize = Math.round(size * 0.34);
    return (
        <View style={[styles.circle, {width: size, height: size, borderRadius: size / 2,
            backgroundColor: tone === 'brand' ? c.bg.brandSubtle : c.bg.subtle}]}>
            {uri ? <Image source={{uri}} style={{width: size, height: size}} contentFit="cover"/> : (
                <Text variant="headline" color={tone === 'brand' ? c.text.brand : c.text.secondary}
                      style={{fontSize, lineHeight: Math.round(fontSize * 1.25)}}>{initialsOf(name)}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({circle: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}});
