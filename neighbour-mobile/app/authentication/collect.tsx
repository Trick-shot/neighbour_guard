import {router} from 'expo-router';
import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Choice';
import Footer from '@/components/ui/Footer';
import Icon, {IconName} from '@/components/ui/Icon';
import Note from '@/components/ui/Note';
import OnboardingHeader from '@/components/ui/OnboardingHeader';
import Text from '@/components/ui/Text';
import {useColors} from '@/theme';

/** Figma "Onboarding — what we collect" (1637:637). Consent comes before any data is asked for. */
const ITEMS: { icon: IconName; title: string; body: string }[] = [
    {icon: 'map-pin', title: 'Your location', body: 'To alert the right neighbours. Your exact home is shown only during a live alert.'},
    {icon: 'shield-check', title: 'Your ID', body: 'Checked by a verification partner. We never keep a copy.'},
    {icon: 'mail', title: 'Email and phone', body: 'To sign you in and send SMS alerts when you have no data.'},
    {icon: 'heart-pulse', title: 'Health notes (optional)', body: 'Shown only to responders during your own alert.'},
];

export default function OnboardingCollect() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [agreed, setAgreed] = useState(true);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top}]}>
            <OnboardingHeader/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heading}>
                    <Text variant="title1">What we collect and why</Text>
                    <Text variant="body" color={c.text.secondary}>We only ask for what helps neighbours reach you faster.</Text>
                </View>
                <View style={styles.list}>
                    {ITEMS.map((item) => (
                        <View key={item.title} style={styles.row}>
                            <View style={[styles.iconBox, {backgroundColor: c.bg.subtle}]}>
                                <Icon name={item.icon} size={20} color={c.icon.brand}/>
                            </View>
                            <View style={styles.rowText}>
                                <Text variant="headline">{item.title}</Text>
                                <Text variant="subhead" color={c.text.secondary}>{item.body}</Text>
                            </View>
                        </View>
                    ))}
                </View>
                <Note icon="lock">
                    Protected under Tanzania’s Personal Data Protection Act. Download or delete your data at any time.
                </Note>
                <Pressable accessibilityRole="checkbox" accessibilityState={{checked: agreed}}
                           onPress={() => setAgreed((a) => !a)} style={styles.agree}>
                    <Checkbox on={agreed}/>
                    <Text variant="subhead">I agree to the Terms and Privacy Policy</Text>
                </Pressable>
            </ScrollView>
            <Footer>
                <Button title="Agree and continue" disabled={!agreed} onPress={() => router.push('/authentication/email')}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 20},
    heading: {gap: 8},
    list: {gap: 16},
    row: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
    iconBox: {width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
    rowText: {flex: 1, gap: 2},
    agree: {flexDirection: 'row', alignItems: 'center', gap: 10},
});
