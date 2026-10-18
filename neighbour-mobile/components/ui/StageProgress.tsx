import {StyleSheet, View} from 'react-native';

import {radius, useColors} from '@/theme';

import Text from './Text';

/**
 * Figma "Stage progress" — the onboarding header. One bar per stage: done and current stages are
 * brand, the rest are the subtle track. `stage` is 1-based.
 */
export const ONBOARDING_STAGES = ['Account', 'Verify', 'Location', 'Safety'] as const;

type Props = { stage: number; total?: number; label?: string };

export default function StageProgress({stage, total = ONBOARDING_STAGES.length, label}: Props) {
    const c = useColors();
    return (
        <View
            accessibilityRole="progressbar"
            accessibilityValue={{min: 1, max: total, now: stage}}
            style={styles.wrap}>
            <View style={styles.bars}>
                {Array.from({length: total}, (_, i) => (
                    <View
                        key={i}
                        style={[styles.bar, {backgroundColor: i < stage ? c.bg.brand : c.bg.subtle}]}
                    />
                ))}
            </View>
            <View style={styles.row}>
                <Text variant="footnote" color={c.text.secondary}>{label ?? ONBOARDING_STAGES[stage - 1]}</Text>
                <Text variant="footnote" color={c.text.muted}>Step {stage} of {total}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {gap: 8, width: '100%'},
    bars: {flexDirection: 'row', gap: 6},
    bar: {flex: 1, height: 4, borderRadius: radius.pill},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
});
