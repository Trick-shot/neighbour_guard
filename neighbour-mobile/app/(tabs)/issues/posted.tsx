import {router, useLocalSearchParams} from 'expo-router';
import {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import DiscussSheet from '@/components/issues/DiscussSheet';
import Button from '@/components/ui/Button';
import Footer from '@/components/ui/Footer';
import Icon from '@/components/ui/Icon';
import Illustration from '@/components/ui/Illustration';
import IssueCard from '@/components/ui/IssueCard';
import Text from '@/components/ui/Text';
import {chatApi, issuesApi, placesApi} from '@/lib/endpoints';
import {Issue, MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Issue posted" (1634:2297). */
export default function IssuePosted() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const {id, photosFailed} = useLocalSearchParams<{ id: string; photosFailed?: string }>();
    const [issue, setIssue] = useState<Issue | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [discuss, setDiscuss] = useState(false);
    const [group, setGroup] = useState<string | null>(null);

    useEffect(() => {
        issuesApi.get(Number(id)).then(setIssue).catch(() => undefined);
        placesApi.me().then(setHome).catch(() => undefined);
        chatApi.conversations().then((l) => setGroup(l.find((x) => x.kind === 'group')?.name ?? null)).catch(() => undefined);
    }, [id]);

    const area = home?.neighbourhood.name ?? 'your neighbourhood';
    const audience = issue?.visibility === 'public' ? 'Public' : `visible to ${area}`;

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface, paddingTop: insets.top + 46}]}>
            <View style={styles.body}>
                <Illustration source={require('@/assets/illustrations/issue-posted.png')} size={190} height={200}/>
                <View style={[styles.chip, {backgroundColor: c.feedback.successBg}]}>
                    <Icon name="check" size={16} color={c.feedback.success}/>
                    <Text variant="subhead" color={c.feedback.success}>Posted · {audience}</Text>
                </View>
                <View style={{gap: 8}}>
                    <Text variant="title1">Your issue is live</Text>
                    <Text variant="body" color={c.text.secondary}>Neighbours can upvote and comment. We’ll let you know when someone replies.</Text>
                    {!!photosFailed && (
                        <Text variant="footnote" color={c.feedback.warning}>{photosFailed} photo{photosFailed === '1' ? '' : 's'} didn’t upload. You can try again from the issue.</Text>
                    )}
                </View>
                {issue && <IssueCard issue={issue} home={home} onPress={() => router.replace({pathname: '/issues/[id]', params: {id: String(issue.id)}})}/>}
            </View>
            <Footer gap={14}>
                <Button title={group ? `Share to ${group}` : 'Share to my group'} icon="send" onPress={() => setDiscuss(true)}/>
                <Button title="View on map" variant="text" onPress={() => router.replace({pathname: '/issues', params: {map: '1'}})}/>
            </Footer>
            <DiscussSheet visible={discuss} issueId={Number(id)} onClose={() => setDiscuss(false)}
                          onShared={(cid) => { setDiscuss(false); router.replace(`/chat/${cid}`); }}/>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    body: {paddingHorizontal: 16, gap: 16},
    chip: {flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999},
});
