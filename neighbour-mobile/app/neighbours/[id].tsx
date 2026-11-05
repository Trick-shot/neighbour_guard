import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import VouchSheet from '@/components/neighbours/VouchSheet';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Note from '@/components/ui/Note';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {chatApi, placesApi} from '@/lib/endpoints';
import {NeighbourProfile} from '@/lib/types';
import {useColors} from '@/theme';

import {SKILLS} from '../profile/medical';
import {homeLabel} from './index';

/**
 * Figma "Neighbour profile" (1633:2001). The household section of the frame is left out on
 * purpose: who lives in a home is shown to responders during a live alert only.
 */
export default function NeighbourProfileScreen() {
    const c = useColors();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [p, setP] = useState<NeighbourProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = () => placesApi.neighbour(Number(id)).then(setP).catch((e) => setError(e.message));
    useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const message = async () => {
        const convo = await chatApi.direct(Number(id)).catch(() => null);
        if (convo) router.push(`/chat/${convo.id}`);
    };
    const vouch = async () => {
        setBusy(true);
        await placesApi.vouch(p!.home.id).catch((e) => setError(e.message));
        setBusy(false);
        setAsking(false);
        load();
    };

    if (!p) return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Neighbour"/>
            {error ? <StateView kind="error" body={error} actionLabel="Try again" onAction={load}/> : <StateView kind="loading"/>}
        </View>
    );

    const verified = p.home.status === 'verified';
    const vouches = p.vouched_by.length;
    const others = p.vouched_by.length > 2 ? ` and ${p.vouched_by.length - 2} others` : '';
    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Neighbour"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.head}>
                    <Avatar name={p.full_name} uri={p.photo_url} size={80}/>
                    <View style={styles.nameRow}>
                        <Text variant="title2">{p.full_name}</Text>
                        {verified && <Icon name="shield-check" size={20} color={c.feedback.success}/>}
                    </View>
                    <Text variant="subhead" color={c.text.secondary}>{homeLabel(p.home)} · {p.home.street}</Text>
                    <View style={[styles.chip, {backgroundColor: verified ? c.feedback.successBg : c.feedback.warningBg}]}>
                        <Icon name={verified ? 'check' : 'clock'} size={14} color={verified ? c.feedback.success : c.feedback.warning}/>
                        <Text variant="footnote" color={verified ? c.feedback.success : c.feedback.warning}>
                            {verified ? (vouches ? `Verified · ${vouches} vouch${vouches === 1 ? '' : 'es'}` : 'Verified') : `Waiting · ${vouches} of ${p.vouches_needed} vouches`}
                        </Text>
                    </View>
                </View>
                <Button title="Message" icon="message-circle" onPress={message}/>
                {!verified && !p.i_vouched && <Button title="Vouch for them" variant="outline" onPress={() => setAsking(true)}/>}
                <Note icon="lock">Phone numbers are shared only during a live alert.</Note>
                {vouches > 0 && (
                    <View style={[styles.card, {borderColor: c.border.default}]}>
                        <View style={styles.faces}>
                            {p.vouched_by.slice(0, 3).map((n, i) => (
                                <View key={n + i} style={[styles.face, {borderColor: c.bg.surface, marginLeft: i ? -8 : 0}]}><Avatar name={n} size={28}/></View>
                            ))}
                        </View>
                        <Text variant="footnote" color={c.text.secondary} style={styles.flex}>
                            Vouched for by {p.vouched_by.slice(0, 2).join(' and ')}{others}
                        </Text>
                    </View>
                )}
                {p.skills.length > 0 && (
                    <View style={[styles.card, styles.column, {borderColor: c.border.default}]}>
                        <Text variant="caption1" color={c.text.muted}>CAN HELP WITH</Text>
                        <View style={styles.skills}>
                            {p.skills.map((k) => {
                                const medical = k === 'first_aid' || k === 'nurse' || k === 'doctor';
                                return (
                                    <View key={k} style={[styles.skill, {backgroundColor: medical ? c.bg.dangerSubtle : c.bg.brandSubtle}]}>
                                        <Icon name={medical ? 'heart-pulse' : 'user'} size={14} color={medical ? c.icon.danger : c.icon.brand}/>
                                        <Text variant="label" color={medical ? c.text.danger : c.text.brand}>
                                            {SKILLS.find((s) => s.key === k)?.label ?? k}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
                {error ? <Text variant="footnote" color={c.feedback.error}>{error}</Text> : null}
            </ScrollView>
            <VouchSheet name={asking ? p.full_name : null} where={`${homeLabel(p.home)}, ${p.home.street}`} busy={busy}
                        onYes={vouch} onNo={() => setAsking(false)}/>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    content: {padding: 16, gap: 12, paddingBottom: 40},
    head: {alignItems: 'center', gap: 4, marginBottom: 4},
    nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8},
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 4},
    card: {flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 14},
    column: {flexDirection: 'column', alignItems: 'flex-start'},
    faces: {flexDirection: 'row'},
    face: {borderWidth: 2, borderRadius: 16},
    skills: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
    skill: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999},
});
