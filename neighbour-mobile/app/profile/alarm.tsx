import {router} from 'expo-router';
import {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import {Radio} from '@/components/ui/Choice';
import Footer from '@/components/ui/Footer';
import ScreenHeader from '@/components/ui/ScreenHeader';
import {Locked, Row, Section, Toggle} from '@/components/ui/Settings';
import Text from '@/components/ui/Text';
import {profileApi} from '@/lib/endpoints';
import {prefs} from '@/lib/prefs';
import {Me} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Alarm & notifications" (1634:2529).
 *
 * The emergency alarm cannot be switched off from here: the whole product rests on a neighbour's
 * phone ringing. "Messages & issues" and quiet hours live on the server, because a push that
 * arrives while the app is closed is shown by the phone before any app code runs.
 */
const QUIET = [
    {key: 'off', label: 'Off', from: null, to: null},
    {key: '22-06', label: '22:00–06:00', from: '22:00:00', to: '06:00:00'},
    {key: '23-07', label: '23:00–07:00', from: '23:00:00', to: '07:00:00'},
    {key: '21-06', label: '21:00–06:00', from: '21:00:00', to: '06:00:00'},
] as const;

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

export default function AlarmSettings() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [me, setMe] = useState<Me | null>(null);
    const [silent, setSilent] = useState(true);
    const [vibrate, setVibrate] = useState(true);
    const [quietOpen, setQuietOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        profileApi.me().then(setMe).catch(() => undefined);
        prefs.silentSos().then(setSilent);
        prefs.vibrate().then(setVibrate);
    }, []);

    const save = async (fields: Parameters<typeof profileApi.update>[0]) => {
        if (!me) return;
        const before = me;
        setMe({...me, ...fields});
        setError(null);
        try { setMe(await profileApi.update(fields)); } catch (e: any) { setMe(before); setError(e.message); }
    };

    const quiet = me?.quiet_from && me?.quiet_to ? `${hhmm(me.quiet_from)}–${hhmm(me.quiet_to)}` : 'Off';

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Alarm & notifications"/>
            <ScrollView contentContainerStyle={styles.content}>
                <Section title="When I send an SOS" outlined>
                    <Row first icon="volume-x" tile="subtle" title="Silent SOS" subtitle="Your phone stays quiet while neighbours’ phones ring"
                         right={<Toggle value={silent} onChange={(v) => { setSilent(v); prefs.setSilentSos(v); }}/>}/>
                    <Row icon="siren" tile="subtle" title="Press power 5 times to send" subtitle="Not in this version yet. Use the SOS button."
                         right={<Toggle value={false} onChange={() => undefined} disabled/>}/>
                </Section>

                <Section title="When a neighbour needs help" outlined>
                    <Row first icon="bell" tile="subtle" title="Emergency alarm" subtitle="Always rings, even on silent" right={<Locked/>}/>
                    <Row icon="bell" tile="subtle" title="Alarm sound" value="Siren · Loud"/>
                    <Row icon="phone" tile="subtle" title="Vibrate" right={<Toggle value={vibrate} onChange={(v) => { setVibrate(v); prefs.setVibrate(v); }}/>}/>
                </Section>

                <Section title="Everything else" outlined>
                    <Row first icon="message-circle" tile="subtle" title="Messages & issues"
                         right={<Toggle value={me?.routine_push ?? true} onChange={(v) => save({routine_push: v})} disabled={!me}/>}/>
                    <Row icon="clock" tile="subtle" title="Quiet hours" subtitle="Emergencies still ring" value={quiet} onPress={() => setQuietOpen(true)}/>
                </Section>
                {error && <Text variant="footnote" color={c.feedback.error}>{error}</Text>}
            </ScrollView>
            <Footer>
                <Button title="Test my alarm" variant="subtle" icon="bell" onPress={() => router.push('/system/alarm-check')}/>
            </Footer>

            <Modal visible={quietOpen} transparent animationType="slide" onRequestClose={() => setQuietOpen(false)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setQuietOpen(false)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Quiet hours</Text>
                    <Text variant="subhead" color={c.text.secondary}>No message or issue notifications in these hours. A neighbour’s SOS always rings.</Text>
                    {QUIET.map((q) => {
                        const on = q.label === quiet;
                        return (
                            <Pressable key={q.key} onPress={() => { save({quiet_from: q.from, quiet_to: q.to}); setQuietOpen(false); }}
                                       style={[styles.option, {borderColor: on ? c.border.brand : c.border.default}]}>
                                <Text variant="body" style={{flex: 1}}>{q.label}</Text>
                                <Radio on={on}/>
                            </Pressable>
                        );
                    })}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {padding: 16, gap: 16},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 12, paddingTop: 8, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
    option: {flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1},
});
