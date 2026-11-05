import {Image} from 'expo-image';
import {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Button from './Button';
import {IconName} from './Icon';
import Text from './Text';

/**
 * Figma page "Android · 09": "Empty" (1635:3000), "Loading" (1635:3064), "Error" (1635:3137).
 * One component, so every screen fails, waits and starts empty the same way. A screen that fails
 * says what to do next, and reminds you that SOS still works.
 */
type Props = {
    kind: 'loading' | 'empty' | 'error';
    title?: string;
    body?: string;
    icon?: IconName;
    actionLabel?: string;
    onAction?: () => void;
    /** Loading only: how many skeleton cards to draw. */
    rows?: number;
};

const DEFAULTS = {
    empty: {title: 'Nothing here yet', body: ''},
    error: {title: 'Something went wrong', body: 'Check your connection and try again. Your SOS button still works.'},
};

export default function StateView({kind, title, body, icon, actionLabel, onAction, rows = 4}: Props) {
    const c = useColors();
    if (kind === 'loading') return <Skeleton rows={rows}/>;
    const fallback = DEFAULTS[kind];
    const text = body ?? fallback.body;

    if (kind === 'error') {
        return (
            <View style={styles.error} accessibilityRole="alert">
                <View style={[styles.errorArt, {backgroundColor: c.bg.brandSubtle}]}>
                    <Image source={require('@/assets/illustrations/error.png')} style={styles.errorImg} contentFit="contain"/>
                </View>
                <Text variant="title1" style={styles.centre}>{title ?? fallback.title}</Text>
                {!!text && <Text variant="body" color={c.text.secondary} style={styles.centre}>{text}</Text>}
                {onAction && actionLabel && <Button title={actionLabel} onPress={onAction} style={styles.retry}/>}
            </View>
        );
    }

    return (
        <View style={styles.empty}>
            <View style={[styles.emptyArt, {backgroundColor: c.bg.brandSubtle}]}>
                <Image source={require('@/assets/illustrations/empty.png')} style={styles.emptyImg} contentFit="contain"/>
            </View>
            <Text variant="title3" style={styles.centre}>{title ?? fallback.title}</Text>
            {!!text && <Text variant="subhead" color={c.text.secondary} style={styles.centre}>{text}</Text>}
            {onAction && actionLabel && <Button title={actionLabel} size="M" icon={icon} onPress={onAction}/>}
        </View>
    );
}

/** Grey cards that breathe, in the shape of the list that is coming (1635:3064). */
function Skeleton({rows}: { rows: number }) {
    const c = useColors();
    const pulse = useRef(new Animated.Value(0.6)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, {toValue: 1, duration: 700, useNativeDriver: true}),
            Animated.timing(pulse, {toValue: 0.6, duration: 700, useNativeDriver: true}),
        ]));
        loop.start();
        return () => loop.stop();
    }, [pulse]);
    const bar = (w: number | `${number}%`, h = 14) => <View style={{width: w, height: h, borderRadius: 7, backgroundColor: c.bg.subtle}}/>;
    return (
        <Animated.View style={[styles.skeleton, {opacity: pulse}]} accessibilityLabel="Loading" accessibilityRole="progressbar">
            {Array.from({length: rows}).map((_, i) => (
                <View key={i} style={[styles.skCard, {borderColor: c.border.default}]}>
                    <View style={[styles.skThumb, {backgroundColor: c.bg.subtle}]}/>
                    <View style={styles.skLines}>
                        {bar(60)}
                        {bar('85%')}
                        {bar('62%')}
                    </View>
                </View>
            ))}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    centre: {textAlign: 'center'},
    empty: {alignItems: 'center', gap: 12, paddingTop: 48, paddingHorizontal: 32},
    emptyArt: {width: 260, height: 220, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 10},
    emptyImg: {width: 220, height: 200},
    error: {flex: 1, alignItems: 'center', gap: 12, paddingTop: 26, paddingHorizontal: 16},
    errorArt: {alignSelf: 'stretch', height: 240, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12},
    errorImg: {width: 260, height: 220},
    retry: {alignSelf: 'stretch', marginTop: 'auto', marginBottom: 120, marginHorizontal: 13.5},
    skeleton: {padding: 16, gap: 12},
    skCard: {flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14},
    skThumb: {width: 64, height: 64, borderRadius: 12},
    skLines: {flex: 1, gap: 8, justifyContent: 'center'},
});
