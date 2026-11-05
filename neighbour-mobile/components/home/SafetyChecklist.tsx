import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {contactsApi, placesApi, safetyApi} from '@/lib/endpoints';
import {prefs} from '@/lib/prefs';
import {useColors} from '@/theme';

/**
 * Figma "Home — complete your safety profile" (1673:5384): the seven things that make a
 * neighbour's help faster, each ticked from real data. Opens once after onboarding, and from Profile.
 */
type Step = { key: string; title: string; body: string; done: boolean; href: string };

export async function loadSafetySteps(): Promise<Step[]> {
    const [home, contacts, household, safety, tested] = await Promise.all([
        placesApi.me().catch(() => null), contactsApi.list().catch(() => []), placesApi.household().catch(() => []),
        safetyApi.get().catch(() => null), prefs.alarmTested(),
    ]);
    return [
        {key: 'verify', title: 'Verify your identity', body: 'Two neighbours vouch, or an ID check', done: home?.status === 'verified', href: '/authentication/verify'},
        {key: 'contact', title: 'Add an emergency contact', body: 'Texted when you send an SOS', done: contacts.length > 0, href: '/profile/contacts'},
        {key: 'gate', title: 'Help neighbours find your gate', body: 'Gate colour, a landmark, a photo', done: !!(home?.directions || home?.gate_photo_url), href: '/authentication/house?from=home'},
        {key: 'household', title: 'Add your household', body: 'Who lives with you', done: household.length > 0, href: '/profile/household'},
        {key: 'skills', title: 'Add your skills', body: 'First aid, nurse, security…', done: (safety?.skills.length ?? 0) > 0, href: '/profile/medical'},
        {key: 'medical', title: 'Medical notes (optional)', body: 'Shown only during your alert', done: !!(safety && (safety.conditions || safety.allergies || safety.blood_type)), href: '/profile/medical'},
        {key: 'alarm', title: 'Test your alarm', body: 'Hear it once so you trust it', done: tested, href: '/system/alarm-check'},
    ];
}

export default function SafetyChecklist({visible, onClose}: { visible: boolean; onClose: () => void }) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [steps, setSteps] = useState<Step[]>([]);

    useEffect(() => {
        if (visible) loadSafetySteps().then(setSteps);
    }, [visible]);

    const done = steps.filter((s) => s.done).length;
    const go = (href: string) => { onClose(); router.push(href as any); };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[StyleSheet.absoluteFill, styles.dim]} onPress={onClose}/>
            <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                <View style={styles.heading}>
                    <Text variant="title2">Complete your safety profile</Text>
                    <Text variant="subhead" color={c.text.secondary}>Neighbours can help you faster when they know more.</Text>
                </View>
                <View style={styles.progress}>
                    <View style={[styles.bar, {backgroundColor: c.bg.subtle}]}>
                        <View style={[styles.fill, {width: `${steps.length ? (done / steps.length) * 100 : 0}%`, backgroundColor: c.feedback.success}]}/>
                    </View>
                    <Text variant="label" color={c.text.brand}>{done} of {steps.length || 7}</Text>
                </View>
                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    {steps.map((s) => (
                        <Pressable key={s.key} disabled={s.done} onPress={() => go(s.href)} style={styles.row}>
                            {s.done ? (
                                <View style={[styles.tick, {backgroundColor: c.feedback.success}]}><Icon name="check" size={14} color={c.icon.onBrand}/></View>
                            ) : <View style={[styles.tick, {borderWidth: 2, borderColor: c.border.strong}]}/>}
                            <View style={styles.rowText}>
                                <Text variant="headline" color={s.done ? c.text.muted : c.text.primary}
                                      style={s.done && styles.strike}>{s.title}</Text>
                                <Text variant="footnote" color={s.done ? c.feedback.success : c.text.secondary}>{s.done ? 'Done' : s.body}</Text>
                            </View>
                            {!s.done && <Icon name="chevron-right" size={20} color={c.icon.muted}/>}
                        </Pressable>
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    dim: {backgroundColor: 'rgba(0,0,0,0.3)'},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '75%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: 10, paddingHorizontal: 16, gap: 12},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
    heading: {gap: 4, marginTop: 2},
    progress: {flexDirection: 'row', alignItems: 'center', gap: 10},
    bar: {flex: 1, height: 6, borderRadius: 3, overflow: 'hidden'},
    fill: {height: 6, borderRadius: 3},
    list: {flexGrow: 0},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10},
    tick: {width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
    rowText: {flex: 1, gap: 2},
    strike: {textDecorationLine: 'line-through'},
});
