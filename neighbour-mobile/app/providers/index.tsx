import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';

import ProviderLogo from '@/components/providers/ProviderLogo';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {providersApi} from '@/lib/endpoints';
import {MySubscription, SecurityProvider} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Security providers — near you" (1635:2654). Only verified providers that cover my area
 * reach this list (the server filters). The filter cycles the order: nearest response, then price.
 */
const money = (n: number) => n.toLocaleString('en-US');
const cheapest = (p: SecurityProvider) => Math.min(...p.plans.map((x) => x.price_tsh));

export default function Providers() {
    const c = useColors();
    const [providers, setProviders] = useState<SecurityProvider[] | null>(null);
    const [mine, setMine] = useState<MySubscription[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<'response' | 'price'>('response');

    const load = useCallback(async () => {
        try {
            const [list, subs] = await Promise.all([providersApi.list(), providersApi.mine()]);
            setProviders(list);
            setMine(subs);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        }
    }, []);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const sorted = [...(providers ?? [])].filter((p) => p.plans.length > 0).sort((a, b) => order === 'price'
        ? cheapest(a) - cheapest(b)
        : (a.response_min ?? 99) - (b.response_min ?? 99));
    const active = mine.find((s) => s.status === 'active' && s.my_status === 'paid');

    const open = (p: SecurityProvider) => {
        const sub = mine.find((s) => s.provider_id === p.id && s.my_status && s.my_status !== 'left');
        if (sub?.status === 'active' && sub.my_status === 'paid') router.push({pathname: '/providers/mine/[id]', params: {id: String(sub.id)}});
        else if (sub?.my_payment_id) router.push({pathname: '/providers/pay/[id]', params: {id: String(sub.id)}});
        else if (sub && sub.plan.kind === 'street') router.push({pathname: '/providers/pool/[id]', params: {id: String(sub.id)}});
        else router.push({pathname: '/providers/[id]', params: {id: String(p.id)}});
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Security providers" right={
                <Pressable accessibilityLabel={`Sort by ${order === 'price' ? 'response time' : 'price'}`} hitSlop={10}
                           onPress={() => setOrder((o) => (o === 'price' ? 'response' : 'price'))}>
                    <Icon name="filter" size={24}/>
                </Pressable>
            }/>
            {providers === null && !error ? <StateView kind="loading"/> : error && !providers ? (
                <StateView kind="error" actionLabel="Try again" onAction={load}/>
            ) : (
                <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={false} onRefresh={load}/>}>
                    <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                        <Icon name="shield-check" size={18} color={c.icon.brand}/>
                        <Text variant="footnote" color={c.text.secondary} style={styles.flex}>
                            Providers get your street’s alerts at the same time as your neighbours. Prices are set by each provider.
                        </Text>
                    </View>
                    {active && (
                        <Pressable onPress={() => router.push({pathname: '/providers/mine/[id]', params: {id: String(active.id)}})}
                                   style={[styles.covered, {backgroundColor: c.feedback.successBg}]}>
                            <Icon name="shield-check" size={20} color={c.feedback.success}/>
                            <Text variant="subhead" color={c.feedback.success} style={styles.flex}>You’re covered by {active.provider}</Text>
                            <Icon name="chevron-right" size={18} color={c.feedback.success}/>
                        </Pressable>
                    )}
                    {sorted.length === 0 && (
                        <StateView kind="empty" title="No providers here yet" body="When a licensed provider covers your area, they appear here."/>
                    )}
                    {sorted.map((p) => (
                        <Pressable key={p.id} onPress={() => open(p)} style={[styles.card, {borderColor: c.border.default}]}>
                            <View style={styles.top}>
                                <ProviderLogo name={p.name}/>
                                <View style={styles.flex}>
                                    <View style={styles.nameRow}>
                                        <Text variant="headline" numberOfLines={1} style={styles.shrink}>{p.name}</Text>
                                        {p.verified && <Icon name="shield-check" size={18} color={c.feedback.success}/>}
                                    </View>
                                    {p.rating && (
                                        <Text variant="footnote" color={c.text.secondary}>
                                            ★ {Number(p.rating).toFixed(1)}{p.review_count ? ` · ${p.review_count} reviews` : ''}
                                        </Text>
                                    )}
                                </View>
                                <Icon name="chevron-right" size={20} color={c.icon.muted}/>
                            </View>
                            <View style={styles.chips}>
                                {p.response_min != null && (
                                    <View style={[styles.chip, {backgroundColor: c.bg.subtle}]}>
                                        <Icon name="clock" size={16} color={c.icon.brand}/>
                                        <Text variant="footnote" color={c.text.secondary}>~{p.response_min} min response</Text>
                                    </View>
                                )}
                                {!!p.licence_no && (
                                    <View style={[styles.chip, {backgroundColor: c.feedback.successBg}]}>
                                        <Icon name="check" size={16} color={c.feedback.success}/>
                                        <Text variant="footnote" color={c.feedback.success}>Licensed</Text>
                                    </View>
                                )}
                            </View>
                            <Text variant="subhead" color={c.text.brand}>From TSh {money(cheapest(p))} / house / month</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    shrink: {flexShrink: 1},
    content: {padding: 16, gap: 12},
    note: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12},
    covered: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12},
    card: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 12},
    top: {flexDirection: 'row', alignItems: 'center', gap: 12},
    nameRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
    chips: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 24, borderRadius: 999},
});
