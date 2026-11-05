import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Illustration from '@/components/ui/Illustration';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {profileApi, providersApi} from '@/lib/endpoints';
import {Me, Plan, SecurityProvider} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Provider & plans" (1635:2751).
 *
 * Subscribing to a whole-street plan only joins the pool: nobody is charged until enough houses
 * join (see providers.services). A single-house plan collects at once, so it goes straight to
 * the M-Pesa prompt. The phone never decides that a payment went through; the server does.
 */
const money = (n: number) => n.toLocaleString('en-US');
const maskPhone = (p?: string | null) => (p && p.length > 7 ? `${p.replace('+255', '0').slice(0, 4)} ••• ${p.slice(-3)}` : null);

export default function ProviderPlans() {
    const c = useColors();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [provider, setProvider] = useState<SecurityProvider | null | undefined>(undefined);
    const [me, setMe] = useState<Me | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(useCallback(() => {
        providersApi.list().then((l) => {
            const p = l.find((x) => x.id === Number(id)) ?? null;
            setProvider(p);
            setPicked((old) => old ?? (p?.plans.find((x) => x.kind === 'street') ?? p?.plans[0])?.id ?? null);
        }).catch(() => setProvider(null));
        profileApi.me().then(setMe).catch(() => undefined);
    }, [id]));

    if (provider === undefined) return <View style={[styles.screen, {backgroundColor: c.bg.surface}]}><ScreenHeader title="Provider"/><StateView kind="loading"/></View>;
    if (provider === null) return <View style={[styles.screen, {backgroundColor: c.bg.surface}]}><ScreenHeader title="Provider"/><StateView kind="empty" title="Not available" body="This provider no longer covers your area."/></View>;

    const plan = provider.plans.find((p) => p.id === picked) ?? provider.plans[0];
    const street = provider.plans.filter((p) => p.kind === 'street');
    const bestValue = street.length && provider.plans.length > 1 ? street.reduce((a, b) => (a.price_tsh <= b.price_tsh ? a : b)).id : null;
    const phone = maskPhone(me?.phone_number);

    const subscribe = async () => {
        if (!me?.is_phone_verified) return router.push('/authentication/phone');
        setBusy(true);
        setError(null);
        try {
            const sub = await providersApi.join(plan.id);
            const params = {id: String(sub.id)};
            if (sub.status === 'gathering' && sub.joined < sub.needed) router.replace({pathname: '/providers/pool/[id]', params});
            else router.replace({pathname: '/providers/pay/[id]', params});
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const PlanCard = ({p}: { p: Plan }) => {
        const on = p.id === plan.id;
        const total = p.kind === 'street' ? p.price_tsh * p.min_houses : p.price_tsh;
        return (
            <Pressable accessibilityRole="radio" accessibilityState={{selected: on}} onPress={() => setPicked(p.id)}
                       style={[styles.plan, on ? {backgroundColor: c.bg.brandSubtle, borderColor: c.border.brand, borderWidth: 2} : {borderColor: c.border.default}]}>
                <View style={styles.flex}>
                    <View style={styles.planTitle}>
                        <Text variant="headline">{p.name}</Text>
                        {p.id === bestValue && <View style={[styles.best, {backgroundColor: c.bg.brand}]}><Text variant="caption1" color={c.text.onBrand}>Best value</Text></View>}
                    </View>
                    <Text variant="footnote" color={c.text.secondary}>
                        {p.kind === 'street' ? `Shared by up to ${p.min_houses} houses, TSh ${money(p.price_tsh)} each` : p.description || 'Only your home is covered'}
                    </Text>
                </View>
                <View style={styles.price}>
                    <Text variant="title3" color={c.text.brand}>{money(total)}</Text>
                    <Text variant="caption1" color={c.text.muted}>/ month</Text>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title={provider.name}/>
            <ScrollView contentContainerStyle={styles.content}>
                <Illustration source={require('@/assets/illustrations/provider.png')} size={128} height={128}/>
                <View style={styles.meta}>
                    {provider.rating && (
                        <Text variant="subhead" color={c.text.secondary}>★ {Number(provider.rating).toFixed(1)}{provider.review_count ? ` · ${provider.review_count} reviews` : ''}</Text>
                    )}
                    {provider.verified && (
                        <View style={[styles.verified, {backgroundColor: c.feedback.successBg}]}>
                            <Icon name="shield-check" size={14} color={c.feedback.success}/>
                            <Text variant="caption1" color={c.feedback.success}>{provider.licence_no ? 'Licensed & verified' : 'Verified'}</Text>
                        </View>
                    )}
                </View>
                {provider.plans.map((p) => <PlanCard key={p.id} p={p}/>)}
                {(plan.features ?? []).map((f) => (
                    <View key={f} style={styles.feature}>
                        <View style={[styles.tick, {backgroundColor: c.feedback.successBg}]}><Icon name="check" size={16} color={c.feedback.success}/></View>
                        <Text variant="subhead" style={styles.flex}>{f}</Text>
                    </View>
                ))}
                <Pressable onPress={() => router.push('/authentication/phone')} style={[styles.pay, {borderColor: c.border.default}]}>
                    <View style={[styles.mpesa, {backgroundColor: c.feedback.successBg}]}><Icon name="phone" size={22} color={c.feedback.success}/></View>
                    <View style={styles.flex}>
                        <Text variant="headline">Pay with M-Pesa</Text>
                        <Text variant="footnote" color={c.text.secondary}>{phone ? `${phone} · billed monthly` : 'Add a verified phone to pay'}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={c.icon.muted}/>
                </Pressable>
                {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
            </ScrollView>
            <Footer>
                <Button title={`Subscribe · TSh ${money(plan.price_tsh)} / month`} onPress={subscribe} loading={busy}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {padding: 16, gap: 12},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 10},
    verified: {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 999},
    plan: {flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14},
    planTitle: {flexDirection: 'row', alignItems: 'center', gap: 8},
    best: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999},
    price: {alignItems: 'flex-end'},
    feature: {flexDirection: 'row', alignItems: 'center', gap: 12},
    tick: {width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
    pay: {flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14},
    mpesa: {width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
});
