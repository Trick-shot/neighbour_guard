import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {ScrollView, Share, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Illustration from '@/components/ui/Illustration';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import {placesApi} from '@/lib/endpoints';
import {MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Pending verification" (1633:2184): my own home, waiting for its vouches. */
const ago = (iso: string) => {
    const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    return d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export default function PendingVerification() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [home, setHome] = useState<MyResidence | null>(null);
    useFocusEffect(useCallback(() => { placesApi.me().then(setHome).catch(() => undefined); }, []));

    const got = home?.vouches ?? 0;
    const need = home?.vouches_needed ?? 2;
    const ask = () => Share.share({
        message: `Could you vouch for my home${home ? ` (House ${home.house_number}, ${home.street})` : ''} on NeighbourGuard? Open Neighbours → Pending.`,
    }).catch(() => undefined);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader tone="default"/>
            <ScrollView contentContainerStyle={styles.content}>
                <Illustration source={require('@/assets/illustrations/pending.png')} size={170}/>
                <View style={{gap: 8}}>
                    <Text variant="title1">{home?.status === 'verified' ? 'You’re verified' : 'Almost there'}</Text>
                    <Text variant="body" color={c.text.secondary}>
                        {home?.status === 'verified'
                            ? 'Your neighbours confirmed your home. You can see house numbers and comment on issues.'
                            : `Two neighbours need to confirm you live at House ${home?.house_number ?? ''}. Ask the ones who know you.`}
                    </Text>
                </View>
                <View style={[styles.card, {borderColor: c.border.default}]}>
                    <View style={styles.cardHead}>
                        <Text variant="headline">Confirmations</Text>
                        <Text variant="subhead" color={c.text.brand}>{Math.min(got, need)} of {need}</Text>
                    </View>
                    <View style={[styles.bar, {backgroundColor: c.bg.subtle}]}>
                        <View style={[styles.fill, {width: `${Math.min(1, got / need) * 100}%`, backgroundColor: c.feedback.success}]}/>
                    </View>
                    {(home?.vouchers ?? []).map((v) => (
                        <View key={v.name + v.at} style={styles.person}>
                            <Avatar name={v.name} size={40}/>
                            <View style={styles.flex}>
                                <Text variant="headline">{v.name}</Text>
                                <Text variant="footnote" color={c.text.secondary}>Confirmed {ago(v.at)}</Text>
                            </View>
                            <View style={[styles.state, {backgroundColor: c.feedback.successBg}]}><Icon name="check" size={14} color={c.feedback.success}/></View>
                        </View>
                    ))}
                    {got < need && (
                        <View style={styles.person}>
                            <View style={[styles.wait, {backgroundColor: c.bg.subtle}]}><Icon name="users" size={18} color={c.icon.muted}/></View>
                            <View style={styles.flex}>
                                <Text variant="headline" color={c.text.secondary}>{need - got} more needed</Text>
                                <Text variant="footnote" color={c.text.secondary}>Any verified neighbour can confirm you</Text>
                            </View>
                            <View style={[styles.state, {backgroundColor: c.feedback.warningBg}]}><Icon name="clock" size={14} color={c.feedback.warning}/></View>
                        </View>
                    )}
                </View>
                <Note icon="shield-check">You can already send SOS. Until you’re verified, neighbours see you as unverified.</Note>
            </ScrollView>
            <Footer>
                <Button title="Ask another neighbour" onPress={ask}/>
                <Button title="Verify with ID instead" variant="text" onPress={() => router.push('/authentication/verify')}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 16},
    card: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 12},
    cardHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    bar: {height: 6, borderRadius: 3, overflow: 'hidden'},
    fill: {height: 6, borderRadius: 3},
    person: {flexDirection: 'row', alignItems: 'center', gap: 12},
    wait: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    state: {width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
});
