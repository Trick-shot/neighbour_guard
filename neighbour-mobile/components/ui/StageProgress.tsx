import {StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

/**
 * Figma "Stage progress" (onboarding header): four 54 × 4 bars, 6 px apart. Finished stages are
 * full, the current one fills by how far through it you are (`progress`, 0–1).
 */
export const ONBOARDING_STAGES = ['Account', 'Verify', 'Location', 'Safety'] as const;

export default function StageProgress({stage, progress}: { stage: number; progress: number }) {
    const c = useColors();
    return (
        <View accessibilityRole="progressbar" accessibilityValue={{min: 1, max: 4, now: stage}} style={styles.bars}>
            {ONBOARDING_STAGES.map((name, i) => {
                const fill = i + 1 < stage ? 1 : i + 1 === stage ? progress : 0;
                return (
                    <View key={name} style={[styles.bar, {backgroundColor: c.bg.disabled}]}>
                        <View style={[styles.fill, {width: `${fill * 100}%`, backgroundColor: c.bg.brand}]}/>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bars: {flexDirection: 'row', gap: 6},
    bar: {width: 54, height: 4, borderRadius: 2, overflow: 'hidden'},
    fill: {height: 4},
});
