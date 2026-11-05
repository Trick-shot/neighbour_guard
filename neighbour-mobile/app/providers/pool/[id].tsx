import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useCallback, useState} from 'react';
import {ScrollView, Share, StyleSheet, View} from 'react-native';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {providersApi} from '@/lib/endpoints';
import {MySubscription} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Whole street gathering" (1758:186). Nobody pays until the pool is full; then every joined
 * house gets its own M-Pesa prompt. Houses that are not on the app cannot be listed (we do not
 * know them), so the frame's "Not on the app" row becomes the invite button.
 */
const money = (n: number) => n.toLocaleString('en-US');

export default function StreetPool() {
    const c = useColors();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [sub, setSub] = useState<MySubscription | null | undefined>(undefined);

    const load = useCallback(() => providersApi.mine().then((l) => {
        const s = l.find((x) => x.id === Number(id)) ?? null;
        setSub(s);
        // Full and asking for money: go to the prompt screen.
        if (s?.my_payment_id) router.replace({pathname: '/providers/pay/[id]', params: {id: String(s.id)}});
        if (s?.status === 'active' && s.my_status === 'paid') router.replace({pathname: '/providers/mine/[id]', params: {id: String(s.id)}});
    }).catch(() => setSub(null)), [id]);
    useFocusEffect(useCallback(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]));

    if (!sub) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
                <ScreenHeader title="Whole street plan"/>
                {sub === undefined ? <StateView kind="loading"/> : <StateView kind="empty" title="Not in this plan" body="You may have left it."/>}
            </View>
        );
    }

    const left = Math.max(0, sub.needed - sub.joined);
    const street = sub.street || sub.houses.find((h) => h.is_me)?.house_number || 'your street';
    const statusText = {joined: 'Joined', invited: 'Paying', paid: 'Paid'} as const;
    const invite = () => Share.share({
        message: `We're ${left} house${left === 1 ? '' : 's'} away from a guard on ${sub.street || 'our street'} (${sub.provider}, TSh ${money(sub.plan.price_tsh)} a month each, nobody pays until enough houses join). Join on NeighbourGuard.`,
    }).catch(() => undefined);

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Whole street plan"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.hero, {backgroundColor: c.bg.brandSubtle, borderColor: c.border.brand}]}>
                    <Text variant="caption1" color={c.text.brand}>{`${sub.street || 'Your street'} · ${sub.provider}`.toUpperCase()}</Text>
                    <Text variant="title2">{sub.joined} of {sub.needed} houses joined</Text>
                    <View style={[styles.track, {backgroundColor: c.bg.surface}]}>
                        <View style={[styles.fill, {backgroundColor: c.bg.brand, width: `${Math.min(100, (sub.joined / Math.max(1, sub.needed)) * 100)}%`}]}/>
                    </View>
                    <Text variant="footnote" color={c.text.secondary}>
                        Coverage starts when {sub.needed} houses join. Nobody is charged until then. Each house pays TSh {money(sub.plan.price_tsh)} a month.
                    </Text>
                </View>

                {sub.houses.length > 0 && <Text variant="caption1" color={c.text.muted}>{`HOUSES ON ${street}`.toUpperCase()}</Text>}
                {sub.houses.length > 0 && (
                    <View style={[styles.card, {borderColor: c.border.default}]}>
                        {sub.houses.map((h, i) => (
                            <View key={`${h.house_number}-${i}`} style={[styles.row, i > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                                <Avatar name={h.first_name} size={36}/>
                                <Text variant="body" style={styles.flex}>House {h.house_number} · {h.is_me ? 'You' : h.first_name}</Text>
                                <Text variant="subhead" color={h.status === 'joined' || h.status === 'paid' ? c.feedback.success : c.feedback.warning}>{statusText[h.status]}</Text>
                            </View>
                        ))}
                    </View>
                )}
                <Text variant="footnote" color={c.text.secondary}>
                    {left === 0 ? 'The pool is full. Each house is getting its M-Pesa prompt.' : `${left} more house${left === 1 ? '' : 's'} to go. You pay only after coverage starts.`}
                </Text>
            </ScrollView>
            <Footer gap={10}>
                <Button title={left === 1 ? 'Invite the last house' : 'Invite neighbours'} onPress={invite}/>
                <Button title="Leave this plan" variant="text" onPress={async () => {
                    await providersApi.leave(sub.plan.id).catch(() => undefined);
                    router.back();
                }}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    content: {padding: 16, gap: 12},
    hero: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 10},
    track: {height: 8, borderRadius: 4, overflow: 'hidden'},
    fill: {height: 8, borderRadius: 4},
    card: {borderWidth: 1, borderRadius: 16, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 60},
});
