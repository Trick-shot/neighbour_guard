import {ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

/**
 * The bottom action area of a full-screen step: buttons are 343 wide (29.5 px in from a 402 px
 * screen), stacked 6 px apart, and the last one ends 32 px above the bottom edge.
 */
export default function Footer({children, note, gap = 6, bottom = 32}: { children: ReactNode; note?: ReactNode; gap?: number; bottom?: number }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.footer, {gap, paddingBottom: Math.max(insets.bottom, bottom)}]}>
            {note}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    footer: {paddingHorizontal: 29.5, marginTop: 'auto'},
});
