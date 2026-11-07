import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import {OptionCard} from '@/components/ui/Choice';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {Language, prefs} from '@/lib/prefs';
import {useColors} from '@/theme';

/** Figma "Onboarding — language" (1637:545). The very first screen on a new phone. */
export default function OnboardingLanguage() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {from} = useLocalSearchParams<{ from?: string }>();
    const [lang, setLang] = useState<Language>('en');
    useEffect(() => { prefs.language().then((l) => l && setLang(l)); }, []);

    const next = async () => {
        await prefs.setLanguage(lang);
        // From Profile it is a setting, so go back there; on a new phone it leads on to the slides.
        if (from === 'profile') router.back();
        // push, not replace: Android Back on the slides returns here instead of closing the app.
        else router.push('/authentication/onboarding');
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <View style={styles.content}>
                <View style={[styles.iconBox, {backgroundColor: c.bg.brand}]}>
                    <Icon name="shield-check" size={44} color={c.icon.onBrand}/>
                </View>
                <View style={styles.heading}>
                    <Text variant="title1" style={styles.centre}>Karibu! Welcome</Text>
                    <Text variant="body" color={c.text.secondary} style={styles.centre}>
                        Choose your language. You can change it later in Settings.
                    </Text>
                </View>
                <View style={styles.options}>
                    <OptionCard title="Kiswahili" subtitle="Endelea kwa Kiswahili" selected={lang === 'sw'} onPress={() => setLang('sw')}/>
                    <OptionCard title="English" subtitle="Continue in English" selected={lang === 'en'} onPress={() => setLang('en')}/>
                </View>
            </View>
            <Footer><Button title="Continue" onPress={next}/></Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    // Content starts 200 px from the top of the frame: 138 below a 62 px status bar.
    content: {marginTop: 138, paddingHorizontal: 16, gap: 24, alignItems: 'center'},
    iconBox: {width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
    heading: {gap: 8, width: '100%'},
    centre: {textAlign: 'center'},
    options: {gap: 8, width: '100%'},
});
