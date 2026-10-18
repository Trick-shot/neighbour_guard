import {Pressable, StyleSheet, View} from 'react-native';

import Icon, {IconName} from '@/components/ui/Icon';
import Text from '@/components/ui/Text';
import {Issue, IssueCategory, IssueSeverity, IssueStatus} from '@/lib/types';
import {Colors, radius, shadow, useColors} from '@/theme';

/** Figma "Issue card". Mine (my own area) and other-area variants differ only in what is shown. */
export const CATEGORY_META: Record<IssueCategory, { label: string; icon: IconName }> = {
    security: {label: 'Security', icon: 'shield-check'},
    lighting: {label: 'Street lighting', icon: 'eye'},
    roads: {label: 'Roads and drainage', icon: 'navigation'},
    water: {label: 'Water', icon: 'triangle-alert'},
    waste: {label: 'Waste', icon: 'clipboard-list'},
    other: {label: 'Other', icon: 'clipboard-list'},
};

export const SEVERITY_LABEL: Record<IssueSeverity, string> = {
    low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical',
};

export const STATUS_LABEL: Record<IssueStatus, string> = {
    open: 'Open', in_progress: 'Being dealt with', resolved: 'Resolved',
};

export const severityColor = (c: Colors, severity: IssueSeverity) =>
    severity === 'critical' || severity === 'high' ? c.feedback.error
        : severity === 'moderate' ? c.feedback.warning : c.text.muted;

const when = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
};

export default function IssueCard({issue, otherArea, onPress}: {
    issue: Issue; otherArea?: boolean; onPress?: () => void;
}) {
    const c = useColors();
    const meta = CATEGORY_META[issue.category] ?? CATEGORY_META.other;
    const resolved = issue.status === 'resolved';
    return (
        <Pressable accessibilityRole="button" onPress={onPress}
                   style={({pressed}) => [styles.card, shadow.bubble, {
                       backgroundColor: pressed ? c.bg.subtle : c.bg.surface,
                   }]}>
            <View style={styles.top}>
                <View style={[styles.icon, {backgroundColor: c.bg.subtle}]}>
                    <Icon name={meta.icon} size={20} color={resolved ? c.icon.muted : c.icon.default}/>
                </View>
                <View style={styles.flex}>
                    <Text variant="bodyEmphasis" numberOfLines={2}
                          color={resolved ? c.text.secondary : c.text.primary}>{issue.title}</Text>
                    <Text variant="footnote" color={c.text.muted}>
                        {[meta.label, otherArea ? issue.neighbourhood_name : issue.reporter_name, when(issue.created_at)]
                            .filter(Boolean).join(' · ')}
                    </Text>
                </View>
            </View>

            {!!issue.description && (
                <Text variant="subhead" color={c.text.secondary} numberOfLines={2}>{issue.description}</Text>
            )}

            <View style={styles.meta}>
                <View style={[styles.pill, {backgroundColor: resolved ? c.feedback.successBg : c.bg.subtle}]}>
                    <Text variant="caption1" color={resolved ? c.feedback.success : c.text.secondary}>
                        {STATUS_LABEL[issue.status]}
                    </Text>
                </View>
                <View style={[styles.pill, {backgroundColor: c.bg.subtle}]}>
                    <Text variant="caption1" color={severityColor(c, issue.severity)}>
                        {SEVERITY_LABEL[issue.severity]}
                    </Text>
                </View>
                <View style={styles.flex}/>
                <View style={styles.count}>
                    <Icon name="users" size={16} color={issue.i_support ? c.icon.brand : c.icon.muted}/>
                    <Text variant="caption1" color={issue.i_support ? c.text.brand : c.text.muted}>
                        {issue.support_count}
                    </Text>
                </View>
                <View style={styles.count}>
                    <Icon name="message-circle" size={16} color={c.icon.muted}/>
                    <Text variant="caption1" color={c.text.muted}>{issue.comment_count}</Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {borderRadius: radius.lg, padding: 14, gap: 10},
    top: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
    icon: {width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1, gap: 2},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 8},
    pill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill},
    count: {flexDirection: 'row', alignItems: 'center', gap: 4},
});
