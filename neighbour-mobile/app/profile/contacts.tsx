import {router} from 'expo-router';
import {useCallback, useEffect, useState} from 'react';
import {KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import ScreenHeader from '@/components/ui/ScreenHeader';
import {Toggle} from '@/components/ui/Settings';
import Text from '@/components/ui/Text';
import TextField from '@/components/ui/TextField';
import {contactsApi, placesApi, profileApi} from '@/lib/endpoints';
import {EmergencyContact, Me, MyResidence} from '@/lib/types';
import {useColors} from '@/theme';

/**
 * Figma "Emergency contacts" (1634:2469).
 *
 * Texted when an alert actually goes out — not during the countdown, so a cancelled alert never
 * frightens anyone's mother — and, if I want, again when it is resolved. Five is the limit the
 * server enforces. The preview is the exact text the server sends (alerts/tasks.py).
 */
const MAX = 5;

// "+255 713 ••• 221": enough to recognise the number, not enough to read it over a shoulder.
const masked = (p: string) => {
    const d = p.replace(/\s/g, '');
    if (d.length < 8) return p;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ••• ${d.slice(-3)}`;
};

export default function EmergencyContacts() {
    const c = useColors();
    const [contacts, setContacts] = useState<EmergencyContact[] | null>(null);
    const [me, setMe] = useState<Me | null>(null);
    const [home, setHome] = useState<MyResidence | null>(null);
    const [adding, setAdding] = useState(false);
    const [menu, setMenu] = useState<EmergencyContact | null>(null);

    const load = useCallback(async () => setContacts(await contactsApi.list().catch(() => [])), []);
    useEffect(() => {
        load();
        profileApi.me().then(setMe).catch(() => undefined);
        placesApi.me().then(setHome).catch(() => undefined);
    }, [load]);

    const remove = async (contact: EmergencyContact) => {
        setMenu(null);
        setContacts((l) => (l ?? []).filter((x) => x.id !== contact.id));
        await contactsApi.remove(contact.id).catch(() => load());
    };
    const allClear = async (on: boolean) => {
        if (!me) return;
        setMe({...me, text_contacts_on_resolve: on});
        await profileApi.setAllClear(on).catch(() => setMe(me));
    };

    const count = contacts?.length ?? 0;
    const first = me?.full_name.split(' ')[0] ?? 'You';
    const now = new Date().toTimeString().slice(0, 5);
    const where = home ? `House ${home.house_number}, ${home.street}` : 'your home';

    return (
        <View style={[styles.screen, {backgroundColor: c.bg.surface}]}>
            <ScreenHeader title="Emergency contacts" right={count < MAX ? (
                <Pressable accessibilityLabel="Add contact" hitSlop={10} onPress={() => setAdding(true)}><Icon name="plus" size={24}/></Pressable>
            ) : undefined}/>
            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="body" color={c.text.secondary}>They get a text with your location when you send an SOS. They don’t need the app.</Text>

                <View style={[styles.card, {borderColor: c.border.default}]}>
                    {(contacts ?? []).map((x, i) => (
                        <View key={x.id} style={[styles.row, i > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                            <Avatar name={x.name} size={44}/>
                            <View style={styles.flex}>
                                <Text variant="headline" numberOfLines={1}>{x.relation ? `${x.relation} · ${x.name}` : x.name}</Text>
                                <Text variant="footnote" color={c.text.secondary}>{masked(x.phone)}</Text>
                            </View>
                            <Pressable accessibilityLabel={`Options for ${x.name}`} hitSlop={10} onPress={() => setMenu(x)}>
                                <Icon name="more-horizontal" size={20} color={c.icon.muted}/>
                            </Pressable>
                        </View>
                    ))}
                    {count < MAX && (
                        <Pressable onPress={() => setAdding(true)} style={[styles.row, count > 0 && {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border.default}]}>
                            <View style={[styles.plus, {backgroundColor: c.bg.brandSubtle}]}><Icon name="plus" size={22} color={c.icon.brand}/></View>
                            <Text variant="headline" color={c.text.brand}>Add contact{'  '}({count} of {MAX})</Text>
                        </Pressable>
                    )}
                </View>

                <View style={[styles.card, styles.toggle, {borderColor: c.border.default}]}>
                    <Text variant="body" style={styles.flex}>Text them when it’s resolved</Text>
                    <Toggle value={me?.text_contacts_on_resolve ?? true} onChange={allClear} disabled={!me}/>
                </View>

                <Text variant="caption1" color={c.text.muted}>WHAT THEY RECEIVE</Text>
                <View style={[styles.preview, {backgroundColor: c.bg.subtle}]}>
                    <Text variant="subhead">
                        NeighbourGuard: {first} sent an emergency alert at {now} near {where}. Neighbours are responding.
                    </Text>
                </View>
                {!me?.is_phone_verified && (
                    <Pressable onPress={() => router.push('/authentication/phone')}>
                        <Text variant="footnote" color={c.text.brand}>Add your own number too, so an SOS can still go out by SMS with no data.</Text>
                    </Pressable>
                )}
            </ScrollView>

            <AddContactSheet visible={adding} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }}/>

            <Modal visible={!!menu} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
                <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={() => setMenu(null)}/>
                <View style={[styles.sheet, {backgroundColor: c.bg.surface}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">{menu?.name}</Text>
                    <Button title="Remove contact" variant="outline" onPress={() => menu && remove(menu)}/>
                    <Button title="Cancel" variant="text" onPress={() => setMenu(null)}/>
                </View>
            </Modal>
        </View>
    );
}

function AddContactSheet({visible, onClose, onAdded}: { visible: boolean; onClose: () => void; onAdded: () => void }) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const add = async () => {
        if (!name.trim()) return setError('Who is this?');
        if (!phone.trim()) return setError('A number is the whole point.');
        setBusy(true);
        setError(null);
        try {
            await contactsApi.add({name: name.trim(), relation: relation.trim(), phone: phone.trim()});
            setName(''); setRelation(''); setPhone('');
            onAdded();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.3)'}]} onPress={onClose}/>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap} pointerEvents="box-none">
                <View style={[styles.sheet, styles.inFlow, {backgroundColor: c.bg.surface, paddingBottom: Math.max(insets.bottom, 34)}]}>
                    <View style={[styles.grabber, {backgroundColor: c.border.default}]}/>
                    <Text variant="title3">Add an emergency contact</Text>
                    <TextField label="Name" value={name} onChangeText={setName} placeholder="Grace Luoga"/>
                    <TextField label="Relation" value={relation} onChangeText={setRelation} placeholder="Mama"/>
                    <TextField label="Phone number" value={phone} onChangeText={setPhone} placeholder="0713 000 221" keyboardType="phone-pad" error={error}/>
                    <Button title="Add contact" onPress={add} loading={busy}/>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {flex: 1},
    flex: {flex: 1, gap: 2},
    content: {padding: 16, gap: 16},
    card: {borderWidth: 1, borderRadius: 16, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 69},
    plus: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center'},
    toggle: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56},
    preview: {padding: 14, borderRadius: 16},
    wrap: {flex: 1, justifyContent: 'flex-end'},
    sheet: {position: 'absolute', left: 0, right: 0, bottom: 0, gap: 14, paddingTop: 8, paddingHorizontal: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24},
    inFlow: {position: 'relative'},
    grabber: {width: 36, height: 5, borderRadius: 3, alignSelf: 'center'},
});
