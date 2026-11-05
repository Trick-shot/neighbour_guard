import {router} from 'expo-router';
import {Pressable, StyleSheet, View} from 'react-native';

import {useColors} from '@/theme';

import Icon from './Icon';
import StageProgress, {ONBOARDING_STAGES} from './StageProgress';
import Text from './Text';

/**
 * The row under the status bar on every onboarding screen: brand back chevron at 12 px, the stage
 * bars 20 px after it, and "Account · 1/4" on the right. Without `stage` it is the back button alone.
 * It sits 10 px below the safe area, as in the frames (status bar 62, chevron at 72).
 */
type Props = { stage?: number; progress?: number; onBack?: () => void; back?: boolean; tone?: 'brand' | 'default' };

export default function OnboardingHeader({stage, progress = 1, onBack, back = true, tone = 'brand'}: Props) {
    const c = useColors();
    return (
        <View style={styles.row}>
            {back ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}
                           onPress={onBack ?? (() => router.canGoBack() && router.back())}>
                    <Icon name="chevron-left" size={24} color={tone === 'brand' ? c.icon.brand : c.icon.default}/>
                </Pressable>
            ) : <View style={styles.spacer}/>}
            {stage ? (
                <>
                    <View style={styles.bars}><StageProgress stage={stage} progress={progress}/></View>
                    <Text variant="footnote" color={c.text.brand} style={styles.label}>
                        {ONBOARDING_STAGES[stage - 1]} · {stage}/4
                    </Text>
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {height: 24, marginTop: 10, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 16},
    spacer: {width: 24},
    bars: {marginLeft: 20},
    label: {marginLeft: 'auto'},
});
