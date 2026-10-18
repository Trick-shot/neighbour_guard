import * as Haptics from 'expo-haptics';
import {router} from 'expo-router';
import {useMemo, useRef, useState} from 'react';
import {Animated, Easing, PanResponder, StyleSheet, useWindowDimensions, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

import {ALERT_META} from '@/components/ui/AlertTypeChip';
import Icon from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {alertsApi} from '@/lib/endpoints';
import {AlertType} from '@/lib/types';
import {newClientId} from '@/lib/uuid';
import {alertColor, shadow, useColors} from '@/theme';

/**
 * Figma "SOS — hold, slide to a type" (1677:700).
 * Hold the SOS disc for 2 s (stops pocket taps). While holding, slide onto a type to choose it;
 * release to send. Releasing early sends nothing. Tap outside the disc to close.
 */
const HOLD_MS = 2000;
const DISC = 185;
const RING = 220;
const ARC_RADIUS = 200;
const TYPES: { type: AlertType; angle: number }[] = [
    {type: 'robbery', angle: -56},
    {type: 'medical', angle: -28},
    {type: 'fire', angle: 0},
    {type: 'suspicious', angle: 28},
    {type: 'other', angle: 56},
];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function SosHold() {
    const c = useColors();
    const {width, height} = useWindowDimensions();
    const clientId = useRef(newClientId()).current; // reused if sending has to be retried
    const centre = {x: width / 2, y: height - 294};
    const progress = useRef(new Animated.Value(0)).current;
    const [holding, setHolding] = useState(false);
    const [selected, setSelected] = useState<AlertType | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const done = useRef(false);
    const selectedRef = useRef<AlertType | null>(null);

    const bubbles = useMemo(() => TYPES.map(({type, angle}) => {
        const rad = (angle * Math.PI) / 180;
        return {type, x: centre.x + ARC_RADIUS * Math.sin(rad), y: centre.y - ARC_RADIUS * Math.cos(rad)};
    }), [centre.x, centre.y]);

    const send = async (type: AlertType) => {
        setSending(true);
        try {
            const alert = await alertsApi.create(clientId, type);
            router.replace({pathname: '/sos/countdown', params: {id: String(alert.id)}});
        } catch (e: any) {
            setSending(false);
            if (e.message === 'No connection') {
                // Never a dead end: the same alert can still go out as a text, carrying the ref
                // that stops it becoming a second alert when data comes back.
                router.replace({pathname: '/sos/sms-fallback', params: {clientId, type}});
                return;
            }
            setError(e.message);
        }
    };

    const pan = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
            const {pageX, pageY} = e.nativeEvent;
            const onDisc = Math.hypot(pageX - centre.x, pageY - centre.y) <= DISC / 2;
            if (!onDisc) {
                router.back();
                return;
            }
            setError(null);
            done.current = false;
            setHolding(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.timing(progress, {toValue: 1, duration: HOLD_MS, easing: Easing.linear, useNativeDriver: false})
                .start(({finished}) => {
                    if (finished) {
                        done.current = true;
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }
                });
        },
        onPanResponderMove: (e) => {
            const {pageX, pageY} = e.nativeEvent;
            const hit = bubbles.find((b) => Math.hypot(pageX - b.x, pageY - b.y) < 48);
            const next = hit?.type ?? null;
            if (next !== selectedRef.current) {
                selectedRef.current = next;
                setSelected(next);
                if (next) Haptics.selectionAsync();
            }
        },
        onPanResponderRelease: () => {
            progress.stopAnimation();
            setHolding(false);
            if (done.current) {
                send(selectedRef.current ?? 'emergency');
            } else {
                Animated.timing(progress, {toValue: 0, duration: 200, useNativeDriver: false}).start();
                selectedRef.current = null;
                setSelected(null);
            }
        },
        onPanResponderTerminate: () => {
            progress.stopAnimation();
            progress.setValue(0);
            setHolding(false);
        },
    }), [bubbles, centre.x, centre.y]);

    const circumference = 2 * Math.PI * (RING / 2 - 6);
    const hint = error
        ?? (sending ? 'Sending…'
            : !holding ? 'Hold SOS for 2 seconds · tap outside to close'
                : selected ? `Release on ${ALERT_META[selected].label} to send a ${ALERT_META[selected].label.toLowerCase()} alert · slide back to cancel`
                    : 'Slide to a type, or release for a general SOS');

    return (
        <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(10,13,26,0.6)'}]} {...pan.panHandlers}>
            <View style={styles.copy} pointerEvents="none">
                <Text variant="title1" color={c.text.onBrand}>Slide to what’s happening</Text>
                <Text variant="body" color={c.text.onBrand}>or keep holding for a general SOS</Text>
            </View>

            {bubbles.map(({type, x, y}) => {
                const on = selected === type;
                const size = on ? 76 : 60;
                return (
                    <View key={type} pointerEvents="none" style={[styles.typeWrap, {left: x - 60, top: y - size / 2}]}>
                        <View style={[styles.bubble, shadow.type, {
                            width: size, height: size, borderRadius: size / 2, borderWidth: on ? 4 : 2,
                            backgroundColor: alertColor(c, type),
                        }]}>
                            <Icon name={ALERT_META[type].icon} size={on ? 32 : 26} color="#ffffff"/>
                        </View>
                        <Text variant={on ? 'headline' : 'label'} color="#ffffff">{ALERT_META[type].label}</Text>
                    </View>
                );
            })}

            <View pointerEvents="none" style={[styles.ring, {left: centre.x - RING / 2, top: centre.y - RING / 2}]}>
                <Svg width={RING} height={RING} style={{transform: [{rotate: '-90deg'}]}}>
                    <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - 6} stroke="rgba(255,255,255,0.25)" strokeWidth={8} fill="none"/>
                    <AnimatedCircle
                        cx={RING / 2} cy={RING / 2} r={RING / 2 - 6} stroke={c.bg.danger} strokeWidth={8} fill="none" strokeLinecap="round"
                        strokeDasharray={`${circumference}`}
                        strokeDashoffset={progress.interpolate({inputRange: [0, 1], outputRange: [circumference, 0]})}
                    />
                </Svg>
                <View style={[styles.disc, shadow.sos, {backgroundColor: c.bg.danger}]}>
                    <Text style={styles.sosText} color={c.text.onBrand}>SOS</Text>
                    <Text style={styles.sosSub} color={c.text.onBrand}>{holding ? 'Keep holding…' : 'Hold to send'}</Text>
                </View>
            </View>

            <Text variant="footnote" color={c.text.onBrand} style={[styles.hint, {top: height - 144}]}>{hint}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    copy: {position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center', gap: 8},
    typeWrap: {position: 'absolute', width: 120, alignItems: 'center', gap: 6},
    bubble: {borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center'},
    ring: {position: 'absolute', width: RING, height: RING, alignItems: 'center', justifyContent: 'center'},
    disc: {position: 'absolute', width: DISC, height: DISC, borderRadius: DISC / 2, alignItems: 'center', justifyContent: 'center', gap: 2.5},
    sosText: {fontSize: 50, lineHeight: 55, fontWeight: '800', letterSpacing: 0.4},
    sosSub: {fontSize: 16.25, lineHeight: 22.5, letterSpacing: -0.08},
    hint: {position: 'absolute', left: 16, right: 16, textAlign: 'center', opacity: 0.8},
});
