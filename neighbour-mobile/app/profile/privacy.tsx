import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import {useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {Linking, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';

import {Radio} from '@/components/ui/Choice';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import {Locked, Row, Section} from '@/components/ui/Settings';
import Text from '@/components/ui/Text';
import {placesApi, profileApi} from '@/lib/endpoints';
import {MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Privacy & location" (1634:2692).
 *
 * What is fixed is shown as fixed: live location in an alert is the point of an alert, and a
 * witness report never carries a name at all (alerts.models.WitnessReport), so neither is a switch.
 * "Who can see my home on the map" is real and stored on the server (Residence.map_visibility).
 */
export default function PrivacyAndLocation() {
    const c = useColors();
    const [home, setHome] = useState<MyResidence | null>(null);
    const [access, setAccess] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        placesApi.me().then(setHome).catch(() => undefined);
        (async () => {
            const fg = await Location.getForegroundPermissionsAsync();
            if (!fg.granted) return setAccess('Off');
            const bg = await Location.getBackgroundPermissionsAsync().catch(() => null);
            setAccess(bg?.granted ? 'Always' : 'While using');
        })().catch(() => setAccess(''));
    }, []));

    const setVisibility = async (v: 'neighbours' | 'nobody') => {
        if (!home || home.map_visibility === v) return;
        const before = home;
        setHome({...home, map_visibility: v});
        try { setHome(await placesApi.update({map_visibility: v})); } catch (e: any) { setHome(before); setError(e.message); }
    };

    const download = async () => {
        setBusy(true);
        setError(null);
        try {
            const data = await profileApi.exportData();
            const json = JSON.stringify(data, null, 2);
            if (Platform.OS === 'web') {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([json], {type: 'application/json'}));
                a.download = 'neighbourguard-my-data.json';
                a.click();
            } else {
                const path = `${FileSystem.cacheDirectory}neighbourguard-my-data.json`;
                await FileSystem.writeAsStringAsync(path, json);
                await Sharing.shareAsync(path, {mimeType: 'application/json', dialogTitle: 'My NeighbourGuard data'});
            }
        } catch (e: any) {
            setError(e.message ?? 'Could not prepare your data.');
        } finally {
            setBusy(false);
        }
    };

    const vis = home?.map_visibility ?? 'neighbours';
    const Option = ({value, title, subtitle, first}: { value: 'neighbours' | 'nobody'; title: string; subtitle: string; first?: boolean }) => (
        <Pressable onPress={() => setVisibility(value)} accessibilityRole="radio" accessibilityState={{selected: vis === value}}
                   style={[styles.option, !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
            <View style={styles.flex}>
                <Text variant="body">{title}</Text>
                <Text variant="footnote" color={c.text.secondary}>{subtitle}</Text>
            </View>
            <Radio on={vis === value}/>
        </Pressable>
    );

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Privacy & location"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="shield-check" size={18} color={c.icon.brand}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.flex}>Your exact home is only shown during a live alert.</Text>
                </View>
                <Section title="Who can see my home on the map" outlined>
                    <Option first value="neighbours" title="Verified neighbours" subtitle="As an approximate area, never your door"/>
                    <Option value="nobody" title="Nobody" subtitle="Until I send an alert"/>
                </Section>
                <Section title="Location" outlined>
                    <Row first title="Live location in my alerts" subtitle="Stops when the alert is resolved" right={<Locked/>}/>
                    <Row title="Location access" subtitle="Needed to get nearby alerts" value={access}
                         onPress={() => Linking.openSettings().catch(() => undefined)}/>
                </Section>
                <Section title="Data" outlined>
                    <Row first title="Hide my name on witness reports" subtitle="Witness reports never carry a name" right={<Locked label="On"/>}/>
                    <Row title="Download my data" value={busy ? 'Preparing…' : undefined} onPress={busy ? undefined : download}/>
                </Section>
                {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {padding: 16, gap: 16},
    note: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12},
    option: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14},
});
