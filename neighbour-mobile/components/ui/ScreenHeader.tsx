import {router} from 'expo-router';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icon from './Icon';
import Text from './Text';

/** The plain back-and-title bar the sub-screens share (Figma pages 07 and 09). */
export default function ScreenHeader({title, right}: { title: string; right?: React.ReactNode }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, {paddingTop: insets.top + 6}]}>
            <Pressable accessibilityLabel="Back" onPress={() => router.canGoBack() && router.back()}
                       style={styles.back}>
                <Icon name="chevron-left" size={24}/>
            </Pressable>
            <Text variant="headline" style={styles.title}>{title}</Text>
            <View style={styles.right}>{right}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 4},
    back: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
    title: {flex: 1},
    right: {minWidth: 32, alignItems: 'flex-end'},
});
