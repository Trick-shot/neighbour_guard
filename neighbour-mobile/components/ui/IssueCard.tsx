import {Image} from 'expo-image';
import {Pressable, StyleSheet, View} from 'react-native';

import {Issue, IssueCategory, IssueSeverity, IssueStatus, MyResidence} from '@/lib/types';
import {Colors, useColors} from '@/theme';

import Icon, {IconName} from './Icon';
import Text from './Text';

/** Figma "Issue card" (Issues list): 72 px photo, severity badge + category, title, support / comments / where. */
export const CATEGORY_META: Record<IssueCategory, { label: string; short: string; icon: IconName }> = {
    waste: {label: 'Waste', short: 'Waste', icon: 'clipboard-list'},
    lighting: {label: 'Street lighting', short: 'Lighting', icon: 'eye'},
    roads: {label: 'Roads and drainage', short: 'Roads', icon: 'navigation'},
    water: {label: 'Water', short: 'Water', icon: 'triangle-alert'},
    noise: {label: 'Noise', short: 'Noise', icon: 'volume-x'},
    security: {label: 'Security', short: 'Security', icon: 'shield-check'},
    other: {label: 'Other', short: 'Other', icon: 'more-horizontal'},
};
export const SEVERITY_LABEL: Record<IssueSeverity, string> = {low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical'};
export const STATUS_LABEL: Record<IssueStatus, string> = {open: 'Open', in_progress: 'Being dealt with', resolved: 'Resolved'};
export const severityColor = (c: Colors, s: IssueSeverity) => ({
    low: {bg: c.feedback.successBg, fg: c.feedback.success},
    moderate: {bg: c.feedback.warningBg, fg: c.feedback.warning},
    high: {bg: c.feedback.errorBg, fg: c.feedback.error},
    critical: {bg: c.feedback.errorBg, fg: c.feedback.error},
}[s]);

export const agoText = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} min ago`;
    if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
    if (m < 60 * 48) return 'Yesterday';
    return `${Math.round(m / 1440)} days ago`;
};

export const kmFrom = (home: MyResidence | null | undefined, issue: Issue) => {
    if (!home || issue.lat == null || issue.lng == null) return null;
    const rad = Math.PI / 180, dLat = (issue.lat - home.lat) * rad, dLng = (issue.lng - home.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(home.lat * rad) * Math.cos(issue.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
};

export function SeverityBadge({severity}: { severity: IssueSeverity }) {
    const c = useColors();
    const t = severityColor(c, severity);
    return (
        <View style={[styles.badge, {backgroundColor: t.bg}]}>
            <Text variant="caption2" color={t.fg}>{SEVERITY_LABEL[severity].toUpperCase()}</Text>
        </View>
    );
}

export default function IssueCard({issue, otherArea, home, onPress}: { issue: Issue; otherArea?: boolean; home?: MyResidence | null; onPress?: () => void }) {
    const c = useColors();
    const km = kmFrom(home, issue);
    const where = otherArea
        ? [issue.neighbourhood_name, km != null ? `${km.toFixed(1)} km` : null, agoText(issue.created_at)]
        : [issue.street && home && issue.street === home.street ? 'Your street' : issue.street || issue.neighbourhood_name,
            issue.visibility === 'public' ? 'Public' : null, agoText(issue.created_at)];
    return (
        <Pressable onPress={onPress} style={[styles.card, {backgroundColor: c.bg.surface}]}>
            {issue.media[0] ? (
                <Image source={{uri: issue.media[0].image}} style={styles.thumb} contentFit="cover"/>
            ) : (
                <View style={[styles.thumb, styles.placeholder, {backgroundColor: c.bg.subtle}]}>
                    <Icon name={CATEGORY_META[issue.category].icon} size={26} color={c.icon.muted}/>
                </View>
            )}
            <View style={styles.body}>
                <View style={styles.tags}>
                    <SeverityBadge severity={issue.severity}/>
                    <Text variant="caption1" color={c.text.muted}>{CATEGORY_META[issue.category].short}</Text>
                </View>
                <Text variant="headline" numberOfLines={2}>{issue.title}</Text>
                <View style={styles.meta}>
                    <View style={styles.count}>
                        <Icon name="thumbs-up" size={16} color={c.icon.muted}/>
                        <Text variant="footnote" color={c.text.secondary}>{issue.support_count}</Text>
                    </View>
                    {!otherArea && (
                        <View style={styles.count}>
                            <Icon name="message-circle" size={16} color={c.icon.muted}/>
                            <Text variant="footnote" color={c.text.secondary}>{issue.comment_count}</Text>
                        </View>
                    )}
                    <Text variant="footnote" color={c.text.muted} numberOfLines={1} style={styles.flex}>
                        {where.filter(Boolean).join(' · ')}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16},
    thumb: {width: 72, height: 72, borderRadius: 12},
    placeholder: {alignItems: 'center', justifyContent: 'center'},
    body: {flex: 1, gap: 4},
    tags: {flexDirection: 'row', alignItems: 'center', gap: 6},
    badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
    meta: {flexDirection: 'row', alignItems: 'center', gap: 12},
    count: {flexDirection: 'row', alignItems: 'center', gap: 4},
    flex: {flex: 1},
});
