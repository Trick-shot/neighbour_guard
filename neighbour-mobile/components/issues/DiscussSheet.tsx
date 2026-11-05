import {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import {OptionCard} from '@/components/ui/Choice';
import Text from '@/components/ui/Text';
import {chatApi, issuesApi} from '@/lib/endpoints';
import {Conversation} from '@/lib/types';
import {useColors} from '@/theme';

/** Figma "Discuss in group" (1716:11835): pick a group, add a line, share the issue card there. */
export default function DiscussSheet({visible, issueId, onClose, onShared}: { visible: boolean; issueId: number; onClose: () => void; onShared: (conversationId: number) => void }) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [groups, setGroups] = useState<Conversation[]>([]);
    const [picked, setPicked] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) return;
        chatApi.conversations().then((list) => {
            const g = list.filter((x) => x.kind === 'group');
            setGroups(g);
            setPicked((p) => p ?? g[0]?.id ?? null);
        }).catch(() => undefined);
    }, [visible]);

    const chosen = groups.find((g) => g.id === picked);
    const share = async () => {
        setBusy(true);
        setError(null);
        try {
            // The server posts to the sharer's own neighbourhood group: the body carries no group id.
            const r = await issuesApi.share(issueId, message.trim() || undefined);
            setMessage('');
            onShared(r.conversation_id);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={onClose}/>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap} pointerEvents="box-none">
                <View style={[styles.sheet, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <View style={{gap: 4}}>
                        <Text variant="title3">Discuss with neighbours</Text>
                        <Text variant="subhead" color={c.text.secondary}>Share this issue to a group so everyone can plan together.</Text>
                    </View>
                    {groups.length === 0 && <Text variant="subhead" color={c.text.muted}>You’re not in a neighbourhood group yet.</Text>}
                    {groups.map((g) => (
                        <OptionCard key={g.id} icon="users" title={g.name} subtitle={`${g.participants.length} members`}
                                    selected={g.id === picked} onPress={() => setPicked(g.id)}/>
                    ))}
                    <View style={{gap: 8}}>
                        <Text variant="subhead">Add a message (optional)</Text>
                        <TextInput value={message} onChangeText={setMessage} maxLength={500}
                                   placeholder="Can we sort this out together?" placeholderTextColor={c.text.muted}
                                   style={[styles.message, {borderColor: c.border.default, color: c.text.primary}]}/>
                    </View>
                    {error && <Text variant="footnote" color={c.text.danger}>{error}</Text>}
                    <Button title={chosen ? `Share to ${chosen.name}` : 'Share'} icon="send" onPress={share} loading={busy} disabled={!chosen}/>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetWrap: {flex: 1, justifyContent: 'flex-end'},
    sheet: {gap: 16, paddingTop: 8, paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
    message: {height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 17},
});
