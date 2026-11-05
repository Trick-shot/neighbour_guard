import {router} from 'expo-router';
import {ScrollView, Share, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Illustration from '@/components/ui/Illustration';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/**
 * Figma "Onboarding — verification status" (1627:1543), in its honest state.
 *
 * The frame shows "You’re verified". Until a verification partner is connected nothing can check
 * an ID, so the same layout says the check is pending and that vouches are what verify you today.
 * Saying "verified" here would be the app claiming something it does not know.
 */
export default function OnboardingVerifyStatus() {
    const c = useColors();
    const insets = useSafeAreaInsets();

    const invite = () => Share.share({
        message: 'I’m joining NeighbourGuard so our street can reach each other in an emergency. Vouch for me once I pin my home?',
    }).catch(() => undefined);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={2} progress={1} back={false}/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Illustration source={require('@/assets/illustrations/verified.png')} size={190}/>
                <View style={styles.group}>
                    <View style={[styles.chip, {backgroundColor: c.bg.brandSubtle}]}>
                        <Icon name="clock" size={16} color={c.icon.brand}/>
                        <Text variant="label" color={c.text.brand}>ID check pending</Text>
                    </View>
                    <View style={styles.heading}>
                        <Text variant="title1">Thanks, that’s all we need</Text>
                        <Text variant="body" color={c.text.secondary}>
                            ID checks start when our verification partner is connected. Until then, neighbours vouching for you is what verifies you.
                        </Text>
                    </View>
                </View>
                <View style={[styles.trust, {backgroundColor: c.bg.surface, borderColor: c.border.default}]}>
                    <View style={styles.trustRow}>
                        <Text variant="headline">Trust level</Text>
                        <Text variant="subhead" color={c.text.brand}>0 of 2 vouches</Text>
                    </View>
                    <View style={styles.bars}>
                        <View style={[styles.bar, {backgroundColor: c.bg.subtle}]}/>
                        <View style={[styles.bar, {backgroundColor: c.bg.subtle}]}/>
                    </View>
                    <Text variant="footnote" color={c.text.secondary}>Two neighbours vouching for you makes you fully trusted.</Text>
                </View>
            </ScrollView>
            <Footer>
                <Button title="Continue" onPress={() => router.replace('/authentication/location')}/>
                <Button title="Invite a neighbour to vouch" variant="text" onPress={invite}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    group: {gap: 12},
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999},
    heading: {gap: 8},
    trust: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 10},
    trustRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    bars: {flexDirection: 'row', gap: 6},
    bar: {flex: 1, height: 6, borderRadius: 3},
});
