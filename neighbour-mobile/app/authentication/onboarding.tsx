import {Image} from 'expo-image';
import {LinearGradient} from 'expo-linear-gradient';
import {router} from 'expo-router';
import {useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import PagerView from 'react-native-pager-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {shadow, useColors} from '@/theme';

/**
 * Figma "Onboarding — slide 1–3" (1623:1112, 1623:1170, 1623:1230). The visual cards are static
 * artwork exported from the frames; the floating "Neighbours alerted" chip is drawn here.
 */
const SLIDES = [
    {
        card: require('@/assets/onboarding/slide1.png'),
        title: 'Help in one tap',
        body: 'Hold SOS and every neighbour nearby gets a loud alarm, even when their phone is on silent.',
    },
    {
        card: require('@/assets/onboarding/slide2.png'),
        title: 'See who’s coming',
        body: 'Neighbours tap “I’m coming”, so you know exactly who is on the way and how far they are.',
    },
    {
        card: require('@/assets/onboarding/slide3.png'),
        title: 'Stronger together',
        body: 'Verified neighbours on one map, one network looking out for each other, day and night.',
    },
];

export default function Welcome() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const pager = useRef<PagerView>(null);
    const [, setPage] = useState(0);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <LinearGradient colors={['#d6ebff', c.bg.surface]} style={styles.fade} pointerEvents="none"/>
            <PagerView ref={pager} style={[styles.pager, {marginTop: insets.top}]} initialPage={0}
                       onPageSelected={(e) => setPage(e.nativeEvent.position)}>
                {SLIDES.map((slide, i) => (
                    <View key={i} style={styles.page}>
                        <View style={styles.hero}>
                            <Image source={slide.card} style={styles.card} contentFit="cover"/>
                            {i === 0 && (
                                <View style={[styles.chip, shadow.lg, {backgroundColor: c.bg.surface}]}>
                                    <View style={[styles.chipTick, {backgroundColor: c.feedback.success}]}>
                                        <Icon name="check" size={14} color={c.icon.onBrand}/>
                                    </View>
                                    <Text variant="label">Neighbours alerted</Text>
                                </View>
                            )}
                            {i === 1 && <Image source={require('@/assets/onboarding/responder.png')} style={styles.responder}/>}
                        </View>
                        <View style={styles.copy}>
                            <Text variant="title1" style={styles.centre}>{slide.title}</Text>
                            <Text variant="body" color={c.text.secondary} style={styles.centre}>{slide.body}</Text>
                            <View style={styles.dots}>
                                {SLIDES.map((_, d) => (
                                    <View key={d} style={[styles.dot, d === i
                                        ? {width: 22, backgroundColor: c.bg.brand}
                                        : {width: 6, backgroundColor: c.bg.disabled}]}/>
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
            </PagerView>
            <Footer gap={8} bottom={28}>
                <Button title="Get started" onPress={() => router.push('/authentication/collect')}/>
                <Button title="Log in" variant="outline" onPress={() => router.push('/authentication/login')}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    fade: {position: 'absolute', top: 0, left: 0, right: 0, height: 360},
    pager: {flex: 1},
    page: {flex: 1, alignItems: 'center'},
    // The card sits 56 px under the status bar; the chip floats 26 px above its top edge.
    hero: {width: 402, height: 420 + 30, marginTop: 30, alignItems: 'center'},
    card: {width: 354, height: 420, marginTop: 26},
    chip: {position: 'absolute', top: 0, flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingLeft: 14, paddingRight: 18, paddingVertical: 10, borderRadius: 999},
    chipTick: {width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
    // Exported with its shadow: 237 × 132, offset −12 / −20 from the 193 × 68 card at (12, 250).
    responder: {position: 'absolute', left: 0, top: 26 + 112, width: 237, height: 132},
    copy: {width: 338, marginTop: 34, gap: 12},
    centre: {textAlign: 'center'},
    dots: {flexDirection: 'row', gap: 6, alignSelf: 'center'},
    dot: {height: 6, borderRadius: 3},
});
