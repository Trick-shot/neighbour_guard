import {router} from 'expo-router';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useColors} from '@/theme';

import Icon from './Icon';
import Text from './Text';

/**
 * Figma "Header" on sub-screens (Notifications, Profile pages): 52 px under the status bar, brand
 * back chevron 8 px in, centred Headline title, optional action on the right, hairline below.
 */
type Props = { title: string; right?: React.ReactNode; onBack?: () => void; border?: boolean };

export default function ScreenHeader({title, right, onBack, border = true}: Props) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    return (
        <View style={{paddingTop: insets.top, backgroundColor: c.bg.surface}}>
            <View style={[styles.header, border && {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border.default}]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}
                           onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')))}
                           style={styles.side}>
                    <Icon name="chevron-left" size={24} color={c.icon.brand}/>
                </Pressable>
                <Text variant="headline" numberOfLines={1} style={styles.title}>{title}</Text>
                <View style={[styles.side, styles.right]}>{right}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {height: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, gap: 8},
    side: {minWidth: 24, height: 24, justifyContent: 'center'},
    right: {alignItems: 'flex-end'},
    title: {flex: 1, textAlign: 'center'},
});
