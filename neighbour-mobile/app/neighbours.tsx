import {router} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import {chatApi, placesApi} from '@/lib/endpoints';
import {MyResidence, Neighbour} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma page "Android · 04" / "Neighbours". Who is in my area, and the vouching that verifies them.
 *
 * Vouching is the whole trust model: two verified neighbours vouch for a home and it becomes
 * verified, which is what unlocks house numbers, commenting and supporting. So the screen explains
 * what a vouch means before offering the button — it is a statement that you know this person
 * lives there, not a "like".
 */
export default function Neighbours() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [me, setMe] = useState<MyResidence | null>(null);
    const [people, setPeople] = useState<Neighbour[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [note, setNote] = useState<string | null>(null);
    const [vouched, setVouched] = useState<Record<number, number>>({});

    const load = useCallback(async () => {
        setMe(await placesApi.me().catch(() => null));
        setPeople(await placesApi.neighbours().catch(() => []));
    }, []);

    useEffect(() => { load(); }, [load]);

    const vouch = async (person: Neighbour) => {
        setNote(null);
        try {
            const result = await placesApi.vouch(person.home.id);
            setVouched((v) => ({...v, [person.home.id]: result.vouches}));
            setNote(result.status === 'verified'
                ? `${person.full_name}’s home is now verified.`
                : `Vouched. ${person.full_name}’s home needs one more.`);
            load();
        } catch (e: any) {
            setNote(e.message);
        }
    };

    const message = async (person: Neighbour) => {
        setNote(null);
        try {
            const conversation = await chatApi.direct(person.user_id);
            router.push(`/chat/${conversation.id}`);
        } catch (e: any) {
            setNote(e.message);
        }
    };

    const iAmVerified = me?.status === 'verified';
    const pending = (people ?? []).filter((p) => p.home.status !== 'verified');
    const verified = (people ?? []).filter((p) => p.home.status === 'verified');

    const Row = ({person}: { person: Neighbour }) => {
        const isVerified = person.home.status === 'verified';
        const count = vouched[person.home.id];
        return (
            <View style={[styles.row, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                <Avatar name={person.full_name}/>
                <View style={styles.flex}>
                    <Text variant="body">{person.full_name}</Text>
                    <Text variant="footnote" color={c.text.muted}>
                        {[person.home.house_number, person.home.street].filter(Boolean).join(' · ')}
                        {isVerified ? '' : ' · waiting for vouches'}
                    </Text>
                    {count !== undefined && !isVerified && (
                        <Text variant="caption1" color={c.text.brand}>{count} of 2 vouches</Text>
                    )}
                </View>
                {isVerified ? (
                    <Pressable accessibilityLabel={`Message ${person.full_name}`}
                               onPress={() => message(person)} style={styles.iconButton}>
                        <Icon name="message-circle" size={20} color={c.icon.brand}/>
                    </Pressable>
                ) : iAmVerified ? (
                    <Button title="Vouch" variant="outline" size="M" onPress={() => vouch(person)}/>
                ) : null}
            </View>
        );
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Neighbours"/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.icon.brand}
                                                        onRefresh={async () => {
                                                            setRefreshing(true);
                                                            await load();
                                                            setRefreshing(false);
                                                        }}/>}>
                {me && (
                    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/message')}
                               style={[styles.group, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                        <View style={[styles.groupIcon, {backgroundColor: c.bg.brandSubtle}]}>
                            <Icon name="users" size={22} color={c.icon.brand}/>
                        </View>
                        <View style={styles.flex}>
                            <Text variant="label">{me.neighbourhood.name} neighbours</Text>
                            <Text variant="footnote" color={c.text.muted}>
                                Everyone here is in this group. An SOS posts its card into it.
                            </Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={c.icon.muted}/>
                    </Pressable>
                )}

                {!iAmVerified && (
                    <View style={[styles.note, {backgroundColor: c.feedback.warningBg}]}>
                        <Icon name="clock" size={20} color={c.feedback.warning}/>
                        <Text variant="subhead" color={c.feedback.warning} style={styles.flex}>
                            Your own home is not verified yet, so you cannot vouch for anyone and you see streets
                            rather than house numbers. Two verified neighbours need to vouch for you.
                        </Text>
                    </View>
                )}

                {note && <Text variant="subhead" color={c.text.secondary}>{note}</Text>}

                {pending.length > 0 && (
                    <>
                        <Text variant="label" color={c.text.muted} style={styles.heading}>Waiting to be verified</Text>
                        <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                            <Icon name="shield-check" size={20} color={c.icon.brand}/>
                            <Text variant="footnote" color={c.text.secondary} style={styles.flex}>
                                Vouch only for someone you know actually lives there. Two vouches verify a home,
                                and a verified home can see house numbers and comment on issues.
                            </Text>
                        </View>
                        {pending.map((person) => <Row key={person.user_id} person={person}/>)}
                    </>
                )}

                <Text variant="label" color={c.text.muted} style={styles.heading}>
                    Verified neighbours{verified.length ? ` · ${verified.length}` : ''}
                </Text>
                {people === null ? (
                    <Text variant="subhead" color={c.text.muted}>Loading…</Text>
                ) : verified.length === 0 ? (
                    <Text variant="subhead" color={c.text.muted}>
                        Nobody else verified here yet. You are early.
                    </Text>
                ) : (
                    verified.map((person) => <Row key={person.user_id} person={person}/>)
                )}
                <View style={{height: Math.max(insets.bottom, 16)}}/>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, gap: 10},
    group: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg},
    groupIcon: {width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
    note: {flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, alignItems: 'flex-start'},
    heading: {marginTop: 12, marginLeft: 4},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg},
    flex: {flex: 1, gap: 2},
    iconButton: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
});
