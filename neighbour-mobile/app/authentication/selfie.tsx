import * as ImagePicker from 'expo-image-picker';
import {router} from 'expo-router';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Illustration from '@/components/ui/Illustration';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import TipRow from '@/components/ui/TipRow';
import {useColors} from '@/theme';

/** Figma "Onboarding — selfie check" (1627:1480). Stage 2, three quarters. Stays on the phone too. */
export default function OnboardingSelfie() {
    const c = useColors();
    const insets = useSafeAreaInsets();

    const take = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchCameraAsync({cameraType: ImagePicker.CameraType.front, quality: 0.7});
        if (!res.canceled) router.replace('/authentication/verifyStatus');
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader stage={2} progress={0.75}/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Illustration source={require('@/assets/illustrations/selfie.png')} size={220}/>
                <View style={styles.heading}>
                    <Text variant="title1">Now a quick selfie</Text>
                    <Text variant="body" color={c.text.secondary}>
                        We match your face with the photo on your ID, so nobody can use someone else’s card.
                    </Text>
                </View>
                <View style={styles.tips}>
                    <TipRow icon="user" body="Face the camera and take off sunglasses or a cap"/>
                    <TipRow icon="eye" body="Stand somewhere bright, with the light in front of you"/>
                    <TipRow icon="lock" body="Your selfie is used only for this check, then deleted"/>
                </View>
            </ScrollView>
            <Footer><Button title="Take selfie" onPress={take}/></Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    heading: {gap: 8},
    tips: {gap: 12},
});
