import {Image} from 'expo-image';
import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import {providersApi} from '@/lib/endpoints';
import {MySubscription, PaymentStatus} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Confirm payment — M-Pesa" (1758:245).
 *
 * The phone shows the prompt; the customer types their PIN into M-Pesa, never into us. This
 * screen only polls the payment row, which only the gateway callback can mark paid.
 */
const money = (n: number) => n.toLocaleString('en-US');
const PROMPT_S = 60;

export default function PayWithMpesa() {
    const c = useColors();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [sub, setSub] = useState<MySubscription | null>(null);
    const [payment, setPayment] = useState<PaymentStatus | null>(null);
    const [left, setLeft] = useState(PROMPT_S);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const paymentId = useRef<number | null>(null);

    const load = useCallback(async () => {
        const s = (await providersApi.mine().catch(() => [])).find((x) => x.id === Number(id)) ?? null;
        setSub(s);
        if (s?.status === 'active' && s.my_status === 'paid') {
            router.replace({pathname: '/(tabs)', params: {covered: s.provider}});
            return;
        }
        const pid = paymentId.current ?? s?.my_payment_id ?? null;
        if (pid) {
            paymentId.current = pid;
            const p = await providersApi.payment(pid).catch(() => null);
            setPayment(p);
            if (p?.status === 'paid') router.replace({pathname: '/(tabs)', params: {covered: s?.provider ?? ''}});
        }
    }, [id]);

    useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [load]);
    useEffect(() => {
        if (!payment?.created_at) return;
        const tick = () => setLeft(Math.max(0, PROMPT_S - Math.round((Date.now() - new Date(payment.created_at).getTime()) / 1000)));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [payment?.created_at]);

    const resend = async () => {
        setBusy(true);
        setError(null);
        try {
            const p = await providersApi.pay(Number(id));
            paymentId.current = p.id;
            setPayment(p);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const amount = payment?.amount_tsh ?? sub?.plan.price_tsh ?? 0;
    const phone = sub?.me?.pay_phone ?? 'your phone';
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const failed = payment?.status === 'failed';
    const waiting = payment?.status === 'pending' && left > 0;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Pay with M-Pesa"/>
            <ScrollView contentContainerStyle={styles.content}>
                <Image source={require('@/assets/illustrations/mobile-sms.png')} style={styles.art} contentFit="contain"/>
                <Text variant="title1" style={styles.center}>{failed ? 'Payment didn’t go through' : 'Check your phone'}</Text>
                <Text variant="body" color={c.text.secondary} style={styles.center}>
                    {failed
                        ? 'The request was cancelled or timed out. Nothing was charged. Send it again when you’re ready.'
                        : `We sent an M-Pesa request for TSh ${money(amount)} to ${phone}. Enter your M-Pesa PIN on that prompt to confirm.`}
                </Text>
                {!failed && (
                    <View style={[styles.wait, {backgroundColor: c.bg.subtle}]}>
                        <Icon name="clock" size={18} color={c.icon.default}/>
                        <Text variant="subhead" color={c.text.secondary}>
                            {!payment ? 'Preparing your request…' : waiting ? `Waiting for confirmation · 0:${String(left).padStart(2, '0')}` : 'No answer yet. Resend if the prompt closed.'}
                        </Text>
                    </View>
                )}
                {sub && (
                    <View style={[styles.card, {borderColor: c.border.default}]}>
                        <View style={styles.row}>
                            <View style={styles.flex}>
                                <Text variant="body">{sub.provider} · {sub.plan.name}</Text>
                                <Text variant="footnote" color={c.text.secondary}>First month</Text>
                            </View>
                            <Text variant="subhead">TSh {money(amount)}</Text>
                        </View>
                        <View style={[styles.row, {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                            <View style={styles.flex}>
                                <Text variant="body">Billed monthly</Text>
                                <Text variant="footnote" color={c.text.secondary}>
                                    Next payment {next.getDate()} {next.toLocaleString('en-GB', {month: 'short'})} · cancel any time
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
                <View style={[styles.note, {backgroundColor: c.bg.subtle}]}>
                    <Icon name="lock" size={18} color={c.icon.default}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.flex}>NeighbourGuard never asks for your M-Pesa PIN inside the app.</Text>
                </View>
                {error && <Text variant="footnote" color={c.feedback.error} style={styles.center}>{error}</Text>}
            </ScrollView>
            <Footer gap={12}>
                <Button title="Use another number" variant="text" onPress={() => router.push('/authentication/phone')}/>
                <Button title="Resend request" onPress={resend} loading={busy} disabled={waiting}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {padding: 16, gap: 16, alignItems: 'stretch'},
    art: {width: 140, height: 140, alignSelf: 'center'},
    center: {textAlign: 'center'},
    wait: {flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', paddingHorizontal: 14, height: 36, borderRadius: 999},
    card: {borderWidth: 1, borderRadius: 16, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14},
    note: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12},
});
