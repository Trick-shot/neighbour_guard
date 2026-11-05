import {StyleSheet, View} from 'react-native';

import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/** Figma provider mark: initials on a dark 48 px tile (no provider logos are stored yet). */
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function ProviderLogo({name, size = 48}: { name: string; size?: number }) {
    const c = useColors();
    return (
        <View style={[styles.tile, {width: size, height: size, backgroundColor: c.bg.inverse}]}>
            <Text variant="title3" color={c.text.inverse}>{initials(name)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({tile: {borderRadius: 10, alignItems: 'center', justifyContent: 'center'}});
