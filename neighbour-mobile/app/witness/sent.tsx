import {router, useLocalSearchParams} from 'expo-router';
import {Linking, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Illustration from '@/components/ui/Illustration';
import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/**
 * Figma "Witness — alert sent" (1632:2102). The count is homes in range, not people, so the
 * reporter learns nothing about who lives where; nobody "responds" to a witness report.
 */
export default function WitnessSent() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {homes = '0', radius = '300', at} = useLocalSearchParams<{ homes?: string; radius?: string; at?: string }>();
    const time = at ? new Date(at).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'}) : '';

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <ScrollView contentContainerStyle={styles.content}>
                <Illustration source={require('@/assets/illustrations/alerts.png')} size={220}/>
                <View style={{gap: 12}}>
                    <View style={[styles.chip, {backgroundColor: c.feedback.successBg}]}>
                        <Icon name="check" size={16} color={c.feedback.success}/>
                        <Text variant="label" color={c.feedback.success}>Alert sent{time ? ` · ${time}` : ''}</Text>
                    </View>
                    <View style={{gap: 8}}>
                        <Text variant="title1">Neighbours nearby have been alerted</Text>
                        <Text variant="body" color={c.text.secondary}>Everyone within {radius} m now has the location. You stay anonymous.</Text>
                    </View>
                </View>
                <View style={[styles.stats, {borderColor: c.border.default}]}>
                    <View style={styles.stat}>
                        <Text variant="title1" color={c.text.brand}>{homes}</Text>
                        <Text variant="footnote" color={c.text.secondary}>homes alerted</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text variant="title1" color={c.text.brand}>{radius} m</Text>
                        <Text variant="footnote" color={c.text.secondary}>around you</Text>
                    </View>
                </View>
            </ScrollView>
            <Footer>
                <Button title="Call police (112)" icon="phone" onPress={() => Linking.openURL('tel:112')}/>
                <Button title="Done" variant="text" onPress={() => (router.canGoBack() ? router.dismissAll() : router.replace('/'))}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 46, paddingBottom: 24, gap: 20},
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingLeft: 10, paddingRight: 12, paddingVertical: 6, borderRadius: 999},
    stats: {flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 16},
    stat: {flex: 1, gap: 2},
});
