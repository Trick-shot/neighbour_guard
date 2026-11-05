import {Image} from 'expo-image';
import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Text from '@/components/ui/Text';
import {placesApi} from '@/lib/endpoints';
import {MyResidence, Neighbour} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Onboarding — done" (1619:775). Real numbers from the server, not the frame's sample ones. */
export default function OnboardingDone() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [home, setHome] = useState<MyResidence | null>(null);
    const [people, setPeople] = useState<Neighbour[]>([]);

    useEffect(() => {
        placesApi.me().then(setHome).catch(() => undefined);
        placesApi.neighbours().then(setPeople).catch(() => undefined);
    }, []);

    const verified = people.filter((p) => p.home.status === 'verified');
    const shown = verified.slice(0, 4);
    const more = verified.length - shown.length;
    const area = home?.neighbourhood.name ?? 'your neighbourhood';
    const body = !home
        ? 'Pin your home from the map whenever you are ready. Until then, an alert from you reaches nobody.'
        : home.status === 'verified'
            ? `You are the first verified home here. Invite the neighbours you trust: an alert reaches everyone within ${home.neighbourhood.radius_m} m.`
            : `${verified.length} verified neighbour${verified.length === 1 ? '' : 's'} live within ${home.neighbourhood.radius_m} m of you. Two of them must confirm you before you can see exact homes.`;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <Image source={require('@/assets/illustrations/people.png')} style={styles.art} contentFit="contain"/>
            <View style={styles.heading}>
                <Text variant="title1" style={styles.centre}>Welcome to {area}</Text>
                <Text variant="body" color={c.text.secondary} style={styles.centre}>{body}</Text>
            </View>
            {shown.length > 0 && (
                <View style={styles.avatars}>
                    {shown.map((p, i) => (
                        <View key={p.user_id} style={[styles.ring, {borderColor: c.bg.surface, marginLeft: i ? -10 : 0}]}>
                            <Avatar name={p.full_name} size={40}/>
                        </View>
                    ))}
                    {more > 0 && (
                        <View style={[styles.ring, {borderColor: c.bg.surface, marginLeft: -10}]}>
                            <Avatar name={`+ ${more}`} size={40}/>
                        </View>
                    )}
                </View>
            )}
            <Footer><Button title="Go to my map" onPress={() => router.replace('/(tabs)')}/></Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    // Illustration at y 166, heading at y 340, avatars at y 500.
    art: {width: 122, height: 122, alignSelf: 'center', marginTop: 104},
    heading: {marginTop: 52, paddingHorizontal: 16, gap: 8},
    centre: {textAlign: 'center'},
    avatars: {flexDirection: 'row', alignSelf: 'center', marginTop: 44},
    ring: {borderWidth: 2, borderRadius: 24},
});
