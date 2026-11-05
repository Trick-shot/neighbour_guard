import {Image, ImageSource} from 'expo-image';
import {StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

/** Figma "Illustration · …": an IconScout picture centred on a brand-subtle card, 24 px radius. */
export default function Illustration({source, size, height}: { source: ImageSource | number; size: number; height?: number }) {
    const c = useColors();
    return (
        <View style={[styles.card, {backgroundColor: c.bg.brandSubtle, height: height ?? size}]}>
            <Image source={source} style={{width: size, height: size}} contentFit="contain"/>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {width: '100%', borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
});
