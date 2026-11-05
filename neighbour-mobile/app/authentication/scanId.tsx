import * as ImagePicker from 'expo-image-picker';
import {router, useLocalSearchParams} from 'expo-router';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Illustration from '@/components/ui/Illustration';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TipRow from '@/components/ui/TipRow';
import {useColors} from '@/theme';

import {ID_TYPES} from './verify';

/**
 * Figma "Onboarding — scan ID" (1627:1410). Stage 2, half way.
 *
 * The photo stays on the phone. No verification partner is connected yet, and "we never keep a
 * copy" has to be true, so nothing is uploaded (docs/DECISIONS.md, 2026-11-05).
 */
export default function OnboardingScanId() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {kind = 'nida'} = useLocalSearchParams<{ kind?: string }>();
    const card = ID_TYPES.find((t) => t.key === kind)?.card ?? 'ID card';

    const take = async (camera: boolean) => {
        if (camera) {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) return;
        }
        const res = camera
            ? await ImagePicker.launchCameraAsync({quality: 0.8})
            : await ImagePicker.launchImageLibraryAsync({mediaTypes: ['images'], quality: 0.8});
        if (!res.canceled) router.push('/authentication/selfie');
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={2} progress={0.5}/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Illustration source={require('@/assets/illustrations/scan-id.png')} size={220}/>
                <View style={styles.heading}>
                    <Text variant="title1">Scan the front of your {card}</Text>
                    <Text variant="body" color={c.text.secondary}>Lay the card on a flat surface. The photo is taken once it is in focus.</Text>
                </View>
                <View style={styles.tips}>
                    <TipRow icon="eye" body="Use good light and avoid glare on the card"/>
                    <TipRow icon="image" body="Keep all four corners inside the frame"/>
                    <TipRow icon="check" body="Make sure the text and photo are readable"/>
                </View>
            </ScrollView>
            <Footer>
                <Button title="Open camera" onPress={() => take(true)}/>
                <Button title="Upload a photo instead" variant="text" onPress={() => take(false)}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    heading: {gap: 8},
    tips: {gap: 12},
});
