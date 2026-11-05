import {useCallback, useEffect, useState} from 'react';
import {Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';

import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon, {IconName} from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
// `type` matters: without it Babel sees a value binding called AlarmCheck beside the component
// of the same name and refuses to parse the file, which fails the whole bundle, not just this
// screen. TypeScript alone does not catch it — the two live in different declaration spaces.
import {prefs} from '@/lib/prefs';
import {type AlarmCheck, type CheckState, runAlarmChecks, sendTestAlarm} from '@/lib/notifications';
import {useColors} from '@/theme';

/**
 * Figma page "Android · 09" / "System — alarms can’t reach you".
 *
 * An SOS is only as good as the phone's willingness to ring. Every condition for that lives outside
 * our code — a permission, a channel the user can turn down, Do Not Disturb, battery optimisation,
 * and the push token reaching the server — so this screen reads each one, says what it means in
 * plain words, and goes straight to the setting that fixes it.
 */
const TEST_DELAY_SECONDS = 5;

export default function AlarmCheck() {
    const c = useColors();
    const [checks, setChecks] = useState<AlarmCheck[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [testIn, setTestIn] = useState<number | null>(null);

    const load = useCallback(async () => {
        setChecks(await runAlarmChecks());
    }, []);

    useEffect(() => { load(); }, [load]);

    // Counts down out loud, so the phone can be locked and pocketed before the alarm fires.
    useEffect(() => {
        if (testIn === null) return;
        if (testIn <= 0) { setTestIn(null); return; }
        const t = setTimeout(() => setTestIn((n) => (n === null ? null : n - 1)), 1000);
        return () => clearTimeout(t);
    }, [testIn]);

    const bad = checks?.filter((ch) => ch.state === 'bad').length ?? 0;
    const warn = checks?.filter((ch) => ch.state === 'warn').length ?? 0;
    const ready = checks !== null && bad === 0 && warn === 0;
    const firstFix = checks?.find((ch) => ch.state !== 'ok' && ch.fix)?.fix;

    // Figma 1767:259: a tile per check and one short word on the right.
    const look: Record<CheckState, { icon: IconName; bg: string; fg: string; word: string }> = {
        ok: {icon: 'check', bg: c.feedback.successBg, fg: c.feedback.success, word: 'OK'},
        bad: {icon: 'x', bg: c.feedback.errorBg, fg: c.feedback.error, word: 'Off'},
        warn: {icon: 'triangle-alert', bg: c.feedback.warningBg, fg: c.feedback.warning, word: 'Fix'},
        unknown: {icon: 'search', bg: c.bg.subtle, fg: c.text.secondary, word: 'Check'},
    };

    const runTest = async () => {
        await sendTestAlarm(TEST_DELAY_SECONDS);
        prefs.setAlarmTested();
        setTestIn(TEST_DELAY_SECONDS);
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Alarm check"/>
            <ScrollView contentContainerStyle={styles.content}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}/>}>
                <View style={[styles.badge, {backgroundColor: ready ? c.feedback.successBg : c.feedback.warningBg}]}>
                    <Icon name={ready ? 'shield-check' : 'volume-x'} size={24} color={ready ? c.feedback.success : c.feedback.warning}/>
                </View>
                <Text variant="title1">{checks === null ? 'Checking this phone…' : ready ? 'Alarms will reach you' : 'Alarms can’t reach you'}</Text>
                <Text variant="body" color={c.text.secondary}>
                    {ready
                        ? 'If a neighbour sends an SOS tonight, this phone will ring. Test it once so you know the sound.'
                        : `If a neighbour sends an SOS tonight, your phone may stay silent. Fix ${bad + warn === 1 ? 'this setting' : `these ${bad + warn} settings`} — it takes a minute.`}
                </Text>
                {checks && (
                    <View style={[styles.card, {borderColor: c.border.default}]}>
                        {checks.map((ch, i) => {
                            const l = look[ch.state];
                            return (
                                <Pressable key={ch.id} disabled={!ch.fix} onPress={async () => { await ch.fix?.run(); load(); }}
                                           style={[styles.row, i > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                                    <View style={[styles.tile, {backgroundColor: l.bg}]}><Icon name={l.icon} size={18} color={l.fg}/></View>
                                    <View style={styles.flex}>
                                        <Text variant="body">{ch.title}</Text>
                                        <Text variant="footnote" color={c.text.secondary}>{ch.detail}</Text>
                                    </View>
                                    <Text variant="subhead" color={l.fg}>{l.word}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
                {testIn !== null && (
                    <Text variant="subhead" color={c.text.brand} style={styles.centre}>Lock your phone now · the test alarm rings in {testIn} s</Text>
                )}
            </ScrollView>
            <Footer gap={12}>
                {!ready && <Button title="Open settings" onPress={async () => { await (firstFix ? firstFix.run() : Linking.openSettings()); load(); }}/>}
                <Button title="Test my alarm" variant={ready ? 'primary' : 'text'} onPress={runTest} disabled={testIn !== null || Platform.OS === 'web'}/>
            </Footer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    centre: {textAlign: 'center'},
    content: {padding: 16, gap: 14},
    badge: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 16},
    card: {borderWidth: 1, borderRadius: 16, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12},
    tile: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
});
