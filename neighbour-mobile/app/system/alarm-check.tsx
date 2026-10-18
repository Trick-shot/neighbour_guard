import {router} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon, {IconName} from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {AlarmCheck, CheckState, runAlarmChecks, sendTestAlarm} from '@/lib/notifications';
import {radius, shadow, useColors} from '@/theme';

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
    const insets = useSafeAreaInsets();
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

    const tone: Record<CheckState, { icon: IconName; color: string }> = {
        ok: {icon: 'check', color: c.feedback.success},
        bad: {icon: 'triangle-alert', color: c.feedback.error},
        warn: {icon: 'triangle-alert', color: c.feedback.warning},
        unknown: {icon: 'search', color: c.text.muted},
    };

    const bad = checks?.filter((ch) => ch.state === 'bad').length ?? 0;
    const warn = checks?.filter((ch) => ch.state === 'warn').length ?? 0;
    const summary = bad > 0
        ? {bg: c.feedback.errorBg, fg: c.text.danger, icon: 'triangle-alert' as IconName,
            title: bad === 1 ? 'One thing would stop an alarm' : `${bad} things would stop an alarm`,
            detail: 'Fix these before you rely on this phone.'}
        : warn > 0
            ? {bg: c.feedback.warningBg, fg: c.feedback.warning, icon: 'triangle-alert' as IconName,
                title: 'Alarms will reach you, with limits',
                detail: 'The notes below are worth reading before the demo.'}
            : {bg: c.feedback.successBg, fg: c.feedback.success, icon: 'shield-check' as IconName,
                title: 'This phone is ready',
                detail: 'An SOS from a neighbour will ring here.'};

    const runTest = async () => {
        await sendTestAlarm(TEST_DELAY_SECONDS);
        setTestIn(TEST_DELAY_SECONDS);
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page, paddingTop: insets.top}]}>
            <View style={styles.header}>
                <Pressable accessibilityLabel="Back" onPress={() => router.canGoBack() && router.back()}
                           style={styles.back}>
                    <Icon name="chevron-left" size={24}/>
                </Pressable>
                <Text variant="headline">Alarm check</Text>
            </View>

            <ScrollView
                contentContainerStyle={[styles.content, {paddingBottom: Math.max(insets.bottom, 16) + 24}]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
                        tintColor={c.icon.brand}
                    />
                }>
                <View style={styles.intro}>
                    <Text variant="title2">Can alarms reach you?</Text>
                    <Text variant="subhead" color={c.text.secondary}>
                        A neighbour’s SOS has to get past this phone’s own settings. Here is what they say right now.
                    </Text>
                </View>

                <View style={[styles.summary, {backgroundColor: summary.bg}]}>
                    <Icon name={summary.icon} size={22} color={summary.fg}/>
                    <View style={styles.flex}>
                        <Text variant="bodyEmphasis" color={summary.fg}>{summary.title}</Text>
                        <Text variant="footnote" color={summary.fg}>{summary.detail}</Text>
                    </View>
                </View>

                {checks === null ? (
                    <Text variant="subhead" color={c.text.muted}>Checking…</Text>
                ) : (
                    <View style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                        {checks.map((check, i) => (
                            <View key={check.id}
                                  style={[styles.row, i > 0 && {borderTopWidth: 1, borderTopColor: c.border.default}]}>
                                <Icon {...{name: tone[check.state].icon}} size={20} color={tone[check.state].color}/>
                                <View style={styles.flex}>
                                    <Text variant="label">{check.title}</Text>
                                    <Text variant="footnote" color={c.text.secondary}>{check.detail}</Text>
                                    {check.fix && (
                                        <Button
                                            title={check.fix.label}
                                            variant="outline"
                                            size="M"
                                            style={styles.fix}
                                            onPress={async () => { await check.fix!.run(); load(); }}
                                        />
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                    <View style={styles.row}>
                        <Icon name="siren" size={20} color={c.icon.brand}/>
                        <View style={styles.flex}>
                            <Text variant="label">Hear it for yourself</Text>
                            <Text variant="footnote" color={c.text.secondary}>
                                {testIn === null
                                    ? `A real alarm on the SOS channel, ${TEST_DELAY_SECONDS} seconds from now. `
                                        + 'Start it, then lock the phone and put it in your pocket. No neighbour is alerted.'
                                    : `Firing in ${testIn}… lock the phone now.`}
                            </Text>
                            <Button
                                title={testIn === null ? 'Send a test alarm' : `${testIn}…`}
                                variant="outline"
                                size="M"
                                disabled={testIn !== null}
                                style={styles.fix}
                                onPress={runTest}
                            />
                        </View>
                    </View>
                </View>

                {Platform.OS === 'android' && (
                    <Text variant="footnote" color={c.text.muted}>
                        Some phones (Xiaomi, Oppo, Tecno, Infinix) also have their own “auto-start” or “protected
                        app” list. If a test alarm never arrives with the app closed, look for that list too.
                    </Text>
                )}

                <Button title="Check again" variant="outline" onPress={load}/>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 48},
    back: {width: 28, height: 28, alignItems: 'center', justifyContent: 'center'},
    content: {paddingHorizontal: 16, paddingTop: 8, gap: 16},
    intro: {gap: 6},
    summary: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    card: {borderRadius: radius.lg, overflow: 'hidden'},
    row: {flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start'},
    flex: {flex: 1, gap: 4},
    fix: {alignSelf: 'flex-start', marginTop: 8},
});
