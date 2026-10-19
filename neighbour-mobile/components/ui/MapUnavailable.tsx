import {StyleSheet, View} from 'react-native';

import {radius, useColors} from '@/theme';

import Icon from './Icon';
import Text from './Text';

/** Shown in place of a map when the build has no Google Maps key (see lib/maps.ts). */
export default function MapUnavailable({compact}: { compact?: boolean }) {
    const c = useColors();
    return (
        <View style={[styles.wrap, {backgroundColor: c.bg.subtle}]}>
            <Icon name="map-pin" size={compact ? 22 : 30} color={c.icon.muted}/>
            <Text variant={compact ? 'caption1' : 'subhead'} color={c.text.secondary} style={styles.text}>
                Map unavailable in this build
            </Text>
            {!compact && (
                <Text variant="footnote" color={c.text.muted} style={styles.text}>
                    No Google Maps key was set when it was built.
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: radius.md, padding: 16},
    text: {textAlign: 'center'},
});
