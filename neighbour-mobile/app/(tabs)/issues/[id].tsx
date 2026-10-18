import {useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import {CATEGORY_META, SEVERITY_LABEL, STATUS_LABEL, severityColor} from '@/components/ui/IssueCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {issuesApi, profileApi} from '@/lib/endpoints';
import {Issue, IssueComment, IssueStatus} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma page "Android · 06" / "Issue detail".
 *
 * The buttons shown here follow what the server allows: comments only for verified residents of
 * this issue's area, status only for the person who reported it. When the server refuses anyway,
 * its reason is shown rather than a generic failure — the app hides, the server forbids.
 */
const NEXT_STATUS: Record<IssueStatus, IssueStatus | null> = {
    open: 'in_progress', in_progress: 'resolved', resolved: null,
};

export default function IssueDetail() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const issueId = Number(id);
    const [issue, setIssue] = useState<Issue | null>(null);
    const [comments, setComments] = useState<IssueComment[] | null>(null);
    const [draft, setDraft] = useState('');
    const [myId, setMyId] = useState<number | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setIssue(await issuesApi.get(issueId).catch(() => null));
        setComments(await issuesApi.comments(issueId).catch(() => []));
    }, [issueId]);

    useEffect(() => {
        load();
        profileApi.me().then((me) => setMyId(me.id)).catch(() => undefined);
    }, [load]);

    const support = async () => {
        if (!issue) return;
        const on = !issue.i_support;
        setIssue({...issue, i_support: on, support_count: issue.support_count + (on ? 1 : -1)});
        setNote(null);
        try {
            await issuesApi.support(issueId, on);
        } catch (e: any) {
            setNote(e.message);
            load();
        }
    };

    const follow = async () => {
        if (!issue) return;
        const on = !issue.i_follow;
        setIssue({...issue, i_follow: on});
        setNote(null);
        try {
            await issuesApi.follow(issueId, on);
        } catch (e: any) {
            setNote(e.message);
            load();
        }
    };

    const comment = async () => {
        const body = draft.trim();
        if (!body) return;
        setBusy(true);
        setNote(null);
        try {
            const saved = await issuesApi.comment(issueId, body);
            setComments((list) => [...(list ?? []), saved]);
            setDraft('');
            if (issue) setIssue({...issue, comment_count: issue.comment_count + 1});
        } catch (e: any) {
            setNote(e.message);
        } finally {
            setBusy(false);
        }
    };

    const advance = async () => {
        if (!issue) return;
        const next = NEXT_STATUS[issue.status];
        if (!next) return;
        setNote(null);
        try {
            setIssue(await issuesApi.setStatus(issueId, next));
        } catch (e: any) {
            setNote(e.message);
        }
    };

    const share = async () => {
        setNote(null);
        try {
            await issuesApi.share(issueId);
            setNote('Shared to your neighbourhood group.');
        } catch (e: any) {
            setNote(e.message);
        }
    };

    if (!issue) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.page}]}>
                <ScreenHeader title="Issue"/>
                <Text variant="subhead" color={c.text.muted} style={styles.padded}>
                    This issue is not available to you.
                </Text>
            </View>
        );
    }

    const meta = CATEGORY_META[issue.category] ?? CATEGORY_META.other;
    const mine = myId !== null && issue.created_by === myId;
    const next = NEXT_STATUS[issue.status];

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Issue"/>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                <View style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                    <View style={styles.top}>
                        <View style={[styles.icon, {backgroundColor: c.bg.subtle}]}>
                            <Icon name={meta.icon} size={22}/>
                        </View>
                        <View style={styles.flex}>
                            <Text variant="title3">{issue.title}</Text>
                            <Text variant="footnote" color={c.text.muted}>
                                {[meta.label, issue.neighbourhood_name, issue.reporter_name].filter(Boolean).join(' · ')}
                            </Text>
                        </View>
                    </View>
                    {!!issue.description && <Text variant="body" color={c.text.secondary}>{issue.description}</Text>}
                    <View style={styles.pills}>
                        <View style={[styles.pill, {backgroundColor: issue.status === 'resolved'
                                ? c.feedback.successBg : c.bg.subtle}]}>
                            <Text variant="caption1" color={issue.status === 'resolved'
                                ? c.feedback.success : c.text.secondary}>{STATUS_LABEL[issue.status]}</Text>
                        </View>
                        <View style={[styles.pill, {backgroundColor: c.bg.subtle}]}>
                            <Text variant="caption1" color={severityColor(c, issue.severity)}>
                                {SEVERITY_LABEL[issue.severity]}
                            </Text>
                        </View>
                        <View style={[styles.pill, {backgroundColor: c.bg.subtle}]}>
                            <Text variant="caption1" color={c.text.secondary}>
                                {issue.visibility === 'public' ? 'Anyone nearby' : 'My neighbourhood'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actions}>
                    <Pressable accessibilityRole="button" onPress={support}
                               style={[styles.action, shadow.bubble, {backgroundColor: issue.i_support
                                       ? c.bg.brandSubtle : c.bg.surface}]}>
                        <Icon name="users" size={20} color={issue.i_support ? c.icon.brand : c.icon.default}/>
                        <Text variant="subhead" color={issue.i_support ? c.text.brand : c.text.primary}>
                            Affects me too · {issue.support_count}
                        </Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={follow}
                               style={[styles.action, shadow.bubble, {backgroundColor: issue.i_follow
                                       ? c.bg.brandSubtle : c.bg.surface}]}>
                        <Icon name="bell" size={20} color={issue.i_follow ? c.icon.brand : c.icon.default}/>
                        <Text variant="subhead" color={issue.i_follow ? c.text.brand : c.text.primary}>
                            {issue.i_follow ? 'Following' : 'Follow'}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.row}>
                    <Button title="Share to my group" variant="outline" size="M" icon="send" onPress={share}/>
                    {mine && next && (
                        <Button title={next === 'in_progress' ? 'Mark as being dealt with' : 'Mark resolved'}
                                size="M" onPress={advance}/>
                    )}
                </View>

                {note && <Text variant="subhead" color={c.text.secondary}>{note}</Text>}

                <Text variant="label" color={c.text.muted} style={styles.heading}>
                    Comments{comments?.length ? ` · ${comments.length}` : ''}
                </Text>
                {comments === null ? (
                    <Text variant="subhead" color={c.text.muted}>Loading…</Text>
                ) : comments.length === 0 ? (
                    <Text variant="subhead" color={c.text.muted}>
                        No comments yet. Only verified neighbours in this area can add one.
                    </Text>
                ) : (
                    comments.map((item) => (
                        <View key={item.id} style={[styles.comment, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                            <Avatar name={item.author_name} size={36}/>
                            <View style={styles.flex}>
                                <Text variant="label">{item.author_name}</Text>
                                <Text variant="subhead" color={c.text.secondary}>{item.body}</Text>
                            </View>
                        </View>
                    ))
                )}

                <View style={styles.composer}>
                    <TextField label="Add a comment" value={draft} onChangeText={setDraft} multiline
                               placeholder="What do you know about this?"/>
                    <Button title="Post" variant="outline" size="M" onPress={comment} loading={busy}
                            disabled={!draft.trim()} style={styles.post}/>
                </View>
            </ScrollView>
            <View style={{height: Math.max(insets.bottom, 8)}}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    padded: {padding: 16},
    content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12},
    card: {borderRadius: radius.lg, padding: 16, gap: 12},
    top: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
    icon: {width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1, gap: 2},
    pills: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
    pill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill},
    actions: {flexDirection: 'row', gap: 12},
    action: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 12, borderRadius: radius.md},
    row: {flexDirection: 'row', gap: 12, flexWrap: 'wrap'},
    heading: {marginTop: 12, marginLeft: 4},
    comment: {flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, alignItems: 'flex-start'},
    composer: {marginTop: 12, gap: 12},
    post: {alignSelf: 'flex-start'},
});
