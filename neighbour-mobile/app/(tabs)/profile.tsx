import Constants from 'expo-constants';
import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {Linking, Pressable, ScrollView, Share, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import {Row, Section} from '@/components/ui/Settings';
import Text from '@/components/ui/Text';
import {useAuth} from '@/context/AuthContext';
import {alertsApi, contactsApi, placesApi, profileApi, providersApi, safetyApi} from '@/lib/endpoints';
import {runAlarmChecks} from '@/lib/notifications';
import {prefs} from '@/lib/prefs';
import {Me, MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

import {SKILLS} from '../profile/medical';

/**
 * Figma "Profile v2" (1745:12125). Me, a warning when this phone may not ring, then three groups:
 * what keeps me safe, my home, my account. Every value on the right is read from the server or
 * this phone, never assumed.
 */
type Summary = {
    contacts?: number; pins?: boolean; skill?: string; household?: number; neighbours?: number;
    provider?: string; language?: string; checks?: { passed: number; total: number; detail: string };
};

export default function Profile() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {logout} = useAuth();
    const [me, setMe] = useState<Me | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [s, setS] = useState<Summary>({});

    const load = useCallback(async () => {
        const [m, h] = await Promise.all([profileApi.me().catch(() => null), placesApi.me().catch(() => null)]);
        setMe(m);
        setHome(h);
        const merge = (p: Partial<Summary>) => setS((old) => ({...old, ...p}));
        contactsApi.list().then((l) => merge({contacts: l.length})).catch(() => undefined);
        alertsApi.pinStatus().then((p) => merge({pins: p.is_set})).catch(() => undefined);
        safetyApi.get().then((p) => merge({skill: SKILLS.find((k) => (p.skills ?? []).includes(k.key))?.label})).catch(() => undefined);
        if (h) {
            placesApi.household().then((l) => merge({household: l.length + (h.members?.length ?? 1)})).catch(() => undefined);
            placesApi.neighbours().then((l) => merge({neighbours: l.filter((n) => n.home.status === 'verified').length})).catch(() => undefined);
        }
        providersApi.mine().then((l) => {
            const live = l.find((x) => x.status === 'active') ?? l.find((x) => x.status === 'gathering');
            merge({provider: live ? (live.status === 'active' ? live.provider : 'Gathering') : 'Not subscribed'});
        }).catch(() => undefined);
        prefs.language().then((l) => merge({language: l === 'sw' ? 'Kiswahili' : 'English'}));
        runAlarmChecks().then((checks) => {
            const bad = checks.filter((x) => x.state === 'bad' || x.state === 'warn');
            merge({checks: {passed: checks.length - bad.length, total: checks.length, detail: bad[0]?.detail ?? ''}});
        }).catch(() => undefined);
    }, []);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const verified = home?.status === 'verified';
    const version = Constants.expoConfig?.version ?? '';
    const checks = s.checks;

    return (
        <ScrollView style={{backgroundColor: c.bg.surface}} showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.content, {paddingTop: insets.top + 8, paddingBottom: 140}]}>
            <Text variant="titleLarge" style={styles.title}>Profile</Text>

            <Pressable onPress={() => router.push('/profile/personal')} style={styles.me}>
                <Avatar name={me?.full_name ?? ''} uri={me?.photo_url} size={72}/>
                <View style={styles.meText}>
                    <Text variant="title3">{me?.full_name ?? ' '}</Text>
                    <Text variant="subhead" color={c.text.secondary}>{home ? `House ${home.house_number} · ${home.street}` : 'No home added yet'}</Text>
                    {home && (
                        <Text variant="footnote" color={verified ? c.feedback.success : c.feedback.warning}>
                            {verified ? 'Verified neighbour' : `Waiting for ${Math.max(0, home.vouches_needed - home.vouches)} more vouch${home.vouches_needed - home.vouches === 1 ? '' : 'es'}`} · {home.neighbourhood.name}
                        </Text>
                    )}
                </View>
            </Pressable>

            {checks && checks.passed < checks.total && (
                <View style={[styles.warn, {backgroundColor: c.feedback.warningBg}]}>
                    <Icon name="triangle-alert" size={22} color={c.feedback.warning}/>
                    <View style={styles.flex}>
                        <Text variant="headline">Alarms may not reach you</Text>
                        <Text variant="footnote" color={c.text.secondary}>{checks.passed} of {checks.total} checks passed. {checks.detail}</Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => router.push('/system/alarm-check')} style={[styles.fix, {backgroundColor: c.text.primary}]}>
                        <Text variant="label" color={c.bg.surface}>Fix</Text>
                    </Pressable>
                </View>
            )}

            <Section title="Safety">
                <Row first icon="phone" title="Emergency contacts" value={s.contacts != null ? String(s.contacts) : undefined} onPress={() => router.push('/profile/contacts')}/>
                <Row icon="bell" title="Alarm & notifications" onPress={() => router.push('/profile/alarm')}/>
                <Row icon="lock" title="SOS PIN & duress code" value={s.pins == null ? undefined : s.pins ? 'On' : 'Off'} onPress={() => router.push('/profile/pins')}/>
                <Row icon="heart-pulse" title="Skills & medical notes" value={s.skill} onPress={() => router.push('/profile/medical')}/>
            </Section>

            <Section title="Home">
                <Row first icon="home" title="My household" value={s.household != null ? `${s.household} ${s.household === 1 ? 'person' : 'people'}` : undefined}
                     onPress={() => router.push(home ? '/profile/household' : '/authentication/location')}/>
                <Row icon="users" title="Neighbours" value={s.neighbours != null ? `${s.neighbours} verified` : undefined} onPress={() => router.push('/neighbours')}/>
                <Row icon="shield-check" title="Security provider" value={s.provider} onPress={() => router.push('/providers')}/>
                <Row icon="plus" title="Invite neighbours" onPress={() => Share.share({
                    message: `Join ${home?.neighbourhood.name ?? 'our street'} on NeighbourGuard so we can reach each other in an emergency.`,
                }).catch(() => undefined)}/>
            </Section>

            <Section title="Account">
                <Row first icon="user" title="Personal information" onPress={() => router.push('/profile/personal')}/>
                <Row icon="map-pin" title="Privacy & location" onPress={() => router.push('/profile/privacy')}/>
                <Row icon="settings" title="Language" value={s.language} onPress={() => router.push({pathname: '/authentication/language', params: {from: 'profile'}})}/>
                <Row icon="clock" title="Alert history" onPress={() => router.push('/profile/history')}/>
            </Section>

            <Section>
                <Row first danger icon="log-out" title="Log out" chevron={false}
                     onPress={async () => { await logout(); router.replace('/authentication/login'); }}/>
            </Section>

            <Text variant="caption1" color={c.text.muted} style={styles.footer}>
                NeighbourGuard {version} ·{' '}
                <Text variant="caption1" color={c.text.muted} onPress={() => Linking.openURL('https://neighbourguard.app/terms')}>Terms</Text> ·{' '}
                <Text variant="caption1" color={c.text.muted} onPress={() => Linking.openURL('https://neighbourguard.app/privacy')}>Privacy policy</Text>
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {paddingHorizontal: 16, gap: 20},
    title: {paddingTop: 8},
    flex: {flex: 1, gap: 2},
    me: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16},
    meText: {flex: 1, gap: 2},
    warn: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 18},
    fix: {height: 36, paddingHorizontal: 14, borderRadius: 100, justifyContent: 'center'},
    footer: {textAlign: 'center'},
});
