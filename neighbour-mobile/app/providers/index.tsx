import {router} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {providersApi} from '@/lib/endpoints';
import {MySubscription, SecurityProvider} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma page "Android · 08" / "Security providers".
 *
 * A street pool: houses join for free, and nobody is charged until enough of them have joined for
 * the provider to run a patrol. That is the whole idea, so it is said on the screen rather than
 * buried in a plan's small print.
 */
const money = (tsh: number) => `${tsh.toLocaleString('en-US')} TSh`;

export default function Providers() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [list, setList] = useState<SecurityProvider[] | null>(null);
    const [mine, setMine] = useState<MySubscription[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [providers, subscriptions] = await Promise.all([providersApi.list(), providersApi.mine()]);
            setList(providers);
            setMine(subscriptions);
            setError(null);
        } catch (e: any) {
            setError(e.message);
            setList([]);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const joinedPlanIds = new Set(mine.filter((s) => s.my_status && s.my_status !== 'left').map((s) => s.plan.id));

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Security providers"/>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.note, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="users" size={20} color={c.icon.brand}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.flex}>
                        Joining a street plan is free. Nobody pays anything until enough houses on the street have
                        joined for the provider to run a patrol — then everyone is asked at once.
                    </Text>
                </View>

                {mine.filter((s) => s.my_status && s.my_status !== 'left').map((subscription) => (
                    <Pressable key={subscription.id} accessibilityRole="button"
                               onPress={() => router.push(`/providers/${subscription.plan.id}`)}
                               style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                        <View style={styles.row}>
                            <Text variant="bodyEmphasis" style={styles.flex}>{subscription.provider}</Text>
                            <View style={[styles.pill, {backgroundColor: subscription.status === 'active'
                                    ? c.feedback.successBg : c.bg.subtle}]}>
                                <Text variant="caption1" color={subscription.status === 'active'
                                    ? c.feedback.success : c.text.secondary}>
                                    {subscription.status === 'active' ? 'Covering your street'
                                        : subscription.status === 'lapsed' ? 'Lapsed' : 'Gathering houses'}
                                </Text>
                            </View>
                        </View>
                        <Text variant="subhead" color={c.text.secondary}>
                            {subscription.plan.name} · {money(subscription.plan.price_tsh)} a month each
                        </Text>
                        <Progress joined={subscription.joined} paid={subscription.paid} needed={subscription.needed}/>
                    </Pressable>
                ))}

                <Text variant="label" color={c.text.muted} style={styles.heading}>Available where you live</Text>

                {list === null ? <StateView kind="loading"/>
                    : error ? <StateView kind="error" body={error} actionLabel="Try again" onAction={load}/>
                        : list.length === 0 ? (
                            <StateView kind="empty" icon="shield-check" title="No providers here yet"
                                       body="Nobody licensed covers your neighbourhood on NeighbourGuard so far."/>
                        ) : list.map((provider) => (
                            <View key={provider.id} style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                                <View style={styles.row}>
                                    <View style={[styles.icon, {backgroundColor: c.bg.subtle}]}>
                                        <Icon name="shield-check" size={20} color={c.icon.brand}/>
                                    </View>
                                    <View style={styles.flex}>
                                        <Text variant="bodyEmphasis">{provider.name}</Text>
                                        <Text variant="footnote" color={c.text.muted}>
                                            {[provider.licence_no && `Licence ${provider.licence_no}`,
                                                provider.rating && `${provider.rating} / 5`]
                                                .filter(Boolean).join(' · ') || 'Licensed provider'}
                                        </Text>
                                    </View>
                                </View>
                                {provider.plans.map((plan) => (
                                    <Pressable key={plan.id} accessibilityRole="button"
                                               onPress={() => router.push(`/providers/${plan.id}`)}
                                               style={[styles.plan, {borderColor: c.border.default}]}>
                                        <View style={styles.flex}>
                                            <Text variant="label">{plan.name}</Text>
                                            <Text variant="footnote" color={c.text.muted}>
                                                {money(plan.price_tsh)} a month · needs {plan.min_houses}{' '}
                                                {plan.min_houses === 1 ? 'house' : 'houses'}
                                            </Text>
                                        </View>
                                        {joinedPlanIds.has(plan.id)
                                            ? <Icon name="check" size={20} color={c.icon.brand}/>
                                            : <Icon name="chevron-right" size={20} color={c.icon.muted}/>}
                                    </Pressable>
                                ))}
                            </View>
                        ))}
                <View style={{height: Math.max(insets.bottom, 16)}}/>
            </ScrollView>
        </View>
    );
}

export function Progress({joined, paid, needed}: { joined: number; paid: number; needed: number }) {
    const c = useColors();
    const share = Math.min(1, needed ? joined / needed : 1);
    return (
        <View style={styles.progressWrap}>
            <View style={[styles.track, {backgroundColor: c.bg.subtle}]}>
                <View style={[styles.fill, {width: `${share * 100}%`, backgroundColor: c.bg.brand}]}/>
            </View>
            <Text variant="caption1" color={c.text.muted}>
                {joined} of {needed} houses joined{paid ? ` · ${paid} paid` : ''}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, gap: 12},
    note: {flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, alignItems: 'flex-start'},
    flex: {flex: 1, gap: 2},
    card: {borderRadius: radius.lg, padding: 14, gap: 10},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12},
    icon: {width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
    pill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill},
    plan: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md,
        borderWidth: 1},
    heading: {marginTop: 12, marginLeft: 4},
    progressWrap: {gap: 6},
    track: {height: 6, borderRadius: radius.pill, overflow: 'hidden'},
    fill: {height: 6, borderRadius: radius.pill},
});
