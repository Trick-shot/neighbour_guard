import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import {router} from 'expo-router';
import {Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {shadow, useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/**
 * Figma "Tab bar · SOS dock" (1658:299): four tabs with SOS docked in the centre, so SOS is one
 * press away on every tab. Pressing SOS opens the full-screen hold (sos/hold), where holding for
 * 2 s sends the alert.
 */
const TABS: Record<string, { label: string; icon: IconName }> = {
    index: {label: 'Home', icon: 'home'},
    message: {label: 'Messages', icon: 'message-circle'},
    issues: {label: 'Issues', icon: 'clipboard-list'},
    profile: {label: 'Profile', icon: 'user'},
};

export default function TabBarSOS({state, navigation}: BottomTabBarProps) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const routes = state.routes.filter((r) => TABS[r.name]);

    const tab = (routeIndex: number) => {
        const route = routes[routeIndex];
        if (!route) return null;
        const focused = state.routes[state.index]?.key === route.key;
        const meta = TABS[route.name]!;
        const color = focused ? c.text.brand : c.text.muted;
        return (
            <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{selected: focused}}
                onPress={() => {
                    const e = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
                    if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
                }}
                style={styles.tab}>
                <Icon name={meta.icon} size={24} color={focused ? c.icon.brand : c.icon.muted}/>
                <Text variant="caption2" color={color}>{meta.label}</Text>
            </Pressable>
        );
    };

    return (
        <View style={styles.wrap} pointerEvents="box-none">
            <View style={[styles.bar, shadow.tabBar, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 17)}]}>
                {tab(0)}
                {tab(1)}
                <View style={styles.slot}/>
                {tab(2)}
                {tab(3)}
            </View>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="SOS. Press to open, then hold for 2 seconds to send."
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    router.push('/sos/hold');
                }}
                style={({pressed}) => [styles.sos, {backgroundColor: pressed ? c.bg.dangerPressed : c.bg.danger, borderColor: c.bg.surface}]}>
                <Icon name="siren" size={26} color={c.icon.onBrand}/>
                <Text variant="buttonM" color={c.text.onBrand}>SOS</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 32},
    bar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingTop: 12, paddingHorizontal: 6, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    },
    tab: {width: 78, alignItems: 'center', gap: 2},
    slot: {width: 78, height: 10},
    sos: {
        position: 'absolute', top: 2, alignSelf: 'center', width: 84, height: 84, borderRadius: 42, borderWidth: 5,
        alignItems: 'center', justifyContent: 'center',
    },
});
