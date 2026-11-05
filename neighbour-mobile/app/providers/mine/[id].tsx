import {router, useFocusEffect, useLocalSearchParams} from 'expo-router';
import {useCallback, useState} from 'react';
import {Linking, Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ProviderLogo from '@/components/providers/ProviderLogo';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {providersApi} from '@/lib/endpoints';
import {MySubscription} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "My security plan" (1758:291): who is on duty, what I pay, my receipts, and how to stop. */
const money = (n: number) => n.toLocaleString('en-US');
const day = (iso: string | null) => (iso ? `${new Date(iso).getDate()} ${new Date(iso).toLocaleString('en-GB', {month: 'short'})}` : '');

export default function MyPlan() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const [sub, setSub] = useState<MySubscription | null | undefined>(undefined);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => providersApi.mine().then((l) => setSub(l.find((x) => x.id === Number(id)) ?? null)).catch(() => setSub(null)), [id]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (!sub) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
                <ScreenHeader title="My security plan"/>
                {sub === undefined ? <StateView kind="loading"/> : <StateView kind="empty" title="No plan" body="You’re not in this plan any more."/>}
            </View>
        );
    }

    const renews = sub.me?.renews ?? true;
    const cancel = async () => {
        setBusy(true);
        await providersApi.leave(sub.plan.id).catch(() => undefined);
        setBusy(false);
        setConfirm(false);
        load();
    };
    const Row = ({title, sub: subtitle, right, first}: { title: string; sub?: string; right?: React.ReactNode; first?: boolean }) => (
        <View style={[styles.row, !first && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
            <View style={styles.flex}>
                <Text variant="body">{title}</Text>
                {subtitle && <Text variant="footnote" color={c.text.secondary}>{subtitle}</Text>}
            </View>
            {right}
        </View>
    );

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="My security plan"/>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.card, styles.head, {borderColor: c.border.default}]}>
                    <ProviderLogo name={sub.provider}/>
                    <View style={styles.flex}>
                        <Text variant="headline">{sub.provider}</Text>
                        <Text variant="footnote" color={c.text.secondary}>
                            {sub.plan.kind === 'street' ? `Whole street · ${sub.paid} houses covered` : 'Just my house'}
                        </Text>
                    </View>
                    <View style={[styles.pill, {backgroundColor: sub.status === 'active' ? c.feedback.successBg : c.feedback.warningBg}]}>
                        <Text variant="caption1" color={sub.status === 'active' ? c.feedback.success : c.feedback.warning}>
                            {sub.status === 'active' ? (renews ? 'Active' : 'Ends soon') : sub.status === 'lapsed' ? 'Lapsed' : 'Gathering'}
                        </Text>
                    </View>
                </View>

                {sub.on_duty && (
                    <>
                        <Text variant="caption1" color={c.text.muted}>ON DUTY TONIGHT</Text>
                        <View style={[styles.card, styles.head, {borderColor: c.border.default}]}>
                            <Avatar name={sub.on_duty.name} size={40}/>
                            <View style={styles.flex}>
                                <Text variant="headline">{sub.on_duty.name}</Text>
                                <Text variant="footnote" color={c.text.secondary}>{sub.on_duty.shift}</Text>
                            </View>
                            {!!sub.on_duty.phone && (
                                <Pressable accessibilityLabel={`Call ${sub.on_duty.name}`} onPress={() => Linking.openURL(`tel:${sub.on_duty!.phone}`)}
                                           style={[styles.call, {backgroundColor: c.bg.brand}]}>
                                    <Icon name="phone" size={20} color={c.icon.onBrand}/>
                                </Pressable>
                            )}
                        </View>
                    </>
                )}

                <Text variant="caption1" color={c.text.muted}>BILLING</Text>
                <View style={[styles.card, {borderColor: c.border.default}]}>
                    <Row first title={renews ? 'Next payment' : 'Covered until'}
                         sub={`${day(sub.me?.paid_until ?? null) || '—'}${renews ? ` · TSh ${money(sub.plan.price_tsh)}` : ''}`}
                         right={<Text variant="subhead" color={c.text.secondary}>{renews ? 'Automatic' : 'Not renewing'}</Text>}/>
                    <Row title="Pay with M-Pesa" sub={sub.me?.pay_phone ?? 'No verified phone'}
                         right={<Text variant="subhead" color={c.text.brand} onPress={() => router.push('/authentication/phone')}>Change</Text>}/>
                    {(sub.me?.receipts ?? []).map((r) => (
                        <Row key={`${r.ref}-${r.at}`} title={`${day(r.at)} · Receipt`} sub={r.ref ? `M-Pesa ref ${r.ref}` : undefined}
                             right={<Text variant="subhead">TSh {money(r.amount_tsh)}</Text>}/>
                    ))}
                </View>

                {renews && (
                    <Pressable onPress={() => setConfirm(true)}><Text variant="headline" color={c.text.danger}>Cancel plan</Text></Pressable>
                )}
                <Text variant="footnote" color={c.text.secondary}>
                    {sub.plan.kind === 'street'
                        ? `If you cancel, your street stays covered as long as ${sub.needed} houses keep paying.`
                        : 'If you cancel, your home stays covered to the end of the month you paid for.'}
                </Text>
            </ScrollView>

            <Modal visible={confirm} transparent animationType="slide" onRequestClose={() => setConfirm(false)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setConfirm(false)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Cancel your plan?</Text>
                    <Text variant="subhead" color={c.text.secondary}>
                        You stay covered until {day(sub.me?.paid_until ?? null) || 'the end of this month'}. You won’t be asked to pay again.
                    </Text>
                    <Button title="Cancel plan" variant="danger" onPress={cancel} loading={busy}/>
                    <Button title="Keep my plan" variant="text" onPress={() => setConfirm(false)}/>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {padding: 16, gap: 12},
    card: {borderWidth: 1, borderRadius: 16, overflow: 'hidden'},
    head: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16},
    pill: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999},
    call: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 8, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
});
