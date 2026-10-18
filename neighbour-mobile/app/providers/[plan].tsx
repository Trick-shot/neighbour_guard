import {useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {providersApi} from '@/lib/endpoints';
import {MySubscription, Plan, SecurityProvider} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

import {Progress} from './index';

/**
 * Figma page "Android · 08" / "Street plan".
 *
 * While a payment is on the customer's phone this screen polls the server. It never decides that
 * money has arrived — only the gateway's callback can do that, and saying "paid" before the server
 * agrees would be the single worst lie this app could tell.
 */
const POLL_MS = 4000;
const money = (tsh: number) => `${tsh.toLocaleString('en-US')} TSh`;

export default function PlanDetail() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {plan: planParam} = useLocalSearchParams<{ plan: string }>();
    const planId = Number(planParam);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [provider, setProvider] = useState<SecurityProvider | null>(null);
    const [mine, setMine] = useState<MySubscription | null>(null);
    const [payment, setPayment] = useState<{ status: string } | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const poll = useRef<ReturnType<typeof setInterval> | null>(null);

    const load = useCallback(async () => {
        try {
            const [providers, subscriptions] = await Promise.all([providersApi.list(), providersApi.mine()]);
            const owner = providers.find((p) => p.plans.some((x) => x.id === planId)) ?? null;
            setProvider(owner);
            setPlan(owner?.plans.find((x) => x.id === planId) ?? null);
            setMine(subscriptions.find((s) => s.plan.id === planId) ?? null);
        } catch (e: any) {
            setNote(e.message);
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => { load(); }, [load]);

    // Poll only while a payment is actually waiting, and stop the moment it resolves.
    useEffect(() => {
        const id = mine?.my_payment_id;
        if (!id) return;
        const check = async () => {
            try {
                const result = await providersApi.payment(id);
                setPayment(result);
                if (result.status !== 'pending') {
                    if (poll.current) clearInterval(poll.current);
                    load();
                }
            } catch {
                // A failed poll is not a failed payment: leave it and try again.
            }
        };
        check();
        poll.current = setInterval(check, POLL_MS);
        return () => { if (poll.current) clearInterval(poll.current); };
    }, [mine?.my_payment_id, load]);

    const join = async () => {
        setBusy(true);
        setNote(null);
        try {
            setMine(await providersApi.join(planId));
            await load();
        } catch (e: any) {
            setNote(e.message);
        } finally {
            setBusy(false);
        }
    };

    const leave = async () => {
        setBusy(true);
        setNote(null);
        try {
            await providersApi.leave(planId);
            setMine(null);
            await load();
        } catch (e: any) {
            setNote(e.message);
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
                <ScreenHeader title="Street plan"/>
                <StateView kind="loading"/>
            </View>
        );
    }

    if (!plan || !provider) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
                <ScreenHeader title="Street plan"/>
                <StateView kind="empty" icon="shield-check" title="That plan is not available"
                           body="It may have been withdrawn, or it does not cover your area."/>
            </View>
        );
    }

    const joined = mine?.my_status && mine.my_status !== 'left';
    const waiting = mine?.my_status === 'invited' || payment?.status === 'pending';

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title={provider.name}/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                    <Text variant="title3">{plan.name}</Text>
                    <Text variant="body" color={c.text.secondary}>
                        {plan.description || 'A patrol shared by the houses on your street.'}
                    </Text>
                    <View style={styles.price}>
                        <Text variant="title2">{money(plan.price_tsh)}</Text>
                        <Text variant="subhead" color={c.text.secondary}>per house, per month</Text>
                    </View>
                    {mine && <Progress joined={mine.joined} paid={mine.paid} needed={mine.needed}/>}
                </View>

                {mine?.status === 'active' ? (
                    <View style={[styles.banner, {backgroundColor: c.feedback.successBg}]}>
                        <Icon name="shield-check" size={20} color={c.feedback.success}/>
                        <Text variant="subhead" color={c.feedback.success} style={styles.flex}>
                            This street is covered. An SOS from your home also asks {provider.name} to send a guard.
                        </Text>
                    </View>
                ) : waiting ? (
                    <View style={[styles.banner, {backgroundColor: c.feedback.warningBg}]}>
                        <Icon name="phone" size={20} color={c.feedback.warning}/>
                        <Text variant="subhead" color={c.feedback.warning} style={styles.flex}>
                            Check your phone: a mobile money request is waiting for your PIN. Enter it there — we
                            never ask for it here, and this screen will update itself once the payment clears.
                        </Text>
                    </View>
                ) : payment?.status === 'failed' ? (
                    <View style={[styles.banner, {backgroundColor: c.feedback.errorBg}]}>
                        <Icon name="triangle-alert" size={20} color={c.feedback.error}/>
                        <Text variant="subhead" color={c.text.danger} style={styles.flex}>
                            That payment did not go through. You are still in the pool — you will be asked again.
                        </Text>
                    </View>
                ) : joined ? (
                    <View style={[styles.banner, {backgroundColor: c.bg.subtle}]}>
                        <Icon name="clock" size={20} color={c.icon.muted}/>
                        <Text variant="subhead" color={c.text.secondary} style={styles.flex}>
                            You are in the pool. Nobody is charged until {mine?.needed} houses have joined.
                        </Text>
                    </View>
                ) : null}

                {note && <Text variant="subhead" color={c.feedback.error}>{note}</Text>}

                <View style={styles.actions}>
                    {!joined && <Button title="Join this plan — free" onPress={join} loading={busy}/>}
                    {joined && mine?.my_status !== 'paid' && (
                        <Button title="Leave the pool" variant="outline" onPress={leave} loading={busy}/>
                    )}
                    {mine?.my_status === 'paid' && (
                        <Text variant="footnote" color={c.text.muted} style={styles.centre}>
                            You have paid for this month. Cancelling takes effect at the end of it — ask
                            {' '}{provider.name} directly.
                        </Text>
                    )}
                </View>
                <View style={{height: Math.max(insets.bottom, 16)}}/>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, gap: 12},
    card: {borderRadius: radius.lg, padding: 16, gap: 10},
    price: {flexDirection: 'row', alignItems: 'baseline', gap: 8},
    banner: {flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, alignItems: 'flex-start'},
    flex: {flex: 1},
    actions: {marginTop: 8, gap: 12},
    centre: {textAlign: 'center'},
});
