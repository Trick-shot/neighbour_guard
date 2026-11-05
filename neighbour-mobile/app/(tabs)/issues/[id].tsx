import {Image} from 'expo-image';
import {router, useLocalSearchParams} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import DiscussSheet from '@/components/issues/DiscussSheet';
import Icon from '@/components/ui/Icon';
import {agoText, CATEGORY_META, kmFrom, SeverityBadge, STATUS_LABEL} from '@/components/ui/IssueCard';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {issuesApi, placesApi, profileApi} from '@/lib/endpoints';
import {Issue, IssueComment, IssueStatus, MyResidence} from '@/lib/types';
import {shadow, useColors} from '@/theme';

/**
 * Figma "Issue detail" (1620:991), "· other area" (1741:1029) and "Discuss in group" (1716:11835).
 *
 * Residents of the issue's area can comment and share it to their group; anyone else who can see a
 * public issue can support and follow it. The server enforces both — this only hides the buttons.
 */
const NEXT_STATUS: Record<IssueStatus, IssueStatus | null> = {open: 'in_progress', in_progress: 'resolved', resolved: null};

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false});
const posted = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString() ? `Posted ${clock(iso)}` : agoText(iso);
};
const short = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 60) return `${Math.max(1, m)} min`;
    if (m < 1440) return `${Math.round(m / 60)} h`;
    if (m < 10080) return `${Math.round(m / 1440)} d`;
    return `${Math.round(m / 10080)} w`;
};

export default function IssueDetail() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id} = useLocalSearchParams<{ id: string }>();
    const issueId = Number(id);
    const [issue, setIssue] = useState<Issue | null | undefined>(undefined);
    const [comments, setComments] = useState<IssueComment[]>([]);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [myId, setMyId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const [note, setNote] = useState<string | null>(null);
    const [menu, setMenu] = useState(false);
    const [discuss, setDiscuss] = useState(false);

    const load = useCallback(async () => {
        setIssue(await issuesApi.get(issueId).catch(() => null));
        setComments(await issuesApi.comments(issueId).catch(() => []));
    }, [issueId]);
    useEffect(() => {
        load();
        placesApi.me().then(setHome).catch(() => undefined);
        profileApi.me().then((me) => setMyId(me.id)).catch(() => undefined);
    }, [load]);

    if (issue === undefined) return <View style={[styles.screen, {backgroundColor: c.bg.surface}]}><ScreenHeader title="Issue"/><StateView kind="loading"/></View>;
    if (issue === null) {
        return (
            <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
                <ScreenHeader title="Issue"/>
                <StateView kind="empty" title="Not available" body="This issue was removed, or it is only visible to residents of its area."/>
            </View>
        );
    }

    const resident = !!home && home.neighbourhood.id === issue.neighbourhood;
    const area = issue.neighbourhood_name;
    const km = kmFrom(home, issue);
    const meta = [CATEGORY_META[issue.category].short, resident ? null : area,
        km != null ? `${km.toFixed(1)} km` : null, resident ? posted(issue.created_at) : agoText(issue.created_at)]
        .filter(Boolean).join(' · ');
    const mine = myId !== null && issue.created_by === myId;
    const next = NEXT_STATUS[issue.status];

    const support = async () => {
        const on = !issue.i_support;
        setIssue({...issue, i_support: on, support_count: issue.support_count + (on ? 1 : -1)});
        setNote(null);
        try { await issuesApi.support(issueId, on); } catch (e: any) { setNote(e.message); load(); }
    };
    const follow = async () => {
        const on = !issue.i_follow;
        setIssue({...issue, i_follow: on});
        setNote(null);
        try { await issuesApi.follow(issueId, on); } catch (e: any) { setNote(e.message); load(); }
    };
    const send = async () => {
        const body = draft.trim();
        if (!body) return;
        setDraft('');
        setNote(null);
        try {
            const saved = await issuesApi.comment(issueId, body);
            setComments((l) => [...l, saved]);
            setIssue({...issue, comment_count: issue.comment_count + 1});
        } catch (e: any) {
            setDraft(body);
            setNote(e.message);
        }
    };
    const advance = async () => {
        setMenu(false);
        if (!next) return;
        try { setIssue(await issuesApi.setStatus(issueId, next)); } catch (e: any) { setNote(e.message); }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Issue" right={mine && next ? (
                <Pressable accessibilityLabel="More" hitSlop={10} onPress={() => setMenu(true)}><Icon name="more-horizontal" size={24}/></Pressable>
            ) : undefined}/>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {issue.media.length > 0 && (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.hero}>
                        {issue.media.map((m) => <Image key={m.id} source={{uri: m.image}} style={styles.hero} contentFit="cover"/>)}
                    </ScrollView>
                )}
                <View style={styles.tags}>
                    <SeverityBadge severity={issue.severity}/>
                    <Text variant="footnote" color={c.text.muted} style={styles.flex} numberOfLines={1}>{meta}</Text>
                    {issue.status !== 'open' && (
                        <View style={[styles.status, {backgroundColor: issue.status === 'resolved' ? c.feedback.successBg : c.bg.brandSubtle}]}>
                            <Text variant="caption1" color={issue.status === 'resolved' ? c.feedback.success : c.text.brand}>{STATUS_LABEL[issue.status]}</Text>
                        </View>
                    )}
                </View>
                <Text variant="title2">{issue.title}</Text>
                {!!issue.description && <Text variant="body" color={c.text.secondary}>{issue.description}</Text>}

                <View style={styles.actions}>
                    <Pressable accessibilityRole="button" accessibilityState={{selected: issue.i_support}} onPress={support}
                               style={[styles.action, {backgroundColor: c.bg.brandSubtle}, issue.i_support && {borderWidth: 1.5, borderColor: c.border.brand}]}>
                        <Icon name="thumbs-up" size={20} color={c.icon.brand}/>
                        <Text variant="buttonM" color={c.text.brand}>Support · {issue.support_count}</Text>
                    </Pressable>
                    {resident ? (
                        <Pressable accessibilityRole="button" onPress={() => setDiscuss(true)} style={[styles.action, {borderWidth: 1, borderColor: c.border.strong}]}>
                            <Icon name="message-circle" size={20}/>
                            <Text variant="buttonM">Discuss in group</Text>
                        </Pressable>
                    ) : (
                        <Pressable accessibilityRole="button" onPress={follow}
                                   style={[styles.action, {borderWidth: 1, borderColor: c.border.strong}, issue.i_follow && {backgroundColor: c.bg.subtle}]}>
                            <Icon name={issue.i_follow ? 'check' : 'bell'} size={20}/>
                            <Text variant="buttonM">{issue.i_follow ? 'Following' : 'Follow updates'}</Text>
                        </Pressable>
                    )}
                </View>
                {note && <Text variant="footnote" color={c.text.danger}>{note}</Text>}

                <Text variant="headline" style={styles.heading}>
                    {resident ? 'Comments' : `Comments from ${area} residents`} · {comments.length}
                </Text>
                {comments.length === 0 && (
                    <Text variant="subhead" color={c.text.muted}>{resident ? 'No comments yet. Be the first to say what you know.' : 'No comments yet.'}</Text>
                )}
                {comments.map((m) => (
                    <View key={m.id} style={styles.comment}>
                        <Avatar name={m.author_name} size={32}/>
                        <View style={styles.flex}>
                            <Text variant="caption1" color={c.text.muted}>
                                {[m.author_name, resident ? null : area, short(m.created_at)].filter(Boolean).join(' · ')}
                            </Text>
                            <Text variant="subhead">{m.body}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {resident ? (
                <View style={[styles.composerBar, {borderTopColor: c.border.default, paddingBottom: Math.max(insets.bottom, 12)}]}>
                    <View style={[styles.field, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                        <Icon name="plus" size={22} color={c.icon.muted}/>
                        <TextInput value={draft} onChangeText={setDraft} placeholder="Message..." placeholderTextColor={c.text.muted}
                                   style={[styles.input, {color: c.text.primary}]} multiline/>
                        <Icon name="mic" size={20} color={c.icon.muted}/>
                    </View>
                    <Pressable accessibilityLabel="Send comment" onPress={send} disabled={!draft.trim()}
                               style={[styles.sendBtn, {backgroundColor: c.bg.brand, opacity: draft.trim() ? 1 : 0.5}]}>
                        <Icon name="send" size={22} color={c.icon.onBrand}/>
                    </Pressable>
                </View>
            ) : (
                <View style={[styles.locked, {backgroundColor: c.bg.subtle, borderColor: c.border.default, marginBottom: Math.max(insets.bottom, 16) + 40}]}>
                    <Icon name="lock" size={20}/>
                    <Text variant="subhead" color={c.text.secondary} style={styles.flex}>
                        Only {area} residents can comment. Follow to get updates when it’s resolved.
                    </Text>
                </View>
            )}

            <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setMenu(false)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Update this issue</Text>
                    <Text variant="subhead" color={c.text.secondary}>Everyone who supports or follows it gets told.</Text>
                    {next && <Button title={next === 'in_progress' ? 'Mark as being dealt with' : 'Mark as resolved'} onPress={advance}/>}
                    <Button title="Cancel" variant="text" onPress={() => setMenu(false)}/>
                </View>
            </Modal>

            <DiscussSheet visible={discuss} issueId={issueId} onClose={() => setDiscuss(false)}
                          onShared={(cid) => { setDiscuss(false); router.push(`/chat/${cid}`); }}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12},
    hero: {width: 370, height: 200, borderRadius: 16, alignSelf: 'center'},
    tags: {flexDirection: 'row', alignItems: 'center', gap: 8},
    status: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999},
    actions: {flexDirection: 'row', gap: 8},
    action: {flex: 1, height: 40, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
    heading: {marginTop: 2},
    comment: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
    composerBar: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth},
    field: {flex: 1, minHeight: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16},
    input: {flex: 1, fontSize: 17, paddingVertical: 12, maxHeight: 120},
    sendBtn: {width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center'},
    locked: {flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1},
    sheetWrap: {flex: 1, justifyContent: 'flex-end'},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 16, paddingTop: 8, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
    message: {height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 17},
});
