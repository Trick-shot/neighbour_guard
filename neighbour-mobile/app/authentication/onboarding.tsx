import {Image} from 'expo-image';
import {LinearGradient} from 'expo-linear-gradient';
import {router} from 'expo-router';
import {useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import PagerView from 'react-native-pager-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Text from '@/components/ui/Text';
import {radius, useColors} from '@/theme';

/** Figma "Android · 01" / "Welcome". The first screen anyone sees, including a judge. */
const SLIDES = [
    {
        image: require('@/assets/images/img1.png'),
        title: 'Your street, watching out',
        body: 'The people who can reach you in two minutes are the ones who hear you first.',
    },
    {
        image: require('@/assets/images/img2.png'),
        title: 'One hold, not five taps',
        body: 'Hold the SOS button. Ten seconds to change your mind, then your neighbours’ phones ring.',
    },
    {
        image: require('@/assets/images/img3.png'),
        title: 'They know where to come',
        body: 'Responders see your house number, your gate and who is inside — only while your alert is live.',
    },
];

export default function Welcome() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const pager = useRef<PagerView>(null);
    const [page, setPage] = useState(0);
    const last = page === SLIDES.length - 1;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.inverse}]}>
            <PagerView ref={pager} style={StyleSheet.absoluteFill} initialPage={0}
                       onPageSelected={(e) => setPage(e.nativeEvent.position)}>
                {SLIDES.map((slide, i) => (
                    <View key={i}>
                        <Image source={slide.image} style={styles.image} contentFit="cover"/>
                    </View>
                ))}
            </PagerView>

            {/* The text sits on the photo, so it needs its own ground to stay readable. */}
            <LinearGradient colors={['transparent', 'rgba(10,14,26,0.75)', 'rgba(10,14,26,0.97)']}
                            locations={[0, 0.45, 1]} style={styles.scrim} pointerEvents="none"/>

            <View style={[styles.panel, {paddingBottom: Math.max(insets.bottom, 16) + 8}]}>
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <View key={i} style={[styles.dot, {
                            backgroundColor: '#ffffff',
                            opacity: i === page ? 1 : 0.35,
                            width: i === page ? 20 : 7,
                        }]}/>
                    ))}
                </View>
                <Text variant="title1" color="#ffffff" style={styles.centre}>{SLIDES[page].title}</Text>
                <Text variant="body" color="rgba(255,255,255,0.82)" style={styles.centre}>{SLIDES[page].body}</Text>
                <Button
                    title={last ? 'Get started' : 'Next'}
                    variant="white"
                    onPress={() => (last ? router.push('/authentication/account') : pager.current?.setPage(page + 1))}
                    style={styles.cta}
                />
                <Text variant="subhead" color="#ffffff" style={styles.centre}
                      onPress={() => router.push('/authentication/login')}>
                    I already have an account
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1, justifyContent: 'flex-end'},
    image: {width: '100%', height: '100%'},
    scrim: {position: 'absolute', left: 0, right: 0, bottom: 0, height: Dimensions.get('window').height * 0.62},
    panel: {paddingHorizontal: 24, gap: 12, alignItems: 'center'},
    dots: {flexDirection: 'row', gap: 6, marginBottom: 8},
    dot: {height: 7, borderRadius: radius.pill},
    centre: {textAlign: 'center'},
    cta: {alignSelf: 'stretch', marginTop: 8},
});
