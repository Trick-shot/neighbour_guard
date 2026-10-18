import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Button from './Button';
import Icon, {IconName} from './Icon';
import Text from './Text';

/**
 * Figma page "Android · 09" — the empty, loading and error states, in one component so they are
 * the same everywhere. A screen that fails should say what to do next, not just stop.
 */
type Props = {
    kind: 'loading' | 'empty' | 'error';
    title?: string;
    body?: string;
    icon?: IconName;
    actionLabel?: string;
    onAction?: () => void;
};

const DEFAULTS: Record<Props['kind'], { icon: IconName; title: string; body: string }> = {
    loading: {icon: 'clock', title: 'Loading…', body: ''},
    empty: {icon: 'search', title: 'Nothing here yet', body: ''},
    error: {icon: 'triangle-alert', title: 'That did not load', body: 'Check your connection and try again.'},
};

export default function StateView({kind, title, body, icon, actionLabel, onAction}: Props) {
    const c = useColors();
    const fallback = DEFAULTS[kind];
    return (
        <View style={styles.wrap} accessibilityRole={kind === 'error' ? 'alert' : undefined}>
            {kind === 'loading'
                ? <ActivityIndicator color={c.icon.brand} size="large"/>
                : <Icon name={icon ?? fallback.icon} size={30}
                        color={kind === 'error' ? c.icon.danger : c.icon.muted}/>}
            <Text variant="bodyEmphasis" color={c.text.secondary} style={styles.centre}>
                {title ?? fallback.title}
            </Text>
            {(body ?? fallback.body) ? (
                <Text variant="subhead" color={c.text.muted} style={styles.centre}>{body ?? fallback.body}</Text>
            ) : null}
            {onAction && actionLabel && (
                <Button title={actionLabel} variant="outline" size="M" onPress={onAction} style={styles.action}/>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: 24},
    centre: {textAlign: 'center'},
    action: {marginTop: 6},
});
