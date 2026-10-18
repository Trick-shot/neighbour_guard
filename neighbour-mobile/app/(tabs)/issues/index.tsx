import {router, useFocusEffect} from 'expo-router';
import {useCallback, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import IssueCard from '@/components/ui/IssueCard';
import StateView from '@/components/ui/StateView';
import Text from '@/components/ui/Text';
import {issuesApi} from '@/lib/endpoints';
import {Issue} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma page "Android · 06" / "Issues". Two scopes, because they answer different questions:
 * "what is wrong on my street" and "what is wrong nearby" (public issues only, nearest first).
 */
type Scope = 'mine' | 'others';

export default function Issues() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [scope, setScope] = useState<Scope>('mine');
    const [issues, setIssues] = useState<Issue[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (which: Scope) => {
        try {
            setIssues(await issuesApi.list(which));
            setError(null);
        } catch (e: any) {
            setError(e.message);
            setIssues([]);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(scope); }, [load, scope]));

    const choose = (which: Scope) => {
        setScope(which);
        setIssues(null);
        load(which);
    };

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.page, paddingTop: insets.top + 8}]}>
            <View style={styles.header}>
                <Text variant="title2">Issues</Text>
                <Button title="Report" icon="plus" size="M" onPress={() => router.push('/(tabs)/issues/report')}/>
            </View>

            {/* Figma "segmented control" */}
            <View style={[styles.segmented, {backgroundColor: c.bg.subtle}]}>
                {([['mine', 'My area'], ['others', 'Nearby areas']] as [Scope, string][]).map(([key, label]) => {
                    const on = scope === key;
                    return (
                        <Pressable key={key} accessibilityRole="tab" accessibilityState={{selected: on}}
                                   onPress={() => choose(key)}
                                   style={[styles.segment, on && [shadow.bubble, {backgroundColor: c.bg.surface}]]}>
                            <Text variant="subhead" color={on ? c.text.primary : c.text.secondary}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <ScrollView contentContainerStyle={[styles.list, {paddingBottom: 120}]}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.icon.brand}
                                                        onRefresh={async () => {
                                                            setRefreshing(true);
                                                            await load(scope);
                                                            setRefreshing(false);
                                                        }}/>}>
                {issues === null ? (
                    <StateView kind="loading"/>
                ) : error ? (
                    <StateView kind="error" body={error} actionLabel="Try again" onAction={() => load(scope)}/>
                ) : issues.length === 0 ? (
                    <StateView
                        kind="empty"
                        icon="clipboard-list"
                        title={scope === 'mine' ? 'Nothing reported here yet' : 'Nothing nearby'}
                        body={scope === 'mine'
                            ? 'A broken light or a dark corner is worth posting — your neighbours see it.'
                            : 'No public issues within 5 km of your area.'}
                        actionLabel={scope === 'mine' ? 'Report something' : undefined}
                        onAction={scope === 'mine' ? () => router.push('/(tabs)/issues/report') : undefined}
                    />
                ) : (
                    issues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} otherArea={scope === 'others'}
                                   onPress={() => router.push(`/(tabs)/issues/${issue.id}`)}/>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12},
    segmented: {flexDirection: 'row', marginHorizontal: 16, padding: 3, borderRadius: radius.md, gap: 3},
    segment: {flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm},
    list: {paddingHorizontal: 16, paddingTop: 12, gap: 12},
});
