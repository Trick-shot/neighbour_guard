import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/Icon';
import ListRow from '@/components/ui/ListRow';
import Text from '@/components/ui/Text';
import {useAuth} from '@/context/AuthContext';
import {alertsApi, contactsApi, placesApi, profileApi} from '@/lib/endpoints';
import {Me, MyResidence} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/** Figma page "Android · 07" / "Profile". Everything about me, and the things that keep me safe. */
export default function Profile() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {logout} = useAuth();
    const [me, setMe] = useState<Me | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [pinsSet, setPinsSet] = useState<boolean | null>(null);
    const [household, setHousehold] = useState<number | null>(null);
    const [contacts, setContacts] = useState<number | null>(null);

    const load = useCallback(async () => {
        setMe(await profileApi.me().catch(() => null));
        const myHome = await placesApi.me().catch(() => null);
        setHome(myHome);
        setPinsSet((await alertsApi.pinStatus().catch(() => null))?.is_set ?? null);
        setHousehold(myHome ? (await placesApi.household().catch(() => []))?.length ?? null : null);
        setContacts((await contactsApi.list().catch(() => []))?.length ?? null);
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const verified = home?.status === 'verified';

    return (
        <ScrollView style={{backgroundColor: c.bg.page}}
                    contentContainerStyle={[styles.content, {paddingTop: insets.top + 16, paddingBottom: 120}]}
                    showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Avatar name={me?.full_name ?? ''} size={72}/>
                <View style={styles.headerText}>
                    <Text variant="title2">{me?.full_name ?? ' '}</Text>
                    <Text variant="subhead" color={c.text.secondary}>{me?.email ?? ' '}</Text>
                    {home && (
                        <View style={[styles.badge, {backgroundColor: verified ? c.feedback.successBg : c.feedback.warningBg}]}>
                            <Icon name={verified ? 'shield-check' : 'clock'} size={14}
                                  color={verified ? c.feedback.success : c.feedback.warning}/>
                            <Text variant="caption1" color={verified ? c.feedback.success : c.feedback.warning}>
                                {verified
                                    ? `Verified in ${home.neighbourhood.name}`
                                    : `${home.vouches} of ${home.vouches_needed} vouches`}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <Text variant="label" color={c.text.muted} style={styles.heading}>You</Text>
            <View style={[styles.card, shadow.bubble]}>
                <ListRow first title="Personal information" icon="user"
                         value={me?.full_name} onPress={() => router.push('/profile/personal')}/>
                <ListRow last title="Phone number" icon="phone"
                         value={me?.is_phone_verified ? me.phone_number ?? undefined : 'Not verified'}
                         onPress={() => router.push(me?.is_phone_verified ? '/profile/personal' : '/authentication/phone')}/>
            </View>

            <Text variant="label" color={c.text.muted} style={styles.heading}>Your home</Text>
            <View style={[styles.card, shadow.bubble]}>
                <ListRow first title="Home and address" icon="home"
                         value={home ? `${home.house_number} ${home.street}` : 'Not set'}
                         onPress={() => router.push(home ? '/profile/home' : '/authentication/location')}/>
                <ListRow title="Who lives here" icon="users"
                         subtitle="Only shown to neighbours responding to your alert"
                         value={household === null ? undefined : `${household}`}
                         onPress={() => router.push('/profile/household')}/>
                <ListRow last title="Emergency contacts" icon="message-circle"
                         subtitle="Texted when your alert goes out"
                         value={contacts === null ? undefined : `${contacts}`}
                         onPress={() => router.push('/profile/contacts')}/>
            </View>

            <Text variant="label" color={c.text.muted} style={styles.heading}>Safety</Text>
            <View style={[styles.card, shadow.bubble]}>
                <ListRow first title="Safety and duress PINs" icon="lock"
                         value={pinsSet === null ? undefined : pinsSet ? 'Set' : 'Not set'}
                         onPress={() => router.push('/profile/pins')}/>
                <ListRow title="Alarm check" icon="siren"
                         subtitle="Can a neighbour’s SOS reach this phone?"
                         onPress={() => router.push('/system/alarm-check')}/>
                <ListRow last title="Security providers" icon="shield-check"
                         subtitle="Pooled street patrols"
                         onPress={() => router.push('/providers')}/>
            </View>

            <View style={[styles.card, shadow.bubble, styles.signOut]}>
                <ListRow first last danger chevron={false} title="Sign out" icon="log-out"
                         onPress={async () => { await logout(); router.replace('/authentication/login'); }}/>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {paddingHorizontal: 16, gap: 8},
    header: {flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12},
    headerText: {flex: 1, gap: 4},
    badge: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 2,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill},
    heading: {marginTop: 12, marginLeft: 4},
    card: {borderRadius: radius.lg},
    signOut: {marginTop: 24},
});
