import {useCallback, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {contactsApi} from '@/lib/endpoints';
import {EmergencyContact} from '@/lib/types';
import {radius, shadow, useColors} from '@/theme';

/**
 * Figma page "Android · 07" / "Emergency contacts".
 *
 * Texted when an alert actually goes out — not during the countdown, so a cancelled alert never
 * frightens anyone's mother. Five is the limit the server enforces.
 */
const MAX = 5;

export default function EmergencyContacts() {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [contacts, setContacts] = useState<EmergencyContact[] | null>(null);
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setContacts(await contactsApi.list().catch(() => []));
    }, []);

    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!name.trim()) return setError('Who is this?');
        if (!phone.trim()) return setError('A number is the whole point.');
        setBusy(true);
        setError(null);
        try {
            await contactsApi.add({name: name.trim(), relation: relation.trim(), phone: phone.trim()});
            setName(''); setRelation(''); setPhone('');
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (contact: EmergencyContact) => {
        setContacts((list) => (list ?? []).filter((x) => x.id !== contact.id));
        await contactsApi.remove(contact.id).catch(() => load());
    };

    const full = (contacts?.length ?? 0) >= MAX;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                              style={[styles.screen, {backgroundColor: c.bg.page}]}>
            <ScreenHeader title="Emergency contacts"/>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                <View style={[styles.note, {backgroundColor: c.bg.brandSubtle}]}>
                    <Icon name="message-circle" size={20} color={c.icon.brand}/>
                    <Text variant="footnote" color={c.text.secondary} style={styles.flex}>
                        These people get a text when your alert goes out — not while it is counting down, so
                        cancelling never worries them. They do not need the app.
                    </Text>
                </View>

                {contacts === null ? (
                    <Text variant="subhead" color={c.text.muted}>Loading…</Text>
                ) : contacts.length === 0 ? (
                    <Text variant="subhead" color={c.text.muted}>
                        Nobody yet. Family who would want to know, even from far away.
                    </Text>
                ) : (
                    <View style={[styles.card, shadow.bubble, {backgroundColor: c.bg.surface}]}>
                        {contacts.map((contact, i) => (
                            <View key={contact.id}
                                  style={[styles.row, i > 0 && {borderTopWidth: StyleSheet.hairlineWidth,
                                      borderTopColor: c.border.default}]}>
                                <View style={styles.flex}>
                                    <Text variant="body">{contact.name}</Text>
                                    <Text variant="footnote" color={c.text.muted}>
                                        {[contact.relation, contact.phone].filter(Boolean).join(' · ')}
                                    </Text>
                                </View>
                                <Pressable accessibilityLabel={`Remove ${contact.name}`}
                                           onPress={() => remove(contact)} style={styles.iconButton}>
                                    <Icon name="x" size={20} color={c.icon.muted}/>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                {!full && (
                    <>
                        <Text variant="label" color={c.text.muted} style={styles.heading}>Add someone</Text>
                        <View style={[styles.card, shadow.bubble, styles.form, {backgroundColor: c.bg.surface}]}>
                            <TextField label="Name" value={name} autoCapitalize="words" placeholder="Mama"
                                       onChangeText={(v) => { setName(v); setError(null); }}/>
                            <TextField label="Relation" value={relation} autoCapitalize="words"
                                       placeholder="Mother" helper="Optional."
                                       onChangeText={(v) => { setRelation(v); setError(null); }}/>
                            <TextField label="Phone number" value={phone} keyboardType="phone-pad"
                                       placeholder="0712 345 678" error={error}
                                       onChangeText={(v) => { setPhone(v); setError(null); }}/>
                            <Button title="Add" variant="outline" size="M" onPress={add} loading={busy}
                                    style={styles.add}/>
                        </View>
                    </>
                )}
                {full && (
                    <Text variant="footnote" color={c.text.muted}>
                        Five is the most you can have. Remove one to add another.
                    </Text>
                )}
            </ScrollView>
            <View style={{height: Math.max(insets.bottom, 8)}}/>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 12},
    note: {flexDirection: 'row', gap: 12, padding: 16, borderRadius: radius.md, alignItems: 'flex-start'},
    flex: {flex: 1},
    card: {borderRadius: radius.lg},
    row: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8, minHeight: 60},
    iconButton: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
    heading: {marginTop: 12, marginLeft: 4},
    form: {padding: 16, gap: 14},
    add: {alignSelf: 'flex-start'},
});
